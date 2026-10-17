import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {buildFestivalCrowd} from './festival-crowd.mjs';

// Original game mesh, using real Mekong cargo-boat proportions/details rather
// than a race hull: broad timber bilge, red eyed prow, aft cabin and open hold.
// The referee conversion/measurements are authored to the owner's instruction.
export function buildStartOfficial(scene,assets,{x,z=0,waterY=.28}){
 const root=new T.Group(),floating=new T.Group();root.name='Start_Official_Cargo_Boat';floating.name='Mekong_Timber_Cargo';root.add(floating);root.position.set(x,waterY,z);root.rotation.y=Math.PI;scene.add(root);
 const parts=new Map(),resources=[],wood=['#73543b','#876247','#9b7550','#6e503a'];
 function add(geometry,color,position=[0,0,0],rotation=[0,0,0],kind='wood'){
  geometry.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(1,1,1)));
  geometry.deleteAttribute('uv');const c=new T.Color(color),values=new Float32Array(geometry.attributes.position.count*3);for(let i=0;i<values.length;i+=3)c.toArray(values,i);geometry.setAttribute('color',new T.BufferAttribute(values,3));
  if(!parts.has(kind))parts.set(kind,[]);parts.get(kind).push(geometry);
 }
 const box=(color,x,y,z,w,h,d,kind='wood',rotation)=>add(new T.BoxGeometry(w,h,d),color,[x,y,z],rotation,kind);
 function rod(color,a,b,r=.025,kind='wood'){const p=new T.Vector3(...a),q=new T.Vector3(...b),direction=q.clone().sub(p),g=new T.CylinderGeometry(r,r,direction.length(),7);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize()));add(g,color,p.add(q).multiplyScalar(.5).toArray(),undefined,kind);}
 const stations=[[-7.2,.15,-.13,1.12],[-6.3,.98,-.43,1.01],[-4.8,1.48,-.57,.97],[-2,1.68,-.64,.97],[1.8,1.68,-.64,.99],[4,1.48,-.54,1.08],[5.7,1.10,-.30,1.30],[6.8,.50,-.05,1.44],[7.2,.09,.15,1.47]];
 const positions=[],indices=[],cross=24;
 for(const [x,w,k,g]of stations)for(let j=0;j<=cross;j++){const a=j/cross*Math.PI;positions.push(x,k+(g-k)*Math.pow(1-Math.sin(a),.7),w*Math.cos(a));}
 for(let i=0;i<stations.length-1;i++)for(let j=0;j<cross;j++){const a=i*(cross+1)+j,b=a+cross+1;indices.push(a,a+1,b,a+1,b+1,b);}
 const hull=new T.BufferGeometry();hull.setAttribute('position',new T.Float32BufferAttribute(positions,3));hull.setIndex(indices);hull.computeVertexNormals();add(hull,'#654d3c');
 const bowPaint=new T.Color('#b83d34');for(let i=0;i<hull.attributes.position.count;i++)if(hull.attributes.position.getX(i)>5.4&&hull.attributes.position.getY(i)>.64)hull.attributes.color.setXYZ(i,bowPaint.r,bowPaint.g,bowPaint.b);
 // Long plank seams follow the actual curved sections, with no box hull.
 for(const side of [-1,1])for(let n=0;n<7;n++)for(let i=0;i<stations.length-1;i++){
  const q=.30+n*.115,width=Math.sqrt(1-(1-Math.pow(q,1/.7))**2),point=s=>[s[0],s[2]+(s[3]-s[2])*q,side*(s[1]*width+.008)];rod(wood[n%wood.length],point(stations[i]),point(stations[i+1]),.014);
 }
 function deck(points,y,color){const contour=points.map(([x,z])=>new T.Vector2(x,z)),tri=T.ShapeUtils.triangulateShape(contour,[]).flatMap(t=>[t[2],t[1],t[0]]),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(([x,z])=>[x,y,z]),3));g.setIndex(tri);g.computeVertexNormals();add(g,color);}
 deck([...stations.map(s=>[s[0],s[1]*.88]),...stations.slice().reverse().map(s=>[s[0],-s[1]*.88])],.68,'#ac8356');
 deck([[3.3,1.33],[5.7,.95],[6.8,.39],[6.8,-.39],[5.7,-.95],[3.3,-1.33]],.92,'#b58b5e');
 for(const side of [-1,1])for(let i=0;i<stations.length-1;i++){const a=stations[i],b=stations[i+1];rod('#b04b3d',[a[0],a[3],side*a[1]],[b[0],b[3],side*b[1]],.055);}
 // Paint directly on the outer bow. Separate inset panels would disappear
 // behind the curved timber skin; the eyes sit just outside that skin.
 for(const side of [-1,1]){
  const yaw=side>0?.51:Math.PI-.51;
  add(new T.CircleGeometry(.22,28),'#f9efda',[6.35,1.13,side*.76],[0,yaw,0],'paint');add(new T.CircleGeometry(.135,24),'#222b2b',[6.36,1.13,side*.776],[0,yaw,0],'paint');
 }
 // Low hatch coaming and a partly rolled cover leave working space forward.
 for(const side of [-1,1])box('#725238',.25,.94,side*1.14,5.6,.51,.09);
 for(const end of [-2.55,3.05])box('#725238',end,.94,0,.09,.51,2.35);
 box('#638c89',-.7,1.20,0,2.6,.07,2.2);add(new T.CylinderGeometry(.14,.14,2.2,12),'#648b82',[.68,1.27,0],[Math.PI/2,0,0]);
 for(let i=0;i<5;i++)box(wood[i%4],-1.9+i*.35,.84,.28,.28,.25,.65,'wood',[0,i*.16,.09]);
 // Small aft cabin, window frames, open front door and corrugated sheet roof.
 for(const side of [-1,1]){
  box('#6e9da6',-4.65,1.04,side*1.13,2.9,.72,.10);box('#e4dfc7',-4.65,2.34,side*1.13,2.9,.16,.12);
  for(const px of [-6.05,-4.65,-3.25])box('#e4dfc7',px,1.87,side*1.13,.09,1.05,.12);
  for(const px of [-5.35,-3.95])box('#477b88',px,1.83,side*1.14,1.27,.86,.04,'glass');
 }
 box('#77a8af',-6.08,1.60,0,.12,1.8,2.22);box('#67969e',-3.20,1.2,0,.10,.92,2.22);
 for(const sz of [-.76,.76])box('#e4dfc7',-3.15,1.95,sz,.10,1.02,.08);
 box('#e4dfc7',-3.15,2.42,0,.12,.12,2.25);box('#223f41',-3.13,1.83,0,.035,1.0,1.42,'glass');
 for(const side of [-1,1])box('#bdc7bb',-4.6,2.71,side*.67,3.5,.09,1.40,'metal',[side*.13,0,0]);
 for(let i=0;i<23;i++)for(const side of [-1,1])rod('#92a9a4',[-6.3+i*.155,2.81,0],[-6.3+i*.155,2.63,side*1.36],.012,'metal');
 for(const side of [-1,1])for(const px of [-3.0,2.55]){
  add(new T.TorusGeometry(.30,.085,8,24),'#303737',[px,.64,side*1.68],undefined,'rubber');rod('#baa788',[px,1.05,side*1.61],[px,.77,side*1.68],.018);
 }
 add(new T.TorusGeometry(.32,.075,8,24),'#e37a36',[-4.8,1.77,1.24],undefined,'paint');
 // Fore/aft centre-line moorings cannot cross either paddle lane.
 for(const side of [-1,1]){
  const a=[side*6.7,.92,0],b=[side*9,-.24,0];rod('#bdab85',a,b,.025);add(new T.TorusGeometry(.24,.025,6,32),'#bdab85',[side*5.8,.96,.35],[Math.PI/2,0,0]);
 }
 for(const [kind,list]of parts){const geometry=mergeGeometries(list,false);list.forEach(g=>g.dispose());const material=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:kind==='glass'?.22:kind==='metal'?.57:.91,metalness:kind==='metal'?.23:0});const mesh=new T.Mesh(geometry,material);mesh.name='Cargo_'+kind;floating.add(mesh);resources.push(geometry,material);}
 const pole=new T.Mesh(new T.CylinderGeometry(.025,.025,2.5,8),new T.MeshStandardMaterial({color:'#e1dfc9'}));pole.position.set(5.55,2.15,0);floating.add(pole);resources.push(pole.geometry,pole.material);
 const flagPivot=new T.Group();flagPivot.position.set(5.55,3.38,0);floating.add(flagPivot);
 const flagMaterial=new T.MeshStandardMaterial({color:'#ffcf32',side:T.DoubleSide,roughness:.85}),flag=new T.Mesh(new T.PlaneGeometry(.95,.52,6,2),flagMaterial);flag.position.set(.49,-.27,0);flagPivot.add(flag);resources.push(flag.geometry,flagMaterial);
 const lampMaterial=new T.MeshBasicMaterial({color:'#e84736'}),lamp=new T.Mesh(new T.SphereGeometry(.10,12,8),lampMaterial);lamp.position.set(5.55,3.52,0);floating.add(lamp);resources.push(lamp.geometry,lampMaterial);
 const people=[{x:4.45,z:0,floor:.93,id:850001,modelId:'casual-man',activity:'indicate',yaw:Math.PI/2},{x:3.60,z:-.86,floor:.93,id:850002,modelId:'suit-man',activity:'idle',yaw:Math.PI},{x:3.60,z:.86,floor:.93,id:850003,modelId:'casual-woman',activity:'wave',yaw:0}].map((p,i)=>({...p,age:'adult',height:1,width:1,uniform:{top:i?'#c4e6ef':'#f1f0df',bottom:0,shoes:0}}));
 const crew=buildFestivalCrowd(floating,people,assets,{vibrant:true,middleLimit:12,farLimit:3,radius:430});
 const labelCanvas=document.createElement('canvas');labelCanvas.width=1024;labelCanvas.height=192;const ctx=labelCanvas.getContext('2d');ctx.fillStyle='#183c43';ctx.fillRect(0,0,1024,192);ctx.fillStyle='#fff3c5';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 105px "Noto Sans Khmer"';ctx.fillText('អាជ្ញាកណ្តាល',512,97,980);const map=new T.CanvasTexture(labelCanvas);map.colorSpace=T.SRGBColorSpace;
 const labelMaterial=new T.MeshBasicMaterial({map,side:T.DoubleSide}),labelGeometry=new T.PlaneGeometry(2.6,.49);
 for(const side of [-1,1]){const label=new T.Mesh(labelGeometry,labelMaterial);label.position.set(-.5,1.08,side*1.235);label.rotation.y=side<0?Math.PI:0;floating.add(label);}resources.push(map,labelMaterial,labelGeometry);
 const cameraLocal=new T.Vector3(),stats={role:'START_REFEREE',kind:'Mekong timber cargo boat',lengthM:14.4,beamM:3.36,officials:3,startAlignment:'prow 0.8 m upstream of start; watches both lane bows',reference:'https://vietcruisetours.com/en/tours/CAI-BE-FLOATING-MARKET-MEKONG-ONE-DAY-TOUR-118.html',conversion:'owner-requested referee use; not an identified boat from the tournament',signal:'hold',crew:crew.stats};root.userData=stats;
 let disposed=false;
 return {root,floating,stats,update(time,race,camera){
  if(disposed)return;floating.position.y=Math.sin(time*.8)*.018;floating.rotation.x=Math.sin(time*.65)*.004;floating.rotation.z=Math.sin(time*.7)*.003;
  const hold=race.state==='countdown';stats.signal=hold?'hold':'go';lampMaterial.color.set(hold?'#ee6643':'#58e66d');flagPivot.rotation.z=hold?-.04:-1.13;flag.rotation.y=Math.sin(time*2.8)*.13;
  root.updateMatrixWorld(true);cameraLocal.copy(camera.position);floating.worldToLocal(cameraLocal);crew.update(time,cameraLocal.x,cameraLocal.z);
 },dispose(){if(disposed)return;disposed=true;crew.dispose();resources.forEach(r=>r.dispose());root.removeFromParent();}};
}
