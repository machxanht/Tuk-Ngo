import * as T from 'three';

// Derive the collar from the approved mesh boundary. This only adds a shader
// attribute; endpoint positions, normals, weights and all triangle indices stay
// unchanged. An analytic neckline field used to paint entire upper triangles.
export function finishAthleteShirt(asset){
 const g=asset.geometry,p=g.attributes.position,edges=new Map(),adjacent=new Map();
 for(let f=0;f<g.index.count;f+=3)for(let k=0;k<3;k++){
  const a=g.index.getX(f+k),b=g.index.getX(f+(k+1)%3),key=a<b?`${a}:${b}`:`${b}:${a}`;
  const edge=edges.get(key);if(edge)edge.count++;else edges.set(key,{a,b,count:1});
 }
 for(const {a,b,count}of edges.values())if(count===1){if(!adjacent.has(a))adjacent.set(a,[]);if(!adjacent.has(b))adjacent.set(b,[]);adjacent.get(a).push(b);adjacent.get(b).push(a);}
 const unseen=new Set(adjacent.keys()),loops=[];
 while(unseen.size){const stack=[unseen.values().next().value],loop=[];while(stack.length){const i=stack.pop();if(!unseen.delete(i))continue;loop.push(i);stack.push(...adjacent.get(i));}loops.push(loop);}
 if(loops.length!==4)throw Error('Approved shirt must keep four boundary loops');
 const collar=loops.sort((a,b)=>b.reduce((s,i)=>s+p.getY(i),0)/b.length-a.reduce((s,i)=>s+p.getY(i),0)/a.length)[0],collarSet=new Set(collar);
 const segments=[...edges.values()].filter(e=>e.count===1&&collarSet.has(e.a)&&collarSet.has(e.b)).map(e=>[new T.Vector3().fromBufferAttribute(p,e.a),new T.Vector3().fromBufferAttribute(p,e.b)]);
 const distances=new Float32Array(p.count),point=new T.Vector3(),axis=new T.Vector3(),near=new T.Vector3();
 for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i);let distance=Infinity;for(const [a,b]of segments){axis.subVectors(b,a);const amount=T.MathUtils.clamp(near.subVectors(point,a).dot(axis)/axis.lengthSq(),0,1);distance=Math.min(distance,near.copy(a).addScaledVector(axis,amount).distanceTo(point));}distances[i]=distance;}
 g.setAttribute('collarDistance',new T.BufferAttribute(distances,1));
 const materials=new WeakSet(),original=asset.material;
 asset.material=palette=>{
  const material=original(palette);if(materials.has(material))return material;materials.add(material);
  const compile=material.onBeforeCompile;
  material.onBeforeCompile=shader=>{
   compile(shader);
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float collarDistance; varying float vCollarDistance;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCollarDistance=collarDistance;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vCollarDistance;').replace('if(abs(vShirtPoint.x)<.14 && neck-vShirtPoint.y<.011) diffuseColor.rgb=shirt_trim;','diffuseColor.rgb=mix(diffuseColor.rgb,shirt_trim,1.0-smoothstep(.004,.008,vCollarDistance));');
  };
  return material;
 };
 return asset;
}
