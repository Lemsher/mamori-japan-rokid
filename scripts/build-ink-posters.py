from pathlib import Path
import json,re,base64,hashlib
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/posters/ink'
html=(ROOT/'preview/aiui-runtime.html').read_text()
m=re.search(r'(<script id="aix-preview-config" type="application/json">)(.*?)(</script>)',html)
config=json.loads(m[2])
rows=json.loads(re.search(r'CITY_ROWS = (.*?);', (ROOT/'agent/modules/location-data.js').read_text())[1])
def city(code):
 r=next(r for r in rows if r[0]==code)
 return dict(zip(['code','name','enName','kana','officeCode','office','officeEn','forecastCode'],r))
scenes=[dict(id='ikeda',code='2720400',hazard='earthquake',place='大阪府池田市',label='地震发生',title='日常看天气，震时先护身。',sub='从所在地天气，到地震信息与一屏应对。',context='模拟前提：池田市震度 5弱、震级 M6.2；所有数值均为演练设定。',guide='降低重心，保护头部',note='先保护自己；摇晃停止后，再查看信息与避难地点。',daily='大阪府池田市 · 晴 · 日间最高 28℃',high=28),dict(id='wakayama',code='3020100',hazard='volcano',place='和歌山县',label='虚构火山喷发',title='平时有所准备，灾时知道行动。',sub='以虚构火山情境，展示火山警戒信息与应对指南。',context='地理说明：和歌山及周边无活火山。本图仅为虚构演练，不代表当地风险评估。',guide='保护头部，遵循现场管制',note='查看火山警戒与管制信息；遵循当地政府及现场人员指示。',daily='和歌山县和歌山市 · 晴 · 日间最高 29℃',high=29),dict(id='iwate',code='0320200',hazard='tsunami',place='岩手县沿岸',label='地震 + 海啸警报',title='平日了解沿岸，警报时立即避难。',sub='确认所在沿岸，查看海啸警报与避难行动。',context='模拟前提：宫古市震度 5弱；岩手县沿岸发布津波警報，预计高度 3m。均为演练数据。',guide='不要等待警报或倒计时',note='沿岸感到强烈或持续摇晃：先防护摇晃，随后立即向高处避难。',daily='岩手县宫古市 · 晴 · 日间最高 24℃',high=24)]
for s in scenes:
 c=city(s['code']); coast='岩手県' if s['id']=='iwate' else ''
 common=dict(id='mamori-demo-'+s['id'],cityCode=c['code'],city=c['office']+' '+c['name'],publisher='MAMORI 模拟数据',status='訓練',infoType='発表',scope='municipality',activeState='observed')
 if s['id']=='ikeda':
  e=dict(common,hazard='earthquake',name='地震情報',intensity='5弱',metrics=[dict(label='本地震度',value='5弱'),dict(label='震级',value='M6.2'),dict(label='震源',value='大阪府北部')])
 elif s['id']=='wakayama':
  e=dict(common,hazard='volcano',name='噴火警報',activeState='reported',metrics=[dict(label='情境',value='虚构火山喷发'),dict(label='警戒等级',value='3 / 演练'),dict(label='管制',value='入山規制')])
 else:
  e=dict(common,hazard='tsunami',name='津波警報',scope='confirmed-coast',activeState='reported',coast=coast,timingNote='到达时间未设定 · 立即避难',metrics=[dict(label='适用沿岸',value='岩手県'),dict(label='预计高度',value='3m / 演练')])
 events=[e]
 if s['id']=='iwate':events.append(dict(common,id='iwate-earthquake-demo',hazard='earthquake',name='地震情報',intensity='5弱',metrics=[dict(label='本地震度',value='5弱'),dict(label='震级',value='M7.5'),dict(label='震源',value='三陸沖')]))
 fixture={'city':c,'coast':coast,'high':s['high'],'events':events}
 (OUT/'runtime'/f'{s["id"]}-fixture.json').write_text(json.dumps(fixture,ensure_ascii=False,indent=2))
 adapter="""// Poster-only fixture adapter; production source and all .ink files unchanged.
const fixture=FIXTURE;
const memory={'mamori-confirmed-city':fixture.city.code,'mamori-confirmed-coast':fixture.coast,'mamori-language':'zh'};
const storage={getItem:k=>memory[k]||null,setItem:(k,v)=>{memory[k]=v},removeItem:k=>{delete memory[k]}};
export const store=()=>storage;
function sample(){const now=Date.now();const d=Math.floor((now+32400000)/86400000)*86400000-32400000;return {city:fixture.city,checkedAt:now,dataState:'fetched',warnings:{state:'fetched',alerts:[]},forecast:{issuedAt:now,stale:false,area:'演练数据',days:[{dateTime:now,condition:'晴',high:fixture.high,station:'模拟',rainSlots:[{startsAt:d+Math.floor((now-d)/21600000)*21600000,probability:10}]}]},events:{coast:fixture.coast,items:fixture.events.map(e=>({...e,issuedAt:now})),eew:'not-connected'}};}
export const cachedSnapshot=()=>sample();
export const cacheSnapshot=()=>{};
export const loadSnapshot=async()=>sample();
export function watchRegion(onSnapshot){onSnapshot(sample());return {refresh:()=>onSnapshot(sample()),stop(){}};}
""".replace('FIXTURE',json.dumps(fixture,ensure_ascii=False))
 cfg=json.loads(json.dumps(config))
 hashes={}
 for f in cfg['initialState']['files']:
  path=ROOT/'agent'/f['path']
  if path.exists(): f['base64']=base64.b64encode(path.read_bytes()).decode()
  if f['path'].endswith('.ink'):hashes[f['path']]=hashlib.sha256(base64.b64decode(f['base64'])).hexdigest()
  if f['path']=='modules/monitoring.js':f['base64']=base64.b64encode(adapter.encode()).decode()
  if f['path']=='modules/alerts.js':
   src=base64.b64decode(f['base64']).decode()
   src=src.replace("stateLabel:e.activeState", "stateLabel:e.status==='訓練'?'模拟演练 · 非官方发布':e.activeState")
   f['base64']=base64.b64encode(src.encode()).decode()
 rendered=html[:m.start(2)]+json.dumps(cfg,ensure_ascii=False)+html[m.end(2):]
 rendered=rendered.replace('scaleFactor: 1,','scaleFactor: 3,')
 rendered=rendered.replace('currentView = view;','currentView = view; window.__posterInkView = view;')
 (OUT/'runtime'/f'{s["id"]}.html').write_text(rendered)
 # Freeze the pre-navigation home state in an isolated capture runtime.
 # Native hasAlert/mayInterrupt logic is unchanged; the fixture models normal
 # bulletin fields, and the adapter intentionally does not dispatch onAlert.
 issued=datetime.now(timezone.utc).isoformat()
 warning_cfg=json.loads(json.dumps(cfg))
 warning_adapter=adapter.replace('fixture.events.map(e=>({...e,issuedAt:now}))',
  'fixture.events.map(e=>({...e,status:"通常",demo:true,issuedAt:'+json.dumps(issued)+'}))')
 for f in warning_cfg['initialState']['files']:
  if f['path']=='modules/monitoring.js':f['base64']=base64.b64encode(warning_adapter.encode()).decode()
 warning_html=html[:m.start(2)]+json.dumps(warning_cfg,ensure_ascii=False)+html[m.end(2):]
 warning_html=warning_html.replace('scaleFactor: 1,','scaleFactor: 3,')
 (OUT/'runtime'/f'{s["id"]}-warning.html').write_text(warning_html)

 for f in cfg['initialState']['files']:
  if f['path']=='modules/monitoring.js':
   daily=adapter.replace('fixture.events.map(e=>({...e,issuedAt:now}))','[]')
   f['base64']=base64.b64encode(daily.encode()).decode()
 daily_html=html[:m.start(2)]+json.dumps(cfg,ensure_ascii=False)+html[m.end(2):]
 daily_html=daily_html.replace('scaleFactor: 1,','scaleFactor: 3,')
 (OUT/'runtime'/f'{s["id"]}-daily.html').write_text(daily_html)
 (OUT/'runtime'/f'{s["id"]}-ink-sha256.json').write_text(json.dumps(hashes,indent=2))
(OUT/'scenes.json').write_text(json.dumps(scenes,ensure_ascii=False,indent=2))
print('Built three isolated Ink runtimes; original .ink sources preserved byte-for-byte.')
