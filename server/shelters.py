"""GSI designated emergency evacuation places, filtered by disaster suitability."""
import concurrent.futures
import json
import math
import subprocess
import threading
import time

# GSI's layer IDs are skhb01..08; a different disaster never substitutes for a match.
LAYERS={'flood':1,'landslide':2,'storm-surge':3,'earthquake':4,'tsunami':5,'fire':6,'inland-flood':7,'volcano':8}
SOURCE='https://www.gsi.go.jp/bousaichiri/hinanbasho'
_cache={};_lock=threading.Lock()


def point(lat,lon):
    lat,lon=float(lat),float(lon)
    if not math.isfinite(lat) or not math.isfinite(lon) or not (20<=lat<=46.5 and 122<=lon<=154):raise ValueError('outside-japan')
    return lat,lon


def distance(lat,lon,a,b):
    p,q=map(math.radians,(lat,a));dp=q-p;dl=math.radians(b-lon)
    return 6371000*2*math.asin(min(1,math.sqrt(math.sin(dp/2)**2+math.cos(p)*math.cos(q)*math.sin(dl/2)**2)))


def tiles(lat,lon,z=10):
    x=int((lon+180)/360*2**z);y=int((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**z)
    return [(x+dx,y+dy) for dx in (-1,0,1) for dy in (-1,0,1)]


def fetch_json(url):
    with _lock:
        cached=_cache.get(url)
        if cached and time.time()-cached[0]<3600:return cached[1]
    p=subprocess.run(['curl','-sS','--max-time','10','--max-filesize','3000000','-w','\n%{http_code}',url],capture_output=True,timeout=12)
    body,_,status=p.stdout.rpartition(b'\n')
    if p.returncode or status not in (b'200',b'404'):raise OSError('gsi-unavailable')
    data={'type':'FeatureCollection','features':[]} if status==b'404' else json.loads(body)
    with _lock:
        if len(_cache)>300:_cache.clear()
        _cache[url]=(time.time(),data)
    return data


def select_places(collections,lat,lon,hazard,radius=10000):
    layer=LAYERS.get(hazard)
    if not layer:raise ValueError('choose-specific-disaster')
    found={}
    for collection in collections:
        for feature in collection.get('features',[]):
            g=feature.get('geometry') or {};p=feature.get('properties') or {}
            if g.get('type')!='Point' or p.get('disaster'+str(layer)) not in (1,'1'):continue
            try:a,b=point(g['coordinates'][1],g['coordinates'][0])
            except (ValueError,KeyError,IndexError,TypeError):continue
            d=distance(lat,lon,a,b)
            if d>radius or not p.get('name'):continue
            key=f'{a:.6f},{b:.6f}:{p["name"]}'
            found[key]={'id':key,'name':str(p['name']),'address':str(p.get('address') or ''),'remarks':str(p.get('remarks') or ''),
                        'latitude':a,'longitude':b,'distanceMeters':round(d),'hazard':hazard,'designated':True,
                        'openingStatus':'unverified','routeSafety':'unverified','elevationMeters':None,
                        'source':SOURCE,'mapUrl':f'https://www.google.com/maps/dir/?api=1&destination={a},{b}&travelmode=walking'}
    return sorted(found.values(),key=lambda p:p['distanceMeters'])[:8]


def nearby(lat,lon,hazard,fetcher=fetch_json):
    lat,lon=point(lat,lon);layer=LAYERS.get(hazard)
    if not layer:raise ValueError('choose-specific-disaster')
    collections=[];errors=0
    urls=[f'https://cyberjapandata.gsi.go.jp/xyz/skhb{layer:02}/10/{x}/{y}.geojson' for x,y in tiles(lat,lon)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        for future in concurrent.futures.as_completed([pool.submit(fetcher,u) for u in urls]):
            try:collections.append(future.result())
            except (OSError,ValueError,subprocess.SubprocessError):errors+=1
    places=select_places(collections,lat,lon,hazard)
    if hazard=='tsunami' and fetcher is fetch_json:
        def elevation(p):
            try:
                data=fetcher(f'https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon={p["longitude"]}&lat={p["latitude"]}&outtype=JSON')
                value=data.get('elevation')
                if isinstance(value,(int,float)) and math.isfinite(value):p['elevationMeters']=round(value,1)
            except (OSError,ValueError,subprocess.SubprocessError):pass
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(elevation,places[:3]))
    return {'places':places,'hazard':hazard,'radiusMeters':10000,'source':SOURCE,
            'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'state':'unavailable' if errors==len(urls) else 'partial' if errors else 'fetched',
            'notice':'災害種別に対応した指定緊急避難場所。開設・通行可否は未確認 / 按灾种指定的紧急避难场所；开放及道路状况未核实'}
