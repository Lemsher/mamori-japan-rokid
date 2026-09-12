// Track native page lifetimes so direct-entry pages have a home fallback.
// No browser history or undocumented getCurrentPages API is required.
const pages=[];
export function enterPage(page){if(!pages.includes(page))pages.push(page);}
export function leavePage(page){const i=pages.indexOf(page);if(i>=0)pages.splice(i,1);}
export function backPage(page,router){
 const home=()=>router.redirectTo({url:'/pages/home/index?lang='+page.data.lang});
 if(pages.indexOf(page)>0)router.navigateBack({delta:1,fail:home});
 else home();
}
