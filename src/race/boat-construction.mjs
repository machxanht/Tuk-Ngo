import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {profile} from './boat.mjs';

// Art variants, not an assertion about the construction of a historical team.
export const BOAT_CONSTRUCTIONS=['plywood','dugout'];
export const constructionForLane=index=>index%2?'dugout':'plywood';
export function buildConstructionDetails(boat){
 const variants={plywood:new T.Group(),dugout:new T.Group()};
 const timber=new T.MeshLambertMaterial({color:'#b56d32'}),seam=new T.MeshLambertMaterial({color:'#75451f'}),carved=new T.MeshLambertMaterial({color:'#d99b4c'});
 variants.plywood.name='Plywood_Panel_Seams';variants.dugout.name='Dugout_Continuous_Carved_Gunwale';
 function rail(parent,side,drop,radius,material){
  const points=[];for(let i=0;i<=80;i++){const x=-14.65+i*29.3/80,p=profile(x);points.push(new T.Vector3(x,p.g-drop,side*Math.max(.035,p.b-.025)));}
  parent.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),100,radius,6,false),material));
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
