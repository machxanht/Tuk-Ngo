import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {saveCanvas,recordCanvas} from './art-preview.mjs';

export async function startAthleteStudy(host,settings,clock,base,onReady){
 const gltf=await new GLTFLoader().loadAsync(base+'assets/human/athlete-rower-study.glb?v=v11');
 if(!gltf.animations.length)throw Error('Thiếu chuyển động của VĐV mẫu.');
 const scene=new T.Scene();scene.background=new T.Color('#202b30');
 scene.add(new T.HemisphereLight('#e5eff4','#667069',1.7));
 const light=new T.DirectionalLight('#fff1df',3.3);light.position.set(3,5,4);scene.add(light);
 const rim=new T.DirectionalLight('#b8d8e7',1.9);rim.position.set(-3,3,-2);scene.add(rim);
 const root=gltf.scene;scene.add(root);root.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
 const mixer=new T.AnimationMixer(root);for(const clip of gltf.animations)mixer.clipAction(clip).play();
 const duration=Math.max(...gltf.animations.map(c=>c.duration));
 mixer.setTime(0);root.updateMatrixWorld(true);
 const wood=new T.MeshStandardMaterial({color:'#67513b',roughness:.8});
 const bench=new T.Mesh(new T.BoxGeometry(.66,.035,.19),wood);bench.position.set(0,.50,-.01);scene.add(bench);
 for(const x of [-.25,.25]){const leg=new T.Mesh(new T.BoxGeometry(.04,.71,.045),wood);leg.position.set(x,.13,-.01);scene.add(leg);}
 const footBounds=new T.Box3();
 root.traverse(o=>{if(!o.isSkinnedMesh)return;o.skeleton.update();const indices=o.geometry.getAttribute('skinIndex'),weights=o.geometry.getAttribute('skinWeight'),point=new T.Vector3();
  for(let i=0;i<indices.count;i++){let footWeight=0;for(let j=0;j<4;j++){const name=o.skeleton.bones[indices.getComponent(i,j)]?.name||'';if(/^(foot|ball|toe)_/.test(name))footWeight+=weights.getComponent(i,j);}if(footWeight>.7){o.getVertexPosition(i,point);footBounds.expandByPoint(o.localToWorld(point));}}
 });
 const footCenter=footBounds.isEmpty()?new T.Vector3(0,-.09,.48):footBounds.getCenter(new T.Vector3());
 const rest=new T.Mesh(new T.BoxGeometry(.58,.035,.30),wood);rest.position.set(footCenter.x,(footBounds.isEmpty()?-.09:footBounds.min.y)-.0175,footCenter.z);scene.add(rest);
 const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:'#2c393e',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.26;scene.add(floor);
 const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 renderer.domElement.setAttribute('aria-label','Một vận động viên 3D, trang phục Tum Núp 2 và dằm gỗ. Kéo để xoay, chụm hai ngón để phóng to.');host.appendChild(renderer.domElement);
 const camera=new T.PerspectiveCamera(36,1,.02,50);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.7;controls.maxDistance=6;controls.maxPolarAngle=Math.PI*.89;
 let disposed=false,raf=0,lastView='',w=1,h=1;
 const views={front:{position:[-1.55,1.30,2.24],target:[-.12,.59,.15]},side:{position:[2.50,1.05,.40],target:[-.15,.58,.20]},back:{position:[-1.25,1.25,-2.20],target:[-.1,.59,.12]},paddle:{position:[2.4,1.1,1.9],target:[-.4,.43,.18]}};
 function resize(){w=host.clientWidth;h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();lastView='';}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function frame(now){
  if(disposed)return;const s=settings.current,c=clock.current,dt=Math.min(.05,Math.max(0,(now-c.last)/1000));c.last=now;
  if(s.playing){c.seconds+=dt;c.phase=(c.phase+dt*s.cadence/60)%1;}
  if(lastView!==s.view){const v=views[s.view]||views.front;const narrow=w/h<.85?1.17:.94;controls.target.fromArray(v.target);camera.position.fromArray(v.position).sub(controls.target).multiplyScalar(narrow).add(controls.target);controls.update();lastView=s.view;}
  mixer.setTime(c.phase*duration);root.updateMatrixWorld(true);controls.update();renderer.render(scene,camera);
  host.dataset.renderMode='athlete-study';host.dataset.artSource='BLENDER_2024_REFERENCE_STUDY';host.dataset.phase=c.phase.toFixed(4);host.dataset.view=s.view;host.dataset.crewCount='1';host.dataset.triangles=String(renderer.info.render.triangles);host.dataset.drawCalls=String(renderer.info.render.calls);
  raf=requestAnimationFrame(frame);
 }
 onReady({reset(){},capture(){saveCanvas(renderer.domElement,'tum-nup-2-vdv-mau-'+settings.current.view+'.png');},record(){return recordCanvas(renderer.domElement,'tum-nup-2-vdv-mau-10s.webm');},dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();mixer.stopAllAction();scene.traverse(o=>{o.geometry?.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});renderer.dispose();renderer.domElement.remove();}});
 raf=requestAnimationFrame(frame);
}
