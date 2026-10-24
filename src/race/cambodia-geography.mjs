import layout from './cambodia-layout.json';

export const cambodiaLayout=layout;
const reservations=Object.fromEntries(Object.entries(layout.venues).map(([id,v])=>[id,v.features.filter(f=>!f.id.endsWith('bridge')).map(f=>({minX:Math.min(...f.footprint.map(p=>p[0])),maxX:Math.max(...f.footprint.map(p=>p[0])),minZ:Math.min(...f.footprint.map(p=>p[1])),maxZ:Math.max(...f.footprint.map(p=>p[1]))}))]));
export function cambodiaBank(venueId,x,side){
 const samples=layout.venues[venueId].banks,i=Math.max(0,Math.min(samples.length-2,Math.floor((x-samples[0][0])/25))),a=samples[i],b=samples[i+1],t=Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0]))),column=side<0?1:2;
 return a[column]+(b[column]-a[column])*t;
}
export function cambodiaFeature(venueId,id){return layout.venues[venueId].features.find(f=>f.id===id);}
export function cambodiaReserved(venueId,x,z,padding=12){
 return reservations[venueId].some(b=>x>b.minX-padding&&x<b.maxX+padding&&z>b.minZ-padding&&z<b.maxZ+padding);
}
