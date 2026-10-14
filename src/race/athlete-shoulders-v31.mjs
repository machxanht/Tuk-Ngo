import * as T from 'three';

// The independently decimated tank top no longer follows the body at its
// outer shoulder. Conform this small edge patch; keep collar and central chest.
export function conformShoulders(body,garment){
 const p=body.attributes.position,index=body.index,triangles=[],triangle=new T.Triangle(),probe=new T.Vector3(),nearest=new T.Vector3(),bary=new T.Vector3();
 for(let i=0;i<index.count;i+=3){const ids=[0,1,2].map(k=>index.getX(i+k));triangle.a.fromBufferAttribute(p,ids[0]);triangle.b.fromBufferAttribute(p,ids[1]);triangle.c.fromBufferAttribute(p,ids[2]);const minY=Math.min(triangle.a.y,triangle.b.y,triangle.c.y),maxY=Math.max(triangle.a.y,triangle.b.y,triangle.c.y);if(maxY>1.22&&minY<1.46)triangles.push({ids,triangle:triangle.clone()});}
 const gp=garment.attributes.position,gn=garment.attributes.normal,gj=garment.attributes.skinIndex,gw=garment.attributes.skinWeight,bj=body.attributes.skinIndex,bw=body.attributes.skinWeight;let count=0,maxProjection=0;
 for(let i=0;i<gp.count;i++){
  probe.fromBufferAttribute(gp,i);const blend=T.MathUtils.smoothstep(Math.abs(probe.x),.12,.155)*T.MathUtils.smoothstep(probe.y,1.27,1.35);if(!blend||probe.y>1.46)continue;
  let winner,distance=Infinity;for(const candidate of triangles){candidate.triangle.closestPointToPoint(probe,nearest);const d=nearest.distanceToSquared(probe);if(d<distance){distance=d;winner=candidate;}}
  if(!winner)continue;winner.triangle.closestPointToPoint(probe,nearest);winner.triangle.getBarycoord(nearest,bary);
  // A cuff-like interpolated point drifts under large bone rotations. The
  // outer strap instead follows one original anatomical vertex and its exact
  // weights, so it stays beneath the surface sleeve at every joint pose.
  let source=winner.ids[0],vertexDistance=Infinity;for(const id of winner.ids){const d=new T.Vector3().fromBufferAttribute(p,id).distanceToSquared(nearest);if(d<vertexDistance){vertexDistance=d;source=id;}}
  nearest.fromBufferAttribute(p,source);const amounts=winner.ids.map(id=>id===source?1:0),normal=new T.Vector3();
  for(let k=0;k<3;k++)normal.addScaledVector(new T.Vector3().fromBufferAttribute(body.attributes.normal,winner.ids[k]),amounts[k]);normal.normalize();nearest.addScaledVector(normal,.0025);maxProjection=Math.max(maxProjection,Math.sqrt(distance));probe.lerp(nearest,blend);gp.setXYZ(i,probe.x,probe.y,probe.z);normal.lerp(new T.Vector3().fromBufferAttribute(gn,i),1-blend).normalize();gn.setXYZ(i,normal.x,normal.y,normal.z);
  const weights=new Map();for(let k=0;k<4;k++)weights.set(gj.getComponent(i,k),(weights.get(gj.getComponent(i,k))||0)+gw.getComponent(i,k)*(1-blend));for(let n=0;n<3;n++)for(let k=0;k<4;k++){const id=bj.getComponent(winner.ids[n],k);weights.set(id,(weights.get(id)||0)+bw.getComponent(winner.ids[n],k)*amounts[n]*blend);}const kept=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,4),total=kept.reduce((sum,p)=>sum+p[1],0);for(let k=0;k<4;k++){gj.setComponent(i,k,kept[k]?.[0]||0);gw.setComponent(i,k,(kept[k]?.[1]||0)/total);}count++;
 }
 garment.userData.shoulderFit={conformedVertices:count,maxSourceProjectionM:maxProjection,offsetM:.0025};return garment;
}
