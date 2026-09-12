import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CITIES,OFFICES,searchCities,candidatesForMunicipality,rememberCity,recalledCity,requestPosition,locateCities,locationError} from '../agent/modules/locations.js';
import {startTextInput} from '../agent/modules/text-input.js';
test('offline regions and address matching do not need a weather backend',()=>{
  assert.equal(CITIES.length,1805);assert.equal(OFFICES.length,58);
  for(const text of ['東京都渋谷区神宮前1丁目','Tokyo Shibuya','东京涩谷区','しぶや','シブヤ'])assert.equal(searchCities(text)[0].code,'1311300',text);
});
test('ambiguous municipalities remain candidates; prefecture narrows the result',()=>{
  assert(searchCities('府中市').length>1);const found=searchCities('広島県府中市');assert.equal(found.length,1);assert.equal(found[0].code,'3420800');
});
test('no-keyboard region list covers every municipality',()=>assert.equal(OFFICES.reduce((n,o)=>n+searchCities('',o.code).length,0),1805));
test('GSI ward code is mapped to JMA candidates without guessing a split district',()=>{
  assert.equal(candidatesForMunicipality('13113')[0].code,'1311300');
  assert.deepEqual(candidatesForMunicipality('14101').map(c=>c.name),['横浜市北部','横浜市南部']);
  assert.deepEqual(candidatesForMunicipality('xxxxx'),[]);
});
test('only an explicitly confirmed municipality code is saved',()=>{
  const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  assert.equal(recalledCity(storage),null);rememberCity('1311300',storage);assert.equal(recalledCity(storage).code,'1311300');assert.deepEqual([...values.values()],['1311300']);
  assert.throws(()=>rememberCity('Tokyo',storage));
});
const position=()=>({coords:{latitude:35.6595,longitude:139.7005,accuracy:20},timestamp:Date.now()});
test('unsupported and denied location return actionable manual-selection messages',async()=>{
  await assert.rejects(requestPosition(null),/location-unsupported/);
  await assert.rejects(requestPosition({getCurrentPosition:(_ok,fail)=>fail({code:1})}),/location-denied/);
  assert.match(locationError(new Error('location-denied'),'zh'),/手动/);
});
test('stale or inaccurate coordinates cannot select a warning region',async()=>{
  await assert.rejects(requestPosition({getCurrentPosition:ok=>ok({...position(),timestamp:Date.now()-180000})}),/location-inaccurate/);
  await assert.rejects(requestPosition({getCurrentPosition:ok=>ok({coords:{...position().coords,accuracy:30000},timestamp:Date.now()})}),/location-inaccurate/);
});
test('outside-Japan position does not silently default to Tokyo',async()=>{
  await assert.rejects(requestPosition({getCurrentPosition:ok=>ok({coords:{latitude:31.23,longitude:121.47,accuracy:20},timestamp:Date.now()})}),/location-outside-japan/);
});
test('GPS success yields candidates, not a persisted or confirmed location',async()=>{
  let called;const result=await locateCities({getCurrentPosition:ok=>ok(position())},async url=>{called=url;return {ok:true,json:async()=>({results:{muniCd:'13113'}})};});
  assert.match(called,/^https:\/\/mreversegeocoder\.gsi\.go\.jp\//);assert.equal(result.cities[0].code,'1311300');assert.equal(result.accuracy,20);
});
test('Studio simulated text is handled as a SpeechRecognition result',()=>{
  let text='',started=false;
  class FakeRecognition{start(){started=true;}abort(){}}
  const r=startTextInput(t=>text=t,()=>{},()=>{},FakeRecognition);
  r.onresult({results:[[{transcript:' 東京都渋谷区 '}]]});assert(started);assert.equal(text,'東京都渋谷区');
});
test('native pages retain controls at Studio target=_current and receive voice wakeup',()=>{
  for(const name of ['home','location']){const s=fs.readFileSync(`agent/pages/${name}/index.ink`,'utf8');assert.match(s,/onVoiceWakeup\(\)/);assert.doesNotMatch(s,/@media\s*\(target:\s*_current\)\s*\{\.controls\{display:none/);}
});
