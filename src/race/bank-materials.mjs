import * as T from 'three';

export async function loadBankMaterials(base){
 const loader=new T.TextureLoader(),names=['worn_plaster_wall','corrugated_iron','clay_roof_tiles','corrugated_iron-normal','clay_roof_tiles-normal'];
 const textures=await Promise.all(names.map(n=>loader.loadAsync(base+'assets/maps/materials/'+n+'.jpg')));
 textures.forEach((t,i)=>{if(i<3)t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;});
 const wall=new T.MeshStandardMaterial({map:textures[0],vertexColors:true,roughness:.93});
 // Most riverfront buildings have painted plaster, rather than the full
 // exposed, damaged wall in this CC0 sample. Retain subtle surface detail.
 wall.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;','sampledDiffuseColor.rgb=mix(vec3(1.),sampledDiffuseColor.rgb,.16); diffuseColor *= sampledDiffuseColor;'));};
 wall.customProgramCacheKey=()=> 'painted-plaster-v17';
 const tin=new T.MeshStandardMaterial({map:textures[1],normalMap:textures[3],normalScale:new T.Vector2(.30,.30),vertexColors:true,roughness:.65,metalness:.12});
 const tile=new T.MeshStandardMaterial({map:textures[2],normalMap:textures[4],normalScale:new T.Vector2(.40,.40),vertexColors:true,roughness:.87});
 return {wall,tin,tile,textures,dispose(){[wall,tin,tile].forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
