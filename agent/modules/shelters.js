import {SERVICE_URL} from './config.js';
import {fetchJSON,getJSON} from './client.js';
export const SHELTER_TYPES={earthquake:['地震','地震',4],tsunami:['津波','海啸',5],landslide:['土砂','滑坡泥石流',2],flood:['洪水','洪水',1],'storm-surge':['高潮','风暴潮',3],'inland-flood':['内水氾濫','内涝',7],volcano:['火山','火山',8]};
export function meters(lat,lon,a,b){const r=Math.PI/180,p=lat*r,q=a*r;return 6371000*2*Math.asin(Math.min(1,Math.sqrt(Math.sin((q-p)/2)**2+Math.cos(p)*Math.cos(q)*Math.sin((b-lon)*r/2)**2)));}
export function selectShelters(collections,p,hazard){
 const type=SHELTER_TYPES[hazard];if(!type)throw new Error('choose-disaster');const found=new Map();
 for(const collection of collections)for(const f of collection.features||[]){
  const g=f.geometry,props=f.properties||{};if(g?.type!=='Point'||![1,'1'].includes(props['disaster'+type[2]]))continue;
  const [longitude,latitude]=g.coordinates||[];if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<20||latitude>46.5||longitude<122||longitude>154||!props.name)continue;
  const distanceMeters=Math.round(meters(p.latitude,p.longitude,latitude,longitude));if(distanceMeters>10000)continue;
  const id=latitude+','+longitude+':'+props.name;
  found.set(id,{id,name:String(props.name),address:String(props.address||''),remarks:String(props.remarks||''),latitude,longitude,distanceMeters,hazard,designated:true,openingStatus:'unverified',routeSafety:'unverified',elevationMeters:null,source:'https://www.gsi.go.jp/bousaichiri/hinanbasho'});
 }
 return [...found.values()].sort((a,b)=>a.distanceMeters-b.distanceMeters).slice(0,8);
}
export function navigationURL(place){if(!place?.designated||!SHELTER_TYPES[place.hazard]||!Number.isFinite(place.latitude)||!Number.isFinite(place.longitude))throw new Error('invalid-destination');return 'https://www.google.com/maps/dir/?api=1&destination='+place.latitude+','+place.longitude+'&travelmode=walking';}
export async function nearbyShelters(position,hazard,sameOrigin=false){
 if(!SHELTER_TYPES[hazard])throw new Error('choose-disaster');
 if(!Number.isFinite(position.latitude)||!Number.isFinite(position.longitude)||position.accuracy>1000)throw new Error('location-inaccurate');
 const query='/api/shelters?lat='+position.latitude.toFixed(5)+'&lon='+position.longitude.toFixed(5)+'&hazard='+encodeURIComponent(hazard);
 if(sameOrigin)return fetchJSON(query);
 if(SERVICE_URL)return getJSON(query);
 const z=10,n=2**z,x=Math.floor((position.longitude+180)/360*n),y=Math.floor((1-Math.asinh(Math.tan(position.latitude*Math.PI/180))/Math.PI)/2*n);
 const jobs=[];for(const dx of [-1,0,1])for(const dy of [-1,0,1])jobs.push(fetchJSON('https://cyberjapandata.gsi.go.jp/xyz/skhb'+String(SHELTER_TYPES[hazard][2]).padStart(2,'0')+'/'+z+'/'+(x+dx)+'/'+(y+dy)+'.geojson',12000));
 const results=await Promise.allSettled(jobs),collections=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
 const places=selectShelters(collections,position,hazard);
 if(hazard==='tsunami')await Promise.all(places.slice(0,3).map(async place=>{try{const data=await fetchJSON('https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon='+place.longitude+'&lat='+place.latitude+'&outtype=JSON',8000);if(Number.isFinite(data.elevation))place.elevationMeters=data.elevation;}catch{}}));
 return {places,state:collections.length===9?'fetched':collections.length?'partial':'unavailable',checkedAt:Date.now(),source:'https://www.gsi.go.jp/bousaichiri/hinanbasho'};
}
