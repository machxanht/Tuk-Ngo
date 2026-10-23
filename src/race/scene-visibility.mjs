import * as T from 'three';

// Conservative bounds keep silhouettes at the edge of the screen. This only
// culls decoration; physics, boat positions and race clocks never use it.
export function createSceneVisibility(offsetX=0){
 const frustum=new T.Frustum(),projection=new T.Matrix4(),lens=new T.Matrix4(),sphere=new T.Sphere();
 const position=new T.Vector3(Infinity,0,0),rotation=new T.Quaternion();
 let revision=0,ready=false;
 return {
  get revision(){return revision;},
  update(camera){
   if(!camera?.isCamera)return;
   if(ready&&lens.equals(camera.projectionMatrix)&&position.distanceToSquared(camera.position)<4&&Math.abs(rotation.dot(camera.quaternion))>.99995)return;
   camera.updateMatrixWorld(true);projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);for(const plane of frustum.planes)plane.constant+=12;
   lens.copy(camera.projectionMatrix);position.copy(camera.position);rotation.copy(camera.quaternion);ready=true;revision++;
  },
  contains(x,y,z,radius=3){if(!ready)return true;sphere.center.set(x+offsetX,y,z);sphere.radius=radius;return frustum.intersectsSphere(sphere);},
 };
}
