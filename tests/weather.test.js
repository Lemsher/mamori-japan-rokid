import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {parseForecastReports,homeWeather} from '../agent/modules/weather.js';import {cityByCode,OFFICES} from '../agent/modules/locations.js';import {PREFECTURE_POPULATIONS} from '../agent/modules/population.js';
const reports=()=>JSON.parse(fs.readFileSync('tests/fixtures/jma-tokyo-forecast-20260911.json','utf8'));
const now=Date.parse('2026-09-11T14:00:00+09:00');
const parse=(raw=reports(),code='1311300')=>parseForecastReports(raw,cityByCode(code),'official-fixture',now);
const snapshot=forecast=>({forecast,checkedAt:now,dataState:'fetched',warnings:{state:'fetched',alerts:[]},events:{items:[]},city:{code:'1311300'}});
test('prefecture population ranking leads with Tokyo, Kanagawa, Osaka and Aichi; all local regions are last',()=>{
 assert.deepEqual(OFFICES.slice(0,4).map(o=>o.name),['東京都','神奈川県','大阪府','愛知県']);
 const split=OFFICES.findIndex(o=>o.name.endsWith('地方'));assert.equal(split,45);assert(OFFICES.slice(split).every(o=>o.name.endsWith('地方')));
 for(let i=1;i<split;i++)assert(PREFECTURE_POPULATIONS[OFFICES[i-1].code.slice(0,2)]>=PREFECTURE_POPULATIONS[OFFICES[i].code.slice(0,2)]);
 assert.equal(new Set(OFFICES.map(o=>o.code)).size,58);
});
test('today weather uses exact JMA area, mapped station, maximum slot and current six-hour rain window',()=>{
 const view=homeWeather(snapshot(parse()),'zh',now);assert.equal(view.high,'21');assert.equal(view.rain,'60');assert.equal(view.rainLabel,'降水 12–18时');assert.equal(view.icon,'☂ ☁');assert.match(view.source,/東京/);assert.equal(view.hasAlert,false);
 const late=now+5*3600000;assert.equal(homeWeather({...snapshot(parse()),checkedAt:late},'zh',late).rain,'50');
});
test('island forecasts never take the first mainland temperature station',()=>{
 const city={forecastCode:'130020',officeCode:'130000'};const forecast=parseForecastReports(reports(),city,'fixture',now);assert.equal(forecast.days[0].station,'大島');assert.equal(forecast.days[0].high,23);
});
test('missing temperatures and rain are missing, while valid zero is retained',()=>{
 let raw=reports();raw[0].timeSeries[2].areas[0].temps[0]='';raw[0].timeSeries[1].areas[0].pops=['','','','','',''];
 let view=homeWeather(snapshot(parse(raw)),'zh',now);assert.equal(view.high,'—');assert.equal(view.rain,'—');
 raw=reports();raw[0].timeSeries[2].areas[0].temps[0]='0';raw[0].timeSeries[1].areas[0].pops[0]='0';view=homeWeather(snapshot(parse(raw)),'zh',now);assert.equal(view.high,'0');assert.equal(view.rain,'0');
});
test('tomorrow-only, expired and failed snapshots do not display numbers as today weather',()=>{
 let f=parse();f.days=f.days.slice(1);assert.equal(homeWeather(snapshot(f),'zh',now).high,'—');
 f=parse();f.stale=true;assert.equal(homeWeather(snapshot(f),'zh',now).high,'—');
 assert.equal(homeWeather({...snapshot(parse()),checkedAt:now-120000},'zh',now).high,'—');assert.equal(homeWeather(null,'zh',now).rain,'—');
});
test('known warnings replace the weather summary; unknown coverage never means no warnings',()=>{
 const s=snapshot(parse());s.warnings.alerts=[{name:'大雨警報',hazard:'flood'}];let view=homeWeather(s,'zh',now);assert.equal(view.hasAlert,true);assert.equal(view.alertText,'大雨警報');assert.match(view.status,/已取得预警/);
 s.warnings=null;view=homeWeather(s,'zh',now);assert.equal(view.hasAlert,false);assert.equal(view.high,'21');assert.match(view.status,/未确认/);
});
test('a fresh severe local event has priority even when weather warning list is empty',()=>{
 const s=snapshot(parse());s.events.items=[{id:'test',name:'震度4（本地测试）',cityCode:'1311300',hazard:'earthquake',scope:'municipality',activeState:'observed',intensity:'4',status:'通常',infoType:'発表',issuedAt:new Date(now-1000).toISOString()}];assert.equal(homeWeather(s,'zh',now).hasAlert,true);
 s.events.items[0].activeState='cancelled';assert.equal(homeWeather(s,'zh',now).hasAlert,false);
});
test('homepage response cards have only icon and title and retain seven full-page destinations',()=>{
 const source=fs.readFileSync('agent/pages/home/index.ink','utf8');const cards=source.slice(source.indexOf('<view class="hazards">'),source.indexOf('</page>'));
 assert.equal((cards.match(/bindtap="(?:earthquake|tsunami|landslide|flood|typhoon|volcano|prepare)"/g)||[]).length,7);assert(!cards.includes('class="minor"'));
 assert.match(source,/\/pages\/guide\/index\?hazard=/);
});
