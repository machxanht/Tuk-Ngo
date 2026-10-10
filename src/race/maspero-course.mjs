import * as T from 'three';

// All dimensions/coordinates below are authored approximations for the game.
// Visual references: Báo Sóc Trăng 13/11/2024 and SGGP 14/11/2024.
// No survey, GIS orientation, press-photo textures, or generated image sources.
export const COURSE=Object.freeze({length:1200,width:86,lanes:[-7.5,7.5],standX:1090,standZ:-54,bridgeStart:-105,bridgeEnd:1340});
const V=(x,y,z)=>new T.Vector3(x,y,z);
const palette=['#e2bb64','#61979b','#bf5651','#517955','#faf0d6','#42688b','#987194'];

export function buildMasperoSky(scene){
 const geometry=new T.SphereGeometry(900,20,12),material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 vDir;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
 void main(){vec3 d=normalize(vDir);float h=max(0.,d.y);vec3 sky=mix(vec3(.68,.76,.73),vec3(.27,.48,.65),pow(h,.52));vec2 p=d.xz/max(.15,h)*1.35;float n=noise(p)*.7+noise(p*2.3+4.)*.3;float clouds=smoothstep(.50,.76,n)*smoothstep(.02,.16,h);sky=mix(sky,vec3(.88,.89,.82),clouds*.72);gl_FragColor=vec4(sky,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const mesh=new T.Mesh(geometry,material);mesh.name='Maspero_Daylight_Sky';mesh.frustumCulled=false;scene.add(mesh);
 return {update(camera){mesh.position.copy(camera.position);},dispose(){geometry.dispose();material.dispose();scene.remove(mesh);}};
}

export function buildMasperoBanks(group,waterY){
 const meshes=new Map(),geometries={box:new T.BoxGeometry(1,1,1),pole:new T.CylinderGeometry(1,1,1,8),head:new T.SphereGeometry(1,9,7),cone:new T.ConeGeometry(1,1,12)},dummy=new T.Object3D();
 const material=new T.MeshStandardMaterial({color:'white',roughness:.85}),metal=new T.MeshStandardMaterial({color:'white',roughness:.55,metalness:.28});
 const totals={spectators:0,seats:0,trees:0,houses:0,umbrellas:0};
 function add(type,x,y,z,sx,sy,sz,color,rx=0,ry=0,rz=0,shiny=false){
  const key=type+(shiny?'metal':'');if(!meshes.has(key))meshes.set(key,{type,shiny,list:[]});dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();meshes.get(key).list.push({matrix:dummy.matrix.clone(),color:new T.Color(color)});
 }
 function box(x,y,z,sx,sy,sz,color,rx=0,ry=0,rz=0,shiny=false){add('box',x,y,z,sx,sy,sz,color,rx,ry,rz,shiny);}
 function beam(a,b,r,color){const d=b.clone().sub(a);dummy.quaternion.setFromUnitVectors(V(0,1,0),d.clone().normalize());const e=new T.Euler().setFromQuaternion(dummy.quaternion);add('pole',(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,r,d.length(),r,color,e.x,e.y,e.z,true);}
 function text(text,width,height,x,y,z,background='#8c2321',fg='#f6d880',ry=0){
  const c=document.createElement('canvas');c.width=2048;c.height=256;const p=c.getContext('2d');p.fillStyle=background;p.fillRect(0,0,c.width,c.height);p.fillStyle=fg;p.textAlign='center';p.textBaseline='middle';p.font='bold 116px Arial';const size=Math.min(116,116*1900/p.measureText(text).width);p.font='bold '+size+'px Arial';p.fillText(text,1024,136);
  const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const m=new T.MeshBasicMaterial({map:tx,side:T.DoubleSide}),o=new T.Mesh(new T.PlaneGeometry(width,height),m);o.position.set(x,y,z);o.rotation.y=ry;o.name='CourseSign_'+text;group.add(o);return o;
 }
 function person(x,floor,z,id,seated=false){
  const shirt=palette[id%palette.length],h=seated?.46:.62,y=floor+(seated?.56:1.0);
  add('pole',x,y,z,.19,h,.15,shirt,0,0,(id%5-2)*.025);add('head',x,y+h*.5+.14,z,.125,.15,.12,id%4?'#ae7c5c':'#ca9e79');
  if(!seated){add('pole',x-.08,floor+.37,z,.063,.70,.065,'#45505a');add('pole',x+.08,floor+.37,z,.063,.70,.065,'#45505a');}
  else{box(x,floor+.36,z+.18,.34,.13,.42,'#4c5055');add('pole',x-.09,floor+.18,z+.31,.055,.35,.055,'#4c5055');add('pole',x+.09,floor+.18,z+.31,.055,.35,.055,'#4c5055');}
  if(id%9===0)add('cone',x,y+h*.5+.24,z,.28,.095,.28,'#d3c69f');
  else if(id%4===0)add('head',x,y+h*.5+.24,z,.15,.035,.14,'#d9dfd6');
  if(id%17===0){beam(V(x-.18,y+.06,z),V(x-.38,y+.46,z),.055,shirt);beam(V(x+.18,y+.06,z),V(x+.30,y+.34,z),.055,shirt);}
  totals.spectators++;
 }
 function umbrella(x,y,z,id){add('pole',x,y-1.05,z,.025,2.1,.025,'#bfc2b9');add('cone',x,y,z,.78,.27,.78,palette[id%palette.length]);totals.umbrellas++;}
 function tree(x,z,id){const h=4.1+(id%4)*.5;add('pole',x,2.3,z,.20,4.0,.20,'#83745c');for(let i=0;i<3;i++)add('head',x+(i-1)*1.1,h+i*.4,z+(i%2)*.6,1.65,2.0,1.6,['#546c40','#647c49','#4d693f'][i]);totals.trees++;}
 // Two urban embankments with continuous rails and paved promenades.
 for(const side of [-1,1]){
  box(630,-.22,side*44.9,1580,2.7,4.2,'#a8a18d',side*.24);box(630,.60,side*43.16,1580,.40,.22,'#706e5e');
  box(630,1.2,side*48.6,1580,.35,8.4,'#c4bfb0');box(630,1.13,side*59.9,1580,.22,13.6,'#767b79');box(630,1.26,side*68.2,1580,.26,3.2,'#b8b6a4');
  for(const y of [1.7,2.32])box(630,y,side*44.6,1580,.055,.055,'#d9ddd6',0,0,0,true);
  for(let x=-140;x<1410;x+=2.5)box(x,1.85,side*44.6,.065,1.05,.065,'#d9ddd6',0,0,0,true);
  for(let x=-140;x<1410;x+=9)box(x,1.265,side*60,3,.025,.16,'#ded5a8');
  for(let x=-130;x<1410;x+=27){
   if(!(side<0&&x>1008&&x<1170))tree(x,side*52.0,Math.round(x));
   beam(V(x,1.35,side*53.2),V(x,8,side*53.2),.06,'#e1e2d7');beam(V(x,8,side*53.2),V(x,8.3,side*50.3),.06,'#e1e2d7');box(x,8.25,side*50.0,.38,.12,.70,'#eeead9');
  }
  // Dense spectators near the finish, with smaller clusters up-course.
  for(let x=-30;x<1260;x+=.82){
   if(x<780&&Math.floor(x/18)%3!==0)continue;
   for(let row=0;row<(x>940?3:1);row++){
    const id=Math.round((x+50)*3)+row*11+(side+1)*31,z=side*(45.4+row*.75);
    person(x+Math.sin(id*12.9)*.17,1.4,z,id);if(id%53===0)umbrella(x,3.55,z,id);
   }
  }
  // Narrow mixed townhouses, pitched metal roofs, balconies and shop awnings.
  for(let x=-130,id=0;x<1410;x+=10.2,id++){
   if(side<0&&x>1000&&x<1175)continue;
   const height=4.3+(id%4)*1.65,width=7.7+(id%3)*.4,z=side*(76+(id%3)*2),wall=['#d4d3bd','#c5d9d7','#ded5b7','#b7c6bd','#d3b9a8'][id%5];
   box(x,1.4+height/2,z,width,height,9,wall);box(x,1.4+height+.2,z,width+.4,.35,9.5,id%2?'#b8c2bd':'#829e9c');
   if(id%3!==0){for(const r of [-1,1])box(x,1.4+height+.62,z+r*2.4,width+.55,.13,5.1,['#82949c','#a98b75','#a8b9ad'][id%3],-r*.16);}
   const face=z-side*4.56;
   for(let floor=0;floor<Math.floor(height/2.5);floor++){for(const dx of [-2.1,0,2.1])box(x+dx,2.8+floor*2.5,face,1.18,1.45,.075,'#4c6668');if(floor>0){box(x,2.06+floor*2.5,face-side*.55,width*.88,.20,1.2,wall);box(x,2.85+floor*2.5,face-side*1.1,width*.87,.075,.065,'#e1e0d6');}}
   box(x,3.5,face-side*.65,width,.13,1.5,palette[id%palette.length],side*.17);box(x,1.65,face,width*.6,.5,.08,'#6c7871');totals.houses++;
  }
 }
 // Main stand observed in both photos: white concrete, a shallow double-pitch
 // sheet roof, visible steel trusses, red/white VIP seats and blue side seats.
 const cx=COURSE.standX;
 box(cx,2.65,-56.5,128,2.8,19,'#e6e4d6');box(cx,3.05,-45.9,126,1.5,.5,'#e4e5dc');
 for(let r=0;r<8;r++){
  const y=3.8+r*.44,z=-49.2-r*1.26;box(cx,y-.19,z,122,.40,1.26,'#d4d4c6');
  for(let col=0;col<153;col++){
   if(col%31===0||col%31===1)continue;
   const x=cx-58.7+col*.77,color=col>46&&col<107?(r%2?'#eee6d6':'#be3f38'):'#447f9f';
   box(x,y+.11,z,.57,.12,.53,color);box(x,y+.39,z-.24,.57,.55,.08,color);totals.seats++;
   if((col+r)%5!==0)person(x,y+.16,z,100+col*7+r,true);
  }
 }
 for(const x of [cx-60,cx-40,cx-20,cx,cx+20,cx+40,cx+60]){
  box(x,8,-63,.5,8.4,.5,'#dcded2');box(x,5.5,-48.2,.35,4.2,.35,'#dcded2');
  const front=V(x,10.5,-45.6),ridge=V(x,12.0,-56.5),back=V(x,10.8,-68);
  beam(front,ridge,.11,'#596b68');beam(ridge,back,.11,'#596b68');beam(front,back,.10,'#596b68');beam(V(x,8.2,-63),front,.08,'#596b68');beam(V(x,8.2,-63),ridge,.08,'#596b68');
 }
 for(const side of [-1,1])box(cx,11.62,-56.5+side*5.75,132,.15,11.9,'#a2bab3',side*.105);
 for(let x=cx-65;x<cx+66;x+=3.6){for(const side of [-1,1])box(x,11.73,-56.5+side*5.75,.065,.035,11.9,'#c4cfbd',side*.105);}
 box(cx,10.1,-45.7,126,.65,.08,'#992e25');text('LỄ HỘI OÓC OM BÓC · ĐUA GHE NGO SÓC TRĂNG',122,.78,cx,10.12,-45.63);
 for(const x of [cx-64,cx+64]){
  box(x,4.9,-56,.25,5.7,20,'#e5e7dc');for(let i=0;i<15;i++)box(x-(x<cx?-1:1)*2,1.65+i*.32,-47-i*.83,3.7,.30,.82,'#cccfc3');
 }
 // Officials' booth, access stairs, tents and speaker stacks.
 box(1190,3.0,-49.5,10,3.2,7,'#e7eadc');box(1190,4.66,-49.5,10.5,.20,7.8,'#c6d1c6');box(1190,3.50,-45.95,7.7,1.3,.10,'#567b7d');text('TRỌNG TÀI',7,.58,1190,2.4,-45.87,'#f1eee1','#4c665c');
 for(let i=0;i<4;i++){const x=970+i*17;box(x,3.0,-51,12,.16,9,'#e9e8d6');for(const dx of [-5.5,5.5])for(const dz of [-4,4])add('pole',x+dx,2.25,-51+dz,.045,1.8,.045,'#c8d1c6');for(let n=0;n<11;n++)person(x-4+n*.8,1.4,-49,900+n+i*7);}
 for(const x of [cx-61,cx+61]){box(x,6.6,-45.2,.72,2.1,.65,'#353e3b');box(x,7.9,-45.2,.1,.6,.1,'#767e77');}
 // Flags use authored flat colours, including the observed red/yellow flags.
 const flagGeo=new T.PlaneGeometry(1.1,.76,6,2),flagMat=new T.MeshStandardMaterial({color:'#c93a30',side:T.DoubleSide,roughness:1}),flags=[];
 const star=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?.09:.22;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?star.lineTo(x,y):star.moveTo(x,y);}star.closePath();const starGeo=new T.ShapeGeometry(star),starMat=new T.MeshBasicMaterial({color:'#ead052',side:T.DoubleSide});
 for(const side of [-1,1])for(let x=-60;x<1290;x+=18){
  const z=side*44.9;add('pole',x,3.6,z,.035,4.5,.035,'#d3d5c7');
  const f=new T.Mesh(flagGeo,flagMat);f.position.set(x+.57,5.4,z);group.add(f);flags.push(f);
  const s=new T.Mesh(starGeo,starMat);s.position.set(0,0,.012);f.add(s);
 }
 // Generic bridge silhouettes anchor the section between C247 and 30/4.
 // Their placement and detailing are approximate, not a replica of either bridge.
 for(const [x,label] of [[COURSE.bridgeStart,'C247'],[COURSE.bridgeEnd,'30/4']]){
  box(x,7.2,0,12,.8,115,'#bdc8c1');for(const dx of [-5.7,5.7]){box(x+dx,8.2,0,.25,.75,115,'#dde1d6');for(let z=-55;z<56;z+=3.8)box(x+dx,8,z,.12,1.5,.12,'#d2d7cc');}
  for(const z of [-28,28])box(x,3.1,z,3.2,7.5,3.3,'#a6b3a9');text('CẦU '+label,9,.75,x-6.1,7.3,0,'#bacac2','#44635b',-Math.PI/2);
 }
 // Course markers and finish cable: below all cameras, above the paddle reach.
 for(const x of [0,300,600,900,1200])for(const side of [-1,1]){
  add('pole',x,4.7,side*43.8,.07,7,.07,'#d4d4c5');text(x===1200?'ĐÍCH':x===0?'XUẤT PHÁT':x+' m',x===0?7:4,1,x,7.7,side*43.8,'#8c2c27','#f0dc92');
 }
 beam(V(1200,8, -43.8),V(1200,8,43.8),.015,'#737f74');
 for(let z=-40,i=0;z<42;z+=2.2,i++)box(1200,7.68,z,.04,.55,.75,palette[i%palette.length]);
 for(const {type,shiny,list} of meshes.values()){
  const mesh=new T.InstancedMesh(geometries[type],shiny?metal:material,list.length);mesh.name='Maspero_'+type+(shiny?'_metal':'');for(let i=0;i<list.length;i++){mesh.setMatrixAt(i,list[i].matrix);mesh.setColorAt(i,list[i].color);}mesh.computeBoundingSphere();group.add(mesh);
 }
 group.userData={reference:'REAL_PHOTOS_MASPERO_2024',dimensions:'APPROXIMATE',...totals,standRoof:'shallow double pitch, exposed trusses'};
 return {totals,update(time){for(let i=0;i<flags.length;i++)flags[i].rotation.y=Math.sin(time*1.9+i*.43)*.07;}};
}
