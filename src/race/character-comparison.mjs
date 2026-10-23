import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const $=id=>document.getElementById(id),canvas=$('viewport'),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
const camera=new T.PerspectiveCamera(34,1,.01,40),controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.enablePan=false;controls.minDistance=.35;controls.maxDistance=8;controls.maxPolarAngle=Math.PI*.83;controls.target.set(0,.75,0);camera.position.set(2.2,1.45,3.6);controls.update();
let pose='seated',face='neutral',playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,phase=0,elapsed=0,speed=1,cameraMode='whole',last=performance.now(),disposed=false;
const views=[],loader=new GLTFLoader(),metrics={frames:0,maxFrameMs:0,errors:[]};
function stage(){
 const scene=new T.Scene();scene.background=new T.Color('#e3eeed');
 scene.add(new T.HemisphereLight('#def3ff','#b5b68a',2.2));
 const sun=new T.DirectionalLight('#fff3dd',3.1);sun.position.set(-2,5,4);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-2;sun.shadow.camera.right=2;sun.shadow.camera.top=3;sun.shadow.camera.bottom=-1;sun.shadow.normalBias=.02;scene.add(sun);
 const fill=new T.DirectionalLight('#d5e8ff',.8);fill.position.set(3,2,-3);scene.add(fill);
 const floor=new T.Mesh(new T.PlaneGeometry(20,20),new T.MeshStandardMaterial({color:'#d0dfd9',roughness:.95}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
 const bench=new T.Group(),wood=new T.MeshStandardMaterial({color:'#9c602d',roughness:.78}),dark=new T.MeshStandardMaterial({color:'#513c29',roughness:.85});
 for(const [size,p,mat]of [[[.76,.055,.19],[0,.49,0],wood],[[.07,.44,.11],[-.25,.24,0],dark],[[.07,.44,.11],[.25,.24,0],dark],[[.70,.04,.65],[0,.25,.16],wood]]){const m=new T.Mesh(new T.BoxGeometry(...size),mat);m.position.set(...p);m.castShadow=true;m.receiveShadow=true;bench.add(m);}
 scene.add(bench);return {scene,bench,camera:camera.clone()};
}
function resetCamera(mode){
 cameraMode=mode;const spec=mode==='face'?{target:[0,1.63,.025],offset:[.30,.06,1.02]}:mode==='upper'?{target:[0,1.08,.12],offset:[1.15,.40,2.25]}:{target:[0,.76,.10],offset:[2.2,.70,3.6]};
 controls.target.fromArray(spec.target);camera.position.copy(controls.target).add(new T.Vector3(...spec.offset));controls.minDistance=mode==='face'?.34:.7;controls.update();
 document.querySelectorAll('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.camera===mode));
}
function setPose(next){pose=next;phase=0;elapsed=0;for(const v of views){v.mixer.stopAllAction();v.action=v.mixer.clipAction(v.gltf.animations.find(a=>a.name===pose));v.action.reset().play();v.bench.visible=pose==='seated';v.mixer.setTime(0);}document.querySelectorAll('[data-motion]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.motion===pose));}
function expressions(view){
 if(view.id!=='f')return;
 const blink=playing&&face==='neutral'?Math.max(0,1-Math.abs((elapsed%4.1)-3.1)/.08):0;
 for(const mesh of view.faces){for(const [name,index]of Object.entries(mesh.morphTargetDictionary))mesh.morphTargetInfluences[index]=name===face?(name==='Effort'?.85:1):name==='Blink'?blink:0;}
}
function frame(now){
 if(disposed)return;const dt=Math.min((now-last)/1000,.06);last=now;metrics.frames++;metrics.maxFrameMs=Math.max(metrics.maxFrameMs,dt*1000);if(playing){elapsed+=dt*speed;phase=(elapsed%1.2)/1.2;$('phase').value=phase;}
 controls.update();const width=canvas.clientWidth,height=canvas.clientHeight;if(canvas.width!==Math.round(width*renderer.getPixelRatio())||canvas.height!==Math.round(height*renderer.getPixelRatio()))renderer.setSize(width,height,false);
 renderer.setScissorTest(true);
 for(let i=0;i<views.length;i++){
  const v=views[i];v.mixer.setTime(phase*1.2);v.root.updateMatrixWorld(true);expressions(v);
  const head=v.root.getObjectByName('head'),desired=cameraMode==='face'?head.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,.115,.045)):cameraMode==='upper'?head.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,-.20,.08)):new T.Vector3(0,pose==='standing'?.91:.70,.12);
  v.camera.copy(camera);v.camera.aspect=(width/2)/height;v.camera.position.add(desired.clone().sub(controls.target));v.camera.lookAt(desired);v.camera.updateProjectionMatrix();
  renderer.setViewport(i*width/2,0,width/2,height);renderer.setScissor(i*width/2,0,width/2,height);renderer.render(v.scene,v.camera);
 }
 renderer.setScissorTest(false);requestAnimationFrame(frame);
}
async function start(){
 const manifest=await fetch('../assets/character-comparison/manifest.json').then(r=>{if(!r.ok)throw Error('Chưa tải được thông số mẫu');return r.json();});
 const loaded=await Promise.all(['d','f'].map(async id=>{const gltf=await loader.loadAsync('../assets/character-comparison/'+id+'.glb?asset='+manifest.models[id].sha256.slice(0,12)),v=stage();v.id=id;v.root=gltf.scene;v.gltf=gltf;v.mixer=new T.AnimationMixer(v.root);v.faces=[];v.root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;if(o.morphTargetDictionary)v.faces.push(o);}});v.scene.add(v.root);return v;}));
 views.push(...loaded);setPose(pose);resetCamera('whole');$('play').disabled=false;$('play').textContent=playing?'Tạm dừng':'Phát chuyển động';
 for(const id of ['d','f']){const m=manifest.models[id];$('stats-'+id).textContent=`${m.triangles.toLocaleString('vi-VN')} tam giác · ${(m.bytes/1048576).toFixed(2)} MB · ${m.bones} xương xuất`;}
 $('status').textContent='D và F cùng nhịp · Có thể kéo thanh pha để dừng kiểm tra';requestAnimationFrame(frame);
 window.CharacterComparison={views,metrics,get state(){return {pose,face,phase,playing,cameraMode};},setPose,renderer};
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.motion)setPose(b.dataset.motion);if(b.dataset.camera)resetCamera(b.dataset.camera);if(b.dataset.face){face=b.dataset.face;document.querySelectorAll('[data-face]').forEach(x=>x.setAttribute('aria-pressed',x===b));}if(b.id==='reset-view')resetCamera(cameraMode);if(b.id==='play'){playing=!playing;$('play').textContent=playing?'Tạm dừng':'Phát chuyển động';}});
$('phase').addEventListener('input',e=>{playing=false;$('play').textContent='Phát chuyển động';phase=Number(e.target.value);elapsed=phase*1.2;});$('speed').addEventListener('change',e=>{speed=Number(e.target.value);});
document.addEventListener('visibilitychange',()=>{last=performance.now();});window.addEventListener('pagehide',()=>{disposed=true;controls.dispose();renderer.dispose();});
start().catch(error=>{metrics.errors.push(error.message);$('status').textContent='Không mở được mẫu: '+error.message;console.error(error);});
