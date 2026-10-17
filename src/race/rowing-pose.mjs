import * as T from 'three';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Y=V(0,1,0);
export const ROWING_LAYOUT={callerX:12.35,sternDeckY:.50,rowerOffset:.24,lateralScale:.90,seatedPaddleLength:1.22,seatedBarDrop:.075};
function frame(x,y){y=y.clone().normalize();x=x.clone().addScaledVector(y,-x.dot(y)).normalize();return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,x.clone().cross(y).normalize()));}
function curve(values,t,knots=[0,.12,.43,.57,.72,.90,1]){for(let i=0;i<knots.length-1;i++)if(t<=knots[i+1]){const a=T.MathUtils.smoothstep(t,knots[i],knots[i+1]);return T.MathUtils.lerp(values[i],values[i+1],a);}return values.at(-1);}

// Local +Z faces the bow. A +90° actor yaw maps local +X to boat -Z,
// so port (-Z) uses local +X for its blade. Never mirror a skinned mesh.
export function rowingPose(master,{role='rower',posture='seated',side=-1}={}){
 const bones=Object.fromEntries(master.skeleton.bones.map(b=>[b.name,b]));
 const bind=Object.fromEntries(master.skeleton.bones.map((b,i)=>[b.name,master.skeleton.boneInverses[i].clone().invert()]));
 const restPos=n=>V().setFromMatrixPosition(bind[n]),restQ=n=>new T.Quaternion().setFromRotationMatrix(bind[n]);
 const pos=n=>bones[n].getWorldPosition(V());
 function setQ(n,q){const bone=bones[n],parent=bone.parent.getWorldQuaternion(new T.Quaternion()).invert();bone.quaternion.copy(parent.multiply(q));bone.updateMatrixWorld(true);}
 const root=master.skeleton.bones.find(b=>!master.skeleton.bones.includes(b.parent));
 const arms={};
 for(const [s,sign]of [['l',1],['r',-1]]){
  const u='upperarm_'+s,f='lowerarm_'+s,h='hand_'+s,ud=restPos(f).sub(restPos(u)).normalize(),fd=restPos(h).sub(restPos(f)).normalize(),hinge=ud.clone().cross(fd).normalize();
  const hd=restPos('middle_01_'+s).sub(restPos(h)).normalize(),across=restPos('index_01_'+s).sub(restPos('pinky_01_'+s)).normalize();
  arms[s]={u,f,h,sign,ul:restPos(f).distanceTo(restPos(u)),fl:restPos(h).distanceTo(restPos(f)),pl:restPos('middle_01_'+s).distanceTo(restPos(h))*.9,uf:frame(hinge,ud).invert().multiply(restQ(u)),ff:frame(hinge,fd).invert().multiply(restQ(f)),hf:frame(across,hd).invert().multiply(restQ(h))};
 }
 function direction(n,child,delta){const bone=bones[n],q=bone.getWorldQuaternion(new T.Quaternion()),from=pos(child).sub(pos(n)).normalize();setQ(n,new T.Quaternion().setFromUnitVectors(from,delta.clone().normalize()).multiply(q));}
 function leg(s,z,x=restPos('thigh_'+s).x,y=.075){
  const thigh='thigh_'+s,calf='calf_'+s,foot='foot_'+s,origin=pos(thigh),target=V(x,y,z),u=restPos(calf).distanceTo(restPos(thigh)),v=restPos(foot).distanceTo(restPos(calf));
  const delta=target.clone().sub(origin),d=T.MathUtils.clamp(delta.length(),Math.abs(u-v)+1e-5,u+v-1e-5),unit=delta.normalize(),a=(u*u-v*v+d*d)/(2*d),pole=V(s==='l'?.08:-.08,0,1);pole.addScaledVector(unit,-pole.dot(unit)).normalize();
  const knee=origin.clone().addScaledVector(unit,a).addScaledVector(pole,Math.sqrt(Math.max(0,u*u-a*a)));
  direction(thigh,calf,knee.sub(origin));direction(calf,foot,target.sub(pos(calf)));setQ(foot,restQ(foot));
 }
 function arm(arm,grip){
  const origin=pos(arm.u),delta=grip.clone().sub(origin),distance=delta.length(),u=arm.ul,v=arm.fl+arm.pl,d=Math.min(distance,u+v-1e-6),unit=delta.normalize(),a=(u*u-v*v+d*d)/(2*d),pole=V(arm.sign,-.15,.2);pole.addScaledVector(unit,-pole.dot(unit)).normalize();
  const elbow=origin.clone().addScaledVector(unit,a).addScaledVector(pole,Math.sqrt(Math.max(0,u*u-a*a))),end=elbow.clone().addScaledVector(grip.clone().sub(elbow).normalize(),arm.fl),ud=elbow.clone().sub(origin).normalize(),fd=end.clone().sub(elbow).normalize(),hinge=ud.clone().cross(fd).normalize();
  setQ(arm.u,frame(hinge,ud).multiply(arm.uf));setQ(arm.f,frame(hinge,fd).multiply(arm.ff));setQ(arm.h,frame(hinge,grip.clone().sub(end)).multiply(arm.hf));
 }
 return phase=>{
  if(role==='controller')return;
  const outer=-side,hip=role==='helm'?.83:posture==='standing'?.70:.55;
  if(posture==='seated'){
   // Feet tuck toward the keel beneath a cross-thwart. Raising the ankles
   // allows the seated pelvis to remain below the gunwale without hull cuts.
   for(const s of ['l','r'])leg(s,role==='caller'?.50:.06,(s==='l'?.06:-.06)+(role==='caller'?0:-outer*.13),role==='caller'?.34:.34);
   if(role==='caller')return;
  }
  if(posture==='standing'){
   const pelvis=(pos('thigh_l').y+pos('thigh_r').y)/2,point=root.getWorldPosition(V()).addScaledVector(Y,hip-pelvis);root.position.copy(root.parent.worldToLocal(point));root.updateMatrixWorld(true);
   for(const s of ['l','r'])leg(s,role==='helm'?(s===(outer>0?'l':'r')?.28:-.28):(s===(outer>0?'l':'r')?-.45:.31));
  }
  const angle=T.MathUtils.degToRad(curve([27,12,-29,-35,52,58,50,27],phase,[0,.12,.43,.57,.68,.72,.90,1]));
  let axis=V(-outer*.40,Math.cos(angle)*Math.sqrt(.84),-Math.sin(angle)*Math.sqrt(.84)).normalize();
  let top=V(-outer*.07,hip+curve([.62,.56,.48,.59,.72,.68,.62],phase),curve([.43,.46,.13,.10,.20,.42,.43],phase));
  if(role==='helm'){
   // Plant, loaded sweep aft/outboard, release, and raised recovery. The
   // staggered feet stay planted while the torso transfers weight.
   const spine=bones.spine_01;spine.quaternion.multiply(new T.Quaternion().setFromAxisAngle(V(1,0,0),T.MathUtils.degToRad(curve([8,10,-8,-12,-3,8,8],phase))));spine.updateMatrixWorld(true);
   const bladeY=curve([.18,.10,.12,.17,.48,.64,.18],phase)-ROWING_LAYOUT.sternDeckY;
   top=V(-outer*.07,hip+.48,curve([.32,.34,.02,-.08,.10,.32,.32],phase));
   const dx=top.x-outer*curve([.88,.95,1.35,1.45,1.25,.92,.88],phase),dy=top.y-bladeY;
   axis=V(dx,dy,Math.sqrt(4.2**2-dx*dx-dy*dy)).normalize();
  }
  const upper=outer>0?'r':'l',ordered=[arms[upper],arms[upper==='l'?'r':'l']];
  // Project the common upper grip into both arm reach volumes, so changing
  // stance never detaches a hand or straightens an elbow beyond its limit.
  for(let step=0;step<24;step++)for(let i=0;i<2;i++){
   const a=ordered[i],center=pos(a.u).addScaledVector(axis,i*.53),u=a.ul,v=a.fl+a.pl,delta=top.clone().sub(center),lo=Math.sqrt(u*u+v*v-2*u*v*Math.cos(T.MathUtils.degToRad(55))),hi=Math.sqrt(u*u+v*v-2*u*v*Math.cos(T.MathUtils.degToRad(145)));
   const distance=delta.length();top.copy(center).addScaledVector(delta.normalize(),T.MathUtils.clamp(distance,lo,hi));
  }
  ordered.forEach((a,i)=>arm(a,top.clone().addScaledVector(axis,-i*.53)));
  // Equipment local -Y runs from its T grip down to the blade.
  const width=V(1,0,0).addScaledVector(axis,-axis.x).normalize(),q=frame(width,axis);
  const world=new T.Matrix4().compose(top,q,V(1,1,1)),local=master.paddle.parent.matrixWorld.clone().invert().multiply(world);local.decompose(master.paddle.position,master.paddle.quaternion,master.paddle.scale);master.paddle.updateMatrixWorld(true);
 };
}

export function correctedRowingClip(master,options){
 if(options.role==='controller')return master.clip.clone();
 const apply=rowingPose(master,options),times=Float32Array.from([...new Set([0,...master.clip.tracks.flatMap(track=>Array.from(track.times))])].sort((a,b)=>a-b));
 const records=master.clip.tracks.map(track=>{const {nodeName,propertyName}=T.PropertyBinding.parseTrackName(track.name),node=master.root.getObjectByName(nodeName);if(!node||!['position','quaternion','scale'].includes(propertyName))throw Error('Unexpected rowing channel '+track.name);return {track,node,propertyName,size:track.getValueSize(),values:new Float32Array(times.length*track.getValueSize())};});
 for(let i=0;i<times.length;i++){
  master.mixer.setTime(times[i]);master.root.updateMatrixWorld(true);apply(times[i]/master.clip.duration);master.root.updateMatrixWorld(true);
  for(const r of records)r.node[r.propertyName].toArray(r.values,i*r.size);
 }
 return new T.AnimationClip(options.name,master.clip.duration,records.map(r=>new r.track.constructor(r.track.name,times,r.values,T.InterpolateLinear)));
}
