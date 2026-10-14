// Cache a far view's local transforms, not only its GPU matrices: the eight
// masters are shared by both boats, and attachment world positions must agree.
export function crewAnimation(rigs, applyPose, {distanceThreshold = 44} = {}) {
 const nodes = Object.values(rigs).flatMap(rig => {
  const list = []; rig.root.traverse(node => list.push(node)); return list;
 });
 const views = new Map(), counters = {updates:0, restores:0, byView:{}};
 function capture(view) {
  let poses = views.get(view);
  if (!poses) {
   poses = nodes.map(() => new Float64Array(42));
   if (views.size === 4) views.delete(views.keys().next().value);
   views.set(view, poses);
  }
  nodes.forEach((node, i) => {
   const p = poses[i]; node.position.toArray(p,0); node.quaternion.toArray(p,3);
   node.scale.toArray(p,7); node.matrix.toArray(p,10); node.matrixWorld.toArray(p,26);
  });
 }
 function restore(view) {
  const poses = views.get(view);
  nodes.forEach((node, i) => {
   const p=poses[i]; node.position.fromArray(p,0); node.quaternion.fromArray(p,3);
   node.scale.fromArray(p,7); node.matrix.fromArray(p,10); node.matrixWorld.fromArray(p,26);
   node.matrixWorldNeedsUpdate=false;
  });
  for (const rig of Object.values(rigs)) rig.skeleton.update();
 }
 return {
  counters,
  update(phase,time,{viewKey='study',frameId,distance=0,nearest=false,desyncIntensity=0}={}) {
   const far=!nearest && Number.isInteger(frameId) && distance>distanceThreshold;
   if (far && frameId%2 && views.has(viewKey)) { restore(viewKey); counters.restores++; }
   else {
    applyPose(phase,time,desyncIntensity); counters.updates++;
    counters.byView[viewKey]=(counters.byView[viewKey]||0)+1;
    if (far) capture(viewKey);
   }
  },
  clear(){views.clear();},
  get distanceThreshold(){return distanceThreshold;},
 };
}
