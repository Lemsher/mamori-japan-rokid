import { SERVICE_URL } from './config.js';

export function timestamp(value){return typeof value==='number'?value:Date.parse(value);}
// Ink 0.17's browser build can produce malformed Date.toISOString() output.
// Keep capture times as epoch milliseconds and format JST without constructing Date.
export function jstTime(value) {
  const millis=timestamp(value);if(!Number.isFinite(millis)||millis<0||millis>253402214400000)return '未確認';
  const seconds=Math.floor(millis/1000)+9*3600;
  let days=Math.floor(seconds/86400),year=1970;
  const leap=y=>y%4===0&&(y%100!==0||y%400===0);
  while(days>=365+Number(leap(year)))days-=365+Number(leap(year++));
  const months=[31,leap(year)?29:28,31,30,31,30,31,31,30,31,30,31];let month=0;
  while(days>=months[month])days-=months[month++];
  const pad=n=>String(n).padStart(2,'0'),hour=Math.floor(seconds%86400/3600),minute=Math.floor(seconds%3600/60);
  return pad(month+1)+'-'+pad(days+1)+' '+pad(hour)+':'+pad(minute)+' JST';
}

export async function fetchJSON(url,timeoutMs=45000) {
  let timer;
  try{return await Promise.race([(async()=>{const response=await fetch(url,{headers:{},timeout:timeoutMs});if(!response.ok)throw new Error('source-unavailable');return response.json();})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('source-timeout')),timeoutMs);})]);}
  finally{clearTimeout(timer);}
}
export async function getJSON(path) {
  if (!SERVICE_URL || !/^https:\/\//.test(SERVICE_URL)) throw new Error('service-unconfigured');
  return fetchJSON(SERVICE_URL.replace(/\/$/,'') + path);
}

export function isSnapshotFresh(snapshot, now = Date.now()) {
  const issued = timestamp(snapshot?.checkedAt);
  return Number.isFinite(issued) && now-issued >= -60000 && now-issued < 120000 && snapshot?.dataState !== 'unavailable';
}

export function warningSummary(snapshot, lang = 'ja', now = Date.now()) {
  const zh = lang === 'zh';
  if (!isSnapshotFresh(snapshot,now)) return zh ? '最新预警未确认，请查看官方信息。' : '最新の警報は未確認。公式情報を確認。';
  const w = snapshot.warnings;
  if (!w || w.state === 'partial') return zh ? '部分预警数据未确认，请查看官方信息。' : '警報の一部が未確認。公式情報を確認。';
  return w.alerts.length ? w.alerts.map(a=>a.name).join(' / ') : (zh ? '本次取得范围内未列出预警；不代表安全。' : '取得範囲に警報等の掲載なし。安全を意味しません。');
}
