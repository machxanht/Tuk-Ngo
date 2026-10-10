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
const source=body.geometry,p=source.attributes.position,normal=source.attributes.normal,joints=source.attributes.skinIndex,weights=source.attributes.skinWeight,index=source.index.array;
const regions={body:[],jersey:[],shorts:[]};
const skeletonNames=body.skeleton.bones.map(b=>b.name);
for(let f=0;f<index.length;f+=3){
 const tri=[index[f],index[f+1],index[f+2]],c=new T.Vector3();let arm=0;
 for(const i of tri){c.add(new T.Vector3().fromBufferAttribute(p,i));for(let k=0;k<4;k++){const name=skeletonNames[joints.array[i*4+k]]||'';if(name.includes('upperarm')||name.includes('lowerarm'))arm+=weights.array[i*4+k]/3;}}
 c.multiplyScalar(1/3);const top=1.405-.075*Math.max(0,1-Math.abs(c.x)/.105)**2;
 const region=c.y>.91&&c.y<top&&Math.abs(c.x)<.24&&arm<.30?'jersey':c.y>.61&&c.y<.955&&Math.abs(c.x)<.30?'shorts':'body';regions[region].push(...tri);
}
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
  const pointKey=id=>[p.getX(id),p.getY(id),p.getZ(id)].map(v=>Math.round(v*1e6)).join(',');
  const edges=new Map();for(let i=0;i<selected.length;i+=3)for(const [a,b]of [[selected[i],selected[i+1]],[selected[i+1],selected[i+2]],[selected[i+2],selected[i]]]){const ka=pointKey(a),kb=pointKey(b),key=ka<kb?ka+':'+kb:kb+':'+ka;const edge=edges.get(key);if(edge)edge.n++;else edges.set(key,{a,b,n:1});}
  const boundary=new Set();for(const e of edges.values())if(e.n===1){boundary.add(e.a);boundary.add(e.b);}
  // Smooth the physical cut contour before generating its binding. Centroid
  // face selection follows triangle edges, so an unsmoothed edge looks torn.
  const contour=new Map(),neighbors=new Map();
  for(const e of edges.values())if(e.n===1){for(const [a,b]of [[e.a,e.b],[e.b,e.a]]){const key=pointKey(a),other=pointKey(b);contour.set(key,new T.Vector3().fromBufferAttribute(p,a));if(!neighbors.has(key))neighbors.set(key,new Set());neighbors.get(key).add(other);}}
  for(let pass=0;pass<5;pass++){const next=new Map();for(const [key,position]of contour){const adjacent=[...neighbors.get(key)];if(adjacent.length!==2){next.set(key,position);continue;}next.set(key,position.clone().multiplyScalar(.5).addScaledVector(contour.get(adjacent[0]),.25).addScaledVector(contour.get(adjacent[1]),.25));}for(const [key,position]of next)contour.set(key,position);}
  const contourPoint=id=>contour.get(pointKey(id))||new T.Vector3().fromBufferAttribute(p,id);
  for(let i=0;i<ids.length;i++){const smooth=contour.get(pointKey(ids[i]));if(smooth)pos.setXYZ(i,smooth.x+normal.getX(ids[i])*offset,smooth.y+normal.getY(ids[i])*offset,smooth.z+normal.getZ(ids[i])*offset);}
  const color=new Float32Array(ids.length*3);for(let i=0;i<ids.length;i++){const value=boundary.has(ids[i])?.84:.92+.04*Math.sin(pos.getY(i)*81+pos.getX(i)*17);color.set([value,value,value],i*3);}g.setAttribute('color',new T.BufferAttribute(color,3));
  // A narrow raised binding follows each actual cut edge, using the same weights.
  const ribbon=[],ribbonIndices=[],ribbonJoints=[],ribbonWeights=[];
  for(const e of edges.values())if(e.n===1){
   const va=contourPoint(e.a),vb=contourPoint(e.b),na=new T.Vector3().fromBufferAttribute(normal,e.a),nb=new T.Vector3().fromBufferAttribute(normal,e.b),base=ribbon.length/3;
   ribbon.push(...va.clone().addScaledVector(na,offset+.001).toArray(),...vb.clone().addScaledVector(nb,offset+.001).toArray(),...va.clone().addScaledVector(na,offset-.004).toArray(),...vb.clone().addScaledVector(nb,offset-.004).toArray());
   ribbonIndices.push(base,base+1,base+2,base+2,base+1,base+3);
   for(const id of [e.a,e.b,e.a,e.b])for(let k=0;k<4;k++){ribbonJoints.push(joints.array[id*4+k]);ribbonWeights.push(weights.array[id*4+k]);}
  }
  const binding=new T.BufferGeometry();binding.setAttribute('position',new T.Float32BufferAttribute(ribbon,3));binding.setAttribute('skinIndex',new T.Uint16BufferAttribute(ribbonJoints,4));binding.setAttribute('skinWeight',new T.Float32BufferAttribute(ribbonWeights,4));binding.setIndex(ribbonIndices);binding.computeVertexNormals();g.userData.binding=binding;
 }
 if(cloth)g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}
body.geometry=compact(regions.body);body.name='MakeHuman_Athlete_Body';body.material=new T.MeshStandardMaterial({color:'#a77250',roughness:.78});
function addSkin(name,geometry,material){const mesh=new T.SkinnedMesh(geometry,material);mesh.name=name;mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);body.parent.add(mesh);mesh.bind(body.skeleton,body.bindMatrix);return mesh;}
for(const [name,color,offset]of [['jersey','#137649',.012],['shorts','#263c42',.016]]){
 const g=compact(regions[name],offset,true),binding=g.userData.binding;delete g.userData.binding;
 addSkin('Athlete_'+name,g,new T.MeshStandardMaterial({color,vertexColors:true,roughness:.94,side:T.DoubleSide}));
 addSkin('Athlete_'+name+'_binding',binding,new T.MeshStandardMaterial({color:'#d6d4b9',roughness:.95,side:T.DoubleSide}));
}
root.updateMatrixWorld(true);
const data=await new GLTFExporter().parseAsync(root,{binary:true,animations:[],onlyVisible:false});
const output=process.argv[2]||path.join(os.tmpdir(),'tuk-ngo-athlete-clothed.glb');await fs.writeFile(output,Buffer.from(data));
console.log(JSON.stringify({output,bytes:data.byteLength,sourceTriangles:index.length/3,regions:Object.fromEntries(Object.entries(regions).map(([k,v])=>[k,v.length/3])),bones:body.skeleton.bones.length}));
