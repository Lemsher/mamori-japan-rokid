"""Read-only JMA XML adapter. No inference of all-clear or geospatial safety."""
import concurrent.futures
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import threading
import time
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
FEED = 'https://www.data.jma.go.jp/developer/xml/feed/'
DATA = 'https://www.data.jma.go.jp/developer/xml/data/'
UTC = dt.timezone.utc
AREAS = json.loads((ROOT / 'data/areas.json').read_text())
MAX_BYTES = 12_000_000


def stamp():
    return dt.datetime.now(UTC).isoformat()


def age(value):
    try:
        return (dt.datetime.now(UTC) - dt.datetime.fromisoformat(value.replace('Z', '+00:00'))).total_seconds()
    except (ValueError, TypeError):
        return float('inf')


def xml_root(raw):
    if len(raw) > MAX_BYTES or b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
        raise ValueError('unsupported XML')
    root = ET.fromstring(raw)
    # Normalize namespace URIs; queries below use exact structural paths.
    for el in root.iter():
        el.tag = el.tag.rsplit('}', 1)[-1]
    return root


def text(el, path, default=''):
    return el.findtext(path, default=default).strip()


def parse_feed(raw):
    root = xml_root(raw)
    if root.tag != 'feed':
        raise ValueError('expected Atom feed')
    entries = []
    for e in root.findall('entry'):
        url = text(e, 'id')
        if re.fullmatch(re.escape(DATA) + r'[0-9A-Za-z_]+\.xml', url):
            entries.append({'id':url, 'title':text(e,'title'), 'issuedAt':text(e,'updated'),
                            'summary':text(e,'content'), 'publisher':text(e,'author/name')})
    return {'updatedAt':text(root,'updated'), 'entries':entries}


def municipality(code):
    city = AREAS['class20s'].get(code)
    if not city:
        raise ValueError('unknown municipality')
    group = AREAS['class15s'][city['parent']]
    district = AREAS['class10s'][group['parent']]
    office_code = district['parent']
    office = AREAS['offices'][office_code]
    return {'code':code,'name':city['name'],'officeCode':office_code,'office':office['name'],
            'forecastCode':group['parent'],'forecastArea':district['name']}


def report_meta(root, url):
    return {'id':url, 'source':url, 'title':text(root,'Head/Title'),
            'issuedAt':text(root,'Head/ReportDateTime'), 'infoType':text(root,'Head/InfoType'),
            'publisher':text(root,'Control/PublishingOffice'), 'status':text(root,'Control/Status')}


def parse_warnings(raw, city_code, url):
    root = xml_root(raw)
    meta = report_meta(root, url)
    if meta['status'] != '通常' or meta['infoType'] not in ('発表', '訂正'):
        return {'meta':meta,'matched':False,'alerts':[], 'withdrawn':meta['infoType']=='取消'}
    alerts, matched = [], False
    for warning in root.findall('Body/Warning'):
        # Body contains a full snapshot, whereas Head is a change summary.
        for item in warning.findall('Item'):
            if text(item,'Area/Code') != city_code:
                continue
            matched = True
            for kind in item.findall('Kind'):
                name, status = text(kind,'Name'), text(kind,'Status')
                if not name or name == '解除' or status in ('解除', '発表警報・注意報はなし'):
                    continue
                normalized = name.translate(str.maketrans('０１２３４５６７８９','0123456789'))
                m = re.search(r'レベル([1-5])', normalized)
                level = int(m[1]) if m else None
                hazard = ('landslide' if '土砂' in name else 'flood' if any(s in name for s in ('大雨','洪水','氾濫','高潮'))
                          else 'typhoon' if '暴風' in name else 'prepare')
                alerts.append({**meta,'name':name,'conditionStatus':status,'level':level,
                               'hazard':hazard,'cityCode':city_code,'city':text(item,'Area/Name'),
                               'kindCode':text(kind,'Code'),'system':'jma-meteorological',
                               'notice':text(root,'Body/Notice')})
    return {'meta':meta,'matched':matched,'alerts':alerts,'withdrawn':False}


def parse_forecast(raw, area_code, url):
    root = xml_root(raw)
    meta = report_meta(root,url)
    if meta['status'] != '通常' or meta['infoType'] not in ('発表','訂正'):
        return None
    for series in root.findall('Body/MeteorologicalInfos/TimeSeriesInfo'):
        times = {t.get('timeId'):{'label':text(t,'Name'),'dateTime':text(t,'DateTime')}
                 for t in series.findall('TimeDefines/TimeDefine')}
        for item in series.findall('Item'):
            if text(item,'Area/Code') != area_code:
                continue
            weather = item.findall('Kind/Property/WeatherPart/Weather')
            if weather:
                return {**meta,'area':text(item,'Area/Name'),'areaCode':area_code,
                        'days':[{'condition':w.text or '',**times.get(w.get('refID'),{})} for w in weather]}
    return None


class PublicCache:
    """Cache public, non-personal XML. No repeated bulletin downloads; no stale fallback."""
    def __init__(self, directory=None, fetcher=None):
        self.directory = Path(directory or ROOT / '.cache/jma')
        self.directory.mkdir(parents=True, exist_ok=True)
        self.fetcher = fetcher or self._fetch
        self.locks = {}
        self.guard = threading.Lock()

    @staticmethod
    def _fetch(url):
        if os.environ.get('JMA_HTTP_CLIENT','curl') == 'curl':
            p = subprocess.run(['curl','--fail','--silent','--show-error','--max-time','12',
                                '--max-filesize',str(MAX_BYTES),url],capture_output=True,timeout=14)
            if p.returncode:
                raise OSError('official source unavailable')
            return p.stdout
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'MAMORI/0.1'}),timeout=12) as r:
            return r.read(MAX_BYTES+1)

    def get(self, url, ttl):
        if not (re.fullmatch(re.escape(FEED)+r'(?:extra|regular|eqvol)(?:_l)?\.xml',url)
                or re.fullmatch(re.escape(DATA)+r'[0-9A-Za-z_]+\.xml',url)):
            raise ValueError('source URL not allowed')
        key = hashlib.sha256(url.encode()).hexdigest()
        with self.guard:
            lock = self.locks.setdefault(key,threading.Lock())
        with lock:
            path = self.directory / key
            if path.exists() and time.time()-path.stat().st_mtime < ttl:
                return path.read_bytes()
            raw = self.fetcher(url)
            xml_root(raw)  # Never cache malformed responses or HTML error pages.
            tmp = path.with_suffix('.tmp')
            tmp.write_bytes(raw)
            tmp.replace(path)
            return raw


class JMAService:
    def __init__(self, cache=None):
        self.cache = cache or PublicCache()

    def feed(self, name):
        values = []
        for suffix, ttl in (('_l',3600),('',60)):
            values.append(parse_feed(self.cache.get(FEED+name+suffix+'.xml',ttl)))
        entries = {e['id']:e for f in values for e in f['entries']}
        return sorted(entries.values(),key=lambda e:e['issuedAt'],reverse=True)

    def warnings(self, city):
        entries = self.feed('extra')
        # Current R06 hazard-specific bulletins, plus legacy general warning coverage.
        codes = ('VPWW53','VPWW55','VPWW56','VPWW57','VPWW58','VPWW59','VPWW60','VPWW61')
        chosen = {}
        for e in entries:
            for c in codes:
                if f'_{c}_{city["officeCode"]}.xml' in e['id'] and c not in chosen:
                    chosen[c] = e
        reports, errors = {}, []
        def parse(pair):
            code,e = pair
            return code,parse_warnings(self.cache.get(e['id'],86400*30),city['code'],e['id'])
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            jobs = {pool.submit(parse,pair):pair[0] for pair in chosen.items()}
            for future, code in jobs.items():
                try:
                    c,p = future.result(); reports[c] = p
                except (OSError,ValueError,ET.ParseError,subprocess.SubprocessError): errors.append(code)
        alerts = []
        for code,r in reports.items():
            for a in r['alerts']:
                # R06 replaces only its matching hazard, including an explicit cancellation.
                replacing = {'landslide':'VPWW56','flood':None}.get(a['hazard'])
                if '大雨' in a['name']: replacing = 'VPWW55'
                if '高潮' in a['name']: replacing = 'VPWW57'
                if '暴風' in a['name']: replacing = 'VPWW58'
                if code == 'VPWW53' and replacing in reports and reports[replacing]['matched']:
                    newer = reports[replacing]['meta']['issuedAt'] >= r['meta']['issuedAt']
                    if newer: continue
                alerts.append(a)
        unique = {(a['name'],a['cityCode']):a for a in alerts}
        return {'alerts':sorted(unique.values(),key=lambda a:a['level'] or 0,reverse=True),
                'reports':[r['meta'] for r in reports.values()],
                'state':'partial' if errors or not reports or any(not r['matched'] for r in reports.values()) else 'fetched',
                'coverage':'partial', 'errors':errors,
                'note':'取得範囲の情報です。未掲載・未取得は安全や警報解除を意味しません。河川洪水予報・自治体避難情報は未接続。'}

    def forecast(self, city):
        for e in self.feed('regular'):
            if f'_VPFD51_{city["officeCode"]}.xml' in e['id']:
                forecast = parse_forecast(self.cache.get(e['id'],86400*30),city['forecastCode'],e['id'])
                if forecast:
                    forecast['stale'] = age(forecast['issuedAt']) > 86400
                return forecast
        return None

    def national(self):
        # Bulletins only. Never imply these are active local warning polygons.
        items = []
        counts = {}
        seen = set()
        for e in self.feed('eqvol'):
            if len(items) >= 9: break
            if any(term in e['title'] for term in ('津波','震源・震度','噴火警報','噴火速報','火山の状況')):
                key = (e['title'],e['summary'])
                topic = 'tsunami' if '津波' in e['title'] else 'earthquake' if '震源' in e['title'] else 'volcano'
                if key not in seen and counts.get(topic,0) < 3:
                    items.append({**e,'scope':'national-bulletin','activeState':'unverified'});seen.add(key)
                    counts[topic] = counts.get(topic,0)+1
        return items

    def snapshot(self, code, coast=''):
        from .events import local_events
        city = municipality(code)
        result = {'city':city,'checkedAt':stamp(),'mode':'live','forecast':None,'warnings':None,'national':[],
                  'municipalEvacuation':'not-connected','events':None,'errors':[]}
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            jobs = {k:pool.submit(fn) for k,fn in [('forecast',lambda:self.forecast(city)),
                     ('warnings',lambda:self.warnings(city)),('national',self.national),('events',lambda:local_events(self,city,coast))]}
            for key,job in jobs.items():
                try: result[key] = job.result()
                except (OSError,ValueError,ET.ParseError,subprocess.SubprocessError) as exc:
                    result['errors'].append({'service':key,'reason':type(exc).__name__})
        incomplete = result['errors'] or not result['warnings'] or result['warnings']['state']=='partial' or not result['forecast'] or result['forecast'].get('stale')
        result['dataState'] = 'unavailable' if all(e in {x['service'] for x in result['errors']} for e in ('forecast','warnings','national')) else 'partial' if incomplete else 'fetched'
        return result
