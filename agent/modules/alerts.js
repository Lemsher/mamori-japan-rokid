import {isSnapshotFresh,jstTime} from './client.js';
export function eventKey(e){return [e.id,e.kindCode||'',e.cityCode||'',e.coast||''].join('|');}
export function snapshotAlerts(snapshot){
 if(!snapshot)return [];
 return [...(snapshot.warnings?.alerts||[]).map(a=>({...a,scope:'municipality',activeState:'reported',metrics:[{label:'気象警報 / 气象预警',value:a.name}],timingNote:'発生時刻の予測はありません / 无灾害发生倒计时'})),...(snapshot.events?.items||[])];
}
export function mayInterrupt(e,snapshot,now=Date.now()){
 if(!isSnapshotFresh(snapshot,now)||!['municipality','confirmed-coast'].includes(e.scope)||!['reported','observed'].includes(e.activeState))return false;
 if(e.cityCode!==snapshot.city?.code||e.status!=='通常'||!['発表','訂正'].includes(e.infoType))return false;
 const age=now-Date.parse(e.issuedAt);if(!Number.isFinite(age)||age< -60000||age>600000)return false;
 if(e.hazard==='earthquake')return e.activeState==='observed'&&Number.parseInt(e.intensity,10)>=3;
 if(e.hazard==='tsunami')return e.scope==='confirmed-coast'&&e.coast===snapshot.events?.coast&&/警報|注意報/.test(e.name);
 if(e.hazard==='volcano')return /警報|噴火速報/.test(e.name);
 return (e.level||0)>=3||(/警報/.test(e.name)&&!e.name.includes('注意報'));
}
export function nextInterrupt(snapshot,seen=new Set(),now=Date.now()){
 const priority={tsunami:6,earthquake:5,volcano:4,landslide:3,flood:2,typhoon:1};
 return snapshotAlerts(snapshot).filter(e=>mayInterrupt(e,snapshot,now)&&!seen.has(eventKey(e))).sort((a,b)=>(priority[b.hazard]||0)-(priority[a.hazard]||0)||(b.level||0)-(a.level||0))[0]||null;
}
export function countdown(e,snapshot,lang='ja',now=Date.now()){
 const zh=lang==='zh';
 if(e?.hazard==='earthquake')return zh?'未接入秒级地震预警':'秒単位の緊急地震速報は未接続';
 if(e?.hazard!=='tsunami')return zh?'无可靠发生时间，不显示倒计时':'発生時刻の予測なし';
 if(!isSnapshotFresh(snapshot,now)||e.activeState!=='reported'||e.scope!=='confirmed-coast')return zh?'到达时间未确认，请立即避险':'到達時刻未確認。直ちに避難';
 const at=Date.parse(e.arrivalAt);
 if(e.arrivalBasis!=='jma-tsunami-first-arrival'||!Number.isFinite(at))return e.timingNote||(zh?'可能已到达，请立即避险':'到達の可能性。直ちに避難');
 const left=Math.ceil((at-now)/1000);
 if(left<=0)return zh?'可能已到达，保持避难':'既に到達の可能性。避難を継続';
 return (zh?'最早预计约 ':'最も早い到達予想まで約 ')+Math.floor(left/60)+'分'+left%60+'秒'+(zh?' · 不要等待':'・待たず避難');
}
export function alertView(e,snapshot,lang='ja'){
 return {...e,key:eventKey(e),time:jstTime(e.issuedAt),timing:countdown(e,snapshot,lang),
  stateLabel:e.activeState==='cancelled'?(lang==='zh'?'该电文报告解除':'この電文は解除報告'):isSnapshotFresh(snapshot)?(lang==='zh'?'官方发布记录':'公式発表記録'):(lang==='zh'?'历史记录 · 最新状态未确认':'過去の記録・最新状態未確認')};
}
