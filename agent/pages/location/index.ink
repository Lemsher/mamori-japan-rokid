<script def>
{"navigationBarTitleText":"まもり / 場所を選択"}
</script>
<script setup>
import wx from 'wx';
import {enterPage,leavePage,backPage} from '../../modules/navigation.js';
import {handleKeys,methodActions} from '../../modules/keys.js';
import {OFFICES,searchCities,rememberCity,locateCities,locationError,COASTS,rememberCoast} from '../../modules/locations.js';
import {startTextInput} from '../../modules/text-input.js';
export default {
 onKeyUp(e){handleKeys(this,e,methodActions(this,['back','search','listen','showOffices','locate','postal','showCoasts']).concat(this.data.items.map(item=>({id:'item-'+item.code,run:()=>this.selectItem({currentTarget:{attributes:{'data-code':item.code}}})})),methodActions(this,[...(this.data.offset>0?['previous']:[]),...(this.data.offset+4<this.data.total?['next']:[])])),()=>this.back());},
  data:{keyFocus:'',lang:'ja',query:'',items:[],title:'地域一覧 / 地区列表',message:'',pageLabel:'',offset:0,total:0,locating:false},
  onLoad(q={}){enterPage(this);this._active=true;this.setData({lang:q.lang==='zh'?'zh':'ja',query:q.query||''});if(q.action==='coast')this.showCoasts();else if(q.query)this.search();else this.showOffices();if(q.action==='locate')this.locate();if(q.action==='postal')this.postal();},
  t(ja,zh){return this.data.lang==='zh'?zh:ja;},
  input(e){this.setData({query:String(e.detail?.value ?? e.currentTarget?.value ?? '')});},
  present(items,title){this._parent=null;this._items=items;this.setData({keyFocus:'',title,offset:0,total:items.length});this.renderList();},
  renderList(){const offset=this.data.offset;this.setData({items:this._items.slice(offset,offset+4),pageLabel:this._items.length?(Math.floor(offset/4)+1)+' / '+Math.ceil(this._items.length/4):'0 / 0'});},
  cancelLocate(){this._generation=(this._generation||0)+1;this.setData({locating:false});},
  showOffices(){this.cancelLocate();this.present(OFFICES.map(o=>({...o,label:o.name,kind:'office'})),this.t('地域一覧','地区列表'));this.setData({message:this.t('人口順（2024年10月）・地方区分は最後。','按都府县人口排序（2024年10月），地方分区在最后。')});},
  search(){
    this.cancelLocate();
    const q=this.data.query.trim();
    if(!q){this.showOffices();return;}
    const results=searchCities(q).map(c=>({...c,label:c.office+' '+c.name,kind:'city'}));
    this.present(results,this.t('検索候補：選択して確定','搜索候选：选择即确认'));
    this.setData({message:results.length?this.t('市町村名を確認して選択してください。','请核对市町村名称后选择。'):this.t('市町村名・かな・英語で入力、または一覧を選択。','请输入含市町村的地址、日文假名或英文；也可选择地区列表。')});
  },
  postal(){this.setData({query:'',message:this.t('7桁の郵便番号を音声またはStudio右側に入力。','请输入7位日本邮编，例如150-0001；可语音或在Studio右侧输入。')});this.listen();},
  showCoasts(){this.cancelLocate();this.present(COASTS.map(([name,description],i)=>({code:String(i),name,label:name,description,kind:'coast'})),this.t('対象の沿岸を確認して選択','请确认所在的海啸预报沿岸'));this.setData({message:this.t('市町村と海岸区分は異なります。海岸を確認して選択。','市町村与海啸预报区不同，请确认对应沿岸后选择。')});},
  selectItem(e){
    this.cancelLocate();const item=this._items.find(i=>i.code===e.currentTarget.attributes['data-code']);if(!item)return;
    if(item.kind==='coast'){rememberCoast(item.name,typeof localStorage==='undefined'?null:localStorage);backPage(this,wx);return;}
    if(item.kind==='office'){const parent={items:this._items,title:this.data.title,offset:this.data.offset,message:this.data.message};this.present(searchCities('',item.code).map(c=>({...c,label:c.name,kind:'city'})),item.name);this._parent=parent;this.setData({message:this.t('市町村を選択して確定','选择市町村即确认查询地点')});return;}
    const storage=typeof localStorage==='undefined'?null:localStorage;rememberCity(item.code,storage);
    backPage(this,wx);
  },
  next(){this.setData({offset:Math.min(Math.max(0,Math.floor((this.data.total-1)/4)*4),this.data.offset+4)});this.renderList();},
  previous(){this.setData({offset:Math.max(0,this.data.offset-4)});this.renderList();},
  back(){this.cancelLocate();if(this._parent){const p=this._parent;this._parent=null;this._items=p.items;this.setData({keyFocus:'',title:p.title,offset:p.offset,total:p.items.length,message:p.message});this.renderList();return;}backPage(this,wx);},
  onVoiceWakeup(){this.listen();},
  listen(){
    if(this._recognition){this._recognition.abort();this._recognition=null;}
    this.setData({message:this.t('住所を話すか、Studioの右側に入力して送信。','请说出地址，或在 Studio 右侧输入地址并发送。')});
    this._recognition=startTextInput(text=>{if(!this._active)return;this.setData({query:text});this.search();},()=>{if(this._active)this.setData({message:this.t('音声/文字入力を開始できません。一覧を使用。','宿主未能启动输入，请使用地区列表。')});},()=>{this._recognition=null;});
  },
  async locate(){
    if(this.data.locating)return;const generation=this._generation=(this._generation||0)+1;
    this.setData({locating:true,message:this.t('位置情報を取得中。権限の確認が表示されたら選択してください。','正在定位；如出现系统权限提示，请自行选择是否允许。')});
    try{
      const result=await locateCities(typeof navigator==='undefined'?null:navigator.geolocation);
      if(!this._active||generation!==this._generation)return;
      this.present(result.cities.map(c=>({...c,label:c.office+' '+c.name,kind:'city'})),this.t('位置情報の候補：確認して選択','定位候选：请核对并选择'));
      this.setData({message:this.t('推定誤差 '+result.accuracy+' m。自動確定しません。','定位误差约 '+result.accuracy+' 米，请自行确认市町村。')});
    }catch(e){if(this._active&&generation===this._generation)this.setData({message:locationError(e,this.data.lang)});}
    finally{if(this._active&&generation===this._generation)this.setData({locating:false});}
  },
  onHide(){this._active=false;this.cancelLocate();if(this._recognition)this._recognition.abort();this._recognition=null;},
  onShow(){this._active=true;},onUnload(){leavePage(this);this.onHide();}
};
</script>
<page>
<view class="panel">
 <view class="row top"><button class="back {{keyFocus === 'back' ? 'selected' : ''}}" bindtap="back" id="nav-back" >{{keyFocus === 'back' ? '▶ ' : ''}}← {{lang === 'zh' ? '返回' : '戻る'}}</button><text class="heading">{{lang === 'zh' ? '确认所在地' : '場所を確認'}}</text><text class="minor">MAMORI</text></view>
 <view class="split">
  <scroll-view class="card location-tools" scroll-y="true" scroll-into-view="{{'nav-' + keyFocus}}"><text class="card-title">◎ {{lang === 'zh' ? '选择定位方式' : '場所の入力方法'}}</text><input class="address" value="{{query}}" maxLength="150" placeholder="渋谷区 / 150-0001" bindinput="input" /><view class="tool-list"><button class=" {{keyFocus === 'search' ? 'selected' : ''}}" bindtap="search" id="nav-search" >{{keyFocus === 'search' ? '▶ ' : ''}}⌕ {{lang === 'zh' ? '搜索' : '検索'}}</button><button class=" {{keyFocus === 'listen' ? 'selected' : ''}}" bindtap="listen" id="nav-listen" >{{keyFocus === 'listen' ? '▶ ' : ''}}♪ {{lang === 'zh' ? '语音' : '音声'}}</button><button class=" {{keyFocus === 'showOffices' ? 'selected' : ''}}" bindtap="showOffices" id="nav-showOffices" >{{keyFocus === 'showOffices' ? '▶ ' : ''}}☷ {{lang === 'zh' ? '地区' : '地域'}}</button><button class=" {{keyFocus === 'locate' ? 'selected' : ''}}" bindtap="locate" id="nav-locate" disabled="{{locating}}">{{keyFocus === 'locate' ? '▶ ' : ''}}◎ {{lang === 'zh' ? 'GPS' : 'GPS'}}</button><button class=" {{keyFocus === 'postal' ? 'selected' : ''}}" bindtap="postal" id="nav-postal" >{{keyFocus === 'postal' ? '▶ ' : ''}}〒 {{lang === 'zh' ? '邮编' : '郵便'}}</button><button class=" {{keyFocus === 'showCoasts' ? 'selected' : ''}}" bindtap="showCoasts" id="nav-showCoasts" >{{keyFocus === 'showCoasts' ? '▶ ' : ''}}≋ {{lang === 'zh' ? '沿岸' : '沿岸'}}</button></view></scroll-view>
  <view class="column location-results"><view class="row"><text class="label grow">{{title}}</text><text class="minor">{{pageLabel}}</text></view><scroll-view class="scroll" scroll-y="true" scroll-into-view="{{'nav-' + keyFocus}}"><button class="choice {{keyFocus === ('item-' + item.code) ? 'selected' : ''}}" ink:for="{{items}}" ink:key="code" data-code="{{item.code}}" bindtap="selectItem" id="{{'nav-' + ('item-' + item.code)}}"><text class="body">{{keyFocus === ('item-' + item.code) ? '▶ ' : '◎ '}}{{item.label}}</text><text class="minor" ink:if="{{item.description}}">{{item.description}}</text></button><text class="empty" ink:if="{{!total}}">{{lang === 'zh' ? '未找到候选，请检查地址或邮编。' : '候補がありません。住所や郵便番号を確認。'}}</text></scroll-view><view class="actions"><button class="grow {{keyFocus === 'previous' ? 'selected' : ''}}" bindtap="previous" id="nav-previous" disabled="{{offset === 0}}">{{keyFocus === 'previous' ? '▶ ' : ''}}← {{lang === 'zh' ? '前页' : '前へ'}}</button><button class="grow {{keyFocus === 'next' ? 'selected' : ''}}" bindtap="next" id="nav-next" disabled="{{offset + 4 >= total}}">{{keyFocus === 'next' ? '▶ ' : ''}}→ {{lang === 'zh' ? '后页' : '次へ'}}</button></view><text class="note">{{message}}</text></view>
 </view><text class="footer">{{lang === 'zh' ? 'GPS 坐标发送至国土地理院，不持久保存；请自行确认候选。' : 'GPS座標は国土地理院に送信。保存せず、候補は自分で確認。'}}</text>
</view>
</page>
<style>

.panel{width:480px;height:352px;padding:10px;box-sizing:border-box;background:#000;color:var(--color-text-primary,#40ff5e);display:flex;flex-direction:column;gap:8px;font-family:sans-serif;}
.row{display:flex;flex-direction:row;align-items:center;gap:6px;}.top{height:30px;flex-shrink:0;justify-content:space-between;}.brand{font-family:monospace;font-size:22px;font-weight:700;}.heading{font-family:monospace;font-size:17px;font-weight:700;}.minor,.note{display:block;font-size:11px;line-height:1.35;color:var(--color-text-secondary,rgba(64,255,94,.6));}.label{display:block;font-size:12px;font-weight:600;}.body{display:block;font-size:15px;line-height:1.35;}.name{display:block;font-size:16px;font-weight:700;line-height:1.3;}.split{display:flex;flex-direction:row;gap:8px;flex:1;min-height:0;}.column{display:flex;flex-direction:column;gap:8px;min-height:0;}.card{border:1px solid rgba(64,255,94,.6);border-radius:12px;padding:10px;box-sizing:border-box;background:#000;}.card-title{display:block;font-size:12px;font-weight:600;margin-bottom:6px;}.icon{font-size:20px;font-weight:700;}.grow{flex:1;min-width:0;}.footer{display:block;font-size:10px;line-height:1.3;color:var(--color-text-secondary,rgba(64,255,94,.6));flex-shrink:0;}
button{font-size:12px;line-height:1.3;padding:5px 7px;min-height:28px;border:1px solid rgba(64,255,94,.6);border-radius:8px;background:#000;color:var(--color-primary,#40ff5e);box-sizing:border-box;}button.selected{background:rgba(64,255,94,.4);border:2px solid var(--color-primary,#40ff5e);font-weight:700;}button:disabled{opacity:.4;}.back{min-width:64px;}.actions{display:flex;flex-direction:row;gap:6px;flex-shrink:0;}.scroll{flex:1;min-height:0;}.empty{display:block;font-size:17px;line-height:1.5;margin:18px 0;}
.location-tools{width:170px;padding:9px;}.location-results{width:282px;gap:6px;}.tool-list{display:flex;flex-direction:row;flex-wrap:wrap;gap:6px;margin-top:8px;}.tool-list button{width:71px;text-align:center;padding:5px 3px;font-size:11px;}.address{width:150px;height:29px;font-size:12px;--input-border-width:1px;--input-padding-x:4px;--input-padding-y:4px;--input-background-color:rgba(64,255,94,.08);}.choice{display:block;width:282px;min-height:38px;margin-bottom:6px;text-align:left;padding:7px 9px;border-radius:10px;}.location-results .note{font-size:11px;}

</style>
