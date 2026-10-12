import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import data from './data/maspero-buildings.json';

// Open plan shapes supply alignment, not surveyed heights or facade designs.
// Merge the authored walls, metal roofs and facade details for tablet rendering.
export function buildMappedHouses(group,exclude){
 const parts=[],stats={source:data.source,release:data.release,license:data.license,available:data.buildings.length,rendered:0,excluded:0,heights:'authored; all source heights unknown',footprintExtent:[850,1400]};
 const walls=['#d8d2bc','#b5cfc9','#e0d4b9','#b6c4b7','#ccb5a4'],roofs=['#82949c','#a98b75','#a8b9ad'];
 const paint=(g,color)=>{const c=new T.Color(color),values=new Float32Array(g.attributes.position.count*3);for(let i=0;i<values.length;i+=3)values.set([c.r,c.g,c.b],i);g.setAttribute('color',new T.BufferAttribute(values,3));if(g.index){parts.push(g.toNonIndexed());g.dispose();}else parts.push(g);};
 function box(x,y,z,w,h,d,color,yaw=0){const g=new T.BoxGeometry(w,h,d);g.rotateY(yaw);g.translate(x,y,z);paint(g,color);}
 for(const b of data.buildings){
  const points=b.points,cx=points.reduce((v,p)=>v+p[0],0)/points.length,cz=points.reduce((v,p)=>v+p[1],0)/points.length;
  if(cx<850||cx>1400||exclude(b,cx,cz)){stats.excluded++;continue;}
  let seed=0;for(const c of b.id)seed=(Math.imul(seed,31)+c.charCodeAt(0))>>>0;
  const floors=seed%9<2?2:1,height=floors*2.9+(seed%5)*.15,wall=walls[seed%walls.length],roof=roofs[seed%roofs.length],shape=new T.Shape(points.map(p=>new T.Vector2(p[0]-cx,cz-p[1])));
  const body=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1});body.rotateX(-Math.PI/2);body.translate(cx,1.39,cz);paint(body,wall);
  const lengths=points.map((p,i)=>Math.hypot(p[0]-points[(i+1)%points.length][0],p[1]-points[(i+1)%points.length][1]));
  const rectangular=points.length===4&&points.every((p,i)=>{const a=points[(i+1)%4],b=points[(i+3)%4];return Math.abs((a[0]-p[0])*(b[0]-p[0])+(a[1]-p[1])*(b[1]-p[1]))/(lengths[i]*lengths[(i+3)%4])<.12;});
  if(rectangular&&seed%3!==0){const offset=lengths[0]<=lengths[1]?0:1,q=Array.from({length:4},(_,i)=>points[(i+offset)%4]),top=1.39+height+.16,rise=Math.min(1.15,lengths[offset]*.12),verts=q.flatMap(p=>[p[0],top,p[1]]);verts.push((q[0][0]+q[1][0])/2,top+rise,(q[0][1]+q[1][1])/2,(q[2][0]+q[3][0])/2,top+rise,(q[2][1]+q[3][1])/2);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex([0,4,1,1,4,5,1,5,2,2,5,3,3,5,4,3,4,0]);g.computeVertexNormals();g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(12),2));paint(g,roof);}
  else{const cap=new T.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:false,steps:1});cap.rotateX(-Math.PI/2);cap.translate(cx,1.39+height,cz);paint(cap,roof);}
  // Choose the river-facing actual polygon edge for authored shop fronts.
  let edge=null,score=Infinity;for(let i=0;i<points.length;i++){const a=points[i],c=points[(i+1)%points.length],length=Math.hypot(c[0]-a[0],c[1]-a[1]);if(length<2)continue;const s=Math.abs((a[1]+c[1])/2);if(s<score){score=s;edge={a,c,length};}}
  if(edge&&Math.abs(cz)<115){const {a,c,length}=edge,dx=(c[0]-a[0])/length,dz=(c[1]-a[1])/length,yaw=-Math.atan2(dz,dx);let nx=-dz,nz=dx;if(nz*cz>0){nx=-nx;nz=-nz;}for(let floor=0;floor<floors;floor++)for(let k=0;k<Math.max(1,Math.floor(length/3));k++){const t=(k+.5)/Math.max(1,Math.floor(length/3));box(a[0]+(c[0]-a[0])*t+nx*.045,2.75+floor*2.9,a[1]+(c[1]-a[1])*t+nz*.045,Math.min(1.2,length*.4),1.3,.07,'#4c6668',yaw);}box((a[0]+c[0])/2+nx*.58,3.58,(a[1]+c[1])/2+nz*.58,length,.12,1.25,roof,yaw);}
  stats.rendered++;
 }
 if(parts.length){const g=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());g.computeBoundingSphere();const mesh=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.88}));mesh.name='Maspero_Overture_Footprint_Houses';mesh.userData=stats;group.add(mesh);}
 return stats;
}
