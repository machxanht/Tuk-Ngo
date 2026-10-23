import * as T from 'three';
import {riverFlow} from './race-flow.mjs';
import {COURSE,raceX} from './maspero-course.mjs';

export function buildFlowGuide(scene){
 const shape=new T.Shape();shape.moveTo(-.8,0);shape.lineTo(.6,-.65);shape.lineTo(.6,-.40);shape.lineTo(-.3,0);shape.lineTo(.6,.40);shape.lineTo(.6,.65);shape.closePath();
 const geometry=new T.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);
 const material=new T.MeshBasicMaterial({color:'#cdfff0',transparent:true,opacity:.46,depthWrite:false,side:T.DoubleSide});
 const mesh=new T.InstancedMesh(geometry,material,16),dummy=new T.Object3D();mesh.name='Playable_River_Flow';mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.visible=false;scene.add(mesh);
 return {mesh,update(state,visible){
  mesh.visible=visible;if(!visible)return;
  const first=Math.floor((state.distances[0]+9)/7)*7,drift=(state.elapsed*2.2)%7;
  for(let i=0;i<16;i++){const distance=Math.min(1201,first+i*7+drift),flow=riverFlow(distance,0,state.flowSeed);dummy.position.set(raceX(distance),.315,COURSE.lanes[0]-flow.center);dummy.rotation.set(0,-Math.atan(flow.slope),0);dummy.scale.setScalar(distance>1200?0:1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
  mesh.instanceMatrix.needsUpdate=true;material.opacity=state.flowBonus>=2.5?.66:.46;
 },dispose(){mesh.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();}};
}
