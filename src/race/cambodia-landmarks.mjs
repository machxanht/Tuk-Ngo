import * as T from 'three';
import {cambodiaLayout,cambodiaFeature} from './cambodia-geography.mjs';

// Original light geometry built from field-photo silhouettes and OSM footprints.
// Photos are references only. No photographic texture or Google tile is shipped.
export function buildCambodiaLandmarks(parent,venueId){
 const records=[];
 const geometries={box:new T.BoxGeometry(1,1,1),column:new T.CylinderGeometry(1,1,1,8),spire:new T.ConeGeometry(1,1,8),orb:new T.SphereGeometry(1,10,6)},materials=new Map();
 const palette={ivory:'#f8ebc7',gold:'#e8b643',tile:'#d49a30',edge:'#3e6854',red:'#af513c',museum:'#ae5548',dark:'#46665f'};
 function mat(c){if(!materials.has(c))materials.set(c,new T.MeshLambertMaterial({color:c}));return materials.get(c);}
 function part(g,type,x,y,z,w,h,d,c){const mesh=new T.Mesh(geometries[type],mat(c));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);g.add(mesh);return mesh;}
 const box=(g,x,y,z,w,h,d,c=palette.ivory)=>part(g,'box',x,y,z,w,h,d,c);
 const finialGeometry=new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(.25,.5,0),new T.Vector3(.1,1,0),new T.Vector3(-.25,1.15,0)]),8,.07,4,false);
 function finial(g,x,y,z,h=2){const m=new T.Mesh(finialGeometry,mat(palette.gold));m.position.set(x,y,z);m.scale.y=h;g.add(m);}
 // Curved lower eaves, a gold fascia and dark green tile borders, rather than
 // three intersecting cones. Geometry is shared by equal roof dimensions.
 const roofs=new Map();
 function roof(g,x,y,z,w,d,h,c=palette.tile){
  const key=[w,d,h].join(':');let geometry=roofs.get(key);
  if(!geometry){const vertices=[],uv=[],indices=[],steps=6;
   for(const side of[-1,1])for(let i=0;i<=steps;i++)for(const end of[-1,1]){const t=i/steps;vertices.push(end*w/2,h*(1-t)+Math.pow(t,6)*h*.12,side*d/2*t);uv.push(end<0?0:1,t);}
   for(let s=0;s<2;s++)for(let i=0;i<steps;i++){const a=s*(steps+1)*2+i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
   geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();roofs.set(key,geometry);
  }
  const material=mat(c);material.side=T.DoubleSide;const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);g.add(mesh);
  for(const side of[-1,1]){box(g,x,y+h*.12,z+side*d/2,w,.22,.36,palette.gold);for(const end of[-1,1])finial(g,x+end*w/2,y+h*.12,z+side*d/2,1.5);}
  box(g,x,y+h,z,w,.18,.25,palette.gold);
 }
 function gable(g,x,y,z,w,h,c=palette.red){const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(0,h);shape.closePath();const geometry=new T.ShapeGeometry(shape),mesh=new T.Mesh(geometry,mat(c));mesh.material.side=T.DoubleSide;mesh.position.set(x,y,z);g.add(mesh);for(const side of[-1,1]){const beam=box(g,x+side*w/4,y+h/2,z,.32,Math.hypot(w/2,h),.25,palette.gold);beam.rotation.z=side*Math.atan2(w/2,h);}for(let i=0;i<7;i++)part(g,'orb',x+(i-3)*w*.08,y+h*(.12+Math.sin(i*1.5)**2*.25),z+.12,.23,.35,.12,palette.gold);}
 function tower(g,x,y,z,height){let level=y;for(let i=0;i<5;i++){const w=9-i*1.45;box(g,x,level+.65,z,w,1.3,w,palette.gold);roof(g,x,level+1.3,z,w+1,w+1,2.4);level+=3.2;}part(g,'spire',x,level+(height-(level-y))/2,z,.85,height-(level-y),.85,palette.gold);}
 function base(f){const g=new T.Group();g.name='Landmark_'+f.id;g.position.set(f.x,0,f.z);g.userData={id:f.id,osmWay:f.osmWay,latitude:f.lat,longitude:f.lon,reference:'docs/cambodia-research.md',dimensionsEstimated:true};parent.add(g);records.push({id:f.id,name:f.name,x:f.x,z:f.z,osmWay:f.osmWay});return g;}
 function fence(g,w,d){for(const side of[-1,1]){box(g,0,2,side*d/2,w,2,1,palette.ivory);for(let x=-w/2;x<=w/2;x+=6){box(g,x,3.3,side*d/2,.7,1,.8,palette.ivory);part(g,'spire',x,4.1,side*d/2,.45,.7,.45,palette.gold);}}}
 function hall(f,{open=false,silver=false}={}){
  const g=base(f),w=open?49:silver?23:30,d=open?22:silver?48:76,y=open?5:3,h=open?7:silver?6:9;
  box(g,0,1.02,0,w+18,.12,d+18,'#e4d6b7');box(g,0,1.5,0,w+4,2,d+4,palette.ivory);for(let step=0;step<4;step++)box(g,0,.5+step*.35,d/2+2-step*.5,w*.4,.35,4-step*.5,palette.ivory);
  if(!open)box(g,0,y+h/2,0,w,h,d,palette.ivory);else box(g,0,3,0,w,3,d,palette.ivory);
  for(const side of[-1,1])for(let i=0;i<=(open?8:10);i++){const x=-w*.46+i*w*.92/(open?8:10),z=side*d*.46;part(g,'column',x,y+h/2,z,.23,h,.23,palette.ivory);box(g,x,y+h-.2,z,.65,.4,.65,palette.gold);if(!open)box(g,x,y+h*.43,z+side*.3,1.15,h*.58,.1,palette.dark);}
  const top=y+h;
  for(let layer=0;layer<3;layer++){const dd=d+5-layer*4,ww=w+6-layer*4,innerHeight=5*(dd-3.2)/dd;roof(g,0,top+layer*2.4,0,ww,dd,5,palette.edge);roof(g,0,top+5-innerHeight+.10+layer*2.4,0,ww-1,dd-3.2,innerHeight,silver?'#c98c29':palette.tile);}
  // Front-facing cross gable and the central spire are visible from the quay.
  gable(g,0,top+3,d/2+1,w*.48,7);const cross=new T.Group();cross.rotation.y=Math.PI/2;g.add(cross);roof(cross,0,top+2,0,d*.55,w+8,7);
  if(!silver)tower(g,0,top+9,0,open?24:59-(top+9));
  g.rotation.y=open?0:.06;
  g.userData.height=silver?25:open?45:59;
 }
 if(venueId==='phnom-penh'){
  hall(cambodiaFeature(venueId,'moonlight'),{open:true});hall(cambodiaFeature(venueId,'throne-hall'));hall(cambodiaFeature(venueId,'silver-pagoda'),{silver:true});
  const compound=base(cambodiaFeature(venueId,'palace-compound'));box(compound,0,1,0,380,.12,360,'#a3bf6d');fence(compound,400,360);
  // The mapped museum way is one wing. The remaining courtyard wings follow
  // the photographed red Khmer courtyard typology; their size is estimated.
  const museum=base(cambodiaFeature(venueId,'national-museum'));
  for(const [x,z,w,d] of [[0,0,96,17],[-41,33,14,66],[41,33,14,66],[0,66,96,17]]){box(museum,x,5,z,w,8,d,palette.museum);roof(museum,x,9,z,w+3,d+4,9,palette.red);for(let dx=-w/2+3;dx<w/2;dx+=5){box(museum,x+dx,5,z+d/2+.05,1.7,4,.12,palette.dark);box(museum,x+dx,7.3,z+d/2+.1,2,.35,.15,palette.gold);}}
  box(museum,0,1.3,33,65,.18,42,'#87b45d');box(museum,0,1.5,33,18,.25,12,'#6db3aa');gable(museum,0,9,77,14,10,palette.museum);
  const park=base(cambodiaFeature(venueId,'palace-park'));box(park,0,1.05,0,190,.15,80,'#91bd68');box(park,0,1.15,0,190,.1,8,'#e3d4b5');
 }else{
  const residence=base(cambodiaFeature(venueId,'royal-residence'));residence.rotation.y=Math.PI/2;
  box(residence,0,1.5,0,35,1,20,palette.ivory);box(residence,0,4,0,30,4,14,'#fcf4db');
  roof(residence,0,6.2,0,35,22,6,palette.red);
  for(let x=-14;x<=14;x+=3.5){part(residence,'column',x,3.6,9,.17,4,.17,'#fff5df');box(residence,x,3.5,7.1,1.5,2.6,.08,'#6e5443');}
  box(residence,0,2.1,9,30,.2,.3,palette.gold);box(residence,0,1.8,10,32,.3,2);
  // Rounded projecting entrance and the white central gable from the photo.
  part(residence,'column',0,3.7,8.5,4,4.8,3.6,'#fff5df');box(residence,0,3.5,12.1,2.8,3.3,.12,'#654938');gable(residence,0,6.2,12,10,5,'#f9edcf');gable(residence,0,6.5,12.1,7,3.7,palette.red);
  const entranceRoof=new T.Group();entranceRoof.position.set(0,6.2,8);entranceRoof.rotation.y=Math.PI/2;residence.add(entranceRoof);roof(entranceRoof,0,0,0,9,11,5,palette.red);
  const shrine=base(cambodiaFeature(venueId,'royal-shrine'));box(shrine,0,2,0,23,2,23,'#e8d3aa');for(const x of[-8,8])for(const z of[-8,8])part(shrine,'column',x,5,z,.3,5,.3,palette.ivory);for(let k=0;k<3;k++)roof(shrine,0,7+k*2,0,25-k*5,25-k*5,6,palette.red);gable(shrine,0,8,12,13,6);part(shrine,'spire',0,22,0,.7,8,.7,palette.gold);
  const garden=base(cambodiaFeature(venueId,'royal-gardens'));box(garden,0,1.03,0,170,.12,130,'#8dbd66');box(garden,0,1.16,0,170,.12,7,'#e9d8b4');box(garden,0,1.16,0,7,.12,130,'#e9d8b4');
  const fcc=base(cambodiaFeature(venueId,'fcc-angkor'));box(fcc,0,4,0,44,6,20,'#efe8cd');roof(fcc,0,7,0,48,24,5,'#8c7356');for(let x=-20;x<=20;x+=4){part(fcc,'column',x,4.2,11,.2,6,.2,'#fff3d9');box(fcc,x,4.3,10.1,2.1,3.1,.08,'#527265');}
 }
 const context=new T.Group();context.name='Landmark_Mapped_Context';parent.add(context);
 const triangle=new T.Shape();triangle.moveTo(-.5,0);triangle.lineTo(.5,0);triangle.lineTo(0,1);triangle.closePath();
 const contextRoof=new T.ExtrudeGeometry(triangle,{depth:1,bevelEnabled:false});contextRoof.translate(0,0,-.5);
 const contextBuildings=cambodiaLayout.venues[venueId].contextBuildings;
 for(const [i,b]of contextBuildings.entries()){
  // Hero footprints are represented by the more detailed photo-based models.
  const heroes=records.filter(l=>!l.id.includes('compound')&&!l.id.includes('park')&&!l.id.includes('garden'));
  if(heroes.some(l=>Math.abs(l.x-b.x)<30&&Math.abs(l.z-b.z)<35))continue;
  const height=venueId==='phnom-penh'?5:4,w=Math.max(2,b.w),d=Math.max(2,b.d),g=new T.Group();g.position.set(b.x,0,b.z);g.rotation.y=b.rotation;context.add(g);
  box(g,0,1.1,0,w+2,.25,d+2,'#e1d3b1');box(g,0,1.2+height/2,0,w,height,d,palette.ivory);
  const roofMesh=new T.Mesh(contextRoof,mat(venueId==='phnom-penh'&&i%3===0?palette.tile:palette.red));roofMesh.position.y=1.2+height;roofMesh.scale.set(Math.min(w,d)+2,Math.min(5,Math.min(w,d)*.4),Math.max(w,d)+2);roofMesh.rotation.y=w>d?Math.PI/2:0;g.add(roofMesh);
  for(let x=-w/2+2;x<w/2;x+=4)for(const side of[-1,1])box(g,x,3.2,side*(d/2+.05),1.2,2,.08,palette.dark);
 }
 // Flatten local transforms before batching the context houses, preserving
 // each mapped orientation without one draw call per window or roof.
 context.updateMatrixWorld(true);const contextMeshes=[];context.traverse(o=>{if(o.isMesh)contextMeshes.push(o);});
 for(const m of contextMeshes)context.attach(m);
 for(const child of [...context.children])if(child.isGroup)child.removeFromParent();
 context.userData={mappedBuildings:contextBuildings.length,heightAndFacadeEstimated:true};
 // Merge equal material/geometry instances within each landmark. This keeps
 // detailed eaves and columns inexpensive while allowing per-building culling.
 for(const g of parent.children.filter(c=>c.name.startsWith('Landmark_'))){const buckets=new Map();for(const mesh of [...g.children]){if(!mesh.isMesh)continue;const key=mesh.geometry.uuid+':'+mesh.material.uuid;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(mesh);}for(const list of buckets.values()){if(list.length<2)continue;const batch=new T.InstancedMesh(list[0].geometry,list[0].material,list.length);list.forEach((m,i)=>{m.updateMatrix();batch.setMatrixAt(i,m.matrix);m.removeFromParent();});batch.computeBoundingSphere();g.add(batch);}}
 return records;
}
