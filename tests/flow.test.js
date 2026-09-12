import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {getBrief} from '../agent/modules/briefs.js';
import {HAZARDS} from '../agent/modules/playbooks.js';
import {searchCities,searchPostcode,candidatesForMunicipality} from '../agent/modules/locations.js';
import {POSTAL_GROUPS} from '../agent/modules/postal-data.js';
import {nextInterrupt,countdown,eventKey} from '../agent/modules/alerts.js';
import {selectShelters,navigationURL} from '../agent/modules/shelters.js';
const now=Date.parse('2026-09-11T10:00:00+09:00');
const alert=(extra={})=>({id:'https://www.data.jma.go.jp/developer/xml/data/example.xml',cityCode:'1311300',status:'通常',infoType:'発表',issuedAt:new Date(now-1000).toISOString(),name:'レベル3土砂災害警報',level:3,hazard:'landslide',scope:'municipality',activeState:'reported',...extra});
const snapshot=e=>({checkedAt:new Date(now).toISOString(),dataState:'partial',city:{code:'1311300'},warnings:{alerts:[]},events:{items:[e],coast:'東京湾内湾'}});
test('postal lookup accepts Japanese formatted digits, never treats an invalid postcode as a location',()=>{
 for(const q of ['150-0001','１５０－０００１','〒150-0001'])assert.equal(searchCities(q)[0].code,'1311300');
 assert.equal(searchPostcode('000-0000').length,0);assert.equal(searchPostcode('1311300').length,0);
});
test('all bundled postal municipality groups resolve to explicit JMA candidates',()=>{
 const missing=POSTAL_GROUPS.filter(([code])=>!candidatesForMunicipality(code).length).map(r=>r[0]);assert.deepEqual(missing,[]);
});
test('every hazard and both languages fit three bounded visible guide points',()=>{
 for(const h of HAZARDS)for(const lang of ['ja','zh']){const b=getBrief(h,lang);assert.equal(b.points.length,3);assert(b.points.every(p=>p.text.length<=63));assert(b.source.startsWith('https://'));}
 const page=fs.readFileSync('agent/pages/guide/index.ink','utf8');assert(!page.includes('bindtap="next"'));assert(page.includes('guide.points'));
});
test('blocked landslide leads with staying away from the slope, with no promise of safety',()=>{
 const b=getBrief('landslide','zh',true);assert.match(b.points[0].text,/远离坡面/);assert.match(b.points[2].text,/不能保证安全/);
});
test('a fresh matching severe alert interrupts once; unrelated, old and cancelled reports do not',()=>{
 const e=alert();assert.equal(nextInterrupt(snapshot(e),new Set(),now)?.id,e.id);
 assert.equal(nextInterrupt(snapshot(e),new Set([eventKey(e)]),now),null);
 for(const x of [{cityCode:'9999999'},{activeState:'cancelled'},{status:'訓練'},{issuedAt:new Date(now-900000).toISOString()},{scope:'national-bulletin'}])assert.equal(nextInterrupt(snapshot(alert(x)),new Set(),now),null);
});
test('observed earthquake information never supplies an earthquake countdown',()=>{
 const e=alert({hazard:'earthquake',activeState:'observed',intensity:'4',arrivalAt:new Date(now+30000).toISOString()});assert(nextInterrupt(snapshot(e),new Set(),now));assert.match(countdown(e,snapshot(e),'zh',now),/未接入秒级/);
});
test('tsunami countdown needs a confirmed coast and authoritative arrival time; it never turns negative',()=>{
 const e=alert({hazard:'tsunami',scope:'confirmed-coast',coast:'東京湾内湾',name:'津波警報',arrivalBasis:'jma-tsunami-first-arrival',arrivalAt:new Date(now+60000).toISOString()});
 assert.match(countdown(e,snapshot(e),'zh',now),/1分0秒/);assert.match(countdown(e,snapshot(e),'zh',now+61000),/可能已到达/);
 assert.doesNotMatch(countdown({...e,scope:'unconfirmed'},snapshot(e),'zh',now),/1分/);
 assert.match(countdown(e,{...snapshot(e),checkedAt:'2000-01-01'},'zh',now),/未确认/);
});
test('shelters must be explicitly suitable for the selected hazard and retain special conditions',()=>{
 const f=(name,props,xy=[139.7005,35.6595])=>({geometry:{type:'Point',coordinates:xy},properties:{name,...props}});
 const places=selectShelters([{features:[f('quake only',{disaster4:1}),f('tsunami building',{disaster5:1,remarks:'3階以上'}),f('far',{disaster5:1},[140.7,35.6])]}],{latitude:35.6595,longitude:139.7005},'tsunami');
 assert.equal(places.length,1);assert.equal(places[0].remarks,'3階以上');assert.equal(places[0].routeSafety,'unverified');assert.match(navigationURL(places[0]),/travelmode=walking/);assert.throws(()=>navigationURL({latitude:0,longitude:0}));
});

test('temple keys select before activation, wrap safely and allow backing out',async()=>{
 const {handleKeys}=await import('../agent/modules/keys.js');let called=0,back=0,prevented=0;
 const page={data:{keyFocus:''},setData(next){Object.assign(this.data,next);}},actions=[{id:'a',run:()=>called++},{id:'b',run:()=>called+=10}];
 const key=code=>handleKeys(page,{code,preventDefault(){prevented++;}},actions,()=>back++);
 key('Enter');assert.equal(called,0);assert.equal(page.data.keyFocus,'a');key('ArrowUp');assert.equal(page.data.keyFocus,'b');key('Enter');assert.equal(called,10);
 key('Backspace');assert.equal(page.data.keyFocus,'');assert.equal(back,1);key('Backspace');assert.equal(back,2);assert.equal(prevented,5);
});
test('JST formatting and freshness accept native epoch captures without Date construction',async()=>{
 const {jstTime,isSnapshotFresh}=await import('../agent/modules/client.js');
 assert.equal(jstTime(Date.parse('2024-02-28T15:05:00Z')),'02-29 00:05 JST');
 assert.equal(jstTime('2025-12-31T15:59:00Z'),'01-01 00:59 JST');assert.equal(jstTime('invalid'),'未確認');
 assert.equal(isSnapshotFresh({checkedAt:now,dataState:'partial'},now),true);
 assert.equal(isSnapshotFresh({checkedAt:now-120000,dataState:'fetched'},now),false);
});
