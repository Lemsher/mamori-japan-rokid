<script def>
{"navigationBarTitleText":"まもり"}
</script>
<script setup>
import wx from 'wx';
import {enterPage,leavePage,backPage} from '../../modules/navigation.js';
import {handleKeys,methodActions} from '../../modules/keys.js';
import {cityByCode,rememberCity,recalledCity,recalledCoast} from '../../modules/locations.js';
import {startTextInput} from '../../modules/text-input.js';
import {classifyIntent} from '../../modules/playbooks.js';
import {homeWeather} from '../../modules/weather.js';
import {cachedSnapshot,watchRegion,store} from '../../modules/monitoring.js';
import {eventKey} from '../../modules/alerts.js';
export default {
 onKeyUp(e){handleKeys(this,e,methodActions(this,['language','gps','listen','location','postal','alerts','refresh','earthquake','tsunami','landslide','flood','typhoon','volcano','prepare']),()=>this.back());},
 data:{keyFocus:'',lang:'ja',city:'場所を設定 / 设置所在地',cityCode:'',weather:homeWeather(null),message:'',coast:''},
 t(ja,zh){return this.data.lang==='zh'?zh:ja;},
 onLoad(q={}){enterPage(this);
  const s=store(),city=cityByCode(q.cityCode)||recalledCity(s);if(city)rememberCity(city.code,s);
  this.setData({lang:q.lang==='zh'?'zh':q.lang==='ja'?'ja':s?.getItem('mamori-language')==='zh'?'zh':'ja',cityCode:city?.code||'',city:city?city.office+' '+city.name:'場所を設定 / 设置所在地',coast:recalledCoast(s)});
 },
 onShow(){this._active=true;const c=recalledCity(store());if(c)this.setData({cityCode:c.code,city:c.office+' '+c.name,coast:recalledCoast(store())});this.paint(cachedSnapshot());this._watch=watchRegion(s=>this.paint(s),a=>this.openAlert(a),()=>this.setData({weather:homeWeather(null,this.data.lang),message:this.t('通信失敗・最新情報は未確認','连接失败，最新数据未确认')}));},
 paint(s){
  const matches=s&&s.city?.code===this.data.cityCode;
  this.setData({weather:homeWeather(matches?s:null,this.data.lang),message:''});
 },
 back(){this.setData({message:this.t('ホーム画面です','当前已是首页')});},
 location(){wx.navigateTo({url:'/pages/location/index?lang='+this.data.lang});},
 gps(){wx.navigateTo({url:'/pages/location/index?lang='+this.data.lang+'&action=locate'});},
 postal(){wx.navigateTo({url:'/pages/location/index?lang='+this.data.lang+'&action=postal'});},
 listen(){if(this._recognition)this._recognition.abort();this.setData({message:this.t('住所・郵便番号・状況を話す / Studio右側に入力','请说出地址、邮编或情况；也可在 Studio 右侧输入')});this._recognition=startTextInput(text=>this.ask(text),()=>this.setData({message:this.t('音声入力を開始できません。地域一覧を使用。','语音输入不可用，请使用地区列表。')}),()=>{this._recognition=null;});},
 onVoiceWakeup(){this.listen();},
 async ask(text){
  const intent=classifyIntent(text);if(intent.intent!=='unknown'&&intent.intent!=='weather'){this.guide(intent.intent,intent.blocked);return;}
  if(intent.intent==='weather'){this.refresh();return;}
  wx.navigateTo({url:'/pages/location/index?lang='+this.data.lang+'&query='+encodeURIComponent(text)});
 },
 refresh(){this.setData({message:this.t('更新中','正在更新')});this._watch?.refresh();},
 language(){const lang=this.data.lang==='ja'?'zh':'ja';this.setData({lang});try{store()?.setItem('mamori-language',lang);}catch{}this.paint(cachedSnapshot());},
 openAlert(a){wx.navigateTo({url:'/pages/alert/index?lang='+this.data.lang+(a?'&key='+encodeURIComponent(eventKey(a)):'')});},
 alerts(){this.openAlert();},
 guide(hazard,blocked=false){wx.navigateTo({url:'/pages/guide/index?hazard='+hazard+'&lang='+this.data.lang+'&blocked='+blocked});},
 earthquake(){this.guide('earthquake');},tsunami(){this.guide('tsunami');},landslide(){this.guide('landslide');},flood(){this.guide('flood');},typhoon(){this.guide('typhoon');},volcano(){this.guide('volcano');},prepare(){this.guide('prepare');},
 onHide(){this._active=false;this._watch?.stop();if(this._recognition)this._recognition.abort();},onUnload(){leavePage(this);this.onHide();}
};
</script>
<page>
<view class="panel">
 <view class="row top"><text class="brand">まもり</text><text class="minor">MAMORI · v0.2.2</text><button class=" {{keyFocus === 'language' ? 'selected' : ''}}" bindtap="language" id="nav-language" >{{keyFocus === 'language' ? '▶ ' : ''}}{{lang === 'zh' ? '中文' : '日本語'}}</button></view>
 <view class="split">
  <view class="column home-left">
   <view class="card location-card"><text class="name">◎ {{cityCode ? city : (lang === 'zh' ? '先确认你的位置' : '場所を確認する')}}</text><view class="row tools"><button class=" {{keyFocus === 'gps' ? 'selected' : ''}}" bindtap="gps" id="nav-gps" >{{keyFocus === 'gps' ? '▶ ' : ''}}◎ {{lang === 'zh' ? 'GPS' : 'GPS'}}</button><button class=" {{keyFocus === 'listen' ? 'selected' : ''}}" bindtap="listen" id="nav-listen" >{{keyFocus === 'listen' ? '▶ ' : ''}}♪ {{lang === 'zh' ? '语音' : '音声'}}</button></view><view class="row tools"><button class=" {{keyFocus === 'location' ? 'selected' : ''}}" bindtap="location" id="nav-location" >{{keyFocus === 'location' ? '▶ ' : ''}}☷ {{lang === 'zh' ? '地区' : '地域'}}</button><button class=" {{keyFocus === 'postal' ? 'selected' : ''}}" bindtap="postal" id="nav-postal" >{{keyFocus === 'postal' ? '▶ ' : ''}}〒 {{lang === 'zh' ? '邮编' : '郵便'}}</button></view></view>
   <scroll-view class="card weather-card" scroll-y="true" scroll-into-view="{{'nav-' + keyFocus}}">
    <text class="card-title">{{weather.hasAlert ? '! ' : ''}}{{lang === 'zh' ? '天气与灾害' : '天気と災害'}} {{weather.date}}</text>
    <view ink:if="{{weather.hasAlert}}"><text class="weather-alert">{{weather.alertText}}</text></view>
    <view ink:if="{{!weather.hasAlert}}"><view class="row weather-numbers"><text class="weather-symbol">{{weather.icon}}</text><view class="stat"><view class="measure"><text class="temperature">{{weather.high}}</text><text class="unit">℃</text></view><text class="stat-label">{{lang === 'zh' ? '日间最高' : '日中の最高'}}</text></view><view class="stat"><view class="measure"><text class="rain">{{weather.rain}}</text><text class="unit">%</text></view><text class="stat-label">{{weather.rainLabel}}</text></view></view><text class="weather-source">JMA · {{weather.source}}</text></view>
    <view class="row tools"><button class="{{keyFocus === 'alerts' ? 'selected' : ''}}" bindtap="alerts" id="nav-alerts">{{keyFocus === 'alerts' ? '▶ ' : ''}}! {{lang === 'zh' ? '预警详情' : '詳細'}}</button><button class="{{keyFocus === 'refresh' ? 'selected' : ''}}" bindtap="refresh" id="nav-refresh">{{keyFocus === 'refresh' ? '▶ ' : ''}}↻ {{lang === 'zh' ? '更新' : '更新'}}</button></view>
   </scroll-view>
  </view>
  <view class="card home-right"><text class="card-title">＋ {{lang === 'zh' ? '立即查看应对' : '今すぐ行動を確認'}}</text><view class="hazards"><button class="hazard  {{keyFocus === 'earthquake' ? 'selected' : ''}}" bindtap="earthquake" id="nav-earthquake"><view class="row"><text class="icon">⌁</text><text class="label">{{keyFocus === 'earthquake' ? '▶ ' : ''}}{{lang === 'zh' ? '地震' : '地震'}}</text></view></button><button class="hazard  {{keyFocus === 'tsunami' ? 'selected' : ''}}" bindtap="tsunami" id="nav-tsunami"><view class="row"><text class="icon">≋</text><text class="label">{{keyFocus === 'tsunami' ? '▶ ' : ''}}{{lang === 'zh' ? '海啸' : '津波'}}</text></view></button><button class="hazard  {{keyFocus === 'landslide' ? 'selected' : ''}}" bindtap="landslide" id="nav-landslide"><view class="row"><text class="icon">△</text><text class="label">{{keyFocus === 'landslide' ? '▶ ' : ''}}{{lang === 'zh' ? '滑坡' : '土砂'}}</text></view></button><button class="hazard  {{keyFocus === 'flood' ? 'selected' : ''}}" bindtap="flood" id="nav-flood"><view class="row"><text class="icon">≋</text><text class="label">{{keyFocus === 'flood' ? '▶ ' : ''}}{{lang === 'zh' ? '暴雨洪水' : '大雨洪水'}}</text></view></button><button class="hazard  {{keyFocus === 'typhoon' ? 'selected' : ''}}" bindtap="typhoon" id="nav-typhoon"><view class="row"><text class="icon">◎</text><text class="label">{{keyFocus === 'typhoon' ? '▶ ' : ''}}{{lang === 'zh' ? '台风' : '台風'}}</text></view></button><button class="hazard  {{keyFocus === 'volcano' ? 'selected' : ''}}" bindtap="volcano" id="nav-volcano"><view class="row"><text class="icon">△</text><text class="label">{{keyFocus === 'volcano' ? '▶ ' : ''}}{{lang === 'zh' ? '火山' : '火山'}}</text></view></button><button class="hazard wide {{keyFocus === 'prepare' ? 'selected' : ''}}" bindtap="prepare" id="nav-prepare"><view class="row"><text class="icon">＋</text><text class="label">{{keyFocus === 'prepare' ? '▶ ' : ''}}{{lang === 'zh' ? '日常准备' : '日ごろの備え'}}</text></view></button></view></view>
 </view>
 <text class="footer">{{message || (cityCode ? weather.status : (lang === 'zh' ? '先确认所在地 · ↑↓选择 / Enter确认 / ←返回' : '場所を確認 · ↑↓選択 / Enter決定 / ←戻る'))}}</text>
</view>
</page>
<style>

.panel{width:480px;height:352px;padding:10px;box-sizing:border-box;background:#000;color:var(--color-text-primary,#40ff5e);display:flex;flex-direction:column;gap:8px;font-family:sans-serif;}
.row{display:flex;flex-direction:row;align-items:center;gap:6px;}.top{height:30px;flex-shrink:0;justify-content:space-between;}.brand{font-family:monospace;font-size:22px;font-weight:700;}.heading{font-family:monospace;font-size:17px;font-weight:700;}.minor,.note{display:block;font-size:11px;line-height:1.35;color:var(--color-text-secondary,rgba(64,255,94,.6));}.label{display:block;font-size:12px;font-weight:600;}.body{display:block;font-size:15px;line-height:1.35;}.name{display:block;font-size:16px;font-weight:700;line-height:1.3;}.split{display:flex;flex-direction:row;gap:8px;flex:1;min-height:0;}.column{display:flex;flex-direction:column;gap:8px;min-height:0;}.card{border:1px solid rgba(64,255,94,.6);border-radius:12px;padding:10px;box-sizing:border-box;background:#000;}.card-title{display:block;font-size:12px;font-weight:600;margin-bottom:6px;}.icon{font-size:20px;font-weight:700;}.grow{flex:1;min-width:0;}.footer{display:block;font-size:10px;line-height:1.3;color:var(--color-text-secondary,rgba(64,255,94,.6));flex-shrink:0;}
button{font-size:12px;line-height:1.3;padding:5px 7px;min-height:28px;border:1px solid rgba(64,255,94,.6);border-radius:8px;background:#000;color:var(--color-primary,#40ff5e);box-sizing:border-box;}button.selected{background:rgba(64,255,94,.4);border:2px solid var(--color-primary,#40ff5e);font-weight:700;}button:disabled{opacity:.4;}.back{min-width:64px;}.actions{display:flex;flex-direction:row;gap:6px;flex-shrink:0;}.scroll{flex:1;min-height:0;}.empty{display:block;font-size:17px;line-height:1.5;margin:18px 0;}
.home-left{width:208px;}.home-right{width:244px;padding:10px;}.location-card{padding:9px;}.tools{margin-top:6px;}.tools button{flex:1;}.weather-card{flex:1;min-height:0;padding:9px;}.hazards{display:flex;flex-direction:row;flex-wrap:wrap;gap:6px;}.hazard{width:106px;height:49px;text-align:left;padding:5px 7px;}.hazard.wide{width:218px;}.hazard .icon{font-size:23px;}.hazard .row{gap:7px;justify-content:center;height:35px;}

.weather-numbers{gap:5px;align-items:center;}.weather-symbol{width:44px;font-size:20px;line-height:28px;}.stat{flex:1;display:flex;flex-direction:column;gap:2px;}.measure{display:flex;flex-direction:row;align-items:center;height:32px;gap:1px;}.temperature{display:block;font-size:29px;font-family:monospace;font-weight:700;line-height:32px;}.rain{display:block;font-size:24px;font-family:monospace;font-weight:700;line-height:32px;}.unit{font-size:12px;}.stat-label{display:block;font-size:9px;height:12px;line-height:12px;color:rgba(64,255,94,.6);}.weather-source{display:block;font-size:9px;line-height:1.2;color:rgba(64,255,94,.6);margin-top:4px;}.weather-alert{display:block;font-size:16px;font-weight:700;line-height:1.35;}.weather-card .tools{margin-top:4px;}.weather-card button{height:28px;min-height:28px;padding:3px 5px;}.location-card .name{font-size:15px;line-height:20px;}
</style>
