import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {courseZ} from './maspero-layout.mjs';

function template(banana=false){
 const parts=[],add=(g,color,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);const c=new T.Color(color),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3)c.toArray(a,i);g.setAttribute('color',new T.BufferAttribute(a,3));g.deleteAttribute('uv');const ready=g.index?g.toNonIndexed():g;if(ready!==g)g.dispose();parts.push(ready);};
 if(banana){
  add(new T.CylinderGeometry(.13,.19,2.8,9),'#a2aa63',0,.07,0,0,0,Math.PI/2);
  for(let k=0;k<8;k++)add(new T.CylinderGeometry(.134,.145,.035,9),'#697c49',-.95+k*.27,.08,0,0,0,Math.PI/2);
  for(let k=0;k<3;k++){
   const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(.55,.33,1.6,.40,2,0);shape.lineTo(1.45,-.24);shape.lineTo(1.37,-.04);shape.lineTo(1.30,-.28);shape.bezierCurveTo(.7,-.35,.25,-.14,0,0);
   const g=new T.ShapeGeometry(shape,8);g.rotateX(-Math.PI/2);add(g,k%2?'#739d45':'#4b8b42',-.65,.14,k*.14-.1,0,k*.85-.6,0);
  }
 }else{
  for(let plant=0;plant<7;plant++){
   const angle=plant*2.4,x=Math.cos(angle)*.42,z=Math.sin(angle)*.36;
   add(new T.SphereGeometry(.11,7,5),'#8ba95b',x,.045,z,0,0,0);
   for(let k=0;k<5;k++){
    const a=k*Math.PI*2/5+plant,shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(.25,.23,.60,.23,.65,0);shape.bezierCurveTo(.53,-.22,.2,-.25,0,0);const g=new T.ShapeGeometry(shape,5);g.rotateX(-Math.PI/2);add(g,k%2?'#61a346':'#438744',x,.10+(k%2)*.055,z,.06*Math.sin(a),a,0);
    add(new T.CylinderGeometry(.014,.023,.20,5),'#8da14e',x,.10,z,.45*Math.sin(a),0,.45*Math.cos(a));
   }
   for(let k=0;k<2;k++)add(new T.CylinderGeometry(.007,.015,.19,4),'#66523b',x+k*.035,-.055,z,.3,0,.25);
  }
 }
 const geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());return geometry;
}
export function flotsamPlacement(index,time=0){
 const banana=index>=32,x=-600+((1440+index*37.71-time*.24)%3600+3600)%3600,side=index%2?1:-1,z=side*(banana?37:34.5+(index%4)*1.1);
 return {x,y:Math.sin(time*.95+index)*.025,z:courseZ(x,z),yaw:index*2.41+Math.sin(time*.12+index)*.10,scale:banana?.72+(index%3)*.2:.70+(index%5)*.18};
}
export function buildRiverFlotsam(parent,waterY){
 const group=new T.Group();group.name='River_Hyacinth_And_Fallen_Banana';parent.add(group);
 const material=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}),geometries=[template(),template(true)],counts=[32,8],dummy=new T.Object3D(),batches=geometries.map((g,i)=>{const m=new T.InstancedMesh(g,material,counts[i]);m.name=i?'Floating_Fallen_Banana_Stems':'Floating_Water_Hyacinth_Patches';m.frustumCulled=false;group.add(m);return m;});
 const stats={hyacinthPatches:32,fallenBananaStems:8,drawCalls:2,placement:'near banks, outside the racing lanes',flowMps:.24,samples:[]};parent.userData.flotsam=stats;let last=-Infinity;
 function update(time){if(time-last<.08)return;last=time;stats.samples=[];for(let i=0;i<40;i++){const p=flotsamPlacement(i,time);dummy.position.set(p.x,waterY+p.y,p.z);dummy.rotation.set(Math.sin(time*.6+i)*.025,p.yaw,Math.sin(time*.7+i)*.025);dummy.scale.setScalar(p.scale);dummy.updateMatrix();batches[i>=32?1:0].setMatrixAt(i>=32?i-32:i,dummy.matrix);if(i<3||i===32)stats.samples.push({id:i,...p});}batches.forEach(b=>b.instanceMatrix.needsUpdate=true);}
 update(0);return{group,stats,update,dispose(){group.removeFromParent();batches.forEach(b=>b.dispose());geometries.forEach(g=>g.dispose());material.dispose();}};
}
