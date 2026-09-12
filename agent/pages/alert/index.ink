<script def>
{"navigationBarTitleText":"まもり / 警報・地震情報"}
</script>
<script setup>
import wx from 'wx';
import {enterPage,leavePage,backPage} from '../../modules/navigation.js';
import {handleKeys,methodActions} from '../../modules/keys.js';
import {snapshotAlerts,alertView,countdown,eventKey} from '../../modules/alerts.js';
import {cachedSnapshot,watchRegion} from '../../modules/monitoring.js';
export default {
 onKeyUp(e){handleKeys(this,e,methodActions(this,['back',...(this.data.alert?['guide','shelters']:[]),...(this.data.count>1?['next']:[]),'coast']),()=>this.back());},
 data:{keyFocus:'',lang:'ja',alert:null,count:0,index:0,message:'',coast:''},
 onLoad(q={}){enterPage(this);this._key=q.key||'';this.setData({lang:q.lang==='zh'?'zh':'ja'});this.paint(cachedSnapshot());},
 onShow(){this._watch=watchRegion(s=>this.paint(s),a=>{this._key=eventKey(a);this.paint(cachedSnapshot());});this._timer=setInterval(()=>{if(this.data.alert)this.setData({alert:{...this.data.alert,timing:countdown(this.data.alert,this._snapshot,this.data.lang)}});},1000);},
 paint(s){this._snapshot=s;this._items=snapshotAlerts(s);let index=Math.max(0,this._items.findIndex(a=>eventKey(a)===this._key));const a=this._items[index];this.setData({alert:a?alertView(a,s,this.data.lang):null,count:this._items.length,index,coast:s?.events?.coast||'',message:a?'':this.data.lang==='zh'?'本次未取得匹配记录；不表示安全或解除。':'該当記録を取得できていません。安全・解除を意味しません。'});},
 next(){if(!this._items?.length)return;this._key=eventKey(this._items[(this.data.index+1)%this._items.length]);this.paint(this._snapshot);},
 guide(){if(this.data.alert)wx.navigateTo({url:'/pages/guide/index?hazard='+this.data.alert.hazard+'&lang='+this.data.lang});},
 shelters(){if(this.data.alert)wx.navigateTo({url:'/pages/shelters/index?hazard='+this.data.alert.hazard+'&lang='+this.data.lang});},
 coast(){wx.navigateTo({url:'/pages/location/index?action=coast&lang='+this.data.lang});},
 back(){backPage(this,wx);},
 onHide(){this._watch?.stop();clearInterval(this._timer);},onUnload(){leavePage(this);this.onHide();}
};
</script>
<page>
<view class="panel">
 <view class="row top"><button class="back {{keyFocus === 'back' ? 'selected' : ''}}" bindtap="back" id="nav-back" >{{keyFocus === 'back' ? '▶ ' : ''}}← {{lang === 'zh' ? '返回' : '戻る'}}</button><text class="heading">{{lang === 'zh' ? '地区灾害信息' : '地域の災害情報'}}</text><text class="minor">MAMORI</text></view>
 <view class="split">
 <scroll-view class="card alert-summary" scroll-y="true"><text class="card-title">! {{lang === 'zh' ? '已取得信息' : '取得した情報'}} · {{count ? index+1 : 0}} / {{count}}</text><view ink:if="{{alert}}"><text class="minor">{{alert.stateLabel}}</text><text class="alert-name">{{alert.name}}</text><text class="body">{{alert.city}}</text><text class="note">{{alert.time}} · {{alert.publisher}}</text></view><text class="empty" ink:if="{{!alert}}">{{message}}</text></scroll-view>
 <scroll-view class="card alert-detail" scroll-y="true" scroll-into-view="{{'nav-' + keyFocus}}"><view ink:if="{{alert}}"><view class="metric" ink:for="{{alert.metrics}}" ink:key="label"><text class="minor">{{item.label}}</text><text class="name">{{item.value}}</text></view><text class="timing">{{alert.timing}}</text><view class="column alert-actions"><button class=" {{keyFocus === 'guide' ? 'selected' : ''}}" bindtap="guide" id="nav-guide" >{{keyFocus === 'guide' ? '▶ ' : ''}}＋ {{lang === 'zh' ? '立即查看应对' : '今すぐ行動確認'}}</button><button class=" {{keyFocus === 'shelters' ? 'selected' : ''}}" bindtap="shelters" id="nav-shelters" >{{keyFocus === 'shelters' ? '▶ ' : ''}}⌂ {{lang === 'zh' ? '避难地' : '避難先'}}</button><button class=" {{keyFocus === 'next' ? 'selected' : ''}}" bindtap="next" id="nav-next" ink:if="{{count > 1}}">{{keyFocus === 'next' ? '▶ ' : ''}}→ {{lang === 'zh' ? '其他预警' : '他の情報'}}</button></view></view><text class="card-title" ink:if="{{!alert}}">≋ {{lang === 'zh' ? '海啸信息适用区域' : '津波情報の対象地域'}}</text><text class="note" ink:if="{{!alert}}">{{lang === 'zh' ? '市町村与海啸预报区不同，请核对对应沿岸。' : '市町村と沿岸の区分は異なります。対象の沿岸を確認。'}}</text><button class="coast-button {{keyFocus === 'coast' ? 'selected' : ''}}" bindtap="coast" id="nav-coast">{{keyFocus === 'coast' ? '▶ ' : '≋ '}}{{coast || (lang === 'zh' ? '确认海啸预报沿岸' : '津波予報の沿岸を確認')}}</button></scroll-view>
 </view><text class="footer">{{lang === 'zh' ? '公开信息约每分钟更新；秒级地震预警尚未接通。' : '公開情報は約1分周期。秒単位の緊急地震速報は未接続。'}}</text>
</view>
</page>
<style>

.panel{width:480px;height:352px;padding:10px;box-sizing:border-box;background:#000;color:var(--color-text-primary,#40ff5e);display:flex;flex-direction:column;gap:8px;font-family:sans-serif;}
.row{display:flex;flex-direction:row;align-items:center;gap:6px;}.top{height:30px;flex-shrink:0;justify-content:space-between;}.brand{font-family:monospace;font-size:22px;font-weight:700;}.heading{font-family:monospace;font-size:17px;font-weight:700;}.minor,.note{display:block;font-size:11px;line-height:1.35;color:var(--color-text-secondary,rgba(64,255,94,.6));}.label{display:block;font-size:12px;font-weight:600;}.body{display:block;font-size:15px;line-height:1.35;}.name{display:block;font-size:16px;font-weight:700;line-height:1.3;}.split{display:flex;flex-direction:row;gap:8px;flex:1;min-height:0;}.column{display:flex;flex-direction:column;gap:8px;min-height:0;}.card{border:1px solid rgba(64,255,94,.6);border-radius:12px;padding:10px;box-sizing:border-box;background:#000;}.card-title{display:block;font-size:12px;font-weight:600;margin-bottom:6px;}.icon{font-size:20px;font-weight:700;}.grow{flex:1;min-width:0;}.footer{display:block;font-size:10px;line-height:1.3;color:var(--color-text-secondary,rgba(64,255,94,.6));flex-shrink:0;}
button{font-size:12px;line-height:1.3;padding:5px 7px;min-height:28px;border:1px solid rgba(64,255,94,.6);border-radius:8px;background:#000;color:var(--color-primary,#40ff5e);box-sizing:border-box;}button.selected{background:rgba(64,255,94,.4);border:2px solid var(--color-primary,#40ff5e);font-weight:700;}button:disabled{opacity:.4;}.back{min-width:64px;}.actions{display:flex;flex-direction:row;gap:6px;flex-shrink:0;}.scroll{flex:1;min-height:0;}.empty{display:block;font-size:17px;line-height:1.5;margin:18px 0;}
.alert-summary{width:208px;}.alert-detail{width:244px;}.alert-name{display:block;font-size:23px;font-weight:700;line-height:1.3;margin:10px 0;}.metric{display:flex;flex-direction:row;justify-content:space-between;gap:6px;padding:6px 0;border-bottom:1px solid rgba(64,255,94,.4);}.timing{display:block;font-size:14px;line-height:1.35;margin:9px 0;}.alert-actions{gap:6px;}.coast-button{margin-top:10px;width:222px;}.alert-summary .note{margin-top:12px;}

</style>
