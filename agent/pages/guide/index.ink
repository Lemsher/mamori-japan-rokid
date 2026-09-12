<script def>
{"navigationBarTitleText":"まもり / 防災ガイド","description":"災害別の重要な行動を一画面で表示するオフラインガイド。","schema":{"data":{"type":"object","properties":{"hazard":{"type":"string","enum":["earthquake","tsunami","landslide","flood","typhoon","volcano","prepare"]},"lang":{"type":"string","enum":["ja","zh"]},"blocked":{"type":"boolean"}},"required":["hazard"]}}}
</script>
<script setup>
import wx from 'wx';
import {enterPage,leavePage,backPage} from '../../modules/navigation.js';
import {handleKeys,methodActions} from '../../modules/keys.js';
import {getBrief} from '../../modules/briefs.js';
import {JAPANESE_TTS_VERIFIED} from '../../modules/config.js';
import {watchRegion} from '../../modules/monitoring.js';
import {eventKey} from '../../modules/alerts.js';
export default {
 onKeyUp(e){handleKeys(this,e,methodActions(this,['back','read','shelters',...(!this.data.isBlocked&&['flood','landslide'].includes(this.data.guide.hazard)?['blocked']:[])]),()=>this.back());},
 data:{keyFocus:'',guide:getBrief('prepare'),lang:'ja',message:'',isBlocked:false},
 onLoad(q={}){enterPage(this);const lang=q.lang==='zh'?'zh':'ja',blocked=q.blocked===true||q.blocked==='true';this.setData({guide:getBrief(q.hazard,lang,blocked),lang,isBlocked:blocked});},
 onShow(){this._active=true;this._watch=watchRegion(()=>{},a=>wx.navigateTo({url:'/pages/alert/index?lang='+this.data.lang+'&key='+encodeURIComponent(eventKey(a))}));},
 blocked(){this.setData({guide:getBrief(this.data.guide.hazard,this.data.lang,true),isBlocked:true});},
 shelters(){wx.navigateTo({url:'/pages/shelters/index?lang='+this.data.lang+'&hazard='+this.data.guide.hazard});},
 back(){backPage(this,wx);},
 async read(){
  if(this.data.lang==='ja'&&!JAPANESE_TTS_VERIFIED){this.setData({message:'日本語の読上げは実機検証待ち。'});return;}
  if(typeof speechSynthesis==='undefined'||typeof speechSynthesis.synthesize!=='function'||typeof SpeechAudioPlayer!=='function'){this.setData({message:'音声を利用できません / 朗读不可用'});return;}
  const generation=this._speechGeneration=(this._speechGeneration||0)+1;this._player?.destroy();this._speechTask?.abort();
  try{const g=this.data.guide,task=await speechSynthesis.synthesize(new SpeechSynthesisUtterance(g.action+'。'+g.points.map(p=>p.text).join('。')),{subtitles:'none'});if(!this._active||generation!==this._speechGeneration){task.abort();return;}this._speechTask=task;task.finished.catch(()=>{if(this._active)this.setData({message:'音声を利用できません / 朗读不可用'});});this._player=new SpeechAudioPlayer(task);this._player.play();}catch{if(this._active)this.setData({message:'音声を利用できません / 朗读不可用'});}
 },
 onHide(){this._active=false;this._speechGeneration=(this._speechGeneration||0)+1;this._watch?.stop();this._player?.destroy();this._player=null;this._speechTask?.abort();this._speechTask=null;},onUnload(){leavePage(this);this.onHide();}
};
</script>
<page>
<view class="panel guide-panel">
 <view class="row top"><button class="back {{keyFocus === 'back' ? 'selected' : ''}}" bindtap="back" id="nav-back" >{{keyFocus === 'back' ? '▶ ' : ''}}← {{lang === 'zh' ? '返回' : '戻る'}}</button><text class="heading">{{guide.title}}</text><text class="minor">MAMORI</text></view>
 <view class="split guide-content">
  <view class="card lead"><text class="lead-icon">＋</text><text class="card-title">{{lang === 'zh' ? '先做这件事' : 'まず、この行動'}}</text><text class="action">{{guide.action}}</text><text class="minor">{{lang === 'zh' ? '离线指南' : 'オフラインガイド'}}</text></view>
  <view class="column points"><view class="card point" ink:for="{{guide.points}}" ink:key="id"><text class="step">{{index + 1}}</text><text class="body grow">{{item.text}}</text></view></view>
 </view>
 <view class="actions"><button class=" {{keyFocus === 'read' ? 'selected' : ''}}" bindtap="read" id="nav-read" >{{keyFocus === 'read' ? '▶ ' : ''}}♪ {{lang === 'zh' ? '朗读' : '読上げ'}}</button><button class="grow {{keyFocus === 'shelters' ? 'selected' : ''}}" bindtap="shelters" id="nav-shelters" >{{keyFocus === 'shelters' ? '▶ ' : ''}}⌂ {{lang === 'zh' ? '附近避难地' : '近くの避難先'}}</button><button class=" {{keyFocus === 'blocked' ? 'selected' : ''}}" bindtap="blocked" id="nav-blocked" ink:if="{{(guide.hazard === 'flood' || guide.hazard === 'landslide') && !isBlocked}}">{{keyFocus === 'blocked' ? '▶ ' : ''}}! {{lang === 'zh' ? '无法外出' : '外出困難'}}</button></view>
 <text class="footer">{{message || (lang === 'zh' ? '119 救援 · 阅读完毕不代表危险解除。依据气象厅/内阁府指南。' : '119 救助 · 読み終えても警報解除ではありません。気象庁/内閣府資料の要約。')}}</text>
</view>
</page>
<style>

.panel{width:480px;height:352px;padding:10px;box-sizing:border-box;background:#000;color:var(--color-text-primary,#40ff5e);display:flex;flex-direction:column;gap:8px;font-family:sans-serif;}
.row{display:flex;flex-direction:row;align-items:center;gap:6px;}.top{height:30px;flex-shrink:0;justify-content:space-between;}.brand{font-family:monospace;font-size:22px;font-weight:700;}.heading{font-family:monospace;font-size:17px;font-weight:700;}.minor,.note{display:block;font-size:11px;line-height:1.35;color:var(--color-text-secondary,rgba(64,255,94,.6));}.label{display:block;font-size:12px;font-weight:600;}.body{display:block;font-size:15px;line-height:1.35;}.name{display:block;font-size:16px;font-weight:700;line-height:1.3;}.split{display:flex;flex-direction:row;gap:8px;flex:1;min-height:0;}.column{display:flex;flex-direction:column;gap:8px;min-height:0;}.card{border:1px solid rgba(64,255,94,.6);border-radius:12px;padding:10px;box-sizing:border-box;background:#000;}.card-title{display:block;font-size:12px;font-weight:600;margin-bottom:6px;}.icon{font-size:20px;font-weight:700;}.grow{flex:1;min-width:0;}.footer{display:block;font-size:10px;line-height:1.3;color:var(--color-text-secondary,rgba(64,255,94,.6));flex-shrink:0;}
button{font-size:12px;line-height:1.3;padding:5px 7px;min-height:28px;border:1px solid rgba(64,255,94,.6);border-radius:8px;background:#000;color:var(--color-primary,#40ff5e);box-sizing:border-box;}button.selected{background:rgba(64,255,94,.4);border:2px solid var(--color-primary,#40ff5e);font-weight:700;}button:disabled{opacity:.4;}.back{min-width:64px;}.actions{display:flex;flex-direction:row;gap:6px;flex-shrink:0;}.scroll{flex:1;min-height:0;}.empty{display:block;font-size:17px;line-height:1.5;margin:18px 0;}
.lead{width:146px;display:flex;flex-direction:column;gap:8px;padding:12px;}.lead-icon{font-size:30px;font-weight:700;}.action{display:block;font-family:monospace;font-size:22px;font-weight:700;line-height:1.35;flex:1;}.points{width:306px;gap:6px;}.point{flex:1;display:flex;flex-direction:row;gap:8px;align-items:center;padding:8px;}.step{font-family:monospace;font-size:15px;font-weight:700;}.point .body{font-size:15px;line-height:1.35;}

</style>
