const fs=await import('node:fs/promises');const t=await taskSpace(8),p=t.page('p1');
const root='/Users/hanyu/Documents/ChatGPT/rokid项目/output/posters/ink';
await p.cdp('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:2,mobile:false});const qa=[];
for(const id of ['ikeda','wakayama','iwate']){
 await p.goto(`http://127.0.0.1:8790/${id}.html`);
 await p.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
 qa.push(await p.evaluate(()=>({url:location.href,width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,images:[...document.images].map(i=>({src:i.getAttribute('src'),width:i.naturalWidth,height:i.naturalHeight})),valueBottom:document.querySelector('.value').getBoundingClientRect().bottom,footerTop:document.querySelector('.footer').getBoundingClientRect().top,overflow:[...document.querySelectorAll('.poster *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>1920||r.bottom>1080}).map(e=>e.className)})));
 const shot=await p.cdp('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:1920,height:1080,scale:1}});
 await fs.writeFile(root+`/${id}.png`,Buffer.from(shot.data,'base64'));
}
if(qa.some(q=>q.overflow.length||q.images.length!==4||q.valueBottom>=q.footerTop))throw new Error('Poster layout validation failed');
await fs.writeFile(root+'/layout-qa.json',JSON.stringify(qa,null,2));console.log(qa);
