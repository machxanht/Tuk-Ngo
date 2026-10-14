import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';

// Development-only GLB exporter. Convert the runtime painted shader to ordinary
// glTF materials, keeping the current geometry, garment weights, UVs and clip.
window.exportAthleteV31=async function({posture='seated',face=2,teamId='tum-nup-2'}={}){
 const h=illustratedPreview.hybrid;await h.prepareTeams([teamId]);h.render(0,0,{study:true,posture,faceVariant:face,teamId});
 const a=h.actors.find(a=>['seated','standing'].includes(posture)?a.role==='rower'&&a.posture===posture&&a.side===-1:a.role===posture),g=a.skin.geometry.clone(),palette=a.palette;
 for(let i=0;i<g.attributes.skinWeight.count;i++){let sum=0;for(let k=0;k<4;k++){if(g.attributes.skinWeight.getComponent(i,k)<.5/65535){g.attributes.skinIndex.setComponent(i,k,0);g.attributes.skinWeight.setComponent(i,k,0);}sum+=g.attributes.skinWeight.getComponent(i,k);}for(let k=0;k<4;k++)g.attributes.skinWeight.setComponent(i,k,g.attributes.skinWeight.getComponent(i,k)/sum);}
 const rig=clone(a.master.root);let reference;rig.traverse(o=>{if(o.isSkinnedMesh&&!reference)reference=o;});const skeleton=reference.skeleton;const old=[];rig.traverse(o=>{if(o.isMesh)old.push(o);});old.forEach(o=>o.removeFromParent());rig.visible=true;
 const paddleRoot=rig.getObjectByName('Dam_Wood_152cm');
 if(paddleRoot&&a.paddle){paddleRoot.visible=true;for(const part of a.paddle.children){const copy=part.clone(true);copy.traverse(o=>{o.visible=true;if(o.isMesh)o.material=new T.MeshStandardMaterial({name:o.material.name||'Wood_Paddle',color:o.material.color,map:o.material.map,side:T.DoubleSide,roughness:1});});paddleRoot.add(copy);}}
 else paddleRoot?.removeFromParent();
 const scene=new T.Scene();scene.name='Ghe_Ngo_Athlete_V31';scene.add(rig);
 const pos=g.attributes.facePoint,zone=g.attributes.paintZone,col=g.attributes.color,mix=g.attributes.shirtMix,hair=g.attributes.hair,beard=g.attributes.beard;
 const skinTexture=a.skin.material.userData.skinMap;
 if(!skinTexture)throw Error('Skin source texture required for GLB');
 const materials=[new T.MeshStandardMaterial({name:'Generic_MakeHuman_Skin_CC0',map:skinTexture,vertexColors:true,roughness:1}),new T.MeshStandardMaterial({name:'Painted_Kit_V31',vertexColors:true,roughness:1})];materials.forEach(m=>m.side=T.DoubleSide);
 const smooth=(x,a,b)=>T.MathUtils.smoothstep(x,a,b),skin=new T.Color(),dark=new T.Color().setRGB(.034,.026,.019),jersey=new T.Color(palette.jersey),lower=new T.Color(palette.lower),trim=new T.Color(palette.trim),cap=new T.Color(palette.cap),shorts=new T.Color(palette.shorts),sleeve=new T.Color(palette.sleeve||palette.jersey);
 for(let i=0;i<col.count;i++){
  const z=zone.getX(i);if(z===1){
   const shade=T.MathUtils.clamp(col.getX(i)/.56,.65,1.3)*.75;skin.setRGB(shade,shade,shade);
   if(hair.getX(i)>.5){const style=hair.getX(i),x=pos.getX(i),y=pos.getY(i),depth=pos.getZ(i),line=style<1.5?.063:style<2.5?.056:style<3.5?.052:.058+.002*Math.sin(x*160),mask=smooth(y,line-.002,line+.002)*Math.max(smooth(Math.abs(x),.053,.067)*(1-smooth(depth,.025,.052)),1-smooth(depth,-.018,-.008));skin.lerp(dark,mask);}
   if(beard.getX(i)>0){const x=pos.getX(i),y=pos.getY(i),depth=pos.getZ(i),front=smooth(depth,.035,.075),jaw=(1-smooth(y,-.032,-.014))*smooth(y,-.089,-.065),mustache=Math.exp(-((x/.023)**2)-(((y+.016)/.004)**2)),amount=beard.getX(i)*front*Math.max(jaw*.48,mustache*.55);skin.multiplyScalar(1-amount*.64);}
   col.setXYZ(i,skin.r,skin.g,skin.b);
  }else{const c=z===2?cap:z===3||z===4?lower.clone().lerp(jersey,mix.getX(i)):z===5||z===8?trim:z===6?shorts:z===7?sleeve:null;if(c)col.setXYZ(i,c.r,c.g,c.b);}
 }
 const groups=[[],[]],ix=g.index;for(let i=0;i<ix.count;i+=3){const z=zone.getX(ix.getX(i));if(z===7&&!palette.sleeve||z===8&&palette.sleeve)continue;groups[z===1?0:1].push(ix.getX(i),ix.getX(i+1),ix.getX(i+2));}
 g.setIndex(groups.flat());g.clearGroups();g.addGroup(0,groups[0].length,0);g.addGroup(groups[0].length,groups[1].length,1);
 const correctiveTimes=[],correctiveValues=[],cuffPairs=palette.sleeve?g.userData.garmentPairs.filter(p=>p[1].length===2):[],targetCount=cuffPairs.length?9:0;
 if(targetCount){
  const position=g.attributes.position,normal=g.attributes.normal,joints=g.attributes.skinIndex,weights=g.attributes.skinWeight,point=new T.Vector3(),target=new T.Vector3(),matrix=new T.Matrix4();g.morphTargetsRelative=true;g.morphAttributes.position=[];
  function posed(i,sourcePoint,bones){const out=new T.Vector3();for(let k=0;k<4;k++)out.addScaledVector(sourcePoint.clone().applyMatrix4(new T.Matrix4().fromArray(bones,joints.getComponent(i,k)*16)),weights.getComponent(i,k));return out;}
  for(let frame=0;frame<targetCount;frame++){
   const phase=frame/(targetCount-1);h.render(phase===1?0:phase,phase,{study:true,posture,faceVariant:face,teamId});const bones=a.master.skeleton.boneMatrices,delta=new Float32Array(position.count*3);
   for(const [i,source]of cuffPairs){target.set(0,0,0);for(const [k,amount]of source){point.fromBufferAttribute(position,k).addScaledVector(new T.Vector3().fromBufferAttribute(normal,k),.0045);target.addScaledVector(posed(k,point,bones),amount);}matrix.elements.fill(0);for(let k=0;k<4;k++){const off=joints.getComponent(i,k)*16,amount=weights.getComponent(i,k);for(let n=0;n<16;n++)matrix.elements[n]+=bones[off+n]*amount;}point.copy(target).applyMatrix4(matrix.invert()).sub(new T.Vector3().fromBufferAttribute(position,i));delta.set(point.toArray(),i*3);}
   g.morphAttributes.position.push(new T.BufferAttribute(delta,3));correctiveTimes.push(phase*a.master.clip.duration);for(let target=0;target<targetCount;target++)correctiveValues.push(target===frame?1:0);
  }
 }
 for(const name of Object.keys(g.attributes))if(!['position','normal','uv','skinIndex','skinWeight','color'].includes(name))g.deleteAttribute(name);
 const body=new T.SkinnedMesh(g,materials);body.name='Athlete_Current_V31';body.bindMode='detached';body.bind(skeleton,new T.Matrix4());body.frustumCulled=false;scene.add(body);
 if(targetCount)body.morphTargetInfluences[0]=1;
 for(const original of a.group.children.filter(o=>o.isSkinnedMesh&&o!==a.skin)){const decal=new T.SkinnedMesh(original.geometry.clone(),new T.MeshStandardMaterial({name:original.material.name||'Khmer_Kit_Print',color:original.material.color,map:original.material.map,transparent:original.material.transparent,alphaTest:original.material.alphaTest,side:T.DoubleSide,roughness:1}));decal.name='Kit_Print_'+scene.children.length;decal.bindMode='detached';decal.bind(skeleton,new T.Matrix4());for(const name of Object.keys(decal.geometry.attributes))if(!['position','normal','uv','skinIndex','skinWeight','color'].includes(name))decal.geometry.deleteAttribute(name);scene.add(decal);}
 const clip=a.master.clip.clone();clip.tracks=clip.tracks.filter(track=>{const name=T.PropertyBinding.parseTrackName(track.name).nodeName;return !!rig.getObjectByName(name);});
 if(targetCount)clip.tracks.push(new T.NumberKeyframeTrack(body.name+'.morphTargetInfluences',correctiveTimes,correctiveValues));
 scene.userData={revision:'hybrid-v31',teamId,posture,faceProfile:g.userData.face,source:'MakeHuman CC0; authored kit and continuous motion',appearance:'Current geometry and closed shoulder fit; hair/stubble converted to vertex colour for portable glTF',cuffCorrectiveTargets:targetCount,garmentPairs:palette.sleeve?g.userData.garmentPairs:[],notNamedAthleteLikeness:true};scene.updateMatrixWorld(true);
 const data=await new GLTFExporter().parseAsync(scene,{binary:true,animations:[clip],onlyVisible:true});const blob=new Blob([data],{type:'model/gltf-binary'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='athlete-'+posture+'-v31.glb';link.click();URL.revokeObjectURL(link.href);
 return {posture,teamId,face,bytes:data.byteLength,triangles:g.index.count/3,bones:skeleton.bones.length,clipTracks:clip.tracks.length,cuffCorrectiveTargets:targetCount};
};
