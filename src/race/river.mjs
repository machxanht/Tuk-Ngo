import * as T from 'three';
import {buildMasperoBanks} from './maspero-course.mjs';

const V=(x,y,z)=>new T.Vector3(x,y,z);
export function buildRiver(scene,waterY=.28,{detailed=false}={}){
 const group=new T.Group();group.name='Maspero_River_And_Banks';scene.add(group);
 const material=new T.ShaderMaterial({fog:true,uniforms:T.UniformsUtils.merge([T.UniformsLib.fog,{uTime:{value:0},uSediment:{value:detailed?1:0}}]),
  vertexShader:`uniform float uTime;uniform float uSediment;varying vec3 vWorld;varying vec3 vNormal;
   #include <fog_pars_vertex>
   void main(){vec3 p=position;vec3 w=(modelMatrix*vec4(p,1.)).xyz;
   float a=w.x*.34+w.z*.65-uTime*1.2;float b=w.x*.87-w.z*.72-uTime*1.8;
   float wave=mix(1.,.42,uSediment);p.y+=wave*(.022*sin(a)+.009*sin(b));vNormal=normalize(vec3(wave*(-.0075*cos(a)-.0078*cos(b)),1.,wave*(-.0143*cos(a)+.0065*cos(b))));vWorld=(modelMatrix*vec4(p,1.)).xyz;
   vec4 mvPosition=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mvPosition;
   #include <fog_vertex>
   }`,
  fragmentShader:`uniform float uTime;uniform float uSediment;varying vec3 vWorld;varying vec3 vNormal;
   #include <fog_pars_fragment>
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
   void main(){vec3 n=normalize(vNormal);vec3 view=normalize(cameraPosition-vWorld);
   float f=pow(1.-max(dot(n,view),0.),3.);float ripple=sin(vWorld.x*3.8+sin(vWorld.z*2.2)-uTime*2.)*.5+.5;
   vec3 sediment=mix(vec3(.035,.095,.065),vec3(.09,.19,.13),ripple*.32);
   float patches=noise(vWorld.xz*.24+vec2(-uTime*.05,0.))*.7+noise(vWorld.xz*.77+vec2(0.,uTime*.03))*.3;
   sediment=mix(sediment,mix(vec3(.16,.135,.074),vec3(.23,.21,.14),patches*.45),uSediment);
   vec3 sky=vec3(.38,.63,.64);float shine=pow(max(dot(reflect(-normalize(vec3(-.4,1.,.4)),n),view),0.),100.);
   gl_FragColor=vec4(mix(sediment,sky,f*.70)+shine*vec3(.9,.8,.6),1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   #include <fog_fragment>
   }`});
 const geo=new T.PlaneGeometry(1600,86,320,32);geo.rotateX(-Math.PI/2);const water=new T.Mesh(geo,material);water.position.set(650,waterY,0);group.add(water);
 if(detailed){const banks=buildMasperoBanks(group,waterY);return {group,water,update(time){material.uniforms.uTime.value=time;banks.update(time);},dispose(){const geometries=new Set(),materials=new Set(),textures=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){materials.add(m);if(m.map)textures.add(m.map);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());scene.remove(group);}};}
 const bankMat=new T.MeshStandardMaterial({color:'#8d958c',roughness:.96}),grassMat=new T.MeshStandardMaterial({color:'#44704b',roughness:1});
 for(const side of [-1,1]){
  const bank=new T.Mesh(new T.BoxGeometry(1600,1.5,8),bankMat);bank.position.set(650,.1,side*46);group.add(bank);
  const lawn=new T.Mesh(new T.BoxGeometry(1600,.35,45),grassMat);lawn.position.set(650,.98,side*71);group.add(lawn);
 }
 const treeCount=170,trunks=new T.InstancedMesh(new T.CylinderGeometry(.22,.30,3.1,7),new T.MeshStandardMaterial({color:'#62543a',roughness:1}),treeCount);
 const crowns=new T.InstancedMesh(new T.IcosahedronGeometry(2.3,1),new T.MeshStandardMaterial({color:'#ffffff',roughness:1}),treeCount);const dummy=new T.Object3D();
 for(let i=0;i<treeCount;i++){const side=i%2?1:-1,x=-110+Math.floor(i/2)*18.5,z=side*(55+(i%7)*2.1);dummy.position.set(x,2.5,z);dummy.scale.set(1,1+(i%4)*.06,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);dummy.position.y=5.1;dummy.scale.set(1+(i%3)*.13,1.3+(i%4)*.09,1);dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);crowns.setColorAt(i,new T.Color().setHSL(.31,.22,.20+(i%4)*.024));}group.add(trunks,crowns);
 const rail=new T.InstancedMesh(new T.BoxGeometry(.08,.95,.08),new T.MeshStandardMaterial({color:'#ced2c8',roughness:.6}),320);
 for(let i=0;i<320;i++){dummy.position.set(-125+Math.floor(i/2)*9.4,1.65,(i%2?1:-1)*44);dummy.scale.set(1,1,1);dummy.updateMatrix();rail.setMatrixAt(i,dummy.matrix);}group.add(rail);
 const buoys=new T.InstancedMesh(new T.SphereGeometry(.20,10,6),new T.MeshStandardMaterial({roughness:.35}),90);
 for(let i=0;i<90;i++){dummy.position.set(-60+i*15,waterY+.08,0);dummy.updateMatrix();buoys.setMatrixAt(i,dummy.matrix);buoys.setColorAt(i,new T.Color(i%2?'#f1c74b':'#df5540'));}group.add(buoys);
 // A simple grandstand and finish marker, preserving the river-course scale.
 const stand=new T.Group();stand.position.set(1130,1.0,-52);group.add(stand);
 for(let i=0;i<4;i++){const tier=new T.Mesh(new T.BoxGeometry(120,.8,2.8),bankMat);tier.position.set(0,i*.8,-i*2.8);stand.add(tier);}
 const roof=new T.Mesh(new T.BoxGeometry(126,.20,14),new T.MeshStandardMaterial({color:'#558da0',roughness:.7}));roof.position.set(0,7,-4);stand.add(roof);
 for(const x of [-55,-27,0,27,55]){const post=new T.Mesh(new T.CylinderGeometry(.15,.15,7,8),bankMat);post.position.set(x,3.5,-3);stand.add(post);}
 const finish=new T.Mesh(new T.BoxGeometry(.12,.50,86),new T.MeshStandardMaterial({color:'#efbf43'}));finish.position.set(1200,5.8,0);group.add(finish);
 return {group,water,update(time){material.uniforms.uTime.value=time;buoys.position.y=Math.sin(time*1.5)*.022;},dispose(){group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}};
}

export function buildSplashes(scene,waterY=.28){
 const COUNT=1000,positions=new Float32Array(COUNT*3),alpha=new Float32Array(COUNT),life=new Float32Array(COUNT),velocity=new Float32Array(COUNT*3);positions.fill(-999);
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('aAlpha',new T.BufferAttribute(alpha,1).setUsage(T.DynamicDrawUsage));
 const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uDpr:{value:1}},vertexShader:`attribute float aAlpha;varying float vAlpha;uniform float uDpr;void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(80.*uDpr/max(1.,-p.z),1.5,10.);vAlpha=aAlpha;}`,fragmentShader:`varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);float a=(1.-smoothstep(.22,.50,d))*vAlpha;if(a<.02)discard;gl_FragColor=vec4(.84,.94,.93,a);}`});
 const droplets=new T.Points(geo,mat);droplets.frustumCulled=false;scene.add(droplets);
 const ringGeo=new T.RingGeometry(.74,1,20);ringGeo.rotateX(-Math.PI/2);const rings=new T.InstancedMesh(ringGeo,new T.MeshBasicMaterial({color:'#dceae3',transparent:true,opacity:.24,depthWrite:false,side:T.DoubleSide}),120);rings.frustumCulled=false;scene.add(rings);
 const ringLife=new Float32Array(120),ringPos=new Float32Array(120*3),dummy=new T.Object3D();let cursor=0,ringCursor=0,eventCount=0,active=0;
 const previous=new Map(),driveTimer=new Map();
 function spawn(p,n,speed,release=false){eventCount++;for(let k=0;k<n;k++){const i=cursor++%COUNT,j=i*3;life[i]=.48+Math.random()*.28;alpha[i]=.9;positions[j]=p.x;positions[j+1]=Math.max(waterY,p.y)+.015;positions[j+2]=p.z;velocity[j]=speed*.4-1.1+Math.random()*.5;velocity[j+1]=(release?.75:1.15)+Math.random()*.85;velocity[j+2]=(Math.random()-.5)*.95;}if(n>1){const i=ringCursor++%120;ringLife[i]=.8;ringPos[i*3]=p.x;ringPos[i*3+1]=waterY+.018;ringPos[i*3+2]=p.z;}}
 return {droplets,rings,setDpr(v){mat.uniforms.uDpr.value=v;},update(dt,boat,speed,time,enabled=true){
  if(enabled&&dt>0)for(const a of boat.athletes){if(a.role!=='ROWER')continue;const p=V(0,-boat.root.userData.spec.paddleLength,0).applyMatrix4(a.paddle.matrixWorld),last=previous.get(a.root.name);
   if(last!==undefined){if(last>waterY&&p.y<=waterY)spawn(p,9,speed);else if(last<=waterY&&p.y>waterY)spawn(p,6,speed,true);else if(p.y<waterY&&time-(driveTimer.get(a.root.name)||0)>.11){spawn(p,1,speed);driveTimer.set(a.root.name,time);}}previous.set(a.root.name,p.y);
  }
  active=0;for(let i=0;i<COUNT;i++){if(life[i]<=0){alpha[i]=0;continue;}active++;const j=i*3;life[i]-=dt;velocity[j+1]-=4.8*dt;positions[j]+=velocity[j]*dt;positions[j+1]+=velocity[j+1]*dt;positions[j+2]+=velocity[j+2]*dt;alpha[i]=Math.max(0,Math.min(1,life[i]*2));if(positions[j+1]<waterY-.025)life[i]=0;}
  for(let i=0;i<120;i++){ringLife[i]=Math.max(0,ringLife[i]-dt);const s=ringLife[i]>0?.08+(.8-ringLife[i])*.72:0;dummy.position.fromArray(ringPos,i*3);dummy.scale.set(s,1,s);dummy.updateMatrix();rings.setMatrixAt(i,dummy.matrix);}rings.instanceMatrix.needsUpdate=true;
  geo.attributes.position.needsUpdate=true;geo.attributes.aAlpha.needsUpdate=true;droplets.visible=enabled;rings.visible=enabled;
 },reset(){life.fill(0);alpha.fill(0);positions.fill(-999);ringLife.fill(0);previous.clear();driveTimer.clear();eventCount=0;active=0;cursor=0;ringCursor=0;},stats(){return {events:eventCount,particles:active};},dispose(){geo.dispose();mat.dispose();ringGeo.dispose();rings.material.dispose();scene.remove(droplets,rings);}};
}
