const fs=await import('node:fs/promises');
const root='/Users/hanyu/Documents/ChatGPT/rokid项目/output/posters/japanese';
const t=await taskSpace(10);const p=t.page('p1');
const scenes=JSON.parse(await fs.readFile(root+'/scenes.json','utf8'));
for(const s of scenes){
 for(const kind of ['daily','warning','alert','guide']){
  const url=`http://127.0.0.1:8792/runtime/${s.id}${['daily','warning'].includes(kind)?'-'+kind:''}.html?lang=ja&cityCode=${s.code}&page=${['daily','warning'].includes(kind)?'home':kind}&hazard=${s.hazard}`;
  await p.goto(url);await p.waitForFunction(()=>document.querySelector('#preview-status').textContent==='Preview ready.');
  await p.evaluate(()=>new Promise(resolve=>{let n=0;function frame(){if(++n>=8)resolve();else requestAnimationFrame(frame)}requestAnimationFrame(frame)}));
  const r=await p.evaluate(()=>document.querySelector('canvas').getBoundingClientRect().toJSON());
  const shot=await p.cdp('Page.captureScreenshot',{format:'png',clip:{x:r.x,y:r.y,width:r.width,height:r.height,scale:2}});
  await fs.writeFile(root+`/screens/${s.id}-${kind}.png`,Buffer.from(shot.data,'base64'));
  console.log(s.id,kind,r.width,r.height);
 }
}
