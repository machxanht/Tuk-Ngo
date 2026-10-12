import layout from '../../public/assets/maps/maspero-osm-layout.json';

export const MASPERO_LAYOUT=layout;
export const DETAIL_RANGE=[850,1400];
export function bankEdges(x){const points=layout.banks;let i=0;while(i<points.length-2&&x>points[i+1].x)i++;const a=points[i],b=points[i+1],t=Math.max(0,Math.min(1,(x-a.x)/(b.x-a.x)));return {north:a.north+(b.north-a.north)*t,south:a.south+(b.south-a.south)*t};}
// Retain authored promenade/road widths outside the bank; map the old
// normalized river interior into the licensed observed bank outline.
export function courseZ(x,z){const edge=bankEdges(x),side=Math.sign(z),bank=side<0?edge.north:edge.south;if(Math.abs(z)<=43)return bank*Math.abs(z)/43;return bank+side*(Math.abs(z)-43);}
export function bridgeYaw(x){return layout.bridges.find(b=>b.x===x)?.yawRad||0;}
