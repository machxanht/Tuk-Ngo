import * as T from 'three';
import {MeshoptSimplifier} from 'meshoptimizer/simplifier';

/** Derived display indices; original attributes, source files and rigs stay intact. */
export async function displayLod(source,ratio=.25,error=.03,compact=false){
 await MeshoptSimplifier.ready;
 const positions=source.attributes.position;
 const input=source.index?Uint32Array.from(source.index.array):Uint32Array.from({length:positions.count},(_,i)=>i);
 const target=Math.max(36,Math.floor(input.length*ratio/3)*3);
 const [indices]=MeshoptSimplifier.simplify(input,Float32Array.from(positions.array),3,target,error,['Permissive']);
 const geometry=new T.BufferGeometry();for(const [name,attribute] of Object.entries(source.attributes))geometry.setAttribute(name,attribute);
 if(compact){const ids=[...new Set(indices)],remap=new Map(ids.map((id,i)=>[id,i]));for(const [name,a]of Object.entries(source.attributes)){const array=new a.array.constructor(ids.length*a.itemSize);for(let i=0;i<ids.length;i++)for(let c=0;c<a.itemSize;c++)array[i*a.itemSize+c]=a.array[ids[i]*a.itemSize+c];geometry.setAttribute(name,new T.BufferAttribute(array,a.itemSize,a.normalized));}geometry.setIndex(Array.from(indices,id=>remap.get(id)));}else geometry.setIndex(new T.BufferAttribute(indices,1));geometry.boundingBox=source.boundingBox;geometry.boundingSphere=source.boundingSphere;
 return geometry;
}
