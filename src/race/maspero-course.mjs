import * as T from 'three';
import {FESTIVAL,FESTIVAL_BRANDS,paintFestivalBanner} from './festival-branding.mjs';
import {buildFestivalCrowd} from './festival-crowd.mjs';
import {buildFestivalStreet} from './festival-street.mjs';
import {buildFestivalTraffic} from './festival-traffic.mjs';
import {buildFinishSpectators} from './finish-spectators.mjs';
import {courseZ,bridgeYaw,MASPERO_LAYOUT,DETAIL_RANGE,BRIDGE_POSITIONS,nearCourseBridge} from './maspero-layout.mjs';

// All dimensions/coordinates below are authored approximations for the game.
// Visual references: owner-supplied VTV10 2025 footage and real press photos.
// No survey, GIS orientation, press-photo textures, or generated image sources.
// The owner places 30/4 upstream of the start, outside the racing interval.
// Game bridge positions are estimates; original mapped coordinates stay intact.
export const COURSE=Object.freeze({length:1200,width:61,lanes:[-7.5,7.5],standX:1090,standZ:courseZ(1090,-54),bridgeStart:BRIDGE_POSITIONS.C247,bridgeEnd:BRIDGE_POSITIONS['30/4'],finishX:1090,direction:-1});
// Positive race progress heads towards -X; the VIP stand is on the right.
export const raceX=distance=>COURSE.finishX+COURSE.length-distance;
const V=(x,y,z)=>new T.Vector3(x,y,z);
const palette=['#ffd05a','#32b9ba','#f36d5f','#5fb768','#fff3cf','#4f98df','#b482d4'];
const nearBridge=nearCourseBridge;

export function buildMasperoSky(scene){
 const geometry=new T.SphereGeometry(900,20,12),material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 vDir;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
 void main(){vec3 d=normalize(vDir);float h=max(0.,d.y);vec3 sky=mix(vec3(.63,.82,.96),vec3(.19,.49,.83),pow(h,.52));vec2 p=d.xz/max(.15,h)*1.35;float n=noise(p)*.7+noise(p*2.3+4.)*.3;float clouds=smoothstep(.55,.79,n)*smoothstep(.02,.16,h);sky=mix(sky,vec3(.97,.985,1.),clouds*.62);gl_FragColor=vec4(sky,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const mesh=new T.Mesh(geometry,material);mesh.name='Maspero_Daylight_Sky';mesh.frustumCulled=false;mesh.renderOrder=-100;scene.add(mesh);
 return {update(camera){mesh.position.copy(camera.position);},dispose(){geometry.dispose();material.dispose();scene.remove(mesh);}};
}

export function buildMasperoBanks(group,waterY,crowdAssets,bankMaterials={},options={}){
 const meshes=new Map(),geometries={box:new T.BoxGeometry(1,1,1),pole:new T.CylinderGeometry(1,1,1,8),head:new T.SphereGeometry(1,9,7),crown:new T.SphereGeometry(1,20,14),cone:new T.ConeGeometry(1,1,12)},dummy=new T.Object3D();
 const material=new T.MeshStandardMaterial({color:'white',roughness:.85}),metal=new T.MeshStandardMaterial({color:'white',roughness:.55,metalness:.28});
 const people=[],totals={spectators:0,seats:0,trees:0,houses:0,distantBlocks:0,umbrellas:0,stands:2,nationalFlags:0};
 let bridgeFrame=null,bankAnchor=null;const signs=new Map(),signPlacements=[];
 const mappedZ=(x,z)=>courseZ(bankAnchor??x,z);
 // Feathered coconut fronds and irregular broadleaf crowns, rather than solid
 // paddle-shaped leaves and five smooth balls per tree.
 const leaf=new T.BufferGeometry(),lp=[],li=[];
 for(let i=1;i<=15;i++){const t=i/16,z=t*3.6,y=-1.2*t*t,length=Math.sin(Math.PI*t)*.85;for(const s of [-1,1]){const k=lp.length/3;lp.push(0,y,z,s*length,y-.12,z+.26,0,y-.025,z+.12);li.push(k,k+1,k+2);}}
 for(let i=0;i<12;i++){const t=i/12,k=lp.length/3;lp.push(-.025,-1.2*t*t,t*3.6,.025,-1.2*t*t,t*3.6,0,-1.2*((i+1)/12)**2,(i+1)/12*3.6);li.push(k,k+1,k+2);}
 leaf.setAttribute('position',new T.Float32BufferAttribute(lp,3));leaf.setIndex(li);leaf.computeVertexNormals();geometries.leaf=leaf;
 const cp=geometries.crown.attributes.position;for(let i=0;i<cp.count;i++){const x=cp.getX(i),y=cp.getY(i),z=cp.getZ(i),r=1+.10*Math.sin(x*13+y*7)*Math.cos(z*11-y*9)+.07*Math.sin(z*19+x*6);cp.setXYZ(i,x*r,y*r,z*r);}geometries.crown.computeVertexNormals();
 function add(type,x,y,z,sx,sy,sz,color,rx=0,ry=0,rz=0,shiny=false){
  if(color===undefined)throw Error('Missing environment color');
  const key=type+(shiny?'metal':'');if(!meshes.has(key))meshes.set(key,{type,shiny,list:[]});
  if(bridgeFrame){const dx=x-bridgeFrame.x,c=Math.cos(bridgeFrame.yaw),s=Math.sin(bridgeFrame.yaw);dummy.position.set(bridgeFrame.x+dx*c+z*s,y,-dx*s+z*c);dummy.rotation.set(rx,ry,rz);dummy.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(V(0,1,0),bridgeFrame.yaw));}
  else{dummy.position.set(x,y,mappedZ(x,z));dummy.rotation.set(rx,ry,rz);}
  dummy.scale.set(sx,sy,sz);dummy.updateMatrix();meshes.get(key).list.push({matrix:dummy.matrix.clone(),color:new T.Color(color)});
 }
 function box(x,y,z,sx,sy,sz,color,rx=0,ry=0,rz=0,shiny=false){
  if(sx>500&&!bridgeFrame){const geo=new T.BoxGeometry(sx,sy,sz,64,1,1);geo.rotateX(rx);geo.translate(x,y,z);const p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,courseZ(p.getX(i),p.getZ(i)));geo.computeVertexNormals();const mat=new T.MeshStandardMaterial({color,roughness:shiny?.55:.92,metalness:shiny?.28:0}),surface=new T.Mesh(geo,mat);surface.name='Maspero_Continuous_Bank_Surface';group.add(surface);return;}
  add('box',x,y,z,sx,sy,sz,color,rx,ry,rz,shiny);
 }
 function beam(a,b,r,color){const d=b.clone().sub(a);dummy.quaternion.setFromUnitVectors(V(0,1,0),d.clone().normalize());const e=new T.Euler().setFromQuaternion(dummy.quaternion);add('pole',(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,r,d.length(),r,color,e.x,e.y,e.z,true);}
 function text(text,width,height,x,y,z,background='#8c2321',fg='#f6d880',ry=0){
  const key=JSON.stringify([text,width,height,background,fg]);let batch=signs.get(key);
  if(!batch){const c=document.createElement('canvas');c.width=2048;c.height=Math.max(128,Math.round(c.width*height/width));paintFestivalBanner(c,text,background,fg);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=8;batch={geometry:new T.PlaneGeometry(width,height),material:new T.MeshBasicMaterial({map:tx,side:T.FrontSide}),text,width,height,list:[]};signs.set(key,batch);}
  const o=new T.Object3D();o.position.set(x,y,bridgeFrame?z:mappedZ(x,z));o.rotation.y=ry;if(bridgeFrame){const dx=x-bridgeFrame.x;cDummyPosition(o,dx,z,bridgeFrame);o.rotation.y+=bridgeFrame.yaw;}o.updateMatrix();batch.list.push(o.matrix.clone());signPlacements.push({text,width,height,x:o.position.x,y,z:o.position.z,bank:Math.sign(z)});return o;
 }
 function cDummyPosition(o,dx,z,frame){o.position.x=frame.x+dx*Math.cos(frame.yaw)+z*Math.sin(frame.yaw);o.position.z=-dx*Math.sin(frame.yaw)+z*Math.cos(frame.yaw);}
 function person(x,floor,z,id,seated=false,seatY=null){
  const shirt=palette[Math.abs(id)%palette.length],height=.94+Math.abs(id%7)*.023,width=.90+Math.abs(id%5)*.045;
  people.push({x,floor,z:mappedZ(x,z),id:Math.abs(id),seated,seatY,shirt,height,width});
  // Headwear belongs to the animated NPC, rather than a separate fixed hat
  // that floats when an age variant or seated pose changes head height.
  totals.spectators++;
 }
 function umbrella(x,y,z,id){add('pole',x,y-1.05,z,.025,2.1,.025,'#bfc2b9');add('cone',x,y,z,.78,.27,.78,palette[id%palette.length]);totals.umbrellas++;}
 function tree(x,z,id,palm=false){id=Math.abs(id);const h=5.1+id%4*.65;if(palm||id%3===0){beam(V(x,1.35,z),V(x+.38,h,z+.16),.15,'#817454');for(let k=0;k<11;k++)add('leaf',x+.38,h,z+.16,1+(k%3)*.12,1,1+(k%4)*.08,['#3d6541','#557744','#476d3d'][k%3],-.10+(k%3)*.16,k*Math.PI*2/11+id*.17);for(let k=0;k<3;k++)add('head',x+.26+k*.11,h-.16,z,.12,.15,.12,'#8f9570');}else{add('pole',x,2.8,z,.19,4.2,.19,'#75684d');for(let i=0;i<9;i++){const dx=Math.sin(i*2.4+id)*1.25,dz=Math.cos(i*2.4+id)*1.15;beam(V(x,3.4,z),V(x+dx,h-.9+(i%3)*.4,z+dz),.07,'#75684d');add('crown',x+dx,h-.9+(i%3)*.4,z+dz,1.1+(i%2)*.25,1.1+(i%3)*.19,1.15,['#456540','#5b7546','#4a6838'][i%3],0,id*.4);}}totals.trees++;}
 // Two urban embankments with continuous rails and paved promenades.
 for(const side of [-1,1]){
  // Continuous land behind both streets prevents a narrow city strip from
  // ending abruptly in the sky when the player rotates the wide camera.
  box(1150,1.00,side*370,2800,.46,605,'#879c74');
  // Quiet low-detail city mass behind the front street, with no window/
  // crowd detail. Its heights are authored context, not mapped elevations.
  for(let x=-120,id=0;x<2450;x+=27,id++)for(let row=0;row<2;row++){
   if(x>=850&&x<=2050)continue;
   const height=3.3+(id%4)*1.1,width=17+id%3*3,z=side*(112+row*36+(id%3)*3),wall=['#bdc8bf','#ccd0bf','#b8c4bf'][id%3];
   box(x+row*9,1.39+height/2,z,width,height,16,wall);box(x+row*9,1.39+height+.07,z,width+.3,.14,16.4,'#adbeb6');totals.distantBlocks++;
  }
  box(1150,-.22,side*44.9,2590,2.7,4.2,'#a8a18d',side*.24);box(1150,.60,side*43.16,2590,.40,.22,'#706e5e');
  box(1150,1.2,side*48.6,2590,.35,8.4,'#c4bfb0');
  // Roads bend behind the stands instead of passing through their seating.
  const roadZ=x=>{const d=Math.abs(x-1090),t=T.MathUtils.smoothstep(d,80,145);return side*(60+(side<0?24:6)*(1-t));};
  const roadGeo=new T.BoxGeometry(2590,.22,13.6,260,1,1);roadGeo.translate(1150,1.13,0);const roadP=roadGeo.attributes.position;for(let i=0;i<roadP.count;i++)roadP.setZ(i,courseZ(roadP.getX(i),roadZ(roadP.getX(i))+roadP.getZ(i)));roadGeo.computeVertexNormals();const road=new T.Mesh(roadGeo,new T.MeshStandardMaterial({color:'#767b79',roughness:.94}));road.name='Maspero_Road_Behind_Stands_'+side;group.add(road);
  for(let x=-140;x<2440;x+=4){box(x,1.25,roadZ(x)+side*8.1,4,.22,2.4,'#b8b6a4');}

  for(const y of [1.7,2.32])box(1150,y,side*44.6,2590,.055,.055,'#d9ddd6',0,0,0,true);
  for(let x=-140;x<2440;x+=2.5)if(!nearBridge(x,8))box(x,1.85,side*44.6,.065,1.05,.065,'#d9ddd6',0,0,0,true);
  for(let x=-140;x<2440;x+=1.25){if(nearBridge(x,8))continue;beam(V(x,1.5,side*44.6),V(x+.60,2.17,side*44.6),.024,'#c8cec4');beam(V(x+.60,2.17,side*44.6),V(x+1.2,1.5,side*44.6),.024,'#c8cec4');}
  for(let x=-140;x<2440;x+=9)box(x,1.265,roadZ(x),3,.025,.16,'#ded5a8');
  for(let x=-130;x<2440;x+=23){
   if(nearBridge(x,25))continue;
   if(x>1000&&x<1180)continue;
   beam(V(x,1.35,side*53.2),V(x,8,side*53.2),.06,'#e1e2d7');beam(V(x,8,side*53.2),V(x,8.3,side*50.3),.06,'#e1e2d7');box(x,8.25,side*50.0,.38,.12,.70,'#eeead9');
  }
  // Shoulder-to-shoulder spectators along the full race, not a single sparse
  // row after leaving the finish cameras. The street remains behind them.
  for(let x=850,col=0;x<2438;x+=.56,col++){
   if(nearBridge(x,8))continue;
   const inStand=side<0&&x>1025&&x<1155||side>0&&x>1000&&x<1170;
   for(let row=0;row<(inStand?1:10);row++){
    const id=100000+(side+1)*200000+col*13+row,z=side*(45.05+row*.55);
    person(x+(row%2)*.24+Math.sin(id*12.9)*.17,1.4,z+Math.sin(id*7.73)*.20,id);if(row>=3&&id%97===0)umbrella(x,3.55,z,id);
   }
  }
 }
 // Main stand observed in both photos: white concrete, a shallow double-pitch
 // sheet roof, visible steel trusses, red/white VIP seats and blue side seats.
 const cx=COURSE.standX;
 bankAnchor=cx;
 box(cx,2.65,-56.5,128,2.8,19,'#e6e4d6');box(cx,3.05,-45.9,126,1.5,.5,'#e4e5dc');
 for(let r=0;r<8;r++){
  const y=3.8+r*.44,z=-49.2-r*1.26;box(cx,y-.19,z,122,.40,1.26,'#d4d4c6');
  for(let col=0;col<153;col++){
   if(col%31===0||col%31===1)continue;
   const x=cx-58.7+col*.77,color=col>46&&col<107?(r%2?'#eee6d6':'#be3f38'):'#447f9f';
   const vip=col>46&&col<107;
   box(x,y+.45,z,.57,.12,.53,vip?'#faf7eb':color);box(x,y+.74,z-.24,.57,.55,.08,vip?'#faf7eb':color);
   if(vip)box(x,y+.67,z-.188,.57,.16,.015,'#c53d3c');totals.seats++;
   person(x,y+.01,z,100+col*7+r,true,y+.56);
  }
 }
 for(const x of [cx-60,cx-40,cx-20,cx,cx+20,cx+40,cx+60]){
  box(x,10,-63,.5,12.4,.5,'#dcded2');box(x,7.5,-48.2,.35,8.2,.35,'#dcded2');
  const front=V(x,14.5,-45.6),ridge=V(x,16.0,-56.5),back=V(x,14.8,-68);
  beam(front,ridge,.11,'#596b68');beam(ridge,back,.11,'#596b68');beam(front,back,.10,'#596b68');beam(V(x,12.2,-63),front,.08,'#596b68');beam(V(x,12.2,-63),ridge,.08,'#596b68');
 }
 for(const side of [-1,1])box(cx,15.62,-56.5+side*5.75,132,.15,11.9,'#a2bab3',side*.105);
 for(let x=cx-65;x<cx+66;x+=3.6){for(const side of [-1,1])box(x,15.73,-56.5+side*5.75,.065,.035,11.9,'#c4cfbd',side*.105);}
 box(cx,13.62,-45.7,126,1.82,.08,'#992e25');for(const x of [cx-45,cx-15,cx+15,cx+45])text('ពិធីបុណ្យអកអំបុក · ប្រណាំងទូក-ង',30,1.82,x,13.62,-45.63);
 for(const x of [cx-43,cx,cx+43])text('អបអរសាទរ · ប្រណាំងទូក-ង',39,2.05,x,3.05,-45.60,'#e1c271','#49301c');
 for(const x of [cx-64,cx+64]){
  box(x,4.9,-56,.25,5.7,20,'#e5e7dc');for(let i=0;i<15;i++)box(x-(x<cx?-1:1)*2,1.65+i*.32,-47-i*.83,3.7,.30,.82,'#cccfc3');
 }
 // Photo-matched bay dividers, open rear concrete frame and roof webbing:
 // Thach Pich's front / inside views (Báo Sóc Trăng, 13 Nov 2024).
 for(let x=cx-60;x<=cx+60;x+=10){
  box(x,10.25,-66,.6,10.9,.65,'#eeeee4');box(x,11.1,-66,9.4,.6,.65,'#e7e9df');
  for(let z=-65;z<-46;z+=4){beam(V(x-4.8,14.65,z),V(x+4.8,15.25,z-2),.055,'#617878');beam(V(x-4.8,15.25,z-2),V(x+4.8,14.65,z),.055,'#617878');}
 }
 for(const dx of [-35,35]){
  box(cx+dx,4.95,-55,.20,3.3,15.8,'#f3f1e6');
  for(let r=0;r<8;r++)beam(V(cx+dx,4.5+r*.44,-48.7-r*1.26),V(cx+dx,4.5+(r+1)*.44,-48.7-(r+1)*1.26),.045,'#b9cacb');
 }
 // Low central ceremony platform at the water's edge, distinct from the
 // grandstand roof. Reference photos are never pasted onto the meshes.
 box(cx,1.8,-44.8,27,.75,4.5,'#e9e6d9');box(cx,5.95,-46.4,29,.13,6.6,'#e4e7df');
 for(const dx of [-13.7,13.7]){beam(V(cx+dx,2.2,-43.5),V(cx+dx,6,-43.5),.085,'#c6cfcc');beam(V(cx+dx,2.2,-49.2),V(cx+dx,6,-49.2),.085,'#c6cfcc');}
 for(let x=cx-13.5;x<cx+14;x+=1.1){beam(V(x,6,-43.5),V(x+1.1,6.5,-43.5),.032,'#bdc9c8');beam(V(x+1.1,6.5,-43.5),V(x+1.1,6,-43.5),.032,'#bdc9c8');}
 text('ពិធីបុណ្យអកអំបុក · ប្រណាំងទូក-ង',26,.9,cx,2.05,-42.49,'#ae3534','#fff1aa');
 for(let x=cx-22;x<cx+23;x+=3.2){box(x,4.9,-48.6,2.8,.10,.6,'#7c4d35');for(const dx of [-1.1,1.1])box(x+dx,4.5,-48.6,.07,.8,.4,'#7c4d35');}
 // Officials' booth, access stairs, tents and speaker stacks.
 // The opposite bank has a long low single-pitch covered spectator platform,
 // seen at 00:00 in the supplied livestream, not a mirrored VIP grandstand.
 bankAnchor=cx-10;
 box(cx-10,1.72,50.8,156,.6,10.0,'#d4d0bd');
 for(let row=0;row<4;row++){const y=1.98+row*.32,z=47.3+row*1.2;box(cx-10,y-.18,z,151,.32,1.2,'#d4d4c6');for(let col=0;col<203;col++){if(col%42<2)continue;const x=cx-83+col*.72;person(x,y+.01,z,13000+row*213+col,true,y+.55);box(x,y+.44,z,.53,.1,.5,'#4c8291');box(x,y+.73,z+.24,.53,.50,.08,'#4c8291');totals.seats++;}}
 for(let x=cx-88;x<cx+72;x+=10){beam(V(x,1.4,46.6),V(x,4.15,46.6),.075,'#879892');beam(V(x,1.4,56),V(x,4.8,56),.075,'#879892');beam(V(x,4.15,46.6),V(x,4.8,56),.075,'#6d8078');}
 box(cx-10,4.55,51.3,161,.12,10.7,'#c9d2ce',-.067);for(let x=cx-90;x<cx+71;x+=1.1)box(x,4.62,51.3,.035,.025,10.7,'#adbdb7',-.067);
 for(let i=0;i<6;i++)text('ប្រណាំងទូក-ង · សូមស្វាគមន៍',25.1,1.55,cx-72.75+i*25.1,2.07,45.6,'#e1c271','#49301c',Math.PI);
 bankAnchor=null;
 box(1190,3.0,-49.5,10,3.2,7,'#e7eadc');box(1190,4.66,-49.5,10.5,.20,7.8,'#c6d1c6');box(1190,3.50,-45.95,7.7,1.3,.10,'#567b7d');text('អាជ្ញាកណ្តាល',7,.70,1190,2.4,-45.87,'#f1eee1','#4c665c');
 for(let i=0;i<4;i++){const x=966+i*16;box(x,4.15,-56.5,10.5,.16,7,'#e9e8d6');for(const dx of [-4.8,4.8])for(const dz of [-3.2,3.2])add('pole',x+dx,2.775,-56.5+dz,.045,2.75,.045,'#c8d1c6');for(let n=0;n<11;n++)person(x-4+n*.8,1.4,-54.7,900+n+i*13);}
 for(const x of [cx-61,cx+61]){box(x,6.6,-45.2,.72,2.1,.65,'#353e3b');box(x,7.9,-45.2,.1,.6,.1,'#767e77');}
 // National flags and stars removed at the owner's request.
 // C247: real teal curved steel portal forms (2022 press-photo reference).
 // 30/4/Cau Cao: concrete piers and silver arched decoration observed in the
 // January 2022 construction photo at the mapped bridge. Finished cladding and
 // current decoration colour are not established by that photograph.
 for(const [x,label] of [[COURSE.bridgeStart,'C247'],[COURSE.bridgeEnd,'30/4']]){
  bridgeFrame={x,yaw:bridgeYaw(x)};
  const deck=label==='C247'?4.8:7.1;box(x,deck,0,12,.78,115,'#bdc8c1');box(x,deck+.43,0,10.5,.06,115,'#707775');
  for(const dx of [-5.7,5.7]){box(x+dx,deck+1,0,.18,.12,115,'#dbe1d6');for(let z=-55;z<56;z+=2.2){box(x+dx,deck+.85,z,.11,1.25,.11,'#d2d7cc');box(x+dx,deck+.9,z+1.1,.075,.75,1.1,'#d2d7cc');}}
  for(const z of [-28,28]){box(x,deck/2-1,z,8,deck-1,1.7,'#9ba69f');box(x,deck-.6,z,10.5,.6,2.2,'#adb8af');}
  const rampRun=label==='C247'?36:56,rampRise=deck+.4-1.24,rampLength=Math.hypot(rampRun,rampRise);for(const side of [-1,1])box(x,1.24+rampRise/2,side*(57.5+rampRun/2),12,.45,rampLength,'#b9c3b9',side*Math.atan2(rampRise,rampRun));
  if(label==='C247')for(const z0 of [-34,0,34]){
   for(const side of [-1,1]){let lastPoint;for(let k=0;k<=24;k++){const t=k/24,z=z0+(t-.5)*31,y=deck+.6+9.8*Math.sin(Math.PI*t),px=x+side*(5.4-1.25*Math.sin(Math.PI*t));const point=V(px,y,z);if(lastPoint)beam(lastPoint,point,.29,'#327f80');lastPoint=point;if(k%4===0&&k>0&&k<24)beam(V(px,y,z),V(x+side*5.5,deck+.65,z),.048,'#bcc8bc');}}
   beam(V(x-4.15,deck+10.4,z0),V(x+4.15,deck+10.4,z0),.25,'#327f80');
  }
  if(label==='30/4'){
   for(const z0 of [-30,0,30])for(const side of [-1,1]){
    let outer,inner;for(let k=0;k<=20;k++){const t=k/20,z=z0+(t-.5)*27,y=deck+.65+7.4*Math.sin(Math.PI*t),a=V(x+side*5.4,y,z),b=V(x+side*5.4,y-.65,z);if(outer){beam(outer,a,.14,'#b4c1bf');beam(inner,b,.10,'#a2b1ae');beam(inner,a,.055,'#9cacaa');}beam(a,b,.055,'#a2b1ae');outer=a;inner=b;}
    for(const dz of [-5,0,5])beam(V(x+side*5.4,deck+7.4*Math.cos(dz/27*Math.PI)+.65,z0+dz),V(x-side*5.4,deck+7.4*Math.cos(dz/27*Math.PI)+.65,z0+dz),.085,'#a8b9b5');
   }
   for(const dz of [-46,-20,20,46])for(const side of [-1,1]){beam(V(x+side*5.35,deck+.6,dz),V(x+side*5.35,deck+3.6,dz+Math.sign(dz)*6),.12,'#b4c1bf');beam(V(x+side*5.35,deck+.6,dz+Math.sign(dz)*11),V(x+side*5.35,deck+3.6,dz+Math.sign(dz)*6),.12,'#b4c1bf');}
  }
  text('ស្ពាន '+(label==='C247'?'C247':'៣០/៤'),10,1.1,x-6.11,deck+.1,0,'#bacac2','#44635b',-Math.PI/2);
  bridgeFrame=null;
 }
 // Course markers and finish cable: below all cameras, above the paddle reach.
 for(const distance of [0,300,600,900,1200])for(const side of [-1,1]){
  const x=raceX(distance),numerals=String(distance).replace(/\d/g,n=>'០១២៣៤៥៦៧៨៩'[Number(n)]);add('pole',x,4.7,side*43.8,.07,7,.07,'#d4d4c5');text(distance===1200?'ទីបញ្ចប់':distance===0?'ចំណុចចាប់ផ្តើម':numerals+' ម៉ែត្រ',distance===0?7:5,1.1,x,7.7,side*43.8,'#8c2c27','#f0dc92');
 }
 beam(V(COURSE.finishX,8, -43.8),V(COURSE.finishX,8,43.8),.015,'#737f74');
 const phrases=['សូមស្វាគមន៍','ប្រណាំងទូក-ង','អបអរសាទរ',FESTIVAL.titleKm];
 for(const side of[-1,1])for(let x=854,id=0;x<2430;x+=38,id++){
  if(nearBridge(x,24)||x>990&&x<1190)continue;
  const high=id%3===0,width=high?18:15,height=high?2.4:1.55,y=high?5.4:2.05,z=side*44.75,phrase=phrases[id%phrases.length];
  if(high)for(const dx of[-9.3,9.3])add('pole',x+dx,3.55,z,.055,5.5,.055,'#d5ddd2');
  text(phrase,width,height,x,y,z,['#087c83','#c33a52','#4347ac','#a33789'][id%4],'#fff7d1',side<0?0:Math.PI);
  if(high)text(FESTIVAL_BRANDS[id%2],13,2.7,x,8.2,z,id%2?'#9e284b':'#1d5b95','#fff5cf',side<0?0:Math.PI);
 }
 for(const side of[-1,1]){
  text(FESTIVAL.titleKm,32,3.1,COURSE.standX,10.4,side*45.8,'#a52952','#fff1bb',side<0?0:Math.PI);
  FESTIVAL_BRANDS.forEach((brand,i)=>text(brand,17,3.2,COURSE.standX+(i?78:-78),6.4,side*45.8,i?'#832e9d':'#0e7b84','#fff1bb',side<0?0:Math.PI));
 }
 for(let z=-40,i=0;z<42;z+=2.2,i++)box(COURSE.finishX,7.68,z,.04,.55,.75,palette[i%palette.length]);
 for(const {type,shiny,list} of meshes.values()){
  const mesh=new T.InstancedMesh(geometries[type],shiny?metal:material,list.length);if(type==='leaf')mesh.material=material.clone(),mesh.material.side=T.DoubleSide;mesh.name='Maspero_'+type+(shiny?'_metal':'');for(let i=0;i<list.length;i++){mesh.setMatrixAt(i,list[i].matrix);mesh.setColorAt(i,list[i].color);}mesh.computeBoundingSphere();group.add(mesh);
 }
 for(const batch of signs.values()){const mesh=new T.InstancedMesh(batch.geometry,batch.material,batch.list.length);batch.list.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.name='CourseSign_'+batch.text;mesh.userData={language:'km',worldText:batch.text,width:batch.width,height:batch.height};mesh.computeBoundingSphere();group.add(mesh);}
 const street=buildFestivalStreet(group,bankMaterials),buildings=street.stats;
 totals.houses+=buildings.houses||buildings.buildings||0;totals.trees+=buildings.trees||0;
 const shallows=buildFinishSpectators(group,COURSE.finishX,waterY);
 people.push(...street.people,...shallows.people);totals.spectators=people.length;
 const crowd=buildFestivalCrowd(group,people,crowdAssets,options),traffic=buildFestivalTraffic(group);
 group.userData={...group.userData,reference:'OWNER_VTV10_VIDEO_2025_REAL_PHOTOS_AND_OSM_LAYOUT',dimensions:'APPROXIMATE_GAME_SCALE',...totals,buildings,detailRange:DETAIL_RANGE,bankSource:MASPERO_LAYOUT.source,bankLicense:MASPERO_LAYOUT.license,bankOutlineGameSpanM:400,bridgeYawSource:'OSM bridge centre-lines',continuousLand:true,pitchedRoof:'ridge above eaves; corrugation follows both slopes',npcSource:'Quaternius CC0 civilian silhouettes with independently animated festival actions',signLanguage:'km',standRoof:'VIP double pitch; opposite low single pitch',bridgeC247:'teal curved steel portals',bridge30April:'concrete piers and silver arched truss, 2022 construction photo; finished decoration approximate'};
 group.userData.traffic=traffic.stats;group.userData.spectatorSpacingM=.56;group.userData.fullCourseCrowdRows=10;
 group.userData.finishWaterCrowd=shallows.stats;
 group.userData.banners={count:signPlacements.length,textureCount:signs.size,language:'km',placements:signPlacements,railHeightM:1.55,overheadHeightM:2.4};
 group.userData.bridges={C247:{x:COURSE.bridgeStart,yaw:bridgeYaw(COURSE.bridgeStart)},'30/4':{x:COURSE.bridgeEnd,yaw:bridgeYaw(COURSE.bridgeEnd),beforeStartM:COURSE.bridgeEnd-raceX(0)},placement:'owner-corrected game placement; OSM angles retained'};
 group.userData.mainStand={bank:'right in race direction',lengthM:128,tiers:8,roofHeightM:16,roof:'shallow double pitch, pale green-grey sheet metal',reference:'https://baosoctrang.org.vn/van-hoa-the-thao-du-lich/202411/hao-huc-cho-ngay-khai-hoi-67c01d9/',measured:false};
 return {totals,update(time,cameraX,cameraZ){crowd.update(time,cameraX,cameraZ);street.update(time,cameraX,cameraZ);traffic.update(time,cameraX);shallows.update(time);},dispose(){crowd.dispose();street.dispose();traffic.dispose();shallows.dispose();}};
}
