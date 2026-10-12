import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import data from './data/maspero-buildings.json';
import {courseZ} from './maspero-layout.mjs';

// Open plan shapes supply alignment, not surveyed heights or facade designs.
// Merge the authored walls, metal roofs and facade details for tablet rendering.
export function buildMappedHouses(group,exclude,materials={}){
 const parts={wall:[],tin:[],tile:[],details:[]},stats={source:data.source,release:data.release,license:data.license,available:data.buildings.length,rendered:0,mappedRendered:0,authoredStreetHouses:0,excluded:0,heights:'authored; all source heights unknown',footprintExtent:[850,1400]};
 const walls=['#d8d2bc','#b5cfc9','#e0d4b9','#b6c4b7','#ccb5a4'],roofs=['#82949c','#a98b75','#a8b9ad'];
 const paint=(g,color,kind='details')=>{const c=new T.Color(color),values=new Float32Array(g.attributes.position.count*3);for(let i=0;i<values.length;i+=3)values.set([c.r,c.g,c.b],i);g.setAttribute('color',new T.BufferAttribute(values,3));if(kind!=='details'){const p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=(kind==='wall'&&Math.abs(n.getX(i))>.6?p.getZ(i):p.getX(i))/2.4;uv[i*2+1]=(kind==='wall'&&Math.abs(n.getY(i))<.6?p.getY(i):p.getZ(i))/2.4;}g.setAttribute('uv',new T.BufferAttribute(uv,2));}if(g.index){parts[kind].push(g.toNonIndexed());g.dispose();}else parts[kind].push(g);};
 function box(x,y,z,w,h,d,color,yaw=0,kind='details'){const g=new T.BoxGeometry(w,h,d);g.rotateY(yaw);g.translate(x,y,z);paint(g,color,kind);}
 const authored=[];for(const side of [-1,1])for(let x=1418,id=0;x<2390;x+=6.35,id++){const width=4.8+(id%5)*.29,depth=12+(id%4)*2.1,front=(side<0?-28.93:32.55)+side*25.8,z=front+side*depth/2;authored.push({id:'authored-street-'+side+'-'+id,authored:true,points:[[x-width/2,z-depth/2],[x+width/2,z-depth/2],[x+width/2,z+depth/2],[x-width/2,z+depth/2]]});}
 for(const b of [...data.buildings,...authored]){
  const points=b.points,cx=points.reduce((v,p)=>v+p[0],0)/points.length,cz=points.reduce((v,p)=>v+p[1],0)/points.length;
  if(!b.authored&&(cx<850||cx>1400)||exclude(b,cx,cz)){stats.excluded++;continue;}
  let seed=0;for(const c of b.id)seed=(Math.imul(seed,31)+c.charCodeAt(0))>>>0;
  const floors=seed%9<2?2:1,height=floors*2.9+(seed%5)*.15,wall=walls[seed%walls.length],roof=roofs[seed%roofs.length],shape=new T.Shape(points.map(p=>new T.Vector2(p[0]-cx,cz-p[1])));
  const body=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1});body.rotateX(-Math.PI/2);body.translate(cx,1.39,cz);paint(body,wall,'wall');
  const foundation=new T.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:false,steps:1});foundation.rotateX(-Math.PI/2);foundation.translate(cx,1.23,cz);paint(foundation,'#b6b7a8');
  const lengths=points.map((p,i)=>Math.hypot(p[0]-points[(i+1)%points.length][0],p[1]-points[(i+1)%points.length][1]));
  const rectangular=points.length===4&&points.every((p,i)=>{const a=points[(i+1)%4],b=points[(i+3)%4];return Math.abs((a[0]-p[0])*(b[0]-p[0])+(a[1]-p[1])*(b[1]-p[1]))/(lengths[i]*lengths[(i+3)%4])<.12;});
  if(rectangular&&seed%3!==0){const offset=lengths[0]<=lengths[1]?0:1,q=Array.from({length:4},(_,i)=>points[(i+offset)%4]),top=1.39+height+.16,rise=Math.min(1.15,lengths[offset]*.12),verts=q.flatMap(p=>[p[0],top,p[1]]);verts.push((q[0][0]+q[1][0])/2,top+rise,(q[0][1]+q[1][1])/2,(q[2][0]+q[3][0])/2,top+rise,(q[2][1]+q[3][1])/2);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex([0,4,1,1,4,5,1,5,2,2,5,3,3,5,4,3,4,0]);g.computeVertexNormals();g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(12),2));paint(g,seed%5===0?'#d2b9a4':'#c4d3d0',seed%5===0?'tile':'tin');}
  else{const cap=new T.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:false,steps:1});cap.rotateX(-Math.PI/2);cap.translate(cx,1.39+height,cz);paint(cap,'#c8d4d0','tin');}
  // Choose the river-facing actual polygon edge for authored shop fronts.
  let edge=null,score=Infinity;for(let i=0;i<points.length;i++){const a=points[i],c=points[(i+1)%points.length],length=Math.hypot(c[0]-a[0],c[1]-a[1]);if(length<2)continue;const s=Math.abs((a[1]+c[1])/2);if(s<score){score=s;edge={a,c,length};}}
  if(edge&&Math.abs(cz)<115){
   const {a,c,length}=edge,dx=(c[0]-a[0])/length,dz=(c[1]-a[1])/length,yaw=-Math.atan2(dz,dx);let nx=-dz,nz=dx;if(nz*cz>0){nx=-nx;nz=-nz;}
   const roadEdge=x=>{const side=Math.sign(cz),t=T.MathUtils.smoothstep(Math.abs(x-1090),80,145);return courseZ(x,side*(60+(side<0?24:6)*(1-t))+side*9.3);};
   const za=roadEdge(a[0]),zc=roadEdge(c[0]);
   if(Math.abs(a[1])>Math.abs(za)&&Math.abs(c[1])>Math.abs(zc)){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([a[0],1.385,za,c[0],1.385,zc,c[0],1.385,c[1],a[0],1.385,a[1]],3));g.setIndex(cz<0?[0,1,2,0,2,3]:[0,2,1,0,3,2]);g.computeVertexNormals();if(g.attributes.normal.getY(0)<0){const index=g.index.array;for(let i=0;i<index.length;i+=3){const v=index[i+1];index[i+1]=index[i+2];index[i+2]=v;}g.computeVertexNormals();}g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(8),2));paint(g,'#c7c3b4');}
   const point=(t,d=0)=>[a[0]+(c[0]-a[0])*t+nx*d,a[1]+(c[1]-a[1])*t+nz*d],units=Math.max(1,Math.round(length/4.6)),unit=length/units;
   for(let u=0;u<units;u++){
    const [x,z]=point((u+.5)/units,.06),[px,pz]=point(u/units,.1);
    // Narrow shop fronts, shutters, shade canopies, concrete trim and upper
    // balconies supply local street character on the retained plan shapes.
    box(px,1.39+height/2,pz,.16,height,.19,'#e5ddc9',yaw);
    box(x,2.54,z,unit*.68,2.2,.095,seed%3===0?'#81978c':'#5a7578',yaw);
    for(let k=0;k<9;k++)box(x+dx*(k-4)*unit*.065,2.54,z+dz*(k-4)*unit*.065,unit*.008,2.1,.11,'#aec0b5',yaw);
    const [ax,az]=point((u+.5)/units,.70);box(ax,3.66,az,unit*.99,.10,1.42,seed%4===0?'#a4866f':'#95ada5',yaw,'tin');
    box(x,1.52,z,unit*.95,.24,.45,'#aeb3a5',yaw);
    for(let f=1;f<floors;f++){
     const y=2.83+f*2.9;box(x,y,z,unit*.68,1.45,.10,'#46676e',yaw);
     box(x,y,z,unit*.025,1.45,.16,'#d8e2d6',yaw);box(x,y,z,unit*.69,.08,.16,'#d8e2d6',yaw);
     if(seed%3!==0){const [bx,bz]=point((u+.5)/units,.58);box(bx,y-.91,bz,unit*.94,.16,1.35,wall,yaw);const [rx,rz]=point((u+.5)/units,1.22);box(rx,y-.25,rz,unit*.92,.08,.06,'#d4dccd',yaw);for(let k=0;k<6;k++)box(rx+dx*(k-2.5)*unit*.14,y-.52,rz+dz*(k-2.5)*unit*.14,.05,.54,.05,'#c7d4c8',yaw);}
    }
    box(x,1.39+height,z,unit*.98,.17,.22,'#e3ded0',yaw);
   }
  }
  stats.rendered++;if(b.authored)stats.authoredStreetHouses++;else stats.mappedRendered++;
 }
 stats.drawCalls=0;stats.triangles=0;for(const [kind,list] of Object.entries(parts)){if(!list.length)continue;const g=mergeGeometries(list,false);list.forEach(p=>p.dispose());if(!g)throw Error('Building geometry merge failed: '+kind);g.computeBoundingSphere();const mesh=new T.Mesh(g,materials[kind]||new T.MeshStandardMaterial({vertexColors:true,roughness:kind==='details'?.75:.88}));mesh.name='Maspero_Overture_Footprint_Houses_'+kind;mesh.userData=stats;group.add(mesh);stats.drawCalls++;stats.triangles+=g.attributes.position.count/3;}
 return stats;
}
