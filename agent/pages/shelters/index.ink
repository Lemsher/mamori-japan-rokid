<script def>
{"navigationBarTitleText":"まもり / 避難先"}
</script>
<script setup>
import wx from 'wx';
import {enterPage,leavePage,backPage} from '../../modules/navigation.js';
import {handleKeys,methodActions} from '../../modules/keys.js';
import {requestPosition,locationError} from '../../modules/locations.js';
import {SHELTER_TYPES,nearbyShelters} from '../../modules/shelters.js';
import {watchRegion} from '../../modules/monitoring.js';
import {eventKey} from '../../modules/alerts.js';
export default {
 onKeyUp(e){handleKeys(this,e,methodActions(this,['back']).concat(this.data.types.map(item=>({id:'type-'+item.code,run:()=>this.type({currentTarget:{attributes:{'data-code':item.code}}})})),methodActions(this,this.data.hazard&&!this.data.busy?['search']:[]),(this.data.destination||!this.data.place?[]:[this.data.place]).map((item)=>({id:'place-'+this.data.placeIndex,run:()=>this.navigate({currentTarget:{attributes:{'data-id':item.id}}})})),methodActions(this,this.data.destination?[]:[...(this.data.placeIndex>0?['previousPlace']:[]),...(this.data.placeIndex+1<this.data.places.length?['nextPlace']:[])])),()=>this.back());},
 data:{keyFocus:'',lang:'ja',hazard:'',types:[],places:[],place:null,placeIndex:0,message:'',busy:false,destination:null},
 t(ja,zh){return this.data.lang==='zh'?zh:ja;},
 onLoad(q={}){enterPage(this);const lang=q.lang==='zh'?'zh':'ja';this.setData({lang,hazard:SHELTER_TYPES[q.hazard]?q.hazard:'',types:Object.entries(SHELTER_TYPES).map(([code,labels])=>({code,label:labels[lang==='zh'?1:0]}))});},
 onShow(){this._active=true;this._watch=watchRegion(()=>{},a=>wx.navigateTo({url:'/pages/alert/index?lang='+this.data.lang+'&key='+encodeURIComponent(eventKey(a))}));},
 type(e){this._generation=(this._generation||0)+1;this.setData({hazard:e.currentTarget.attributes['data-code'],places:[],place:null,placeIndex:0,destination:null,busy:false,message:''});},
 async search(){
  if(!this.data.hazard||this.data.busy)return;const generation=this._generation=(this._generation||0)+1;
  this.setData({busy:true,places:[],place:null,placeIndex:0,destination:null,message:this.t('現在地と避難場所を確認中','正在获取当前位置和避难地点')});
  try{const position=await requestPosition(typeof navigator==='undefined'?null:navigator.geolocation);if(position.accuracy>1000)throw new Error('location-inaccurate');const result=await nearbyShelters(position,this.data.hazard);if(!this._active||generation!==this._generation)return;
   const places=result.places.map(p=>({...p,elevation:Number.isFinite(p.elevationMeters)?this.t('地面標高 約 ','地面海拔约 ')+p.elevationMeters+' m':'',distance:p.distanceMeters>=1000?(p.distanceMeters/1000).toFixed(1)+' km':p.distanceMeters+' m'}));this.setData({places,place:places[0]||null,placeIndex:0,message:result.places.length?this.t('直線距離順。開設・経路の通行可否は未確認。','按直线距离排序；开放状态及道路可通行性未核实。'):this.t('対応する場所を取得できません。標識・自治体情報を確認。','未取得适合该灾种的地点，请按现场标识及当地政府信息行动。')});
  }catch(e){if(this._active&&generation===this._generation)this.setData({message:locationError(e,this.data.lang)});}finally{if(this._active&&generation===this._generation)this.setData({busy:false});}
 },
 showPlace(index){const placeIndex=Math.max(0,Math.min(this.data.places.length-1,index));this.setData({placeIndex,place:this.data.places[placeIndex]||null,keyFocus:'place-'+placeIndex});},
 nextPlace(){this.showPlace(this.data.placeIndex+1);},
 previousPlace(){this.showPlace(this.data.placeIndex-1);},
 navigate(e){const p=this.data.places.find(p=>p.id===e.currentTarget.attributes['data-id']);if(p){this._destinationFocus='place-'+this.data.places.indexOf(p);this.setData({keyFocus:'back',destination:p,message:this.t('Hi Rokidのナビで目的地を指定。自動開始はこの宿主では未接続。','在 Hi Rokid 导航中指定该目的地。当前宿主尚未接通自动启动导航。')});}},
 back(){if(this.data.destination){this.setData({keyFocus:this._destinationFocus||'',destination:null,message:this.t('避難場所を選択','请选择避难地点')});return;}backPage(this,wx);},
 onHide(){this._active=false;this._generation=(this._generation||0)+1;this._watch?.stop();},onUnload(){leavePage(this);this.onHide();}
};
</script>
<page>
<view class="panel">
 <view class="row top"><button class="back {{keyFocus === 'back' ? 'selected' : ''}}" bindtap="back" id="nav-back" >{{keyFocus === 'back' ? '▶ ' : ''}}← {{lang === 'zh' ? '返回' : '戻る'}}</button><text class="heading">{{lang === 'zh' ? '指定紧急避难场所' : '指定緊急避難場所'}}</text><text class="minor">MAMORI</text></view>
 <view class="split">
 <scroll-view class="card shelter-tools" scroll-y="true" scroll-into-view="{{'nav-' + keyFocus}}"><text class="card-title">⌂ {{lang === 'zh' ? '选择实际灾种' : '災害種別を選択'}}</text><view class="types"><button class="{{keyFocus === ('type-' + item.code) ? 'selected' : ''}}" ink:for="{{types}}" ink:key="code" data-code="{{item.code}}" bindtap="type" id="{{'nav-' + ('type-' + item.code)}}">{{keyFocus === ('type-' + item.code) ? '▶ ' : ''}}{{hazard === item.code ? '● ' : '○ '}}{{item.label}}</button></view><button class=" {{keyFocus === 'search' ? 'selected' : ''}}" bindtap="search" id="nav-search" disabled="{{busy || !hazard}}">{{keyFocus === 'search' ? '▶ ' : ''}}◎ {{lang === 'zh' ? 'GPS 查询附近' : 'GPSで周辺検索'}}</button><text class="note">{{lang === 'zh' ? 'GPS 坐标用于查询，不持久保存。' : 'GPS座標で照会。保存しません。'}}</text></scroll-view>
 <view ink:if="{{!destination}}" class="column shelter-results"><view class="row" ink:if="{{places.length}}"><text class="label grow">{{lang === 'zh' ? '附近候选 · 直线距离' : '近くの候補・直線距離'}}</text><text class="minor">{{placeIndex + 1}} / {{places.length}}</text></view><scroll-view class="scroll" scroll-y="true" scroll-into-view="{{'nav-' + keyFocus}}"><text class="note">{{message}}</text><view class="card" ink:if="{{!places.length && !destination}}"><text class="icon">⌂</text><text class="empty">{{busy ? (lang === 'zh' ? '正在查询附近地点' : '周辺の場所を確認中') : (lang === 'zh' ? '先选灾种，再查询附近地点' : '災害を選び、周辺を検索')}}</text><text class="note">{{lang === 'zh' ? '开放状态与道路通行未核实，请结合现场标识及当地政府信息。' : '開設・道路の通行可否は未確認。標識と自治体情報も確認。'}}</text></view><view class="card place" ink:if="{{place}}"><text class="name">{{place.name}}</text><text class="note">↗ {{place.distance}} · {{place.address}}</text><text class="note">{{place.remarks}}</text><text class="note">{{place.elevation}}</text><button class="{{keyFocus === ('place-' + placeIndex) ? 'selected' : ''}}" bindtap="navigate" data-id="{{place.id}}" id="{{'nav-' + ('place-' + placeIndex)}}">{{keyFocus === ('place-' + placeIndex) ? '▶ ' : '↗ '}}{{lang === 'zh' ? '查看导航方式' : 'ナビの起動方法'}}</button></view></scroll-view><view class="actions" ink:if="{{places.length > 1}}"><button class="grow {{keyFocus === 'previousPlace' ? 'selected' : ''}}" id="nav-previousPlace" bindtap="previousPlace" disabled="{{placeIndex === 0}}">{{keyFocus === 'previousPlace' ? '▶ ' : ''}}← {{lang === 'zh' ? '上一处' : '前の場所'}}</button><button class="grow {{keyFocus === 'nextPlace' ? 'selected' : ''}}" id="nav-nextPlace" bindtap="nextPlace" disabled="{{placeIndex + 1 >= places.length}}">{{keyFocus === 'nextPlace' ? '▶ ' : ''}}{{lang === 'zh' ? '下一处' : '次の場所'}} →</button></view></view><scroll-view ink:if="{{destination}}" class="shelter-results" scroll-y="true"><text class="note">{{message}}</text><view class="card place"><text class="name">{{destination.name}}</text><text class="note">{{destination.address}}</text><text class="body">Hi Rokid, navigate to {{destination.name}} {{destination.address}}</text><text class="note">{{lang === 'zh' ? '核对名称与地址，选择步行；遇积水或封路立即停止前行。' : '目的地名・住所を確認し徒歩を選択。冠水や通行止めには進まない。'}}</text></view></scroll-view>
 </view><text class="footer">{{lang === 'zh' ? '国土地理院 · 直线距离 · 地面海拔不是避难层高度，不能保证安全。' : '国土地理院 · 直線距離 · 地面標高は避難階高・安全の保証ではありません。'}}</text>
</view>
</page>
<style>

.panel{width:480px;height:352px;padding:10px;box-sizing:border-box;background:#000;color:var(--color-text-primary,#40ff5e);display:flex;flex-direction:column;gap:8px;font-family:sans-serif;}
.row{display:flex;flex-direction:row;align-items:center;gap:6px;}.top{height:30px;flex-shrink:0;justify-content:space-between;}.brand{font-family:monospace;font-size:22px;font-weight:700;}.heading{font-family:monospace;font-size:17px;font-weight:700;}.minor,.note{display:block;font-size:11px;line-height:1.35;color:var(--color-text-secondary,rgba(64,255,94,.6));}.label{display:block;font-size:12px;font-weight:600;}.body{display:block;font-size:15px;line-height:1.35;}.name{display:block;font-size:16px;font-weight:700;line-height:1.3;}.split{display:flex;flex-direction:row;gap:8px;flex:1;min-height:0;}.column{display:flex;flex-direction:column;gap:8px;min-height:0;}.card{border:1px solid rgba(64,255,94,.6);border-radius:12px;padding:10px;box-sizing:border-box;background:#000;}.card-title{display:block;font-size:12px;font-weight:600;margin-bottom:6px;}.icon{font-size:20px;font-weight:700;}.grow{flex:1;min-width:0;}.footer{display:block;font-size:10px;line-height:1.3;color:var(--color-text-secondary,rgba(64,255,94,.6));flex-shrink:0;}
button{font-size:12px;line-height:1.3;padding:5px 7px;min-height:28px;border:1px solid rgba(64,255,94,.6);border-radius:8px;background:#000;color:var(--color-primary,#40ff5e);box-sizing:border-box;}button.selected{background:rgba(64,255,94,.4);border:2px solid var(--color-primary,#40ff5e);font-weight:700;}button:disabled{opacity:.4;}.back{min-width:64px;}.actions{display:flex;flex-direction:row;gap:6px;flex-shrink:0;}.scroll{flex:1;min-height:0;}.empty{display:block;font-size:17px;line-height:1.5;margin:18px 0;}
.shelter-tools{width:170px;padding:9px;}.shelter-results{width:282px;}.types{display:flex;flex-direction:row;flex-wrap:wrap;gap:5px;margin-bottom:8px;}.types button{width:72px;text-align:left;font-size:11px;padding:5px 3px;}.shelter-tools .note{margin-top:8px;}.place{margin-top:8px;}.place .note{margin:6px 0;}.place button{margin-top:6px;}.shelter-results>.note{margin-bottom:6px;}

</style>
