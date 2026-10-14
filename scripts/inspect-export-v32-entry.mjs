import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
window.inspectExportV32=async function(url,phase,face=false,back=false,diagnostic=null){
 const asset=await new GLTFLoader().loadAsync(url),scene=new T.Scene();scene.background=new T.Color('#e7e8db');scene.add(asset.scene);scene.add(new T.HemisphereLight('#fff8e4','#d7c5a4',2.1));const sun=new T.DirectionalLight('#ffedcd',1.05);sun.position.set(5,12,-8);scene.add(sun);
 const mixer=new T.AnimationMixer(asset.scene);if(!asset.animations.length)throw Error('Missing exported animation');mixer.clipAction(asset.animations[0]).play();mixer.setTime(asset.animations[0].duration*phase);scene.updateMatrixWorld(true);
 let skin;asset.scene.traverse(o=>{if(o.isSkinnedMesh&&!skin)skin=o;});const head=skin.skeleton.bones.find(b=>b.name==='head').getWorldPosition(new T.Vector3()),target=face?head.clone().add(new T.Vector3(0,.06,0)):new T.Vector3(0,.9,0),span=face?1.05:3.2;
 let maxGarmentGap=0,shirt;asset.scene.traverse(o=>{if(o.isSkinnedMesh&&o.name==='Connected_Shirt_V32')shirt=o;});
 const sourceBody=[];asset.scene.traverse(o=>{if(o.isSkinnedMesh&&(o.name.startsWith('Athlete_Current_V32')||o.parent?.name.startsWith('Athlete_Current_V32')))sourceBody.push(o);});skin=sourceBody[0]||skin;
 if(shirt){for(let step=0;step<17;step++){mixer.setTime(asset.animations[0].duration*step/17);scene.updateMatrixWorld(true);skin.skeleton.update();shirt.skeleton.update();for(const [i,source]of asset.scene.userData.shirtCorrespondence.entries()){const base=new T.Vector3();for(const[k,amount]of source)base.addScaledVector(skin.getVertexPosition(k,new T.Vector3()),amount);maxGarmentGap=Math.max(maxGarmentGap,shirt.getVertexPosition(i,new T.Vector3()).distanceTo(base));}}}
 mixer.setTime(asset.animations[0].duration*phase);scene.updateMatrixWorld(true);
 if(diagnostic==='shirt-only')sourceBody.forEach(o=>o.visible=false);
 if(diagnostic==='no-map'&&shirt){shirt.material.map=null;shirt.material.vertexColors=false;shirt.material.color.set('#3887b6');}
 if(back&&face)target.y-=.18;
 const camera=new T.OrthographicCamera(-span/2,span/2,span*.7/2,-span*.7/2,.1,40);camera.position.copy(target).add(back?new T.Vector3(.3,.16,-2.2):new T.Vector3(-.8,.22,2.2));camera.lookAt(target);
 const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1000,700);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.render(scene,camera);
 const data=renderer.domElement.toDataURL('image/png'),bones=skin.skeleton.bones.map(b=>({name:b.name,position:b.getWorldPosition(new T.Vector3()).toArray()}));renderer.dispose();asset.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}});
 return {image:data,animations:asset.animations.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length})),bones,maxGarmentGapM:maxGarmentGap,shirtVisible:!!shirt,metadata:asset.scene.userData};
};
