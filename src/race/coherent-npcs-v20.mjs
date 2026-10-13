import * as THREE from 'three';

const IDS = ['casual-man', 'hoodie-man', 'casual-woman', 'beach-man', 'farmer-man', 'suit-man', 'worker-man', 'punk-man', 'formal-woman', 'suit-woman', 'worker-woman'];
const smooth = x => x * x * (3 - 2 * x);

function orientBone(bone, child, destination, weight) {
  const position=bone.getWorldPosition(new THREE.Vector3()),current=child.getWorldPosition(new THREE.Vector3()).sub(position).normalize(),desired=destination.clone().sub(position).normalize();
  const world=bone.getWorldQuaternion(new THREE.Quaternion()),rotation=new THREE.Quaternion().setFromUnitVectors(current,desired).multiply(world);
  const local=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation);
  bone.quaternion.slerp(local,weight);bone.updateWorldMatrix(false,true);
}
function gestureArm(entry,side,target,weight,kind) {
  const root=entry.root,upper=root.getObjectByName('UpperArm'+side),lower=root.getObjectByName('LowerArm'+side),wrist=root.getObjectByName('Wrist'+side);
  if(!upper||!lower||!wrist)return;
  const a=upper.getWorldPosition(new THREE.Vector3()),e=lower.getWorldPosition(new THREE.Vector3()),w=wrist.getWorldPosition(new THREE.Vector3());
  const upperLength=a.distanceTo(e),lowerLength=e.distanceTo(w),end=root.localToWorld(target.clone()),axis=end.clone().sub(a),distance=THREE.MathUtils.clamp(axis.length(),Math.abs(upperLength-lowerLength)+.01,upperLength+lowerLength-.01);axis.normalize();end.copy(a).addScaledVector(axis,distance);
  const sign=side==='L'?1:-1,hint=root.localToWorld(root.worldToLocal(a.clone()).add(new THREE.Vector3(sign*.25,-.15,.10))).sub(a);
  const bend=hint.addScaledVector(axis,-hint.dot(axis)).normalize(),along=(upperLength**2-lowerLength**2+distance**2)/(2*distance),height=Math.sqrt(Math.max(0,upperLength**2-along**2)),elbow=a.clone().addScaledVector(axis,along).addScaledVector(bend,height);
  orientBone(upper,lower,elbow,weight);orientBone(lower,wrist,end,weight);
  const middle=root.getObjectByName('Middle2'+side),index=root.getObjectByName('Index2'+side),pinky=root.getObjectByName('Pinky2'+side);
  if(!middle||!index||!pinky)return;
  const origin=wrist.getWorldPosition(new THREE.Vector3()),long=middle.getWorldPosition(new THREE.Vector3()).sub(origin).normalize(),across=index.getWorldPosition(new THREE.Vector3()).sub(pinky.getWorldPosition(new THREE.Vector3()));across.addScaledVector(long,-across.dot(long)).normalize();
  const currentFrame=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,long,across.clone().cross(long).normalize()));
  const forward=(kind==='indicate'?new THREE.Vector3(0,0,1):new THREE.Vector3(0,1,0)).transformDirection(root.matrixWorld),width=(kind==='clap'?new THREE.Vector3(0,0,sign):new THREE.Vector3(1,0,0)).transformDirection(root.matrixWorld);
  const desiredFrame=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(width,forward,width.clone().cross(forward).normalize())),desiredWorld=desiredFrame.multiply(currentFrame.invert()).multiply(wrist.getWorldQuaternion(new THREE.Quaternion()));
  const desiredLocal=wrist.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desiredWorld);wrist.quaternion.slerp(desiredLocal,weight);wrist.updateWorldMatrix(false,true);
}
function crowdGesture(entry,time,weight) {
  if(weight<1e-5||entry.walk)return;
  const chest=entry.root.getObjectByName('Chest');if(!chest)return;entry.root.updateWorldMatrix(true,true);
  const center=entry.root.worldToLocal(chest.getWorldPosition(new THREE.Vector3())),kind=['clap','cheer','indicate'][entry.index%3];
  for(const side of ['L','R']){
    const sign=side==='L'?1:-1;if(kind==='indicate'&&side==='R')continue;
    let target;
    if(kind==='clap'){const separation=.014+.095*(.5+.5*Math.cos(time*2*Math.PI*1.65));target=center.clone().add(new THREE.Vector3(sign*separation,-.16,.30));}
    if(kind==='cheer')target=center.clone().add(new THREE.Vector3(sign*.27,.29+.025*Math.sin(time*5+sign),.10));
    if(kind==='indicate')target=center.clone().add(new THREE.Vector3(sign*.29,-.08,.34+.015*Math.sin(time*3)));
    gestureArm(entry,side,target,weight,kind);
  }
  entry.root.userData.crowdGesture=kind;
}

/** Absolute seconds, deterministic phases; all motion stays on the promenade. */
export async function createCoherentNpcs(scene, loader, base) {
  const url = base.replace(/\/?$/, '/') + 'assets/coherent-v20/npcs/';
  const models = await Promise.all(IDS.map(id => loader.loadAsync(url + id + '.glb')));
  const entries = models.map((model, index) => {
    const root = model.scene;
    root.name = 'Civilian_' + IDS[index];
    const box = new THREE.Box3().setFromObject(root);
    const height = index === 2 || index >= 8 ? 1.64 : 1.73;
    root.scale.setScalar(height / (box.max.y - box.min.y));
    const x = index < 3 ? [-1.7, .1, 1.9][index] : [-17, -12.5, -8, -4.5, 5.5, 10, 14.5, 18][index - 3];
    const z = index < 3 ? .3 : [1.05, 2.3, 1.55, 2.65, 1.05, 2.15, 1.4, 2.65][index - 3];
    root.position.set(x, -box.min.y * root.scale.y, z);
    root.rotation.y = Math.PI;
    root.updateMatrixWorld(true);
    const worldBounds=new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere());worldBounds.radius*=1.4;
    root.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = !object.isSkinnedMesh; if(object.isSkinnedMesh){object.userData.coherentNpc=true;object.boundingSphere=worldBounds.clone().applyMatrix4(object.matrixWorld.clone().invert());object.frustumCulled=true;} } });
    scene.add(root);
    const mixer = new THREE.AnimationMixer(root);
    const actions = {};
    for (const name of ['Idle_Neutral', 'Idle', 'Wave', 'Walk']) {
      const clip = model.animations.find(c => c.name === name);
      if (clip) actions[name] = mixer.clipAction(clip).play().setEffectiveWeight(0);
    }
    (actions.Idle_Neutral || actions.Idle)?.setEffectiveWeight(1);
    return { root, mixer, actions, x, z, index, phase: index * 3.719, walk: [5, 9].includes(index) };
  });
  let disposed = false;
  const roots = entries.map(e => e.root);
  return {
    roots,
    stats: { count: roots.length, uniqueModels: IDS.length, sourceActions: ['Idle', 'Idle_Neutral', 'Wave', 'Walk'], authoredActions: ['clap','cheer','indicate'], ids: [...IDS] },
    update(time) {
      if (disposed) return;
      for (const e of entries) {
        const t = time + e.phase;
        const cycle = ((t % 18) + 18) % 18;
        const wave = e.walk ? 0 : cycle < 5 ? Math.min(smooth(Math.min(cycle / .65, 1)), smooth(Math.min((5 - cycle) / .65, 1))) : 0;
        for (const a of Object.values(e.actions)) a.setEffectiveWeight(0);
        const idle = e.actions.Idle_Neutral || e.actions.Idle;
        const walkWeight = e.walk ? smooth(Math.min(Math.abs(Math.cos(t * .40)) / .3, 1)) : 0;
        idle?.setEffectiveWeight(e.walk ? 1 - walkWeight : 1 - wave);
        e.actions.Wave?.setEffectiveWeight(wave);
        e.actions.Walk?.setEffectiveWeight(walkWeight);
        e.mixer.setTime(t);
        const gestureWeight=cycle>6&&cycle<12?smooth(Math.min((cycle-6)/.8,1))*smooth(Math.min((12-cycle)/.8,1)):0;
        e.root.userData.crowdGesture=wave>.2?'wave':e.walk?'walk':'idle';crowdGesture(e,t,gestureWeight);
        if (e.walk) {
          // A short slow route with eased turns, bounded well inside X -20..20.
          const p = t * .40;
          e.root.position.x = e.x + Math.sin(p) * 1.25;
          e.root.rotation.y = Math.atan2(Math.cos(p), .15);
        }
        e.root.position.z = e.z;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set();
      for (const e of entries) {
        e.mixer.stopAllAction(); e.mixer.uncacheRoot(e.root); e.root.removeFromParent();
        e.root.traverse(o => { if (o.skeleton) skeletons.add(o.skeleton); if (o.isMesh) { geometries.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) { materials.add(m); for (const value of Object.values(m)) if (value?.isTexture) textures.add(value); } } });
      }
      for (const t of textures) t.dispose();
      for (const m of materials) m.dispose();
      for (const g of geometries) g.dispose();
      for (const s of skeletons) s.dispose();
    },
  };
}
