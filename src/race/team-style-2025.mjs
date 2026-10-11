import * as T from 'three';
import {RACE_TEAMS_2025,team2025} from './teams-2025.mjs';

export async function loadTeamLiveries(base){
 const loader=new T.TextureLoader(),textures=new Map();
 await Promise.all(RACE_TEAMS_2025.map(async team=>{
  const texture=await loader.loadAsync(base+'assets/ghe-ngo/teams-2025/'+team.id+'.svg');
  // The Blender export inverts the old Three UV: v=0 at the gunwale.
  // Follow glTF image orientation so the upper kbach stays above the water.
  texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;texture.anisotropy=8;
  textures.set(team.id,texture);
 }));
 return {textures,dispose(){for(const texture of textures.values())texture.dispose();}};
}

export function applyTeamIdentity(root,id,liveries){
 const team=team2025(id),materials=[],geometries=[],cache=new Map();
 root.updateMatrixWorld(true);
 root.userData.team2025={...team,season:2025,division:'men',backPrint:'កូនខ្មែរ',hullShapeEvidence:'shared accepted shape; individual measurements unavailable'};
 function tint(material,color,tag){const key=material.uuid+':'+tag+':'+color;if(!cache.has(key)){const copy=material.clone();copy.color.set(color);copy.name=tag;cache.set(key,copy);materials.push(copy);}return cache.get(key);}
 const hull=root.getObjectByName('Hull_Watertight_30_20x1_12');
 if(!hull)throw Error('Accepted hull missing');
 // GLTFLoader represents a multi-primitive glTF hull as a Group, or a
 // material-array Mesh for other sources. Touch only the painted outer skin.
 hull.traverse(mesh=>{if(!mesh.isMesh)return;const paint=material=>{if(!material.map)return material;const copy=material.clone();copy.name=team.id+'_Kbach_2025';copy.map=liveries.textures.get(id);copy.color.set('white');materials.push(copy);return copy;};mesh.material=Array.isArray(mesh.material)?mesh.material.map(paint):paint(mesh.material);});
 // Keep the wood structure while matching visible end paint on each boat.
 for(const name of ['Red_Integrated_Prow','Red_Integrated_Stern']){const mesh=root.getObjectByName(name);if(mesh)mesh.material=tint(mesh.material,team.pattern==='om-scroll'?'#ed6826':'#c83239',team.id+'_End_Paint');}
 const actors=[];root.traverse(o=>{if(o.userData.component==='athlete'&&/^Athlete_\d+_/.test(o.name))actors.push(o);});
 const sleeveLength=.14,sleeveGeometry=new T.CylinderGeometry(.059,.068,sleeveLength,16,1,true);
 const direction=new T.Vector3(0,1,0);
 for(const actor of actors){
  const roleKit=team.roleKit?.[actor.userData.role];
  if(!['ROWER','HELMSMAN'].includes(actor.userData.role)&&!roleKit)continue;
  const kitColor=roleKit?.jersey||(team.alternateJersey&&actor.userData.id%7===0?team.alternateJersey:team.jersey);
  const capColor=roleKit?.cap||(team.capVariants?team.capVariants[actor.userData.id%10<7?0:actor.userData.id%10<9?1:2]:team.cap);
  actor.userData.teamId=id;actor.userData.jersey=kitColor;actor.userData.capColor=capColor;
  actor.traverse(mesh=>{
   if(!mesh.isMesh)return;
   function style(m){
    if(roleKit&&/^(Caller_Olive|Controller_Light_Blue)/.test(m.name))return tint(m,kitColor,team.id+'_'+actor.userData.role+'_Fabric');
    if(/^Competition_Green_Fabric/.test(m.name))return tint(m,kitColor,team.id+'_Competition_Fabric');
    if(/^Green_Ribbed_Binding/.test(m.name))return tint(m,team.trim,team.id+'_Collar_Armhole');
    if(/^White_Cotton_Cap/.test(m.name))return tint(m,capColor,team.id+'_Cap');
    if(/^Dark_Competition_Shorts/.test(m.name))return tint(m,roleKit?.shorts||'#17222a',team.id+'_'+actor.userData.role+'_Shorts');
    return m;
   }
   const original=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;
   mesh.material=Array.isArray(mesh.material)?mesh.material.map(style):style(mesh.material);
   if(team.lowerJersey&&!roleKit&&/^Competition_Green_Fabric/.test(original.name)){
    const geometry=mesh.geometry.clone(),position=geometry.attributes.position,index=geometry.index;
    let min=Infinity,max=-Infinity;for(let v=0;v<(index?.count??position.count);v++){const i=index?index.getX(v):v;min=Math.min(min,position.getY(i));max=Math.max(max,position.getY(i));}
    const top=new T.Color(kitColor),bottom=new T.Color(team.lowerJersey),color=new T.Color(),values=new Float32Array(position.count*3);
    for(let v=0;v<position.count;v++){const blend=T.MathUtils.smoothstep((position.getY(v)-min)/Math.max(.001,max-min),.05,.8);color.copy(bottom).lerp(top,blend);values.set(color.toArray(),v*3);}
    geometry.setAttribute('color',new T.BufferAttribute(values,3));mesh.geometry=geometry;geometries.push(geometry);
    const material=mesh.material.clone();material.color.set('white');material.vertexColors=true;mesh.material=material;materials.push(material);
   }
  });
  const sleeveColor=roleKit?roleKit.sleeve:team.sleeve;
  if(sleeveColor){
   const fabric=new T.MeshStandardMaterial({color:sleeveColor,roughness:.9,side:T.DoubleSide});fabric.name=team.id+'_Short_Sleeve';materials.push(fabric);
   for(const suffix of ['l','r']){
    let upper,fore;actor.traverse(b=>{if(b.isBone&&new RegExp('^upperarm_'+suffix+'(?:_|$)').test(b.name))upper=b;if(b.isBone&&new RegExp('^lowerarm_'+suffix+'(?:_|$)').test(b.name))fore=b;});
    if(!upper||!fore)continue;
    const end=upper.worldToLocal(fore.getWorldPosition(new T.Vector3())).normalize().multiplyScalar(sleeveLength);
    const sleeve=new T.Mesh(sleeveGeometry,fabric);sleeve.name='Team_Sleeve_'+actor.userData.id+'_'+suffix;sleeve.position.copy(end).multiplyScalar(.5);sleeve.quaternion.setFromUnitVectors(direction,end.clone().normalize());upper.add(sleeve);
   }
  }
 }
 geometries.push(sleeveGeometry);
 return {team,dispose(){materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}};
}
