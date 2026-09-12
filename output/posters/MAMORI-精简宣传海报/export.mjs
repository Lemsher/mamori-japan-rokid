const fs=await import('node:fs/promises');const root='/Users/hanyu/Documents/ChatGPT/rokid项目/output/posters/concise';
const t=await taskSpace(9),p=t.page('p1');await p.cdp('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:2,mobile:false});const qa=[];
for(const id of ['overview','ikeda','wakayama','iwate']){
 await p.goto(`http://127.0.0.1:8791/${id}.html`);await p.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));
 const result=await p.evaluate(()=>({url:location.href,images:[...document.images].map(i=>({src:i.getAttribute('src'),width:i.naturalWidth,height:i.naturalHeight})),noteBottom:document.querySelector('.note').getBoundingClientRect().bottom,footerTop:document.querySelector('.footer').getBoundingClientRect().top,overflow:[...document.querySelectorAll('.poster *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>1920||r.bottom>1080}).map(e=>e.className),captionOverflow:[...document.querySelectorAll('.caption')].filter(e=>e.scrollWidth>e.clientWidth).length}));qa.push(result);
 const r=await p.cdp('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:1920,height:1080,scale:1}});await fs.writeFile(root+'/'+id+'.png',Buffer.from(r.data,'base64'));
}
await fs.writeFile(root+'/qa.json',JSON.stringify(qa,null,2));console.log(qa);
if(qa.some(q=>q.overflow.length||q.captionOverflow||q.noteBottom>=q.footerTop))throw Error('Layout needs correction');
