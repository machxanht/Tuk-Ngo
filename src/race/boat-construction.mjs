import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {profile} from './boat.mjs';

// Art variants, not an assertion about the construction of a historical team.
export const BOAT_CONSTRUCTIONS=['plywood','dugout'];
export {constructionForLane,opponentConstruction} from './construction-rules.mjs';
export function buildConstructionDetails(boat){
 const variants={plywood:new T.Group(),dugout:new T.Group()};
 const timber=new T.MeshLambertMaterial({color:'#b56d32'}),seam=new T.MeshLambertMaterial({color:'#75451f'}),carved=new T.MeshLambertMaterial({color:'#d99b4c'});
 variants.plywood.name='Plywood_Panel_Seams';variants.dugout.name='Dugout_Continuous_Carved_Gunwale';
 function rail(parent,side,drop,radius,material){
  const points=[];for(let i=0;i<=128;i++){const x=-15.09+i*30.18/128,p=profile(x);points.push(new T.Vector3(x,p.g-Math.min(drop,(p.g-p.k)*.6),side*Math.max(.001,p.b-.025)));}
  const path=new T.CatmullRomCurve3(points),geometry=new T.TubeGeometry(path,128,radius,6,false),positions=geometry.attributes.position,point=new T.Vector3();
  // Finish the carved rim at the actual tip. A constant-radius tube cut off
  // half a metre early looked like a separate square timber on the prow.
  for(let i=0;i<=128;i++){const center=path.getPointAt(i/128),scale=Math.max(.015,Math.min(1,profile(center.x).b/.10));for(let j=0;j<=6;j++){const index=i*7+j;point.fromBufferAttribute(positions,index).sub(center).multiplyScalar(scale).add(center);positions.setXYZ(index,point.x,point.y,point.z);}}
  geometry.computeVertexNormals();parent.add(new T.Mesh(geometry,material));
 }
 for(const side of[-1,1]){
  rail(variants.dugout,side,0,.045,carved);
  rail(variants.plywood,side,0,.018,timber);
  for(const drop of[.12,.24])rail(variants.plywood,side,drop,.009,seam);
 }
 for(let x=-12.5;x<13;x+=1.45){const p=profile(x),rib=new T.Mesh(new T.BoxGeometry(.045,.16,p.b*1.75),timber);rib.position.set(x,p.g-.19,0);variants.plywood.add(rib);}
 for(const group of Object.values(variants)){
  const batches=new Map();for(const mesh of [...group.children]){mesh.updateMatrix();if(!batches.has(mesh.material))batches.set(mesh.material,[]);batches.get(mesh.material).push(mesh.geometry.clone().applyMatrix4(mesh.matrix));mesh.geometry.dispose();group.remove(mesh);}
  for(const [material,parts]of batches){group.add(new T.Mesh(mergeGeometries(parts,false),material));parts.forEach(g=>g.dispose());}
  boat.add(group);
 }
 return {set(type){for(const [name,group]of Object.entries(variants))group.visible=name===type;},variants};
}
