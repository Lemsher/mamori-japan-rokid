// Explicit temple navigation keeps the selected action visible in every host.
// Use the documented Page onKeyUp event, without relying on DOM keyboard focus.
export function handleKeys(page,event,actions,back){
 const code=event.code;if(!['Enter','ArrowDown','ArrowUp','Backspace'].includes(code))return;
 event.preventDefault();
 if(code==='Backspace'){page.setData({keyFocus:''});back?.();return;}
 if(!actions.length)return;
 const i=actions.findIndex(a=>a.id===page.data.keyFocus);
 if(code==='Enter'&&i>=0){actions[i].run();return;}
 const index=i<0?0:(i+(code==='ArrowUp'?-1:1)+actions.length)%actions.length;
 page.setData({keyFocus:actions[index].id});
}
export function methodActions(page,names){return names.map(id=>({id,run:()=>page[id]()}));}
