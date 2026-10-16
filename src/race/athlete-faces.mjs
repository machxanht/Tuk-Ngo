import * as T from 'three';

// Generic authored identities, not likenesses of named athletes. Distances are
// in the original head bone's bind space (metres). Eyes follow the same field.
export const FACE_PROFILES = [
 {name:'Gọn · tóc sát',width:.94,depth:.97,jaw:-.003,cheek:-.001,chin:.003,nose:.002,noseWidth:-.001,brow:0,eyes:-.001,hair:0,beard:0},
 {name:'Hàm vuông · tóc ngắn',width:1.04,depth:1,jaw:.005,cheek:0,chin:-.002,nose:.001,noseWidth:.002,brow:.001,eyes:.001,hair:1,beard:0},
 {name:'Má đầy · tóc ngắn',width:1.03,depth:.97,jaw:.001,cheek:.004,chin:.004,nose:-.003,noseWidth:.001,brow:-.001,eyes:.001,hair:2,beard:0},
 {name:'Mặt dài · râu nhẹ',width:.96,depth:1.03,jaw:-.001,cheek:-.002,chin:-.005,nose:.005,noseWidth:-.001,brow:.002,eyes:-.001,hair:0,beard:.45},
 {name:'Hàm rộng · tóc gợn',width:1.05,depth:1,jaw:.004,cheek:.002,chin:-.002,nose:0,noseWidth:.003,brow:0,eyes:.002,hair:3,beard:0},
 {name:'Cằm gọn · tóc ngắn',width:.97,depth:1,jaw:-.004,cheek:.001,chin:.001,nose:.003,noseWidth:0,brow:.001,eyes:0,hair:1,beard:0},
 {name:'Má cao · râu nhẹ',width:1,depth:1.02,jaw:0,cheek:.003,chin:-.003,nose:.002,noseWidth:.002,brow:.001,eyes:.001,hair:2,beard:.6},
 {name:'Mặt tròn · tóc sát',width:1.06,depth:.97,jaw:.002,cheek:.004,chin:.005,nose:-.002,noseWidth:.001,brow:-.001,eyes:.002,hair:0,beard:0},
 {name:'Mũi cao · tóc gợn',width:.98,depth:1.02,jaw:-.001,cheek:0,chin:-.002,nose:.005,noseWidth:-.001,brow:.002,eyes:0,hair:3,beard:0},
 {name:'Hàm vuông · râu nhẹ',width:1.03,depth:1.01,jaw:.005,cheek:-.001,chin:-.003,nose:.001,noseWidth:.002,brow:.002,eyes:.001,hair:1,beard:.7},
 {name:'Cằm ngắn · tóc ngắn',width:1,depth:.98,jaw:-.002,cheek:.002,chin:.004,nose:-.001,noseWidth:0,brow:0,eyes:-.001,hair:2,beard:0},
 {name:'Gò má gọn · tóc sát',width:.95,depth:1.04,jaw:.001,cheek:-.002,chin:-.004,nose:.004,noseWidth:.001,brow:.001,eyes:.001,hair:0,beard:.35},
];
const bell=(value,center,radius)=>Math.exp(-(((value-center)/radius)**2));
function shape(point,profile,out){
 const {x,y,z}=point,front=T.MathUtils.smoothstep(z,.015,.065),side=x/Math.sqrt(x*x+.00004);
 const jaw=bell(y,-.032,.036)*front,cheek=bell(y,.016,.03)*bell(Math.abs(x),.042,.022)*front;
 const nose=bell(x,0,.018)*bell(y,.008,.028)*front;
 const eye=bell(y,.037,.021)*bell(Math.abs(x),.026,.018)*front;
 out.set(x*profile.width+side*(profile.jaw*jaw+profile.cheek*cheek+profile.noseWidth*nose+profile.eyes*eye),
  y+profile.chin*bell(y,-.061,.03)*front,
  z*profile.depth+profile.nose*nose+profile.cheek*.35*cheek+profile.brow*bell(y,.053,.014)*front);
 return out;
}

export function buildFaceVariants(merged,headInverse,headBind,headId){
 const geometryVariants=[],inverseNormal=new T.Matrix3().getNormalMatrix(headInverse),bindNormal=new T.Matrix3().getNormalMatrix(headBind),jacobian=new T.Matrix3(),normalTransform=new T.Matrix3();
 const point=new T.Vector3(),mapped=new T.Vector3(),normal=new T.Vector3(),plus=new T.Vector3(),minus=new T.Vector3(),delta=new T.Vector3(),columns=[new T.Vector3(),new T.Vector3(),new T.Vector3()],axis=new T.Vector3(0,1,0),epsilon=.00005;
 for(const [variant,profile] of FACE_PROFILES.entries()){
  const g=merged.clone(),p=g.attributes.position,n=g.attributes.normal,c=g.attributes.color,z=g.attributes.paintZone,j=g.attributes.skinIndex,w=g.attributes.skinWeight,facePoint=new Float32Array(p.count*3),beard=new Float32Array(p.count),hair=new Float32Array(p.count);
  let changed=0,maxDisplacement=0;
  for(let i=0;i<p.count;i++){
   const zone=z.getX(i);if(zone===1){const shade=.89+(variant%4)*.065;c.setXYZ(i,c.getX(i)*shade,c.getY(i)*shade,c.getZ(i)*shade);}
   let headWeight=0;for(let k=0;k<4;k++)if(j.getComponent(i,k)===headId)headWeight+=w.getComponent(i,k);if(headWeight<.55)continue;
   point.fromBufferAttribute(p,i).applyMatrix4(headInverse);normal.fromBufferAttribute(n,i).applyMatrix3(inverseNormal);
   facePoint.set([point.x,point.y,point.z],i*3);beard[i]=zone===1?profile.beard:0;hair[i]=zone===1?profile.hair+1:0;
   if(zone===2){mapped.set(point.x*profile.width,point.y,point.z*profile.depth);normal.x/=profile.width;normal.z/=profile.depth;}
   else{
    shape(point,profile,mapped);maxDisplacement=Math.max(maxDisplacement,mapped.distanceTo(point));changed++;
    // Transform the source's smooth seam normals with the deformation Jacobian;
    // recomputing normals from the exported split UV vertices creates patches.
    for(let k=0;k<3;k++){delta.copy(point);delta.setComponent(k,point.getComponent(k)+epsilon);shape(delta,profile,plus);delta.setComponent(k,point.getComponent(k)-epsilon);shape(delta,profile,minus);columns[k].subVectors(plus,minus).multiplyScalar(.5/epsilon);}
    jacobian.set(columns[0].x,columns[1].x,columns[2].x,columns[0].y,columns[1].y,columns[2].y,columns[0].z,columns[1].z,columns[2].z);normalTransform.copy(jacobian).invert().transpose();normal.applyMatrix3(normalTransform);
    const hairLine=[.063,.056,.052,.058][profile.hair],sideHair=Math.abs(point.x)>.060&&point.z<.05,backHair=point.z<-.012;
    if(zone===1&&point.y>hairLine+(profile.hair===3?Math.sin(point.x*160)*.002:0)&&(sideHair||backHair)){
     mapped.addScaledVector(normal.clone().normalize(),profile.hair===0?.0003:.0014);
    }
   }
   if(zone===2&&variant%4===3){mapped.applyAxisAngle(axis,Math.PI);normal.applyAxisAngle(axis,Math.PI);}
   if(zone===10){const length=[.0004,.0018,.0032,.0038][profile.hair],wave=profile.hair===3?Math.sin(point.x*220)*Math.sin(point.z*170)*.001:0;mapped.addScaledVector(normal.clone().normalize(),length-.0018+wave);}
   mapped.applyMatrix4(headBind);normal.applyMatrix3(bindNormal).normalize();p.setXYZ(i,mapped.x,mapped.y,mapped.z);n.setXYZ(i,normal.x,normal.y,normal.z);
  }
  g.setAttribute('facePoint',new T.BufferAttribute(facePoint,3));g.setAttribute('beard',new T.BufferAttribute(beard,1));g.setAttribute('hair',new T.BufferAttribute(hair,1));g.userData={...g.userData,face:{...profile,changedVertices:changed,maxDisplacementM:maxDisplacement}};g.computeBoundingSphere();geometryVariants.push(g);
 }
 return geometryVariants;
}
