import * as T from 'three';
import {prepareDesign,buildBoat,verifyBoat,SPEC} from './boat.mjs';

await prepareDesign(import.meta.env.BASE_URL+'assets/ghe-ngo/kbach-from-reference.webp',import.meta.env.BASE_URL+'assets/human/makehuman-athlete.glb');
const boat=buildBoat(),scene=new T.Scene();scene.add(boat.root);
scene.add(new T.HemisphereLight('#fff4dc','#557062',1.25));
const key=new T.DirectionalLight('#ffe6b5',2.6);key.position.set(-12,22,18);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-20;key.shadow.camera.right=20;key.shadow.camera.top=10;key.shadow.camera.bottom=-10;key.shadow.normalBias=.015;scene.add(key);
const rim=new T.DirectionalLight('#d0e4df',.65);rim.position.set(12,10,-16);scene.add(rim);
boat.root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setClearColor(0x000000,0);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.clippingPlanes=[new T.Plane(new T.Vector3(0,1,0),-SPEC.waterY)];
document.querySelector('#shot').appendChild(renderer.domElement);
const camera=new T.OrthographicCamera(-16.9,16.9,4.225,-4.225,.05,500);
const config={boat:{width:1536,height:384},crew:{width:512,height:512}};
const status=document.querySelector('#status'),viewControl=document.querySelector('#view'),phaseControl=document.querySelector('#phase');
function setView(view){const v=config[view];renderer.setSize(v.width,v.height);const width=view==='boat'?33.8:2.4;camera.left=-width/2;camera.right=width/2;camera.top=width*v.height/v.width/2;camera.bottom=-camera.top;
 if(view==='boat'){camera.position.set(10,13,43);camera.lookAt(0,1,0);}else{camera.position.set(5.4,2.25,4.5);camera.lookAt(4.27,.90,.06);}
 for(const a of boat.athletes){a.root.visible=view==='boat'||a.pair===8;if(a.paddle)a.paddle.visible=a.root.visible;}
 camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}
function show(){setView(viewControl.value);boat.pose(Number(phaseControl.value));renderer.render(scene,camera);document.body.dataset.phase=phaseControl.value;document.body.dataset.view=viewControl.value;}
viewControl.addEventListener('change',show);phaseControl.addEventListener('input',show);
const check=verifyBoat(boat);status.textContent=check.pass?'Model đã tải · rig đạt · chọn góc rồi xuất bộ ảnh':JSON.stringify(check.errors);document.body.dataset.rigPass=String(check.pass);document.body.dataset.rigCheck=JSON.stringify(check);
const urls=[];
function link(blob,name){const url=URL.createObjectURL(blob);urls.push(url);const a=document.createElement('a');a.href=url;a.download=name;a.textContent=name;document.querySelector('#downloads').appendChild(a);}
document.querySelector('#capture').disabled=false;document.querySelector('#capture').addEventListener('click',()=>{show();renderer.domElement.toBlob(blob=>link(blob,'art-check-'+viewControl.value+'-'+phaseControl.value+'.png'));});
document.querySelector('#bake').disabled=!check.pass;
document.querySelector('#bake').addEventListener('click',async()=>{
 const button=document.querySelector('#bake');button.disabled=true;for(const url of urls)URL.revokeObjectURL(url);urls.length=0;document.querySelector('#downloads').replaceChildren();
 const view=viewControl.value,v=config[view],frames=[],pages=[],count=24,perPage=8;
 setView(view);
 for(let page=0;page<3;page++){
  const atlas=document.createElement('canvas');atlas.width=v.width*2;atlas.height=v.height*4;const ctx=atlas.getContext('2d');
  for(let tile=0;tile<perPage;tile++){
   const index=page*perPage+tile,phase=index/count;boat.pose(phase);renderer.render(scene,camera);const sx=(tile%2)*v.width,sy=Math.floor(tile/2)*v.height;ctx.drawImage(renderer.domElement,sx,sy);
   const contacts=[];
   for(const a of boat.athletes){if(a.role!=='ROWER'||!a.root.visible)continue;
    const tip=new T.Vector3(0,-SPEC.paddleLength,0).applyMatrix4(a.paddle.matrixWorld),depth=tip.y-SPEC.waterY;tip.y=SPEC.waterY;tip.project(camera);contacts.push({id:a.root.userData.id,x:(tip.x+1)/2,y:(1-tip.y)/2,depth,front:a.z>0});
   }
   frames.push({page,sx,sy,phase,contacts});status.textContent=`Đang xuất ${view}: ${index+1}/24`;await new Promise(requestAnimationFrame);
  }
  const name=view+'-'+page+'.webp',blob=await new Promise(resolve=>atlas.toBlob(resolve,'image/webp',.95));if(!blob)throw Error('Không xuất được WebP');pages.push(name);link(blob,name);
 }
 link(new Blob([JSON.stringify({width:v.width,height:v.height,pages,frames},null,2)],{type:'application/json'}),view+'-manifest.json');status.textContent='Đã xuất 24 khung hình · tải 3 atlas và manifest';button.disabled=false;show();
});
show();
