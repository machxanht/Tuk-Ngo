import * as T from 'three';
import {createHybridBoats} from './hybrid-boats.mjs';

const cameraSpecs={whole:{target:[0,.85,0],offset:[13,10,-22],fit:true},upper:{target:[7.6,1,0],offset:[1.8,1.6,-3.7]},face:{target:[9.8,1.25,-.27],offset:[.55,.20,-1.25]},front:{target:[11.5,1,0],offset:[3.8,1.8,-3.8]},stern:{target:[-11.6,1,0],offset:[-2,1.7,-3.9]},top:{target:[0,.85,0],offset:[0,28,.01],fit:true}};

// Use the game's actual boat and athlete implementation. No substitute body,
// clothing, fitting, skeleton, paddle or animation is authored by this preview.
export async function createCharacterCrew(sharedRenderer){
 const rig=await createHybridBoats('../assets/illustrated-v22/',{sharedRenderer});
 const {scene,boat,actors}=rig;scene.background=new T.Color('#c9e9f2');
 const water=new T.Mesh(new T.PlaneGeometry(600,600),new T.MeshLambertMaterial({color:'#729a88',side:T.DoubleSide}));water.rotation.x=-Math.PI/2;water.position.y=.275;scene.add(water);
 function update(phase,elapsed){rig.render(phase,elapsed,{updateOnly:true,nearest:true,connectedKit:true,kitColor:'#23855e'});}
 function stats(){const roster=actors.map(a=>({index:a.id,role:a.role,posture:a.posture,side:a.side,...a.identity}));return{crew:actors.length,bodyModels:1,bodyModel:'original-game-glb',faceD:roster.filter(a=>a.model==='d').length,faceF:roster.filter(a=>a.model==='f').length,faceProfiles:new Set(roster.map(a=>a.model+':'+a.face)).size,sharedSkeletons:Object.keys(rig.roles).length,materialVariants:rig.faces.materialCount,roster};}
 update(0,0);
 return{scene,boat,actors,rig,roles:rig.roles,update,stats,floorAt:rig.floorAt,randomize(seed){rig.faces.randomize(seed);return stats();},cameraSpec:mode=>cameraSpecs[mode]||cameraSpecs.whole,dispose:rig.dispose};
}
