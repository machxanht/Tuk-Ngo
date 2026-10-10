import * as T from 'three';
import {buildCrowd} from './crowd.mjs';

// All dimensions/coordinates below are authored approximations for the game.
// Visual references: owner-supplied VTV10 2025 footage and real press photos.
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

export function buildMasperoBanks(group,waterY,crowdAssets){
 const meshes=new Map(),geometries={box:new T.BoxGeometry(1,1,1),pole:new T.CylinderGeometry(1,1,1,8),head:new T.SphereGeometry(1,9,7),crown:new T.SphereGeometry(1,20,14),cone:new T.ConeGeometry(1,1,12)},dummy=new T.Object3D();
 const material=new T.MeshStandardMaterial({color:'white',roughness:.85}),metal=new T.MeshStandardMaterial({color:'white',roughness:.55,metalness:.28});
 const people=[],totals={spectators:0,seats:0,trees:0,houses:0,umbrellas:0,stands:2,nationalFlags:0};
 // Feathered coconut fronds and irregular broadleaf crowns, rather than solid
 // paddle-shaped leaves and five smooth balls per tree.
 const leaf=new T.BufferGeometry(),lp=[],li=[];
 for(let i=1;i<=15;i++){const t=i/16,z=t*3.6,y=-1.2*t*t,length=Math.sin(Math.PI*t)*.85;for(const s of [-1,1]){const k=lp.length/3;lp.push(0,y,z,s*length,y-.12,z+.26,0,y-.025,z+.12);li.push(k,k+1,k+2);}}
 for(let i=0;i<12;i++){const t=i/12,k=lp.length/3;lp.push(-.025,-1.2*t*t,t*3.6,.025,-1.2*t*t,t*3.6,0,-1.2*((i+1)/12)**2,(i+1)/12*3.6);li.push(k,k+1,k+2);}
 leaf.setAttribute('position',new T.Float32BufferAttribute(lp,3));leaf.setIndex(li);leaf.computeVertexNormals();geometries.leaf=leaf;
 const cp=geometries.crown.attributes.position;for(let i=0;i<cp.count;i++){const x=cp.getX(i),y=cp.getY(i),z=cp.getZ(i),r=1+.10*Math.sin(x*13+y*7)*Math.cos(z*11-y*9)+.07*Math.sin(z*19+x*6);cp.setXYZ(i,x*r,y*r,z*r);}geometries.crown.computeVertexNormals();
 function add(type,x,y,z,sx,sy,sz,color,rx=0,ry=0,rz=0,shiny=false){
  const key=type+(shiny?'metal':'');if(!meshes.has(key))meshes.set(key,{type,shiny,list:[]});dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();meshes.get(key).list.push({matrix:dummy.matrix.clone(),color:new T.Color(color)});
 }
 function box(x,y,z,sx,sy,sz,color,rx=0,ry=0,rz=0,shiny=false){add('box',x,y,z,sx,sy,sz,color,rx,ry,rz,shiny);}
 function beam(a,b,r,color){const d=b.clone().sub(a);dummy.quaternion.setFromUnitVectors(V(0,1,0),d.clone().normalize());const e=new T.Euler().setFromQuaternion(dummy.quaternion);add('pole',(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,r,d.length(),r,color,e.x,e.y,e.z,true);}
 function text(text,width,height,x,y,z,background='#8c2321',fg='#f6d880',ry=0){
  const c=document.createElement('canvas');c.width=2048;c.height=Math.max(64,Math.round(c.width*height/width));const p=c.getContext('2d'),pad=c.height*.08;p.fillStyle=background;p.fillRect(0,0,c.width,c.height);p.strokeStyle=fg;p.lineWidth=Math.max(2,c.height*.025);p.strokeRect(pad,pad,c.width-pad*2,c.height-pad*2);p.fillStyle=fg;p.textAlign='center';p.textBaseline='middle';const base=c.height*.52;p.font='700 '+base+'px "Noto Sans Khmer"';const size=Math.min(base,base*(c.width-pad*4)/p.measureText(text).width);p.font='700 '+size+'px "Noto Sans Khmer"';p.fillText(text,c.width/2,c.height*.52);
  const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const m=new T.MeshBasicMaterial({map:tx,side:T.DoubleSide}),o=new T.Mesh(new T.PlaneGeometry(width,height),m);o.position.set(x,y,z);o.rotation.y=ry;o.name='CourseSign_'+text;group.add(o);return o;
 }
 function person(x,floor,z,id,seated=false){
  const shirt=palette[Math.abs(id)%palette.length],height=.94+Math.abs(id%7)*.023,width=.90+Math.abs(id%5)*.045;
  people.push({x,floor,z,id:Math.abs(id),seated,shirt,height,width});
  const headY=floor+(seated?1.39:1.67)*height;
  if(id%9===0)add('cone',x,headY+.07,z,.25,.13,.25,'#cdb994');
  else if(id%4===0)add('head',x,headY+.025,z,.115,.045,.125,'#e4e4d8');
  totals.spectators++;
 }
 function umbrella(x,y,z,id){add('pole',x,y-1.05,z,.025,2.1,.025,'#bfc2b9');add('cone',x,y,z,.78,.27,.78,palette[id%palette.length]);totals.umbrellas++;}
 function tree(x,z,id,palm=false){const h=5.1+Math.abs(id%4)*.65;if(palm||id%3===0){beam(V(x,1.35,z),V(x+.38,h,z+.16),.15,'#817454');for(let k=0;k<11;k++)add('leaf',x+.38,h,z+.16,1+(k%3)*.12,1,1+(k%4)*.08,['#3d6541','#557744','#476d3d'][k%3],-.10+(k%3)*.16,k*Math.PI*2/11+id*.17);for(let k=0;k<3;k++)add('head',x+.26+k*.11,h-.16,z,.12,.15,.12,'#8f9570');}else{add('pole',x,2.8,z,.19,4.2,.19,'#75684d');for(let i=0;i<9;i++){const dx=Math.sin(i*2.4+id)*1.25,dz=Math.cos(i*2.4+id)*1.15;beam(V(x,3.4,z),V(x+dx,h-.9+(i%3)*.4,z+dz),.07,'#75684d');add('crown',x+dx,h-.9+(i%3)*.4,z+dz,1.1+(i%2)*.25,1.1+(i%3)*.19,1.15,['#456540','#5b7546','#4a6838'][i%3],0,id*.4);}}totals.trees++;}
 // Two urban embankments with continuous rails and paved promenades.
 for(const side of [-1,1]){
  box(630,-.22,side*44.9,1580,2.7,4.2,'#a8a18d',side*.24);box(630,.60,side*43.16,1580,.40,.22,'#706e5e');
  box(630,1.2,side*48.6,1580,.35,8.4,'#c4bfb0');box(630,1.13,side*59.9,1580,.22,13.6,'#767b79');box(630,1.26,side*68.2,1580,.26,3.2,'#b8b6a4');
  for(const y of [1.7,2.32])box(630,y,side*44.6,1580,.055,.055,'#d9ddd6',0,0,0,true);
  for(let x=-140;x<1410;x+=2.5)box(x,1.85,side*44.6,.065,1.05,.065,'#d9ddd6',0,0,0,true);
  for(let x=-140;x<1410;x+=1.25){beam(V(x,1.5,side*44.6),V(x+.60,2.17,side*44.6),.024,'#c8cec4');beam(V(x+.60,2.17,side*44.6),V(x+1.2,1.5,side*44.6),.024,'#c8cec4');}
  for(let x=-140;x<1410;x+=9)box(x,1.265,side*60,3,.025,.16,'#ded5a8');
  for(let x=-130;x<1410;x+=23){
   if(!(side<0&&x>1008&&x<1170))tree(x,side*(side>0&&x>995&&x<1170?59:52),Math.round(x),side>0);
   beam(V(x,1.35,side*53.2),V(x,8,side*53.2),.06,'#e1e2d7');beam(V(x,8,side*53.2),V(x,8.3,side*50.3),.06,'#e1e2d7');box(x,8.25,side*50.0,.38,.12,.70,'#eeead9');
  }
  // Dense spectators near the finish, with smaller clusters up-course.
  for(let x=-30;x<1260;x+=.63){
   for(let row=0;row<(x>700?4:2);row++){
    if((side<0&&x>1025&&x<1155||side>0&&x>1000&&x<1170)&&row>0)continue;
    const id=Math.round((x+50)*11)+row*23+(side+1)*41,z=side*(45.35+row*.69);
    person(x+Math.sin(id*12.9)*.09,1.4,z,id);if(row>0&&id%23===0)umbrella(x,3.48,z,id);
   }
  }
  // Narrow mixed townhouses, pitched metal roofs, balconies and shop awnings.
  for(let x=-130,id=0;x<1410;x+=9.3,id++){
   if(side<0&&x>1000&&x<1175)continue;
   const height=id%5===0?8.6:id%4===0?6.2:3.2+(id%3)*.5,width=6.8+(id%3)*.6,z=side*(73+(id%3)*2),wall=['#d8d2bc','#b5cfc9','#e0d4b9','#b6c4b7','#ccb5a4'][id%5];
   box(x,1.4+height/2,z,width,height,9,wall);box(x,1.4+height+.2,z,width+.4,.35,9.5,id%2?'#b8c2bd':'#829e9c');
   if(id%3!==0){for(const r of [-1,1])box(x,1.4+height+.62,z+r*2.4,width+.55,.13,5.1,['#82949c','#a98b75','#a8b9ad'][id%3],-r*.16);}
   const face=z-side*4.56;
   for(let floor=0;floor<Math.floor(height/2.5);floor++){for(const dx of [-2.1,0,2.1])box(x+dx,2.8+floor*2.5,face,1.18,1.45,.075,'#4c6668');if(floor>0){box(x,2.06+floor*2.5,face-side*.55,width*.88,.20,1.2,wall);box(x,2.85+floor*2.5,face-side*1.1,width*.87,.075,.065,'#e1e0d6');}}
   box(x,3.5,face-side*.65,width,.13,1.5,palette[id%palette.length],side*.17);box(x,1.65,face,width*.6,.5,.08,'#6c7871');totals.houses++;
   for(const dx of [-width*.46,width*.46])box(x+dx,2.5,face-side*.9,.12,2.3,.12,wall);
   for(let n=0;n<20;n++)box(x-width/2+n*width/20,1.4+height+.39,z,.035,.05,9.7,'#afbbb3');
   box(x,1.72,face-side*.60,width*.95,.22,1.15,'#9e9b8b');
   if(id%3===0){add('pole',x+1.5,1.4+height+.72,z,.44,1.06,.44,'#bac4bf',0,0,Math.PI/2,true);box(x-2.6,3.0,face-side*.15,.68,.56,.22,'#c6c8ba');}
   if(id%4===1)tree(x+width*.5+1,side*82,id,true);
   if(id%13===0)text('សូមស្វាគមន៍',width*.92,.63,x,3.6,face-side*.12,'#426b62','#f1e5c6');
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
   if((col+r)%17!==0)person(x,y+.16,z,100+col*7+r,true);
  }
 }
 for(const x of [cx-60,cx-40,cx-20,cx,cx+20,cx+40,cx+60]){
  box(x,8,-63,.5,8.4,.5,'#dcded2');box(x,5.5,-48.2,.35,4.2,.35,'#dcded2');
  const front=V(x,10.5,-45.6),ridge=V(x,12.0,-56.5),back=V(x,10.8,-68);
  beam(front,ridge,.11,'#596b68');beam(ridge,back,.11,'#596b68');beam(front,back,.10,'#596b68');beam(V(x,8.2,-63),front,.08,'#596b68');beam(V(x,8.2,-63),ridge,.08,'#596b68');
 }
 for(const side of [-1,1])box(cx,11.62,-56.5+side*5.75,132,.15,11.9,'#a2bab3',side*.105);
 for(let x=cx-65;x<cx+66;x+=3.6){for(const side of [-1,1])box(x,11.73,-56.5+side*5.75,.065,.035,11.9,'#c4cfbd',side*.105);}
 box(cx,10.1,-45.7,126,.78,.08,'#992e25');for(const x of [cx-45,cx-15,cx+15,cx+45])text('ពិធីបុណ្យអកអំបុក · ប្រណាំងទូក-ង',30,.92,x,10.12,-45.63);
 for(const x of [cx-43,cx,cx+43])text('អបអរសាទរ · ប្រណាំងទូក-ង   ·   អបអរសាទរ · ប្រណាំងទូក-ង',39,1.05,x,3.1,-45.60,'#d0af59','#573b20');
 for(const x of [cx-64,cx+64]){
  box(x,4.9,-56,.25,5.7,20,'#e5e7dc');for(let i=0;i<15;i++)box(x-(x<cx?-1:1)*2,1.65+i*.32,-47-i*.83,3.7,.30,.82,'#cccfc3');
 }
 // Officials' booth, access stairs, tents and speaker stacks.
 // The opposite bank has a long low single-pitch covered spectator platform,
 // seen at 00:00 in the supplied livestream, not a mirrored VIP grandstand.
 box(cx-10,1.72,50.8,156,.6,10.0,'#d4d0bd');
 for(let row=0;row<4;row++){const y=1.98+row*.32,z=47.3+row*1.2;box(cx-10,y-.18,z,151,.32,1.2,'#d4d4c6');for(let col=0;col<203;col++){if(col%42<2)continue;const x=cx-83+col*.72;person(x,y+.09,z,13000+row*213+col,true);box(x,y+.08,z,.53,.1,.5,'#4c8291');totals.seats++;}}
 for(let x=cx-88;x<cx+72;x+=10){beam(V(x,1.4,46.6),V(x,4.15,46.6),.075,'#879892');beam(V(x,1.4,56),V(x,4.8,56),.075,'#879892');beam(V(x,4.15,46.6),V(x,4.8,56),.075,'#6d8078');}
 box(cx-10,4.55,51.3,161,.12,10.7,'#c9d2ce',-.067);for(let x=cx-90;x<cx+71;x+=1.1)box(x,4.62,51.3,.035,.025,10.7,'#adbdb7',-.067);
 for(let i=0;i<6;i++)text('ប្រណាំងទូក-ង · សូមស្វាគមន៍',25.1,.75,cx-72.75+i*25.1,1.87,45.6,'#d0af59','#573b20',Math.PI);
 box(1190,3.0,-49.5,10,3.2,7,'#e7eadc');box(1190,4.66,-49.5,10.5,.20,7.8,'#c6d1c6');box(1190,3.50,-45.95,7.7,1.3,.10,'#567b7d');text('អាជ្ញាកណ្តាល',7,.70,1190,2.4,-45.87,'#f1eee1','#4c665c');
 for(let i=0;i<4;i++){const x=970+i*17;box(x,3.0,-51,12,.16,9,'#e9e8d6');for(const dx of [-5.5,5.5])for(const dz of [-4,4])add('pole',x+dx,2.25,-51+dz,.045,1.8,.045,'#c8d1c6');for(let n=0;n<11;n++)person(x-4+n*.8,1.4,-49,900+n+i*7);}
 for(const x of [cx-61,cx+61]){box(x,6.6,-45.2,.72,2.1,.65,'#353e3b');box(x,7.9,-45.2,.1,.6,.1,'#767e77');}
 // National flags and stars removed at the owner's request.
 // C247: real teal curved steel portal forms (2022 press-photo reference).
 // 30/4/Cau Cao: concrete piers and silver arched decoration observed in the
 // January 2022 construction photo at the mapped bridge. Finished cladding and
 // current decoration colour are not established by that photograph.
 for(const [x,label] of [[COURSE.bridgeStart,'C247'],[COURSE.bridgeEnd,'30/4']]){
  const deck=label==='C247'?4.8:7.1;box(x,deck,0,12,.78,115,'#bdc8c1');box(x,deck+.43,0,10.5,.06,115,'#707775');
  for(const dx of [-5.7,5.7]){box(x+dx,deck+1,0,.18,.12,115,'#dbe1d6');for(let z=-55;z<56;z+=2.2){box(x+dx,deck+.85,z,.11,1.25,.11,'#d2d7cc');box(x+dx,deck+.9,z+1.1,.075,.75,1.1,'#d2d7cc');}}
  for(const z of [-28,28]){box(x,deck/2-1,z,8,deck-1,1.7,'#9ba69f');box(x,deck-.6,z,10.5,.6,2.2,'#adb8af');}
  for(const side of [-1,1])box(x,deck*.5,side*68,12,.8,28,'#b9c3b9',side*.11);
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
 }
 // Course markers and finish cable: below all cameras, above the paddle reach.
 for(const x of [0,300,600,900,1200])for(const side of [-1,1]){
  const numerals=String(x).replace(/\d/g,n=>'០១២៣៤៥៦៧៨៩'[Number(n)]);add('pole',x,4.7,side*43.8,.07,7,.07,'#d4d4c5');text(x===1200?'ទីបញ្ចប់':x===0?'ចំណុចចាប់ផ្តើម':numerals+' ម៉ែត្រ',x===0?7:5,1.1,x,7.7,side*43.8,'#8c2c27','#f0dc92');
 }
 beam(V(1200,8, -43.8),V(1200,8,43.8),.015,'#737f74');
 for(let z=-40,i=0;z<42;z+=2.2,i++)box(1200,7.68,z,.04,.55,.75,palette[i%palette.length]);
 for(const {type,shiny,list} of meshes.values()){
  const mesh=new T.InstancedMesh(geometries[type],shiny?metal:material,list.length);if(type==='leaf')mesh.material=material.clone(),mesh.material.side=T.DoubleSide;mesh.name='Maspero_'+type+(shiny?'_metal':'');for(let i=0;i<list.length;i++){mesh.setMatrixAt(i,list[i].matrix);mesh.setColorAt(i,list[i].color);}mesh.computeBoundingSphere();group.add(mesh);
 }
 const crowd=buildCrowd(group,people,crowdAssets);
 group.userData={reference:'OWNER_VTV10_VIDEO_2025_AND_REAL_PHOTOS',dimensions:'APPROXIMATE',...totals,npcSource:'MakeHuman CC0, animated anatomical mesh',signLanguage:'km',standRoof:'VIP double pitch; opposite low single pitch',bridgeC247:'teal curved steel portals',bridge30April:'concrete piers and silver arched truss, 2022 construction photo; finished decoration approximate'};
 return {totals,update(time,cameraX){crowd.update(time,cameraX);},dispose(){crowd.dispose();}};
}
