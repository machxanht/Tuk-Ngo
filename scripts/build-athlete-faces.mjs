import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTTextureWebP} from '@gltf-transform/extensions';
import {copyToDocument,createDefaultPropertyResolver,compactPrimitive,weldPrimitive,simplifyPrimitive,dedup,prune} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import * as T from 'three';
import {FACE_IDENTITIES} from '../src/race/character-identity.mjs';

// Heads only: never rewrite the original athlete, equipment, shirt or motion.
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),out=new Document(),buffer=out.createBuffer(),scene=out.createScene('Athlete faces');
const skin=out.createMaterial('Native athlete face skin').setBaseColorFactor([.56,.31,.15,1]).setRoughnessFactor(.85);
out.createExtension(EXTTextureWebP).setRequired(true);
await MeshoptSimplifier.ready;
for(const model of ['d','f']){
 const source=await io.read('public/assets/character-comparison/'+model+'.glb'),resolve=createDefaultPropertyResolver(out,source);
 const scale=model==='d'?[.944,.90,.96]:[.617,.72,.87],offset=model==='d'?[0,-.055,-.004]:[0,-.035,-.027];
 for(const [profile,weights] of FACE_IDENTITIES.entries()){
  const root=out.createNode(model.toUpperCase()+'_'+profile);scene.addChild(root);
  for(const node of source.getRoot().listNodes()){
   if(!node.getSkin()||!node.getMesh()||/hair|shirt|pants/i.test(node.getName()))continue;
   const joints=node.getSkin().listJoints(),headId=joints.findIndex(j=>j.getName()==='head');if(headId<0)continue;
   const inv=node.getSkin().getInverseBindMatrices(),matrix=new T.Matrix4().fromArray(inv.getArray(),headId*16).multiply(new T.Matrix4().fromArray(node.getWorldMatrix()));
   matrix.premultiply(new T.Matrix4().compose(new T.Vector3(...offset),new T.Quaternion(),new T.Vector3(...scale)));
   const normalMatrix=new T.Matrix3().getNormalMatrix(matrix),mesh=out.createMesh(node.getName()),names=node.getMesh().getExtras().targetNames||[];
   for(const primitive of node.getMesh().listPrimitives()){
    const pos=primitive.getAttribute('POSITION'),normal=primitive.getAttribute('NORMAL'),j=primitive.getAttribute('JOINTS_0'),w=primitive.getAttribute('WEIGHTS_0'),indices=primitive.getIndices()?.getArray()||Uint32Array.from({length:pos.getCount()},(_,i)=>i),selected=[];
    const isHead=i=>{let amount=0;for(let k=0;k<4;k++)if(j.getArray()[i*4+k]===headId)amount+=w.getArray()[i*4+k];return amount>.55;};
    for(let i=0;i<indices.length;i+=3)if(isHead(indices[i])||isHead(indices[i+1])||isHead(indices[i+2]))selected.push(indices[i],indices[i+1],indices[i+2]);
    if(!selected.length)continue;
    const positions=new Float32Array(pos.getArray()),normals=new Float32Array(normal.getArray()),point=new T.Vector3();
    for(let i=0;i<pos.getCount();i++){
     point.fromArray(positions,i*3);
     for(const [name,amount] of Object.entries(weights)){const target=primitive.listTargets()[names.indexOf(name)]?.getAttribute('POSITION');if(target)point.addScaledVector(new T.Vector3().fromArray(target.getArray(),i*3),amount);}
     point.applyMatrix4(matrix);
     if(point.y>.08)point.y=.08+(point.y-.08)*(model==='d'?1.24:1.29);
     point.toArray(positions,i*3);point.fromArray(normals,i*3).applyMatrix3(normalMatrix).normalize().toArray(normals,i*3);
    }
    const accessor=(name,array,type)=>out.createAccessor(name).setType(type).setArray(array).setBuffer(buffer);
    const p=out.createPrimitive().setAttribute('POSITION',accessor('Head position',positions,'VEC3')).setAttribute('NORMAL',accessor('Head normal',normals,'VEC3')).setIndices(accessor('Head triangles',new Uint32Array(selected),'SCALAR'));
    const sourceMaterial=primitive.getMaterial(),isSkin=/Superhero_Male|Snow portable skin/i.test(sourceMaterial.getName());
    if(isSkin)p.setMaterial(skin);else{
     const copied=copyToDocument(out,source,[sourceMaterial],resolve).get(sourceMaterial);
     copied.setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null);
     p.setMaterial(copied);
     const uv=primitive.getAttribute('TEXCOORD_0');if(uv)p.setAttribute('TEXCOORD_0',accessor('Head UV',new Float32Array(uv.getArray()),'VEC2'));
    }
    compactPrimitive(p);weldPrimitive(p,{tolerance:0});
    const budget=isSkin?2400:/eyes$/i.test(node.getName())?400:/eyebrows/i.test(node.getName())?200:90;
    simplifyPrimitive(p,{simplifier:MeshoptSimplifier,ratio:Math.min(1,budget/(p.getIndices().getCount()/3)),error:.007,lockBorder:true});
    mesh.addPrimitive(p);
   }
   if(mesh.listPrimitives().length)root.addChild(out.createNode(node.getName()).setMesh(mesh));else mesh.dispose();
  }
 }
}
await out.transform(dedup(),prune());
const bytes=await io.writeBinary(out),path='public/assets/character-comparison/athlete-faces.glb',digest=createHash('sha256').update(bytes).digest('hex');
await writeFile(path,bytes);
const digestsPath='src/race/asset-digests.mjs',old=await readFile(digestsPath,'utf8'),line=`export const athleteFacesDigest='${digest}';`;
await writeFile(digestsPath,old.includes('export const athleteFacesDigest=')?old.replace(/export const athleteFacesDigest='[^']*';/,line):old.trimEnd()+'\n'+line+'\n');
console.log('Head-only library: '+bytes.length+' bytes; old athlete GLBs unchanged');
