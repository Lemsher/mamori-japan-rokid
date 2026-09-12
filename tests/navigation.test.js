import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {enterPage,leavePage,backPage} from '../agent/modules/navigation.js';
import {OFFICES,searchCities} from '../agent/modules/locations.js';

const makePage=()=>({data:{lang:'zh'}});
test('native page back pops exactly one page even with a selected action',()=>{
 const home=makePage(),guide=makePage(),calls=[];enterPage(home);enterPage(guide);
 backPage(guide,{navigateBack(o){calls.push(o.delta);},redirectTo(){assert.fail('must preserve native parent');}});
 assert.deepEqual(calls,[1]);leavePage(guide);leavePage(home);
});
test('every standalone native page returns to home without closing the preview',()=>{
 for(const lang of ['ja','zh']){const page={data:{lang}};enterPage(page);let url;
 backPage(page,{navigateBack(){assert.fail('there is no parent');},redirectTo(o){url=o.url;}});
 assert.equal(url,'/pages/home/index?lang='+lang);leavePage(page);}
});
test('unload removes replaced pages and a failed host back has a home fallback',()=>{
 const old=makePage(),page=makePage();enterPage(old);enterPage(page);let target;
 backPage(page,{navigateBack(o){o.fail();},redirectTo(o){target=o.url;}});assert.match(target,/home/);
 leavePage(old);backPage(page,{navigateBack(){assert.fail('stale parent');},redirectTo(o){target=o.url;}});
 leavePage(page);
});
function nativePage(name,dependencies){
 const source=fs.readFileSync(`agent/pages/${name}/index.ink`,'utf8').match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*;\s*$/gm,'').replace('export default','return');
 const page=Function(...Object.keys(dependencies),source)(...Object.values(dependencies));
 page.setData=function(next){Object.assign(this.data,next);};return page;
}
test('municipality back restores the original region page and offset before leaving',()=>{
 let navigated=0;const page=nativePage('location',{OFFICES,searchCities,backPage(){navigated++;},wx:{}});
 page.showOffices();page.next();const before={title:page.data.title,offset:page.data.offset,items:page.data.items.map(i=>i.code)};
 page.selectItem({currentTarget:{attributes:{'data-code':page.data.items[0].code}}});
 assert.equal(page.data.items[0].kind,'city');page.back();
 assert.equal(navigated,0);assert.equal(page.data.title,before.title);assert.equal(page.data.offset,before.offset);assert.deepEqual(page.data.items.map(i=>i.code),before.items);
 page.back();assert.equal(navigated,1);
});
test('new location search discards an obsolete region parent',()=>{
 const page=nativePage('location',{OFFICES,searchCities});page.showOffices();page.selectItem({currentTarget:{attributes:{'data-code':page.data.items[0].code}}});
 assert(page._parent);page.setData({query:'150-0001'});page.search();assert.equal(page._parent,null);assert.equal(page.data.items[0].code,'1311300');
});
test('confirming a location preserves the native caller instead of creating another home',()=>{
 let city,coast,backs=0;const page=nativePage('location',{OFFICES,searchCities,rememberCity(code){city=code;},rememberCoast(name){coast=name;},backPage(){backs++;},wx:{}});
 page.setData({query:'150-0001'});page.search();page.selectItem({currentTarget:{attributes:{'data-code':'1311300'}}});assert.equal(city,'1311300');assert.equal(backs,1);
 page._items=[{kind:'coast',code:'0',name:'東京湾内湾'}];page.selectItem({currentTarget:{attributes:{'data-code':'0'}}});assert.equal(coast,'東京湾内湾');assert.equal(backs,2);
});
test('shelter handoff returns to results first, then the parent page',()=>{
 let backs=0;const page=nativePage('shelters',{backPage(){backs++;},wx:{}});page.setData({destination:{name:'test'},places:[{name:'test'}]});page.back();assert.equal(page.data.destination,null);assert.equal(page.data.places.length,1);assert.equal(backs,0);page.back();assert.equal(backs,1);
});
test('shelter cards page through all results and retain the card after returning from handoff',()=>{
 const page=nativePage('shelters',{}),places=Array.from({length:8},(_,i)=>({id:String(i),name:'Place '+i}));page.setData({places,place:places[0]});
 for(let i=1;i<8;i++){page.nextPlace();assert.equal(page.data.placeIndex,i);assert.deepEqual(page.data.place,places[i]);}
 page.nextPlace();assert.equal(page.data.placeIndex,7);
 page.navigate({currentTarget:{attributes:{'data-id':'7'}}});assert.equal(page.data.destination,places[7]);assert.equal(page.data.keyFocus,'back');
 page.back();assert.equal(page.data.destination,null);assert.equal(page.data.keyFocus,'place-7');assert.deepEqual(page.data.place,places[7]);
 for(let i=0;i<9;i++)page.previousPlace();assert.equal(page.data.placeIndex,0);
});
test('native shelter search initializes the visible card and changing hazards clears it',async()=>{
 const place={id:'test',distanceMeters:1500,elevationMeters:20};
 const page=nativePage('shelters',{requestPosition:async()=>({accuracy:10}),nearbyShelters:async()=>({places:[place]}),locationError:()=>assert.fail('search should succeed')});
 page._active=true;page.setData({hazard:'tsunami'});await page.search();assert.equal(page.data.place.distance,'1.5 km');assert.equal(page.data.busy,false);
 page.type({currentTarget:{attributes:{'data-code':'earthquake'}}});assert.equal(page.data.place,null);assert.equal(page.data.placeIndex,0);
});
