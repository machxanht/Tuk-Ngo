import * as T from 'three';
import {assetBytes,releaseAssetBytes} from './asset-transfer.mjs';

export const DEFAULT_KBACH_ID='7669657553378282770';
const catalogs=new Map();
const atlases=new Map();
const absolute=url=>new URL(url,globalThis.location?.href||'http://localhost/').href;
export function kbachLibraryRoot(boatBase){return absolute(boatBase+'../ghe-ngo/kbach-library/');}
export function loadKbachCatalog(root){
 root=absolute(root);
 if(!catalogs.has(root))catalogs.set(root,assetBytes(root+'manifest.json').then(bytes=>JSON.parse(new TextDecoder().decode(bytes))).catch(error=>{catalogs.delete(root);throw error;}));
 return catalogs.get(root);
}
export async function loadKbachTexture(url){
 const bytes=await assetBytes(url),blob=new Blob([bytes],{type:'image/webp'}),objectUrl=URL.createObjectURL(blob);
 try{
  const image=new Image();image.src=objectUrl;await image.decode();
  const texture=new T.Texture(image);texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;texture.anisotropy=8;texture.needsUpdate=true;return texture;
 }finally{URL.revokeObjectURL(objectUrl);releaseAssetBytes(url);}
}
export function kbachIndex(id,count){let hash=2166136261;for(const c of id)hash=Math.imul(hash^c.charCodeAt(0),16777619);return (hash>>>0)%count;}
export function atlasKbachTexture(texture,atlas,index){
 const map=texture.clone(),height=atlas.size[1],padding=atlas.padding;
 map.offset.y=(index*atlas.cellHeight+padding)/height;
 map.repeat.y=(atlas.cellHeight-2*padding)/height;
 map.userData.kbachAtlasRow=index;return map;
}
export function acquireKbachAtlas(root){
 root=absolute(root);
 let entry=atlases.get(root);
 if(!entry){
  entry={references:0,result:null};atlases.set(root,entry);
  entry.ready=loadKbachCatalog(root).then(async catalog=>({catalog,texture:await loadKbachTexture(root+catalog.atlas.file)})).then(result=>{entry.result=result;if(!entry.references){result.texture.dispose();atlases.delete(root);}return result;},error=>{atlases.delete(root);throw error;});
 }
 entry.references++;let released=false;
 return {ready:entry.ready,release(){if(released)return;released=true;entry.references--;if(!entry.references&&entry.result){entry.result.texture.dispose();atlases.delete(root);}}};
}

// Full 8K maps are only loaded by the close inspection view. Keep at most two
// per rig; the fleet and tournament share a single small atlas GPU source.
export function createKbachLibrary(boatBase){
 const root=kbachLibraryRoot(boatBase),full=new Map();let disposed=false,sharedAtlas;
 async function fleet(){
  if(!sharedAtlas)sharedAtlas=acquireKbachAtlas(root);
  const acquisition=sharedAtlas;
  try{const result=await acquisition.ready;if(disposed)throw Error('Kbach library disposed');return result;}catch(error){acquisition.release();if(sharedAtlas===acquisition)sharedAtlas=null;throw error;}
 }
 async function load(id){
  if(disposed)throw Error('Kbach library disposed');
  if(full.has(id)){const promise=full.get(id);full.delete(id);full.set(id,promise);return promise;}
  const promise=loadKbachCatalog(root).then(catalog=>{
   const item=catalog.items.find(item=>item.id===id);if(!item)throw Error('Unknown kbach design: '+id);
   return loadKbachTexture(root+item.texture).then(texture=>{texture.userData.kbachId=id;if(disposed){texture.dispose();throw Error('Kbach library disposed');}return texture;});
  }).catch(error=>{full.delete(id);throw error;});full.set(id,promise);
  const texture=await promise;
  // Only evict resolved selections after the newest one is ready.
  if(full.get(id)===promise)while(full.size>2){const oldest=full.keys().next().value;if(oldest===id)break;const removed=full.get(oldest);full.delete(oldest);removed.then(map=>map.dispose(),()=>{});}
  return texture;
 }
 return {root,load,fleet,dispose(){disposed=true;sharedAtlas?.release();for(const pending of full.values())pending.then(texture=>texture.dispose(),()=>{});full.clear();}};
}
