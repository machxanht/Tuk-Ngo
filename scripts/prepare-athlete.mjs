import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';

globalThis.self=globalThis;
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}};
const bytes=await fs.readFile('public/assets/human/makehuman-athlete-base.glb');
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const root=gltf.scene;root.updateMatrixWorld(true);let body;root.traverse(o=>{if(o.isSkinnedMesh)body=o;});
let source=body.geometry,p=source.attributes.position,normal=source.attributes.normal,joints=source.attributes.skinIndex,weights=source.attributes.skinWeight;
const index=source.index.array;
const regions={body:[],jersey:[],shorts:[]};
const pointKey=id=>[p.getX(id),p.getY(id),p.getZ(id)].map(v=>Math.round(v*1e6)).join(',');
const sharedContours=new Map();
const skeletonNames=body.skeleton.bones.map(b=>b.name),attributes=Object.fromEntries(Object.entries(source.attributes).map(([name,a])=>[name,{itemSize:a.itemSize,values:Array.from(a.array),type:a.array.constructor,normalized:a.normalized}])),cutCache=new Map();
let vertexCount=p.count;
const component=(name,id,k)=>attributes[name].values[id*attributes[name].itemSize+k];
function field(id,region){
 const x=component('position',id,0),y=component('position',id,1),z=component('position',id,2);
 if(region==='shorts')return Math.min(y-.61,.955-y,.30-Math.abs(x));
 let arm=0;for(let k=0;k<4;k++){const name=skeletonNames[component('skinIndex',id,k)]||'';if(name.includes('upperarm')||name.includes('lowerarm'))arm+=component('skinWeight',id,k);}
 const neckDepth=.03+.03*T.MathUtils.smoothstep(z,-.035,.035),top=1.405-neckDepth*Math.sqrt(Math.max(0,1-(x/.105)**2));
 return Math.min(y-.91,top-y,.24-Math.abs(x),(.30-arm)*.16);
}
function intersection(a,b,fa,fb,region){
 const key=region+':'+Math.min(a,b)+':'+Math.max(a,b);if(cutCache.has(key))return cutCache.get(key);
 const t=fa/(fa-fb);if(t<1e-7)return a;if(t>1-1e-7)return b;
 const id=vertexCount++;
 for(const [name,attr]of Object.entries(attributes))if(!['skinIndex','skinWeight'].includes(name))for(let k=0;k<attr.itemSize;k++)attr.values.push(component(name,a,k)*(1-t)+component(name,b,k)*t);
 const influence=new Map();for(const [v,mult]of [[a,1-t],[b,t]])for(let k=0;k<4;k++){const joint=component('skinIndex',v,k);influence.set(joint,(influence.get(joint)||0)+component('skinWeight',v,k)*mult);}
 const strongest=[...influence].sort((a,b)=>b[1]-a[1]).slice(0,4),total=strongest.reduce((n,v)=>n+v[1],0);
 for(let k=0;k<4;k++){attributes.skinIndex.values.push(strongest[k]?.[0]||0);attributes.skinWeight.values.push((strongest[k]?.[1]||0)/total);}
 cutCache.set(key,id);return id;
}
function split(polygon,region){
 const inside=[],outside=[],fields=polygon.map(id=>field(id,region));
 for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],fa=fields[i],fb=fields[(i+1)%polygon.length];(fa>=0?inside:outside).push(a);if((fa>=0)!==(fb>=0)){const cut=intersection(a,b,fa,fb,region);inside.push(cut);outside.push(cut);}}
 return {inside,outside};
}
function appendPolygon(target,poly){for(let i=1;i<poly.length-1;i++)if(new Set([poly[0],poly[i],poly[i+1]]).size===3)target.push(poly[0],poly[i],poly[i+1]);}
// Split through each triangle at the garment contour. Selecting whole faces by
// their centroid produced staircase cuts that stayed visible after smoothing.
for(let f=0;f<index.length;f+=3){
 const tri=[index[f],index[f+1],index[f+2]],jersey=split(tri,'jersey');appendPolygon(regions.jersey,jersey.inside);
 if(jersey.outside.length>=3){const shorts=split(jersey.outside,'shorts');appendPolygon(regions.shorts,shorts.inside);appendPolygon(regions.body,shorts.outside);}
}
source=new T.BufferGeometry();for(const [name,a]of Object.entries(attributes))source.setAttribute(name,new T.BufferAttribute(new a.type(a.values),a.itemSize,a.normalized));
p=source.attributes.position;normal=source.attributes.normal;joints=source.attributes.skinIndex;weights=source.attributes.skinWeight;
function compact(selected,offset=0,cloth=false){
 const ids=[...new Set(selected)],map=new Map(ids.map((id,i)=>[id,i])),g=new T.BufferGeometry();
 for(const [key,attr] of Object.entries(source.attributes)){
  const array=new attr.array.constructor(ids.length*attr.itemSize);
  for(let i=0;i<ids.length;i++)for(let k=0;k<attr.itemSize;k++)array[i*attr.itemSize+k]=attr.array[ids[i]*attr.itemSize+k];
  g.setAttribute(key,new T.BufferAttribute(array,attr.itemSize,attr.normalized));
 }
 const pos=g.attributes.position;
 for(let i=0;i<ids.length;i++)pos.setXYZ(i,pos.getX(i)+normal.getX(ids[i])*offset,pos.getY(i)+normal.getY(ids[i])*offset,pos.getZ(i)+normal.getZ(ids[i])*offset);
 g.setIndex(selected.map(id=>map.get(id)));
 if(cloth){
  // UV/normal seams split vertex indices. Match physical positions to avoid
  // mistaking every split seam for a garment opening.
  const edges=new Map();for(let i=0;i<selected.length;i+=3)for(const [a,b]of [[selected[i],selected[i+1]],[selected[i+1],selected[i+2]],[selected[i+2],selected[i]]]){const ka=pointKey(a),kb=pointKey(b),key=ka<kb?ka+':'+kb:kb+':'+ka;const edge=edges.get(key);if(edge)edge.n++;else edges.set(key,{a,b,n:1});}
  const boundary=new Set();for(const e of edges.values())if(e.n===1){boundary.add(e.a);boundary.add(e.b);}
  // Smooth the physical cut contour before generating its binding. Skin and
  // garment share the contour so smoothing cannot open a slit between them.
  const contour=new Map(),neighbors=new Map();
  for(const e of edges.values())if(e.n===1){for(const [a,b]of [[e.a,e.b],[e.b,e.a]]){const key=pointKey(a),other=pointKey(b);contour.set(key,new T.Vector3().fromBufferAttribute(p,a));if(!neighbors.has(key))neighbors.set(key,new Set());neighbors.get(key).add(other);}}
  for(let pass=0;pass<5;pass++){const next=new Map();for(const [key,position]of contour){const adjacent=[...neighbors.get(key)];if(adjacent.length!==2){next.set(key,position);continue;}next.set(key,position.clone().multiplyScalar(.5).addScaledVector(contour.get(adjacent[0]),.25).addScaledVector(contour.get(adjacent[1]),.25));}for(const [key,position]of next)contour.set(key,position);}
  for(const [key,position]of contour)sharedContours.set(key,position);
  const contourPoint=id=>contour.get(pointKey(id))||new T.Vector3().fromBufferAttribute(p,id);
  for(let i=0;i<ids.length;i++){const smooth=contour.get(pointKey(ids[i]));if(smooth)pos.setXYZ(i,smooth.x+normal.getX(ids[i])*offset,smooth.y+normal.getY(ids[i])*offset,smooth.z+normal.getZ(ids[i])*offset);}
  const color=new Float32Array(ids.length*3);for(let i=0;i<ids.length;i++){const value=boundary.has(ids[i])?.84:.92+.04*Math.sin(pos.getY(i)*81+pos.getX(i)*17);color.set([value,value,value],i*3);}g.setAttribute('color',new T.BufferAttribute(color,3));
  // A narrow raised binding follows each actual cut edge, using the same weights.
  const ribbon=[],ribbonIndices=[],ribbonJoints=[],ribbonWeights=[],ribbonUv=[];
  for(const e of edges.values())if(e.n===1){
   const va=contourPoint(e.a),vb=contourPoint(e.b),na=new T.Vector3().fromBufferAttribute(normal,e.a),nb=new T.Vector3().fromBufferAttribute(normal,e.b),base=ribbon.length/3;
   // Close the shell against the matching skin contour. A shallow strip only
   // covered the cloth thickness, leaving a visible slit around the shoulder.
   ribbon.push(...va.clone().addScaledVector(na,offset+.001).toArray(),...vb.clone().addScaledVector(nb,offset+.001).toArray(),...va.clone().addScaledVector(na,-.001).toArray(),...vb.clone().addScaledVector(nb,-.001).toArray());
   ribbonIndices.push(base,base+1,base+2,base+2,base+1,base+3);
   // A small neutral atlas patch with non-degenerate UVs allows portable
   // tangent-space shading on the binding, including mobile WebGL drivers.
   ribbonUv.push(.992,.996,.996,.996,.992,.998,.996,.998);
   for(const id of [e.a,e.b,e.a,e.b])for(let k=0;k<4;k++){ribbonJoints.push(joints.array[id*4+k]);ribbonWeights.push(weights.array[id*4+k]);}
  }
  const binding=new T.BufferGeometry();binding.setAttribute('position',new T.Float32BufferAttribute(ribbon,3));binding.setAttribute('uv',new T.Float32BufferAttribute(ribbonUv,2));binding.setAttribute('skinIndex',new T.Uint16BufferAttribute(ribbonJoints,4));binding.setAttribute('skinWeight',new T.Float32BufferAttribute(ribbonWeights,4));binding.setIndex(ribbonIndices);binding.computeVertexNormals();g.userData.binding=binding;
 }
 if(!cloth)for(let i=0;i<ids.length;i++){const smooth=sharedContours.get(pointKey(ids[i]));if(smooth)pos.setXYZ(i,smooth.x,smooth.y,smooth.z);}
 if(cloth)g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}
const clothes=[['jersey','#09832c',.012],['shorts','#101e30',.016]].map(([name,color,offset])=>({name,color,geometry:compact(regions[name],offset,true)}));
body.geometry=compact(regions.body);body.name='MakeHuman_Athlete_Body';body.material=new T.MeshStandardMaterial({color:'#a77250',roughness:.78});
function addSkin(name,geometry,material){const mesh=new T.SkinnedMesh(geometry,material);mesh.name=name;mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);body.parent.add(mesh);mesh.bind(body.skeleton,body.bindMatrix);return mesh;}
for(const {name,color,geometry:g}of clothes){
 const binding=g.userData.binding;delete g.userData.binding;
 addSkin('Athlete_'+name,g,new T.MeshStandardMaterial({color,vertexColors:true,roughness:.94,side:T.DoubleSide}));
 addSkin('Athlete_'+name+'_binding',binding,new T.MeshStandardMaterial({color:name==='jersey'?'#ad292b':'#18273c',roughness:.95,side:T.DoubleSide}));
}
root.updateMatrixWorld(true);
const data=await new GLTFExporter().parseAsync(root,{binary:true,animations:[],onlyVisible:false});
const output=process.argv[2]||path.join(os.tmpdir(),'tuk-ngo-athlete-clothed.glb');await fs.writeFile(output,Buffer.from(data));
console.log(JSON.stringify({output,bytes:data.byteLength,sourceTriangles:index.length/3,regions:Object.fromEntries(Object.entries(regions).map(([k,v])=>[k,v.length/3])),bones:body.skeleton.bones.length}));
