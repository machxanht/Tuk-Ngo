import * as T from 'three';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Y=V(0,1,0);
export const ROWING_LAYOUT={callerX:12.35,controllerX:5.42,sternDeckY:.50,rowerOffset:.24,lateralScale:.90,seatedPaddleLength:1.22,steeringPaddleLength:2.05,seatedBarDrop:.075,spearLength:1.48,spearTop:.36,spearBottom:-1.12};
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
  const delta=target.clone().sub(origin),d=T.MathUtils.clamp(delta.length(),Math.abs(u-v)+1e-5,u+v-1e-5),unit=delta.normalize(),a=(u*u-v*v+d*d)/(2*d),pole=V((s==='l'?.06:-.06)+(role==='rower'?side*.28:0),0,1);pole.addScaledVector(unit,-pole.dot(unit)).normalize();
  const knee=origin.clone().addScaledVector(unit,a).addScaledVector(pole,Math.sqrt(Math.max(0,u*u-a*a)));
  direction(thigh,calf,knee.sub(origin));direction(calf,foot,target.sub(pos(calf)));setQ(foot,restQ(foot));
 }
 function arm(arm,grip){
  // The inboard upper arm folds forward, along the boat, instead of flaring
  // sideways into its partner. Both palms still solve to the same shaft.
  const outer=-side,inboard=arm.sign!==outer;
  const origin=pos(arm.u),delta=grip.clone().sub(origin),distance=delta.length(),u=arm.ul,v=arm.fl+arm.pl,d=Math.min(distance,u+v-1e-6),unit=delta.normalize(),a=(u*u-v*v+d*d)/(2*d),pole=['controller','bow-spear'].includes(role)?V(arm.sign*.8,-1,.3):inboard?V(outer*.85,-.15,1.5):V(arm.sign,-.15,.35);pole.addScaledVector(unit,-pole.dot(unit)).normalize();
  const center=origin.clone().addScaledVector(unit,a),radius=Math.sqrt(Math.max(0,u*u-a*a));
  if(inboard&&['rower','caller'].includes(role)){
   // The elbow lies on a two-bone reach circle. Choose its forwardmost point,
   // constrained to leave 12 cm between the paired inboard elbows.
   pole.copy(V(0,0,1)).addScaledVector(unit,-unit.z).normalize();
   const bound=-(ROWING_LAYOUT.rowerOffset-.06)/ROWING_LAYOUT.lateralScale;
   if((center.x+pole.x*radius)*outer<bound){
    const bx=V(outer,0,0).addScaledVector(unit,-unit.x*outer).normalize(),bz=unit.clone().cross(bx);if(bz.z<0)bz.negate();
    const c=T.MathUtils.clamp((bound-center.x*outer)/(radius*bx.x*outer),-1,1);pole.copy(bx).multiplyScalar(c).addScaledVector(bz,Math.sqrt(1-c*c));
   }
  }
  const elbow=center.addScaledVector(pole,radius),end=elbow.clone().addScaledVector(grip.clone().sub(elbow).normalize(),arm.fl),ud=elbow.clone().sub(origin).normalize(),fd=end.clone().sub(elbow).normalize(),hinge=ud.clone().cross(fd).normalize();
  setQ(arm.u,frame(hinge,ud).multiply(arm.uf));setQ(arm.f,frame(hinge,fd).multiply(arm.ff));setQ(arm.h,frame(hinge,grip.clone().sub(end)).multiply(arm.hf));
 }
 return phase=>{
  const outer=-side,hip=['controller','bow-spear'].includes(role)?.94:role==='helm'?.83:posture==='standing'?.70:.55;
  if(posture==='seated'){
   // Feet tuck toward the keel beneath a cross-thwart. Raising the ankles
   // allows the seated pelvis to remain below the gunwale without hull cuts.
   for(const s of ['l','r'])leg(s,role==='caller'?.50:.06,(s==='l'?.06:-.06)+(role==='caller'?0:-outer*.13),role==='caller'?.34:.34);
  }
  if(posture==='standing'){
   const pelvis=(pos('thigh_l').y+pos('thigh_r').y)/2,point=root.getWorldPosition(V()).addScaledVector(Y,hip-pelvis);root.position.copy(root.parent.worldToLocal(point));root.updateMatrixWorld(true);
   for(const s of ['l','r'])leg(s,['helm','controller','bow-spear'].includes(role)?(s==='l'?.23:-.23):(s===(outer>0?'l':'r')?-.45:.31),role==='rower'?(s==='l'?.06:-.06)-outer*.13:restPos('thigh_'+s).x);
  }
  if(role==='controller'){
   // One hand keeps the whistle at the lips; the free hand marks the drive.
   const mouth=pos('head').add(V(.055,-.10,.14));
   arm(arms.l,mouth);arm(arms.r,V(-.31,hip+curve([.30,.24,.10,.14,.34,.38,.30],phase),curve([.48,.54,.35,.30,.43,.51,.48],phase)));
   return;
  }
  // The seated caller follows the same imaginary shaft with staggered hands.
  // No visible paddle is attached: this is a rowing cue to the crew.
  const angle=T.MathUtils.degToRad(curve([27,12,-29,-35,52,58,50,27],phase,[0,.12,.43,.57,.68,.72,.90,1]));
  // The shaft crosses gunwale HEIGHT outside the painted skin. Testing only
  // its tip hid a collision halfway up the old, too-upright paddle.
  let axis=V(-outer*.52,Math.cos(angle)*Math.sqrt(1-.52**2),-Math.sin(angle)*Math.sqrt(1-.52**2)).normalize();
  let top=V(outer*.09,hip+curve([.62,.56,.48,.59,.72,.68,.62],phase),curve([.50,.53,.32,.28,.35,.49,.50],phase));
  if(role==='helm'){
   // A nearly upright rudder makes small corrections beside the stern.
   const spine=bones.spine_01;spine.quaternion.multiply(new T.Quaternion().setFromAxisAngle(V(1,0,0),T.MathUtils.degToRad(curve([8,10,-8,-12,-3,8,8],phase))));spine.updateMatrixWorld(true);
   top=V(outer*.19,hip+.68,curve([.39,.42,.32,.28,.33,.41,.39],phase));
   axis=V(-outer*.22,1,curve([.08,.12,.20,.22,.15,.10,.08],phase)).normalize();
  }
  if(role==='bow-spear'){
   top=V(.23,hip+.20,.30);axis=V(.025,1,.035).normalize();
  }
  const upper=outer>0?'r':'l',ordered=[arms[upper],arms[upper==='l'?'r':'l']],gripSpacing=role==='bow-spear'?.34:.53;
  // Project the common upper grip into both arm reach volumes, so changing
  // stance never detaches a hand or straightens an elbow beyond its limit.
  for(let step=0;step<24;step++)for(let i=0;i<2;i++){
   const a=ordered[i],center=pos(a.u).addScaledVector(axis,i*gripSpacing),u=a.ul,v=a.fl+a.pl,delta=top.clone().sub(center),lo=Math.sqrt(u*u+v*v-2*u*v*Math.cos(T.MathUtils.degToRad(55))),hi=Math.sqrt(u*u+v*v-2*u*v*Math.cos(T.MathUtils.degToRad(145)));
   const distance=delta.length();top.copy(center).addScaledVector(delta.normalize(),T.MathUtils.clamp(distance,lo,hi));
  }
  ordered.forEach((a,i)=>arm(a,top.clone().addScaledVector(axis,-i*gripSpacing)));
  // Equipment local -Y runs from its T grip down to the blade.
  const width=V(1,0,0).addScaledVector(axis,-axis.x).normalize(),q=frame(width,axis);
  const world=new T.Matrix4().compose(top,q,V(1,1,1)),local=master.paddle.parent.matrixWorld.clone().invert().multiply(world);local.decompose(master.paddle.position,master.paddle.quaternion,master.paddle.scale);master.paddle.updateMatrixWorld(true);
 };
}

export function correctedRowingClip(master,options){
 const apply=rowingPose(master,options),times=Float32Array.from([...new Set([0,...master.clip.tracks.flatMap(track=>Array.from(track.times))])].sort((a,b)=>a-b));
 const records=master.clip.tracks.map(track=>{const {nodeName,propertyName}=T.PropertyBinding.parseTrackName(track.name),node=master.root.getObjectByName(nodeName);if(!node||!['position','quaternion','scale'].includes(propertyName))throw Error('Unexpected rowing channel '+track.name);return {track,node,propertyName,size:track.getValueSize(),values:new Float32Array(times.length*track.getValueSize())};});
 for(let i=0;i<times.length;i++){
  master.mixer.setTime(times[i]);master.root.updateMatrixWorld(true);apply(times[i]/master.clip.duration);master.root.updateMatrixWorld(true);
  for(const r of records)r.node[r.propertyName].toArray(r.values,i*r.size);
 }
 return new T.AnimationClip(options.name,master.clip.duration,records.map(r=>new r.track.constructor(r.track.name,times,r.values,T.InterpolateLinear)));
}
