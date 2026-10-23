import * as T from 'three';

export const SKIN_TONES=['#dfb392','#c79773','#b7845c','#a16d48','#8c5d3e','#775039','#61412e'];
export const HAIR_COLORS=['#181511','#30251a','#483021','#201e1c','#5a4736'];
export const FACE_IDENTITIES=[{}, {FaceWide:.85}, {JawLean:.9}, {NoseBroad:.9}, {FaceLong:.85}, {FaceWide:.5,NoseBroad:.7}, {JawLean:.6,FaceLong:.5}, {FaceWide:.35,FaceLong:.55}];
function hash(n){n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return(n^(n>>>16))>>>0;}
export function characterIdentity(seed,index){
 const n=hash(seed+Math.imul(index+1,0x9e3779b9));
 return {model:hash(n+1)%2?'d':'f',skin:hash(n+2)%SKIN_TONES.length,hair:hash(n+3)%4,hairColor:hash(n+4)%HAIR_COLORS.length,face:hash(n+5)%FACE_IDENTITIES.length};
}
export function identitySignature(identity){return[identity.model,identity.skin,identity.hair,identity.hairColor,identity.face].join(':');}
export function faceIdentity(mesh,identity,{blink=0,effort=0,smile=0}={}){
 const dict=mesh.morphTargetDictionary;if(!dict)return;
 const weights={...FACE_IDENTITIES[identity.face],Blink:blink,Effort:effort,Smile:smile};
 for(const [name,index]of Object.entries(dict))mesh.morphTargetInfluences[index]=weights[name]||0;
}
export function createIdentityMaterials(){
 const cache=new Map();
 function get(source,model,identity){
  const skin=/Superhero_Male|Snow portable skin/i.test(source.name),hair=/Short dark hair|Hair library/.test(source.name);
  if(!skin&&!hair)return source;
  const key=source.uuid+':'+model+':'+(skin?identity.skin:identity.hairColor);
  if(!cache.has(key)){
   const m=source.clone();
   if(skin){const reference=new T.Color(model==='d'?'#c79b6d':'#6b4f3a'),target=new T.Color(SKIN_TONES[identity.skin]);m.color.setRGB(target.r/reference.r,target.g/reference.g,target.b/reference.b);}
   if(hair){m.map=null;m.color.set(HAIR_COLORS[identity.hairColor]);m.roughness=.8;}
   cache.set(key,m);
  }
  return cache.get(key);
 }
 return {get,get size(){return cache.size;},dispose(){for(const material of cache.values())material.dispose();cache.clear();}};
}
