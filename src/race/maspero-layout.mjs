import layout from '../../public/assets/maps/maspero-osm-layout.json';

export const MASPERO_LAYOUT=layout;
export const DETAIL_RANGE=[850,1400];
// Game placement corrected by the owner: the upstream bridge precedes the
// start, outside the 1,200 m racing interval. Keep observed OSM data intact.
export const BRIDGE_POSITIONS=Object.freeze({C247:940,'30/4':2385});
export const nearCourseBridge=(x,margin)=>Object.values(BRIDGE_POSITIONS).some(b=>Math.abs(x-b)<margin);
export function bankEdges(x){const points=layout.banks;let i=0;while(i<points.length-2&&x>points[i+1].x)i++;const a=points[i],b=points[i+1],t=Math.max(0,Math.min(1,(x-a.x)/(b.x-a.x)));return {north:a.north+(b.north-a.north)*t,south:a.south+(b.south-a.south)*t};}
// Retain authored promenade/road widths outside the bank; map the old
// normalized river interior into the licensed observed bank outline.
export function courseZ(x,z){const edge=bankEdges(x),side=Math.sign(z),bank=side<0?edge.north:edge.south;if(Math.abs(z)<=43)return bank*Math.abs(z)/43;return bank+side*(Math.abs(z)-43);}
export function bridgeYaw(x){const observedX=x===BRIDGE_POSITIONS['30/4']?1340:x;return layout.bridges.find(b=>b.x===observedX)?.yawRad||0;}
