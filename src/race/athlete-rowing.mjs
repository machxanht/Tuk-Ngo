import * as T from 'three';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Q=()=>new T.Quaternion();
const Y=V(0,1,0),X=V(1,0,0),TAU=Math.PI*2;
function basis(x,y){y=y.clone().normalize();x=x.clone().addScaledVector(y,-x.dot(y)).normalize();return Q().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,x.clone().cross(y)));}
function sample(values,t){const knots=[0,.12,.43,.57,.72,.90,1];for(let i=0;i<6;i++)if(t<=knots[i+1])return T.MathUtils.lerp(values[i],values[i+1],T.MathUtils.smoothstep(t,knots[i],knots[i+1]));return values[6];}

/** Body-specific, measured palm contacts. Never reflect a skin or its skeleton. */
export function createAthleteRowing(master,{side='port',posture='seated',role='rower'}={}){
 const bones=Object.fromEntries(master.skeleton.bones.map(b=>[b.name,b]));
 const rest=master.skeleton.bones.map(b=>({bone:b,p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));
 const bind=Object.fromEntries(master.skeleton.bones.map((b,i)=>[b.name,master.skeleton.boneInverses[i].clone().invert()]));
 const rp=name=>V().setFromMatrixPosition(bind[name]),rq=name=>Q().setFromRotationMatrix(bind[name]);
 const pos=name=>bones[name].getWorldPosition(V()),outer=side==='port'?1:-1;
 const root=bones.root,arms={};
 function setQ(name,q){const b=bones[name];b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(q));b.updateMatrixWorld(true);}
 function aim(name,child,target){const b=bones[name],q=b.getWorldQuaternion(Q()),from=pos(child).sub(pos(name)).normalize();setQ(name,Q().setFromUnitVectors(from,target.clone().normalize()).multiply(q));}
 for(const s of ['l','r']){
  const u='upperarm_'+s,f='lowerarm_'+s,h='hand_'+s;
  const ud=rp(f).sub(rp(u)).normalize(),fd=rp(h).sub(rp(f)).normalize(),hinge=ud.clone().cross(fd).normalize();
  const across=rp('index_01_'+s).sub(rp('pinky_01_'+s)).normalize(),finger=rp('middle_01_'+s).sub(rp(h)).normalize();
  const palmFrame=basis(across,finger),normal=X.clone().cross(Y).applyQuaternion(palmFrame);
  const grip=rp('middle_01_'+s).sub(rp(h)).multiplyScalar(.90).addScaledVector(normal,-.020).applyQuaternion(rq(h).invert());
  arms[s]={u,f,h,s,ul:rp(f).distanceTo(rp(u)),fl:rp(h).distanceTo(rp(f)),grip,
   uf:basis(hinge,ud).invert().multiply(rq(u)),ff:basis(hinge,fd).invert().multiply(rq(f)),hf:palmFrame.invert().multiply(rq(h))};
 }
 const diagnostics={side,posture,role,leftPalmError:0,rightPalmError:0,maxReachError:0,grips:[]};
 function reset(){for(const r of rest){r.bone.position.copy(r.p);r.bone.quaternion.copy(r.q);r.bone.scale.copy(r.s);}master.root.updateMatrixWorld(true);}
 function raisePelvis(height){const delta=height-pos('pelvis').y,p=root.getWorldPosition(V()).addScaledVector(Y,delta);root.position.copy(root.parent.worldToLocal(p));master.root.updateMatrixWorld(true);}
 function lean(phase){const bend=sample([.30,.27,.06,-.025,.10,.27,.30],phase);for(const [n,f]of [['spine_01',.45],['spine_02',.35],['spine_03',.20],['neck_01',-.35]])setQ(n,bones[n].getWorldQuaternion(Q()).premultiply(Q().setFromAxisAngle(X,bend*f)));}
 function leg(s,target){
  const a='thigh_'+s,b='calf_'+s,c='foot_'+s,origin=pos(a),u=rp(a).distanceTo(rp(b)),v=rp(b).distanceTo(rp(c));
  const delta=target.clone().sub(origin),d=T.MathUtils.clamp(delta.length(),Math.abs(u-v)+.00001,u+v-.00001),unit=delta.normalize(),length=(u*u-v*v+d*d)/(2*d);
  const pole=V(s==='l'?.04:-.04,0,1).addScaledVector(unit,-unit.z).normalize(),knee=origin.clone().addScaledVector(unit,length).addScaledVector(pole,Math.sqrt(Math.max(0,u*u-length*length)));
  aim(a,b,knee.sub(origin));aim(b,c,target.clone().sub(pos(b)));setQ(c,rq(c));
 }
 function arm(a,wrist,q){
  const origin=pos(a.u),delta=wrist.clone().sub(origin),raw=delta.length(),d=T.MathUtils.clamp(raw,Math.abs(a.ul-a.fl)+.00001,a.ul+a.fl-.00001),unit=delta.normalize(),length=(a.ul*a.ul-a.fl*a.fl+d*d)/(2*d);
  let pole=V(a.s==='l'?.65:-.65,-.25,1.2);if((a.s==='l'?1:-1)!==outer&&role==='rower')pole=V(outer*.35,-.12,1.8);
  pole.addScaledVector(unit,-pole.dot(unit)).normalize();
  const elbow=origin.clone().addScaledVector(unit,length).addScaledVector(pole,Math.sqrt(Math.max(0,a.ul*a.ul-length*length)));
  const ud=elbow.clone().sub(origin).normalize(),fd=wrist.clone().sub(elbow).normalize(),hinge=ud.clone().cross(fd).normalize();
  setQ(a.u,basis(hinge,ud).multiply(a.uf));setQ(a.f,basis(hinge,fd).multiply(a.ff));setQ(a.h,q);
  diagnostics.maxReachError=Math.max(diagnostics.maxReachError,Math.max(0,raw-a.ul-a.fl));
 }
 function curl(a,center,axis){
  // Three phalanges follow a cylinder around the actual shaft/T bar. The palm
  // frame differs on D/F and on left/right hands, so no fixed local-X curl.
  const handQ=bones[a.h].getWorldQuaternion(Q()),handFrame=handQ.clone().multiply(a.hf.clone().invert()),forward=Y.clone().applyQuaternion(handFrame);
  for(const finger of ['index','middle','ring','pinky']){
   const names=[1,2,3].map(i=>finger+'_0'+i+'_'+a.s),start=pos(names[0]);
   const pivot=center.clone().addScaledVector(axis,start.clone().sub(center).dot(axis)),radial=start.clone().sub(pivot).addScaledVector(axis,-start.clone().sub(pivot).dot(axis));
   const radius=Math.max(.021,radial.length()),normal=radial.normalize(),tangent=axis.clone().cross(normal).normalize();if(tangent.dot(forward)<0)tangent.negate();
   let angle=0;
   for(let i=0;i<3;i++){
    const name=names[i],length=i<2?rp(name).distanceTo(rp(names[i+1])):rp(names[1]).distanceTo(rp(names[2]))*.78;
    angle+=2*Math.asin(Math.min(.92,length/(radius*2)));
    const target=pivot.clone().addScaledVector(normal,radius*Math.cos(angle)).addScaledVector(tangent,radius*Math.sin(angle));
    const current=bones[name],from=i<2?pos(names[i+1]).sub(pos(name)):V(0,1,0).applyQuaternion(current.getWorldQuaternion(Q()));
    const q=current.getWorldQuaternion(Q()).premultiply(Q().setFromUnitVectors(from.normalize(),target.sub(pos(name)).normalize()));setQ(name,q);
   }
  }
  const thumb=[1,2,3].map(i=>'thumb_0'+i+'_'+a.s),tipLength=rp(thumb[1]).distanceTo(rp(thumb[2]))*.78;
  const target=center.clone().addScaledVector(axis,.027).addScaledVector(V(0,0,1).applyQuaternion(handFrame),-.006).addScaledVector(forward,-.012);
  const tip=()=>V(0,tipLength,0).applyMatrix4(bones[thumb[2]].matrixWorld);
  for(let pass=0;pass<9;pass++)for(const name of [...thumb].reverse()){
   const from=tip().sub(pos(name)).normalize(),to=target.clone().sub(pos(name)).normalize();
   setQ(name,bones[name].getWorldQuaternion(Q()).premultiply(Q().setFromUnitVectors(from,to)));
  }
 }
 function handOrientation(a,axis,width,top,grip){
  let normal,across;
  if(top){normal=axis.clone();across=width.clone().multiplyScalar(a.s==='l'?1:-1);}
  else{normal=pos(a.u).sub(grip).addScaledVector(axis,-pos(a.u).sub(grip).dot(axis)).normalize();across=axis.clone();}
  const finger=normal.clone().cross(across).normalize();return basis(across,finger).multiply(a.hf);
 }
 function display(){
  for(const [s,sign]of [['l',1],['r',-1]])aim('upperarm_'+s,'lowerarm_'+s,V(sign*.3,-.92,.1));
  master.paddle.scale.setScalar(0);
 }
 return Object.assign(phase=>{
  reset();diagnostics.maxReachError=0;phase=((phase%1)+1)%1;
  if(posture==='standing'&&role==='display'){display();return diagnostics;}
  const height=role==='controller'?.95:role==='helm'?.83:posture==='kneeling'?.65:.55;
  raisePelvis(height);lean(phase);
  for(const s of ['l','r']){
   const sx=s==='l'?1:-1;
   const z=role==='controller'||role==='helm'?(sx*.16):posture==='kneeling'?(sx===outer?-.40:.32):.08;
   leg(s,V(sx*.065-outer*(role==='rower'?.16:0),posture==='seated'?.34:posture==='kneeling'?.15:.10,z));
  }
  let angle=T.MathUtils.degToRad(sample([26,17,-24,-31,47,54,26],phase)),axis=V(-outer*.43,Math.cos(angle)*.903,-Math.sin(angle)*.903).normalize();
  let top=V(outer*.11,height+sample([.63,.59,.52,.54,.76,.77,.63],phase),sample([.43,.45,.21,.16,.25,.39,.43],phase));
  if(role==='helm'){axis=V(-outer*.18,1,.09+.035*Math.sin(phase*TAU)).normalize();top=V(outer*.20,height+.65,.17+.025*Math.sin(phase*TAU));}
  const width=X.clone().addScaledVector(axis,-axis.x).normalize(),upper=outer>0?'r':'l',ordered=[arms[upper],arms[upper==='r'?'l':'r']],spacing=role==='helm'?.49:.45;
  if(role==='controller'){
   const mouth=pos('head').add(V(.035,.025,.12)),beat=V(.30,height+.40+.16*Math.sin(phase*TAU),.35+.10*Math.cos(phase*TAU));
   for(const [a,target]of [[arms.r,mouth],[arms.l,beat]]){const q=handOrientation(a,Y,X,a===arms.r,target),wrist=target.clone().sub(a.grip.clone().applyQuaternion(q));arm(a,wrist,q);}
   master.paddle.scale.setScalar(0);return diagnostics;
  }
  // Solve common paddle translation against BOTH wrist reach volumes. This
  // preserves exact palm contact without extending an elbow beyond its reach.
  for(let iteration=0;iteration<30;iteration++)for(let i=0;i<2;i++){
   const a=ordered[i],grip=top.clone().addScaledVector(axis,-i*spacing),q=handOrientation(a,axis,width,i===0,grip),offset=a.grip.clone().applyQuaternion(q);
   const center=pos(a.u).add(offset).addScaledVector(axis,i*spacing),delta=top.clone().sub(center),distance=delta.length(),hi=a.ul+a.fl-.028,lo=Math.abs(a.ul-a.fl)+.055;
   top.copy(center).addScaledVector(delta.normalize(),T.MathUtils.clamp(distance,lo,hi));
  }
  const grips=[];
  ordered.forEach((a,i)=>{
   const grip=top.clone().addScaledVector(axis,-i*spacing),q=handOrientation(a,axis,width,i===0,grip),wrist=grip.clone().sub(a.grip.clone().applyQuaternion(q));arm(a,wrist,q);
   const contact=bones[a.h].localToWorld(a.grip.clone()),error=contact.distanceTo(grip);diagnostics[a.s==='l'?'leftPalmError':'rightPalmError']=error;
   curl(a,grip,i===0?width:axis);grips.push(grip.toArray());
  });
  const matrix=new T.Matrix4().compose(top,basis(width,axis),V(1,role==='helm'?1.55:1,1));
  master.paddle.parent.matrixWorld.clone().invert().multiply(matrix).decompose(master.paddle.position,master.paddle.quaternion,master.paddle.scale);
  if(role==='caller')master.paddle.scale.setScalar(0);
  master.root.updateMatrixWorld(true);diagnostics.grips=grips;return diagnostics;
 },{bones,diagnostics});
}
