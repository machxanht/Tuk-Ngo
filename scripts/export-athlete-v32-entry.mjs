import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';

function cleanSkinWeights(g){
 const j=g.attributes.skinIndex,w=g.attributes.skinWeight;
 for(let i=0;i<w.count;i++){
  let sum=0;for(let k=0;k<4;k++){if(w.getComponent(i,k)<.5/65535){w.setComponent(i,k,0);j.setComponent(i,k,0);}sum+=w.getComponent(i,k);}
  if(sum<=0)throw Error('Unweighted export vertex');for(let k=0;k<4;k++)w.setComponent(i,k,w.getComponent(i,k)/sum);
 }
}
async function bakeShirtV32(a,h,skeleton,scene,options){
 if(!a.shirt?.visible)return null;
 const g=a.shirt.geometry.clone(),p=g.attributes.position,tint=g.attributes.shirtTint,palette=a.shirt.material.userData.palette;
 const colors=new Float32Array(p.count*3),jersey=new T.Color(palette.jersey),lower=new T.Color(palette.lower||palette.jersey),sleeve=new T.Color(palette.sleeve||palette.jersey),trim=new T.Color(palette.trim);
 for(let i=0;i<p.count;i++){const c=lower.clone().lerp(jersey,tint.getX(i)).lerp(sleeve,tint.getY(i)),x=p.getX(i),y=p.getY(i),z=p.getZ(i),neck=T.MathUtils.lerp(1.31+.10*(x/.085)**2,1.397+.05*(x/.085)**2,T.MathUtils.clamp((-z+.08)/.16,0,1));colors.set(c.toArray(),i*3);}
 g.setAttribute('color',new T.BufferAttribute(colors,3));cleanSkinWeights(g);
 const skinIndices=g.attributes.skinIndex,skinWeights=g.attributes.skinWeight,mat=new T.Matrix4(),point=new T.Vector3(),posed=new T.Vector3(),times=[],values=[];
 function endpoint(attribute,packed,i,bones){
  const position=new T.Vector3(attribute.getX(i),attribute.getY(i),attribute.getZ(i)),encoded=attribute.getW(i),weights=[packed[0]%4096,Math.floor(packed[0]/4096),packed[1]%4096,Math.floor(packed[1]/4096)],sum=weights.reduce((a,b)=>a+b),target=new T.Vector3();
  for(let k=0;k<4;k++)if(weights[k])target.addScaledVector(position.clone().applyMatrix4(new T.Matrix4().fromArray(bones,(Math.floor(encoded/64**k)%64)*16)),weights[k]/sum);
  return target;
 }
 g.morphTargetsRelative=true;g.morphAttributes.position=[];
 for(let frame=0;frame<97;frame++){
  const phase=frame/96;h.render(phase===1?0:phase,phase,{study:true,posture:options.posture,faceVariant:options.face,teamId:options.teamId});a.master.skeleton.update();const bones=a.master.skeleton.boneMatrices,delta=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
   const bary=g.attributes.shirtBary,w=g.attributes.shirtWeights,wc=g.attributes.shirtWeightsC,b=bary.getX(i),c=bary.getY(i);
   posed.copy(endpoint(g.attributes.shirtA,[w.getX(i),w.getY(i)],i,bones)).multiplyScalar(1-b-c);
   posed.addScaledVector(endpoint(g.attributes.shirtB,[w.getZ(i),w.getW(i)],i,bones),b);
   posed.addScaledVector(endpoint(g.attributes.shirtC,[wc.getX(i),wc.getY(i)],i,bones),c);
   mat.elements.fill(0);for(let k=0;k<4;k++){const off=skinIndices.getComponent(i,k)*16,weight=skinWeights.getComponent(i,k);for(let n=0;n<16;n++)mat.elements[n]+=bones[off+n]*weight;}
   point.copy(posed).applyMatrix4(mat.invert()).sub(new T.Vector3().fromBufferAttribute(p,i));delta.set(point.toArray(),i*3);
  }
  g.morphAttributes.position.push(new T.BufferAttribute(delta,3));times.push(phase*a.master.clip.duration);for(let target=0;target<97;target++)values.push(target===frame?1:0);
 }
 const source=g.userData.shirtV32.vertices,correspondence=source.map(v=>v.endpoints.map(e=>[e.sourceVertex,e.baryWeight]));
 const printGeometry=g.clone(),backFaces=[];for(let i=0;i<g.index.count;i+=3){const ids=[0,1,2].map(k=>g.index.getX(i+k));if(ids.some(k=>p.getZ(k)<-.035)&&ids.some(k=>p.getY(k)>1.22&&p.getY(k)<1.31)&&ids.some(k=>Math.abs(p.getX(k))<.155))backFaces.push(...ids);}
 printGeometry.setIndex(backFaces);printGeometry.deleteAttribute('color');const pp=printGeometry.attributes.position,pn=printGeometry.attributes.normal,pu=printGeometry.attributes.uv;
 for(let i=0;i<pp.count;i++){pu.setXY(i,.5-pp.getX(i)/.31,(1.31-pp.getY(i))/.09);for(let c=0;c<3;c++)pp.setComponent(i,c,pp.getComponent(i,c)+pn.getComponent(i,c)*.0006);}
 for(const name of Object.keys(printGeometry.attributes))if(!['position','normal','uv','skinIndex','skinWeight'].includes(name))printGeometry.deleteAttribute(name);printGeometry.userData={};
 const ink=a.shirt.material.userData.printTexture.clone();ink.needsUpdate=true;ink.generateMipmaps=false;ink.minFilter=T.LinearFilter;ink.wrapS=ink.wrapT=T.ClampToEdgeWrapping;
 const print=new T.SkinnedMesh(printGeometry,new T.MeshStandardMaterial({name:'Koun_Khmer_Back_Print',map:ink,transparent:true,alphaTest:.02,depthWrite:false,side:T.DoubleSide,roughness:1}));print.name='Koun_Khmer_Back_Print';print.bindMode='detached';print.bind(skeleton,new T.Matrix4());print.morphTargetInfluences[0]=1;scene.add(print);
 const exportGeometry=g;
 for(const name of Object.keys(exportGeometry.attributes))if(!['position','normal','uv','skinIndex','skinWeight','color'].includes(name))exportGeometry.deleteAttribute(name);
 exportGeometry.userData={};const material=new T.MeshStandardMaterial({name:'Connected_Shirt_Kit_V32',vertexColors:true,side:T.DoubleSide,roughness:1});
 const shirt=new T.SkinnedMesh(exportGeometry,material);shirt.name='Connected_Shirt_V32';shirt.bindMode='detached';shirt.bind(skeleton,new T.Matrix4());shirt.morphTargetInfluences[0]=1;scene.add(shirt);
 return {tracks:[shirt,print].map(mesh=>new T.NumberKeyframeTrack(mesh.name+'.morphTargetInfluences',times,values)),correspondence};
}

// Development-only GLB exporter. Convert the runtime painted shader to ordinary
// glTF materials, keeping the current geometry, garment weights, UVs and clip.
window.exportAthleteV32=async function({posture='seated',face=2,teamId='tum-nup-2'}={}){
 const h=illustratedPreview.hybrid;await h.prepareTeams([teamId]);h.render(0,0,{study:true,posture,faceVariant:face,teamId});
 const a=h.actors.find(a=>['seated','standing'].includes(posture)?a.role==='rower'&&a.posture===posture&&a.side===-1:a.role===posture),g=a.skin.geometry.clone(),palette=a.palette;
 for(let i=0;i<g.attributes.skinWeight.count;i++){let sum=0;for(let k=0;k<4;k++){if(g.attributes.skinWeight.getComponent(i,k)<.5/65535){g.attributes.skinIndex.setComponent(i,k,0);g.attributes.skinWeight.setComponent(i,k,0);}sum+=g.attributes.skinWeight.getComponent(i,k);}for(let k=0;k<4;k++)g.attributes.skinWeight.setComponent(i,k,g.attributes.skinWeight.getComponent(i,k)/sum);}
 const rig=clone(a.master.root);let reference;rig.traverse(o=>{if(o.isSkinnedMesh&&!reference)reference=o;});const skeleton=reference.skeleton;const old=[];rig.traverse(o=>{if(o.isMesh)old.push(o);});old.forEach(o=>o.removeFromParent());rig.visible=true;
 const paddleRoot=rig.getObjectByName('Dam_Wood_152cm');
 if(paddleRoot&&a.paddle){paddleRoot.visible=true;for(const part of a.paddle.children){const copy=part.clone(true);copy.traverse(o=>{o.visible=true;if(o.isMesh)o.material=new T.MeshStandardMaterial({name:o.material.name||'Wood_Paddle',color:o.material.color,map:o.material.map,side:T.DoubleSide,roughness:1});});paddleRoot.add(copy);}}
 else paddleRoot?.removeFromParent();
 const scene=new T.Scene();scene.name='Ghe_Ngo_Athlete_V32';scene.add(rig);
 const pos=g.attributes.facePoint,zone=g.attributes.paintZone,col=g.attributes.color,mix=g.attributes.shirtMix,hair=g.attributes.hair,beard=g.attributes.beard;
 const skinTexture=a.skin.material.userData.skinMap;
 if(!skinTexture)throw Error('Skin source texture required for GLB');
 const materials=[new T.MeshStandardMaterial({name:'Generic_MakeHuman_Skin_CC0',map:skinTexture,vertexColors:true,roughness:1}),new T.MeshStandardMaterial({name:'Painted_Kit_V32',vertexColors:true,roughness:1})];materials.forEach(m=>m.side=T.DoubleSide);
 const smooth=(x,a,b)=>T.MathUtils.smoothstep(x,a,b),skin=new T.Color(),dark=new T.Color().setRGB(.034,.026,.019),jersey=new T.Color(palette.jersey),lower=new T.Color(palette.lower),trim=new T.Color(palette.trim),cap=new T.Color(palette.cap),shorts=new T.Color(palette.shorts),sleeve=new T.Color(palette.sleeve||palette.jersey);
 for(let i=0;i<col.count;i++){
  const z=zone.getX(i);if(z===1){
   const shade=T.MathUtils.clamp(col.getX(i)/.56,.65,1.3)*.75;skin.setRGB(shade,shade,shade);
   if(hair.getX(i)>.5){const style=hair.getX(i),x=pos.getX(i),y=pos.getY(i),depth=pos.getZ(i),line=style<1.5?.063:style<2.5?.056:style<3.5?.052:.058+.002*Math.sin(x*160),mask=smooth(y,line-.002,line+.002)*Math.max(smooth(Math.abs(x),.053,.067)*(1-smooth(depth,.025,.052)),1-smooth(depth,-.018,-.008));skin.lerp(dark,mask);}
   if(beard.getX(i)>0){const x=pos.getX(i),y=pos.getY(i),depth=pos.getZ(i),front=smooth(depth,.035,.075),jaw=(1-smooth(y,-.032,-.014))*smooth(y,-.089,-.065),mustache=Math.exp(-((x/.023)**2)-(((y+.016)/.004)**2)),amount=beard.getX(i)*front*Math.max(jaw*.48,mustache*.55);skin.multiplyScalar(1-amount*.64);}
   col.setXYZ(i,skin.r,skin.g,skin.b);
  }else{const c=z===2?cap:z===3||z===4?lower.clone().lerp(jersey,mix.getX(i)):z===5||z===8?trim:z===6?shorts:z===7?sleeve:null;if(c)col.setXYZ(i,c.r,c.g,c.b);}
 }
 const groups=[[],[]],ix=g.index;for(let i=0;i<ix.count;i+=3){const z=zone.getX(ix.getX(i));if(palette.sleeve&&[3,4,5,7,8,9].includes(z)||z===7&&!palette.sleeve||z===9&&!palette.frontPrint)continue;groups[z===1?0:1].push(ix.getX(i),ix.getX(i+1),ix.getX(i+2));}
 g.setIndex(groups.flat());g.clearGroups();g.addGroup(0,groups[0].length,0);g.addGroup(groups[0].length,groups[1].length,1);
 for(const name of Object.keys(g.attributes))if(!['position','normal','uv','skinIndex','skinWeight','color'].includes(name))g.deleteAttribute(name);
 const body=new T.SkinnedMesh(g,materials);body.name='Athlete_Current_V32';body.bindMode='detached';body.bind(skeleton,new T.Matrix4());body.frustumCulled=false;scene.add(body);
 const shirtExport=await bakeShirtV32(a,h,skeleton,scene,{posture,face,teamId});
 for(const original of a.group.children.filter(o=>o.isSkinnedMesh&&o!==a.skin&&o!==a.shirt&&o.visible)){const decal=new T.SkinnedMesh(original.geometry.clone(),new T.MeshStandardMaterial({name:original.material.name||'Khmer_Kit_Print',color:original.material.color,map:original.material.map,transparent:original.material.transparent,alphaTest:original.material.alphaTest,side:T.DoubleSide,roughness:1}));decal.name='Kit_Print_'+scene.children.length;decal.bindMode='detached';decal.bind(skeleton,new T.Matrix4());for(const name of Object.keys(decal.geometry.attributes))if(!['position','normal','uv','skinIndex','skinWeight','color'].includes(name))decal.geometry.deleteAttribute(name);scene.add(decal);}
 const clip=a.master.clip.clone();clip.tracks=clip.tracks.filter(track=>{const name=T.PropertyBinding.parseTrackName(track.name).nodeName;return !!rig.getObjectByName(name);});
 if(shirtExport)clip.tracks.push(...shirtExport.tracks);
 scene.userData={revision:'hybrid-v32',teamId,posture,faceProfile:g.userData.face,source:'MakeHuman CC0; authored kit and continuous motion',appearance:'Current connected shirt geometry with original endpoint skinning; hair/stubble converted to vertex colour for portable glTF',shirtMorphTargets:shirtExport?97:0,shirtCorrespondence:shirtExport?.correspondence||[],shirtBodyOffset:0,notNamedAthleteLikeness:true};scene.updateMatrixWorld(true);
 const data=await new GLTFExporter().parseAsync(scene,{binary:true,animations:[clip],onlyVisible:true});const blob=new Blob([data],{type:'model/gltf-binary'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='athlete-'+posture+'-v32.glb';link.click();URL.revokeObjectURL(link.href);
 return {posture,teamId,face,bytes:data.byteLength,triangles:g.index.count/3,bones:skeleton.bones.length,clipTracks:clip.tracks.length,shirtMorphTargets:shirtExport?97:0};
};
