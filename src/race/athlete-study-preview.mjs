import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {saveCanvas,recordCanvas} from './art-preview.mjs';
import {athleteMasterDigest} from './asset-digests.mjs';
import {ROWING_LAYOUT} from './rowing-pose.mjs';
import {profile} from './boat.mjs';

export async function startAthleteStudy(host,settings,clock,base,onReady){
 const loader=new GLTFLoader();
 const [gltf,hull]=await Promise.all([loader.loadAsync(base+'assets/athlete-master/athlete-master.glb?sha='+athleteMasterDigest),loader.loadAsync(base+'assets/illustrated-v22/hull-rig-v25.glb')]);
 if(!gltf.animations.length)throw Error('Thiếu chuyển động của VĐV mẫu.');
 const scene=new T.Scene();scene.background=new T.Color('#e3e9df');
 scene.add(new T.HemisphereLight('#e5eff4','#667069',1.7));
 const light=new T.DirectionalLight('#fff1df',3.3);light.position.set(3,5,4);scene.add(light);
 const rim=new T.DirectionalLight('#b8d8e7',1.9);rim.position.set(-3,3,-2);scene.add(rim);
 const root=gltf.scene;root.position.x=ROWING_LAYOUT.rowerOffset;root.scale.x=ROWING_LAYOUT.lateralScale;scene.add(root);root.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
 const mixer=new T.AnimationMixer(root);for(const clip of gltf.animations)mixer.clipAction(clip).play();
 const duration=Math.max(...gltf.animations.map(c=>c.duration));
 // Same scene handles used for render/export acceptance checks; no second rig.
 host.athleteStudy={root,mixer,scene,get renderer(){return renderer;}};
 mixer.setTime(0);root.updateMatrixWorld(true);
 const wood=new T.MeshStandardMaterial({color:'#67513b',roughness:.8});
 // Inspect the athlete in a short section of the actual approved hull. Clip
 // in the viewer only; the source hull and its geometry are not rewritten.
 const section=new T.Group();section.rotation.y=-Math.PI/2;hull.scene.position.x=-6;section.add(hull.scene);scene.add(section);
 const limits=[new T.Plane(new T.Vector3(0,0,1),1.35),new T.Plane(new T.Vector3(0,0,-1),1.35)];
 section.updateMatrixWorld(true);
 const groups=new Map(),sourceGeometry=new Set(),probe=new T.Vector3();
 hull.scene.traverse(o=>{
  if(!o.isMesh)return;sourceGeometry.add(o.geometry);
  if(/Bench|Command_Platform/.test(o.name))return;
  const g=o.geometry.clone(),indices=[];
  // Quantized/interleaved GLB attributes must be expanded before applying a
  // world transform; writing world metres into normalized integers corrupts it.
  for(const [name,attribute]of Object.entries(g.attributes)){
   if(!['position','normal','uv','color'].includes(name)){g.deleteAttribute(name);continue;}
   const size=name==='color'?3:attribute.itemSize,values=new Float32Array(attribute.count*size);
   for(let i=0;i<attribute.count;i++)for(let k=0;k<size;k++)values[i*size+k]=attribute.getComponent(i,k);
   g.setAttribute(name,new T.Float32BufferAttribute(values,size));
  }
  g.applyMatrix4(o.matrixWorld);const positions=g.attributes.position;
  for(let i=0;i<g.index.count;i+=3){const tri=[0,1,2].map(k=>g.index.getX(i+k)),z=tri.map(j=>probe.fromBufferAttribute(positions,j).z);if(Math.max(...z)>=-1.35&&Math.min(...z)<=1.35)indices.push(...tri);}
  if(!indices.length){g.dispose();return;}g.setIndex(indices);
  for(const name of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(name))g.deleteAttribute(name);
  if(!g.attributes.normal)g.computeVertexNormals();
  if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(positions.count*2),2));
  const material=o.material;material.clippingPlanes=limits;material.clipShadows=true;material.side=T.DoubleSide;
  if(!material.vertexColors)g.deleteAttribute('color');
  if(!groups.has(material))groups.set(material,[]);groups.get(material).push(g);
 });
 scene.remove(section);
 // Only the short reach is submitted to WebGL, batched by its original
 // materials. Clipping alone would still draw the entire 30 m source hull.
 for(const [material,parts]of groups){const geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!geometry)throw Error('Cannot batch inspection hull');scene.add(new T.Mesh(geometry,material));}
 sourceGeometry.forEach(g=>g.dispose());
 const bench=new T.Mesh(new T.BoxGeometry(.82,.035,.19),wood);bench.position.set(0,.57,-.01);scene.add(bench);
 const footBounds=new T.Box3();
 root.traverse(o=>{if(!o.isSkinnedMesh)return;o.skeleton.update();const indices=o.geometry.getAttribute('skinIndex'),weights=o.geometry.getAttribute('skinWeight'),point=new T.Vector3();
  for(let i=0;i<indices.count;i++){let footWeight=0;for(let j=0;j<4;j++){const name=o.skeleton.bones[indices.getComponent(i,j)]?.name||'';if(/^(foot|ball|toe)_/.test(name))footWeight+=weights.getComponent(i,j);}if(footWeight>.7){o.getVertexPosition(i,point);footBounds.expandByPoint(o.localToWorld(point));}}
 });
 const seatTop=profile(6).g-ROWING_LAYOUT.seatedBarDrop,lift=seatTop-.515;root.position.y+=lift;root.updateMatrixWorld(true);footBounds.translate(new T.Vector3(0,lift,0));bench.position.y=seatTop-.0175;
 const footCenter=footBounds.isEmpty()?new T.Vector3(0,.072,.48):footBounds.getCenter(new T.Vector3());
 const size=footBounds.getSize(new T.Vector3()),rest=new T.Mesh(new T.BoxGeometry(size.x+.012,.016,size.z+.012),wood);rest.position.set(footCenter.x,(footBounds.isEmpty()?-.09:footBounds.min.y)-.010,footCenter.z);scene.add(rest);
 const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:'#c7d4c6',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.26;scene.add(floor);
 const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.localClippingEnabled=true;renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 renderer.domElement.setAttribute('aria-label','Một vận động viên 3D, trang phục Tum Núp 2 và dằm gỗ. Kéo để xoay, chụm hai ngón để phóng to.');host.appendChild(renderer.domElement);
 const camera=new T.PerspectiveCamera(36,1,.02,50);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.7;controls.maxDistance=6;controls.maxPolarAngle=Math.PI*.89;
 let disposed=false,raf=0,lastView='',w=1,h=1;
 const views={front:{position:[-1.55,1.30,2.24],target:[-.12,.59,.15]},side:{position:[2.50,1.05,.40],target:[-.15,.58,.20]},back:{position:[-1.25,1.25,-2.20],target:[-.1,.59,.12]},paddle:{position:[2.4,1.1,1.9],target:[-.4,.43,.18]}};
 for(const view of Object.values(views)){view.position[1]+=lift;view.target[1]+=lift;view.position[0]+=root.position.x;view.target[0]+=root.position.x;}
 function resize(){w=host.clientWidth;h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();lastView='';}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function frame(now){
  if(disposed)return;const s=settings.current,c=clock.current,dt=Math.min(.05,Math.max(0,(now-c.last)/1000));c.last=now;
  if(s.playing){c.seconds+=dt;c.phase=(c.phase+dt*s.cadence/60)%1;}
  if(lastView!==s.view){const v=views[s.view]||views.front;const narrow=w/h<.85?1.17:.94;controls.target.fromArray(v.target);camera.position.fromArray(v.position).sub(controls.target).multiplyScalar(narrow).add(controls.target);controls.update();lastView=s.view;}
  mixer.setTime(c.phase*duration);root.updateMatrixWorld(true);controls.update();renderer.render(scene,camera);
  host.dataset.renderMode='athlete-study';host.dataset.artSource='BLENDER_MASTER';host.dataset.phase=c.phase.toFixed(4);host.dataset.view=s.view;host.dataset.crewCount='1';host.dataset.triangles=String(renderer.info.render.triangles);host.dataset.drawCalls=String(renderer.info.render.calls);
  raf=requestAnimationFrame(frame);
 }
 onReady({reset(){},capture(){saveCanvas(renderer.domElement,'tum-nup-2-vdv-mau-'+settings.current.view+'.png');},record(){return recordCanvas(renderer.domElement,'tum-nup-2-vdv-mau-10s.webm');},dispose(){disposed=true;if(host.athleteStudy?.root===root)delete host.athleteStudy;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();mixer.stopAllAction();mixer.uncacheRoot(root);const skeletons=new Set();scene.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);o.geometry?.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});for(const skeleton of skeletons)skeleton.dispose();renderer.dispose();renderer.domElement.remove();}});
 raf=requestAnimationFrame(frame);
}
