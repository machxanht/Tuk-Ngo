import fs from 'node:fs';
import crypto from 'node:crypto';
import {Quaternion,Vector3} from 'three';
const input=process.argv[2]||'public/assets/ghe-ngo/ghe-ngo-crew-v15.glb';
const out=process.argv[3]||'../asset-studio/crew-v17-motion';fs.mkdirSync(out,{recursive:true});
const raw=fs.readFileSync(input),jl=raw.readUInt32LE(12),j=JSON.parse(raw.subarray(20,20+jl)),original=raw.subarray(28+jl);let bin=Buffer.from(original);
const descendants=id=>{const s=new Set([id]);for(const c of j.nodes[id].children||[])for(const n of descendants(c))s.add(n);return s;};
const actors=j.nodes.map((n,i)=>({n,i})).filter(({n})=>n.extras?.component==='athlete'&&['MID_CONTROLLER','HELMSMAN'].includes(n.extras.role));
const owned=new Map();for(const {n,i}of actors)for(const id of descendants(i))owned.set(id,n.extras);
for(const {n,i}of j.nodes.map((n,i)=>({n,i})))if(n.extras?.component==='paddle'&&n.extras.role==='HELMSMAN')for(const id of descendants(i))owned.set(id,{role:'HELMSMAN',id:n.extras.id});
function values(a){const ac=j.accessors[a],v=j.bufferViews[ac.bufferView],k={SCALAR:1,VEC3:3,VEC4:4}[ac.type];if(ac.componentType!==5126)throw Error('Expected float');return Array.from({length:ac.count},(_,i)=>Array.from({length:k},(_,c)=>bin.readFloatLE((v.byteOffset||0)+(ac.byteOffset||0)+i*(v.byteStride||4*k)+c*4)));}
function append(a,rows){const ac=j.accessors[a],bytes=Buffer.alloc(rows.flat().length*4);rows.flat().forEach((v,i)=>bytes.writeFloatLE(v,i*4));const offset=bin.length;bin=Buffer.concat([bin,bytes]);const view=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length});const id=j.accessors.length,definition={...ac,bufferView:view,byteOffset:0,count:rows.length};
 // Source bounds describe old samples. Recompute from float32 persisted values,
 // including controller time tracks whose first timestamp changes to zero.
 const persisted=rows.map((row,i)=>row.map((_,k)=>bytes.readFloatLE((i*row.length+k)*4)));
 if(ac.type==='SCALAR'||ac.min||ac.max){definition.min=persisted[0].map((_,k)=>Math.min(...persisted.map(r=>r[k])));definition.max=persisted[0].map((_,k)=>Math.max(...persisted.map(r=>r[k])));}
 j.accessors.push(definition);return id;}
function at(rows,u,rotation){const p=Math.max(0,Math.min(rows.length-1,u*(rows.length-1))),a=Math.floor(p),b=Math.min(rows.length-1,a+1),t=p-a;if(rotation)return new Quaternion().fromArray(rows[a]).slerp(new Quaternion().fromArray(rows[b]),t).toArray();return rows[a].map((x,k)=>x*(1-t)+rows[b][k]*t);}
const changes=[];
for(const animation of j.animations){const originals=animation.samplers.map(s=>values(s.output));for(const channel of animation.channels){const role=owned.get(channel.target.node);if(!role)continue;const sampler=animation.samplers[channel.sampler],rows=originals[channel.sampler],path=channel.target.path,name=j.nodes[channel.target.node].name||'';if(!['rotation','translation'].includes(path))continue;
 let patched;
 if(role.role==='HELMSMAN'){
  // Continuous corrections use a small safe portion of the existing solved
  // steering poses, with all bone+oar channels sampled together. Full recovery
  // strokes and random shoulder motion are never introduced.
  const offset=(role.id-53)*2*Math.PI/3;
  patched=rows.map((_,k)=>at(rows,.5+.20*Math.sin(k/(rows.length-1)*2*Math.PI+offset),path==='rotation'));
 }else if(path==='rotation'&&/^upperarm_[lr](?:_|$)/.test(name)){
  // One command beat per rowing loop: deliberate downbeat then recovery.
  // Local deltas are modest to retain shoulder reach and the existing torso.
  const side=name.includes('_l')?1:-1;
  const duration=Math.max(...animation.samplers.map(s=>values(s.input).at(-1)[0]));
  patched=Array.from({length:49},(_,k)=>{const phase=k/48,beat=Math.cos(2*Math.PI*phase),q=at(rows,phase,true);return new Quaternion().fromArray(q).multiply(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),side*.24*beat)).normalize().toArray();});
  sampler.input=append(sampler.input,Array.from({length:49},(_,k)=>[k/48*duration]));j.accessors[sampler.input].count=49;
 }else continue;
 sampler.output=append(sampler.output,patched);j.accessors[sampler.output].count=patched.length;changes.push({clip:animation.name,node:channel.target.node,name,role:role.role,id:role.id,path,samples:patched.length});
}}
j.buffers[0].byteLength=bin.length;const text=Buffer.from(JSON.stringify(j)),jp=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]),bp=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]),h=Buffer.alloc(20),bh=Buffer.alloc(8);h.writeUInt32LE(0x46546c67);h.writeUInt32LE(2,4);h.writeUInt32LE(28+jp.length+bp.length,8);h.writeUInt32LE(jp.length,12);h.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bp.length);bh.writeUInt32LE(0x004e4942,4);fs.writeFileSync(out+'/ghe-ngo-crew-v17-motion.glb',Buffer.concat([h,jp,bh,bp]));
const report={input,sha256:crypto.createHash('sha256').update(raw).digest('hex'),clips:j.animations.map(a=>a.name),changes,geometryAndOriginalBinaryPreserved:bin.subarray(0,original.length).equals(original),limitation:'Authored motion candidate; collision/grips/visual acceptance still required. Stern evidence is a still, not measured dynamics.'};fs.writeFileSync(out+'/patch-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({channelsChanged:changes.length,geometryPreserved:report.geometryAndOriginalBinaryPreserved}));
