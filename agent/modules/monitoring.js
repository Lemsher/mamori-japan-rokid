import {parseForecastReports} from './weather.js';
import {SERVICE_URL} from './config.js';
import {cityByCode,recalledCity,recalledCoast} from './locations.js';
import {getJSON,fetchJSON} from './client.js';
import {eventKey,nextInterrupt} from './alerts.js';
export const store=()=>typeof localStorage==='undefined'?null:localStorage;
export function cachedSnapshot(){try{const s=JSON.parse(store()?.getItem('mamori-public-snapshot')||'null');return s?.city?.code===recalledCity(store())?.code&&(s.events?.coast||'')===recalledCoast(store())?s:null;}catch{return null;}}
export function cacheSnapshot(value){try{store()?.setItem('mamori-public-snapshot',JSON.stringify(value));}catch{}}
export async function loadSnapshot(code,coast='',sameOrigin=false){
 const city=cityByCode(code);if(!city)throw new Error('invalid-city');
 const query='/api/snapshot?city='+encodeURIComponent(code)+'&coast='+encodeURIComponent(coast);
 if(sameOrigin)return fetchJSON(query);
 if(SERVICE_URL)return getJSON(query);
 // Only a current official forecast is read directly. The obsolete legacy
 // warning JSON froze in May 2026 and must never be used for current warnings.
 const url='https://www.jma.go.jp/bosai/forecast/data/forecast/'+city.officeCode+'.json';
 const forecast=parseForecastReports(await fetchJSON(url,20000),city,url);
 return {city,forecast,checkedAt:Date.now(),dataState:'partial',warnings:null,events:{items:[],eew:'not-connected'},national:[],errors:[{service:'alert-backend',reason:'not-configured'}]};
}
export function watchRegion(onSnapshot,onAlert=()=>{},onError=()=>{}){
 let active=true,busy=false;let seen=[];
 try{seen=JSON.parse(store()?.getItem('mamori-seen-alerts')||'[]');}catch{}
 const checked=new Set(Array.isArray(seen)?seen:[]);
 const refresh=async()=>{
  if(!active||busy)return;const city=recalledCity(store());if(!city)return;
  busy=true;
  try{
   const snapshot=await loadSnapshot(city.code,recalledCoast(store()));
   if(!active||recalledCity(store())?.code!==city.code)return;
   cacheSnapshot(snapshot);onSnapshot(snapshot);
   const alert=nextInterrupt(snapshot,checked);
   if(alert){checked.add(eventKey(alert));try{store()?.setItem('mamori-seen-alerts',JSON.stringify([...checked].slice(-80)));}catch{}onAlert(alert,snapshot);}
  }catch(e){console.warn("MAMORI source unavailable:",String(e?.message||e));if(active)onError(e);}finally{busy=false;}
 };
 const interval=setInterval(refresh,60000);refresh();
 return {refresh,stop(){active=false;clearInterval(interval);}};
}
