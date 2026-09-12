import {FORECAST_STATIONS} from './forecast-stations.js';
import {timestamp,isSnapshotFresh,jstTime,warningSummary} from './client.js';
import {snapshotAlerts,mayInterrupt} from './alerts.js';
const DAY=86400000;
export const jstDay=value=>Math.floor((timestamp(value)+9*3600000)/DAY);
const number=(value,min,max)=>{if(value==null||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=min&&n<=max?n:null;};

// Daily weather and PoP are matched to the selected forecast area. Temperature
// belongs to the officially mapped representative station and is labelled so.
export function parseForecastReports(reports,city,url,now=Date.now()){
 const report=(Array.isArray(reports)?reports:[]).find(r=>(r.timeSeries||[]).some(s=>(s.areas||[]).some(a=>a.area?.code===city.forecastCode&&a.weathers)));
 if(!report)return null;
 const series=report.timeSeries,weatherSeries=series.find(s=>s.areas.some(a=>a.area?.code===city.forecastCode&&a.weathers)),area=weatherSeries.areas.find(a=>a.area?.code===city.forecastCode);
 const days=area.weathers.map((condition,i)=>({condition,weatherCode:area.weatherCodes?.[i]||'',dateTime:weatherSeries.timeDefines[i]||''}));
 const mapping=(FORECAST_STATIONS[city.officeCode]||[]).find(a=>a.class10===city.forecastCode),stationCodes=mapping?.amedas||[];
 const temps=series.find(s=>s.areas.some(a=>a.temps)),station=stationCodes.map(code=>temps?.areas.find(a=>a.area?.code===code)).find(Boolean);
 for(const day of days){
  day.high=null;day.station=station?.area?.name||'';
  // The 09:00 slot is daytime maximum. Never interpret the duplicate 00:00
  // slot in 11:00 reports as a minimum, or show tomorrow's value as today's.
  const highIndex=temps?.timeDefines.findIndex(t=>jstDay(t)===jstDay(day.dateTime)&&Math.floor((timestamp(t)+9*3600000)/3600000)%24===9)??-1;
  if(station&&highIndex>=0)day.high=number(station.temps[highIndex],-60,65);
  const pops=series.find(s=>s.areas.some(a=>a.area?.code===city.forecastCode&&a.pops)),popArea=pops?.areas.find(a=>a.area?.code===city.forecastCode);
  day.rainSlots=(pops?.timeDefines||[]).flatMap((t,i)=>{const value=number(popArea?.pops?.[i],0,100);return jstDay(t)===jstDay(day.dateTime)&&value!==null?[{startsAt:t,probability:value}]:[];});
 }
 return {source:url,issuedAt:report.reportDatetime,area:area.area.name,areaCode:city.forecastCode,stale:!Number.isFinite(timestamp(report.reportDatetime))||now-timestamp(report.reportDatetime)>DAY||timestamp(report.reportDatetime)>now+60000,days};
}
export function weatherIcon(condition=''){
 const icons=[[/晴/,'☀'],[/くもり|曇/,'☁'],[/雨/,'☂'],[/雪/,'❄'],[/雷/,'ϟ']].map(([re,icon])=>({index:condition.search(re),icon})).filter(a=>a.index>=0).sort((a,b)=>a.index-b.index);
 return icons.slice(0,2).map(a=>a.icon).join(' ')||'◇';
}
export function homeWeather(snapshot,lang='ja',now=Date.now()){
 const zh=lang==='zh',fresh=isSnapshotFresh(snapshot,now);
 const hasAlert=fresh&&((snapshot?.warnings?.alerts?.length||0)>0||snapshotAlerts(snapshot).some(a=>mayInterrupt(a,snapshot,now)));
 const day=fresh&&!snapshot?.forecast?.stale?snapshot?.forecast?.days?.find(d=>jstDay(d.dateTime)===jstDay(now)):null;
 const rain=day?.rainSlots?.find(s=>timestamp(s.startsAt)<=now&&now<timestamp(s.startsAt)+6*3600000)||day?.rainSlots?.find(s=>timestamp(s.startsAt)>=now);
 const hour=rain?Math.floor((timestamp(rain.startsAt)+9*3600000)/3600000)%24:null;
 return {hasAlert,alertText:hasAlert?(snapshot.warnings?.alerts?.length?warningSummary(snapshot,lang,now):snapshotAlerts(snapshot).filter(a=>mayInterrupt(a,snapshot,now)).map(a=>a.name).join(' / ')):'',
  icon:day?weatherIcon(day.condition):'◇',high:day&&Number.isFinite(day.high)?String(day.high):'—',rain:rain?String(rain.probability):'—',
  rainLabel:rain?(zh?'降水 ':'降水 ')+hour+'–'+(hour+6)+(zh?'时':'時'):(zh?'降水概率':'降水確率'),
  date:day?jstTime(day.dateTime).slice(0,5).replace('-','/'):'',
  source:day?(day.station||snapshot.forecast.area)+' · '+jstTime(snapshot.forecast.issuedAt).slice(6,11)+(zh?'发布':'発表'):(zh?'当日天气未取得':'今日の天気は未取得'),
  status:!fresh?(zh?'最新预警未确认':'最新警報は未確認'):hasAlert?(zh?'已取得预警记录 · 请查看详情':'警報等の記録あり・詳細を確認'):snapshot.warnings?.state==='fetched'?(zh?'本次未列出预警 · 不代表安全':'取得範囲に警報掲載なし・安全の保証なし'):(zh?'预警数据未确认':'警報データは未確認')};
}
