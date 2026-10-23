import * as T from 'three';

/** Cache head-only geometry in the portable head bone's bind coordinates. */
export function createCharacterHeads(models){
 const parts={d:[],f:[]},bodies=new Map(),owned=new Set();
 for(const model of ['d','f'])models[model].scene.traverse(source=>{
  if(!source.isSkinnedMesh||/shirt|pants/i.test(source.name))return;
  const skeleton=source.skeleton,headId=skeleton.bones.findIndex(b=>b.name==='head');if(headId<0)return;
  const geometry=source.geometry,indices=geometry.index?.array||Uint32Array.from({length:geometry.attributes.position.count},(_,i)=>i),joints=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight;
  const selected=new Uint8Array(joints.count);
  for(let i=0;i<joints.count;i++){let weight=0;for(let k=0;k<4;k++)if(joints.getComponent(i,k)===headId)weight+=weights.getComponent(i,k);selected[i]=weight>.55?1:0;}
  const head=[],body=[];
  for(let i=0;i<indices.length;i+=3){const target=selected[indices[i]]||selected[indices[i+1]]||selected[indices[i+2]]?head:body;target.push(indices[i],indices[i+1],indices[i+2]);}
  if(model==='d'){const g=geometry.clone();g.setIndex(body);g.computeBoundingSphere();bodies.set(source.uuid,g);owned.add(g);}
  if(!head.length)return;
  const matrix=skeleton.boneInverses[headId].clone().multiply(source.bindMatrix);
  // Fit F's broader head into the same neck/height envelope; body is unchanged.
  if(model==='f')matrix.premultiply(new T.Matrix4().makeScale(.78,.90,.80));
  const g=geometry.clone();g.setIndex(head);g.applyMatrix4(matrix);
  const linear=new T.Matrix3().setFromMatrix4(matrix),normal=new T.Matrix3().getNormalMatrix(matrix),point=new T.Vector3();
  for(const [name,attributes]of Object.entries(g.morphAttributes))for(const attribute of attributes)for(let i=0;i<attribute.count;i++){
   point.fromBufferAttribute(attribute,i);
   if(name==='position'){if(g.morphTargetsRelative)point.applyMatrix3(linear);else point.applyMatrix4(matrix);}
   if(name==='normal')point.applyMatrix3(normal);
   attribute.setXYZ(i,point.x,point.y,point.z);
  }
  g.deleteAttribute('skinIndex');g.deleteAttribute('skinWeight');g.computeBoundingSphere();owned.add(g);
  parts[model].push({geometry:g,material:source.material,nativeHair:/Hair_SimpleParted|hair_base/.test(source.name),dictionary:source.morphTargetDictionary});
 });
 return{parts,bodyGeometry:source=>bodies.get(source.uuid)||source.geometry,dispose(){for(const geometry of owned)geometry.dispose();}};
}
