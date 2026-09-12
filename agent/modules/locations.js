import {CITY_ROWS,GSI_MUNICIPALITIES} from './location-data.js';
import {PREFECTURE_POPULATIONS} from './population.js';
import {POSTAL_GROUPS} from './postal-data.js';
import {COASTS} from './coast-data.js';
export {COASTS};

export const CITIES=CITY_ROWS.map(([code,name,enName,kana,officeCode,office,officeEn,forecastCode])=>({code,name,enName,kana,officeCode,office,officeEn,forecastCode}));
export const OFFICES=Array.from(new Map(CITIES.map(c=>[c.officeCode,{code:c.officeCode,name:c.office}])).values()).sort((a,b)=>Number(a.name.endsWith('地方'))-Number(b.name.endsWith('地方'))||(a.name.endsWith('地方')?0:(PREFECTURE_POPULATIONS[b.code.slice(0,2)]||0)-(PREFECTURE_POPULATIONS[a.code.slice(0,2)]||0))||a.code.localeCompare(b.code));
const CHARACTERS={'东':'東','涩':'渋','滨':'浜','县':'県','岛':'島','冈':'岡','户':'戸','广':'広','长':'長','爱':'愛','泽':'沢','桥':'橋','宫':'宮','丰':'豊','关':'関','盐':'塩','叶':'葉','仓':'倉','马':'馬','龙':'竜','门':'門','汤':'湯'};
export function normalizeAddress(value){return String(value||'').normalize('NFKC').toLowerCase().replace(/[\u30a1-\u30f6]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/[东涩滨县岛冈户广长爱泽桥宫丰关盐叶仓马龙门汤]/g,c=>CHARACTERS[c]).replace(/[\s,，、・._〒-]/g,'');}
export function cityByCode(code){return CITIES.find(c=>c.code===String(code))||null;}
export function searchCities(query,officeCode=''){
  const q=normalizeAddress(query);let pool=CITIES.filter(c=>!officeCode||c.officeCode===officeCode);
  if(!q)return pool;
  if(/^\d{7}$/.test(q))return searchPostcode(q).filter(c=>!officeCode||c.officeCode===officeCode);
  const regions=new Set(CITIES.filter(c=>[c.office,c.officeEn].some(s=>s&&q.includes(normalizeAddress(s)))).map(c=>c.officeCode));
  if(regions.size)pool=pool.filter(c=>regions.has(c.officeCode));
  const ranked=pool.map(c=>{
    const names=[c.name,c.kana,c.enName.replace(/ (?:City|Town|Village|Ward)$/i,'')].map(normalizeAddress).filter(Boolean);
    let score=c.code===q?100:0;
    for(const n of names){if(q===n)score=Math.max(score,90);else if(q.includes(n))score=Math.max(score,70+n.length);else if(n.includes(q))score=Math.max(score,40);}
    if(regions.has(c.officeCode)&&[c.office,c.officeEn].some(s=>normalizeAddress(s)===q))score=Math.max(score,20);
    return {c,score};
  });
  return ranked.filter(r=>r.score>0).sort((a,b)=>b.score-a.score||a.c.code.localeCompare(b.c.code)).map(r=>r.c);
}

export function searchPostcode(value){
  const code=normalizeAddress(String(value).replace(/^〒/,''));
  if(!/^\d{7}$/.test(code))return [];
  const matches=POSTAL_GROUPS.filter(([,codes])=>codes.includes(' '+code+' '));
  return Array.from(new Map(matches.flatMap(([municipality])=>candidatesForMunicipality(municipality)).map(c=>[c.code,c])).values());
}
export function rememberCoast(name,storage){if(!COASTS.some(c=>c[0]===name))return;try{storage?.setItem('mamori-confirmed-coast',name);}catch{}}
export function recalledCoast(storage){try{const name=storage?.getItem('mamori-confirmed-coast');return COASTS.some(c=>c[0]===name)?name:'';}catch{return '';}}

// JIS wards and JMA forecast districts are not interchangeable. Keep all split
// district candidates (e.g. Yokohama north/south) for the user's confirmation.
export function candidatesForMunicipality(value){
  const code=String(value||'').padStart(5,'0');if(!/^\d{5}$/.test(code))return [];
  const direct=cityByCode(code+'00');if(direct)return [direct];
  const split=CITIES.filter(c=>c.code.slice(0,5)===code);if(split.length)return split;
  const record=GSI_MUNICIPALITIES[code];if(!record)return [];
  const name=normalizeAddress(record[1]);const city=name.match(/^.*?市/)?.[0];
  return CITIES.filter(c=>c.code.slice(0,2)===code.slice(0,2)&&(name===normalizeAddress(c.name)||(city&&normalizeAddress(c.name).startsWith(city))));
}

const STORAGE_KEY='mamori-confirmed-city';
export function rememberCity(code,storage){const c=cityByCode(code);if(!c)throw new Error('invalid-city');try{if(storage?.getItem(STORAGE_KEY)!==c.code)storage?.removeItem?.('mamori-confirmed-coast');storage?.setItem(STORAGE_KEY,c.code);}catch{}return c;}
export function recalledCity(storage){try{return cityByCode(storage?.getItem(STORAGE_KEY));}catch{return null;}}

export function requestPosition(geo,timeoutMs=10000){
  return new Promise((resolve,reject)=>{
    if(!geo||typeof geo.getCurrentPosition!=='function'){reject(new Error('location-unsupported'));return;}
    let settled=false;
    const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);fn(value);};
    const timer=setTimeout(()=>finish(reject,new Error('location-timeout')),timeoutMs+250);
    try{geo.getCurrentPosition(p=>{
      const c=p?.coords,age=Date.now()-Number(p?.timestamp);
      if(!c||!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||!Number.isFinite(c.accuracy)||c.accuracy<0||c.accuracy>10000||!Number.isFinite(age)||age>120000||age< -60000){finish(reject,new Error('location-inaccurate'));return;}
      if(c.latitude<20||c.latitude>46.5||c.longitude<122||c.longitude>154){finish(reject,new Error('location-outside-japan'));return;}
      finish(resolve,{latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy});
    },e=>finish(reject,new Error(e?.code===1?'location-denied':e?.code===3?'location-timeout':'location-unavailable')),{enableHighAccuracy:false,maximumAge:60000,timeout:timeoutMs});}
    catch{finish(reject,new Error('location-unsupported'));}
  });
}
export async function locateCities(geo,fetcher=fetch){
  const position=await requestPosition(geo);
  // Triggered only by the labelled location action; coordinates are not stored.
  const url='https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat='+position.latitude.toFixed(4)+'&lon='+position.longitude.toFixed(4);
  let timer;
  try{
    const data=await Promise.race([(async()=>{
      const response=await fetcher(url,{headers:{},timeout:8000});
      if(!response.ok)throw new Error('reverse-unavailable');
      return response.json();
    })(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('reverse-unavailable')),8500);})]);
    const cities=candidatesForMunicipality(data?.results?.muniCd);
    if(!cities.length)throw new Error('reverse-unmatched');
    return {cities,accuracy:Math.round(position.accuracy)};
  }finally{clearTimeout(timer);}
}
export function locationError(error,lang='ja'){
  const messages={
    'location-unsupported':['この宿主は位置情報に未対応。下の地域一覧を選択。','当前宿主未提供定位，请从地区列表选择。'],
    'location-unavailable':['位置情報を取得できません。地域一覧を使用してください。','无法取得定位；Studio 可能没有提供定位能力，请使用地区列表。'],
    'location-denied':['位置情報が許可されていません。手動選択を利用できます。','定位权限未获允许，可继续手动选择地点。'],
    'location-timeout':['位置情報がタイムアウトしました。手動選択を利用できます。','定位超时，可继续手动选择地点。'],
    'location-inaccurate':['位置情報が古いか精度不足。市町村を手動で確認。','定位过旧或精度不足，请手动确认市町村。'],
    'location-outside-japan':['日本の位置情報を確認できません。日本の地域を手動選択。','当前定位不在日本覆盖范围，请手动选择日本地区。'],
    'reverse-unmatched':['市町村を特定できません。地域一覧から選択。','无法匹配市町村，请从地区列表选择。']
  };
  return (messages[error?.message]||['住所変換に接続できません。地域一覧はオフラインで使えます。','地址转换服务不可用，离线地区列表仍可使用。'])[lang==='zh'?1:0];
}
