from pathlib import Path
import re,json,base64,hashlib
R=Path(__file__).resolve().parents[1];O=R/'output/posters/japanese'
h=(O/'runtime/iwate.html').read_text();m=re.search(r'(<script id="aix-preview-config" type="application/json">)(.*?)(</script>)',h);cfg=json.loads(m[2])
places=[dict(id='training-a',name='【訓練】高台避難場所 A',address='宮古市・訓練用住所',remarks='表示テスト用の架空の場所',latitude=39.65,longitude=141.95,distanceMeters=480,elevationMeters=35,hazard='tsunami',designated=True,openingStatus='unverified',routeSafety='unverified'),dict(id='training-b',name='【訓練】高台避難場所 B',address='宮古市・訓練用住所',remarks='表示テスト用の架空の場所',latitude=39.66,longitude=141.95,distanceMeters=920,elevationMeters=42,hazard='tsunami',designated=True,openingStatus='unverified',routeSafety='unverified')]
for f in cfg['initialState']['files']:
 src=base64.b64decode(f['base64']).decode()
 if f['path']=='modules/locations.js':
  src=src.replace('export function requestPosition(geo,timeoutMs=10000){','export function requestPosition(geo,timeoutMs=10000){return Promise.resolve({latitude:39.64,longitude:141.96,accuracy:10,timestamp:Date.now()});}\nfunction unusedRealRequestPosition(geo,timeoutMs=10000){')
 if f['path']=='modules/shelters.js':
  src=src.replace('export async function nearbyShelters(position,hazard,sameOrigin=false){','export async function nearbyShelters(position,hazard,sameOrigin=false){return {places:'+json.dumps(places,ensure_ascii=False)+',state:"demo",checkedAt:Date.now(),source:"MAMORI training fixture"};}\nasync function unusedLiveNearbyShelters(position,hazard,sameOrigin=false){')
 f['base64']=base64.b64encode(src.encode()).decode()
(O/'runtime/shelters.html').write_text(h[:m.start(2)]+json.dumps(cfg,ensure_ascii=False)+h[m.end(2):])
(O/'runtime/shelters-fixture.json').write_text(json.dumps({'demo':True,'purpose':'native Ink shelter selection and navigation handoff capture only; no real GPS, public route or destination asserted','places':places},ensure_ascii=False,indent=2))
print('Shelters runtime created; original .ink unchanged; location and shelter data are isolated training fixtures.')
