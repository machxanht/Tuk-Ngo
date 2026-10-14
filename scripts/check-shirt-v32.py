"""Check actual connected-shirt shader correspondence across every master rig."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4255/');parser.add_argument('--out',required=True);args=parser.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True);page=b.new_page(viewport={'width':1200,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(args.url);page.wait_for_selector('body[data-ready=true]',timeout=60000);page.locator('#view').click()
 report=page.evaluate('''async()=>{
 const h=illustratedPreview.hybrid;await h.prepareTeams(['chroi-tum-chas']);const results=[];
 const actors=[...new Map(h.actors.map(a=>[a.master,a])).values()];
 for(const a of actors){const g=a.shirt.geometry,d=g.userData.shirtV32,boneNames=a.master.skeleton.bones.map(b=>b.name),p=g.attributes;
  let maxGap=0,maxPackingError=0,maxEffortGap=0;
  function point(source,bones,offset){let result=[0,0,0];const xyz=source.position.map((v,k)=>v+offset*source.normal[k]);for(let k=0;k<4;k++){const off=boneNames.indexOf(d.jointNames[source.jointIndices[k]])*16,w=source.jointWeights[k];for(let c=0;c<3;c++)result[c]+=(bones[off+c]*xyz[0]+bones[off+4+c]*xyz[1]+bones[off+8+c]*xyz[2]+bones[off+12+c])*w;}return result;}
  function packedPoint(i,e,bones){const src=p[['shirtA','shirtB','shirtC'][e]],packed=e<2?[p.shirtWeights.getComponent(i,e*2),p.shirtWeights.getComponent(i,e*2+1)]:[p.shirtWeightsC.getX(i),p.shirtWeightsC.getY(i)],ws=[packed[0]%4096,Math.floor(packed[0]/4096),packed[1]%4096,Math.floor(packed[1]/4096)],sum=ws.reduce((a,b)=>a+b),xyz=[src.getX(i),src.getY(i),src.getZ(i)],ids=src.getW(i),result=[0,0,0];for(let k=0;k<4;k++){const off=(Math.floor(ids/64**k)%64)*16;for(let c=0;c<3;c++)result[c]+=(bones[off+c]*xyz[0]+bones[off+4+c]*xyz[1]+bones[off+8+c]*xyz[2]+bones[off+12+c])*ws[k]/sum;}return result;}
  for(const effort of [0,1])for(let step=0;step<17;step++){
   h.render(step/17,step/17,{teamId:'chroi-tum-chas',effort});const bones=a.master.skeleton.boneMatrices;
   for(let i=0;i<d.vertices.length;i++){const v=d.vertices[i],raw=[0,0,0],expected=[0,0,0],actual=[0,0,0];for(const [e,source]of v.endpoints.entries()){const zero=point(source,bones,0),cloth=point(source,bones,d.normalOffsetM),packed=packedPoint(i,e,bones);for(let c=0;c<3;c++){raw[c]+=zero[c]*source.baryWeight;expected[c]+=cloth[c]*source.baryWeight;actual[c]+=packed[c]*source.baryWeight;}}const gap=Math.hypot(...actual.map((v,k)=>v-raw[k]));maxGap=Math.max(maxGap,gap);if(effort)maxEffortGap=Math.max(maxEffortGap,gap);maxPackingError=Math.max(maxPackingError,Math.hypot(...actual.map((v,k)=>v-expected[k])));}
  }
  results.push({role:a.master.root.name,actor:a.id,posture:a.posture,maximumSurfaceOffsetM:maxGap,maximumPackedShaderErrorM:maxPackingError,sprintSurfaceOffsetM:maxEffortGap});
 }
 return {topology:actors[0].shirt.geometry.userData.shirtV32.topology,masterRigs:results,draw:h.getDrawStats()};
 }''')
 assert len(report['masterRigs'])==8,report
 assert all(r['maximumSurfaceOffsetM']<.0057 and r['maximumPackedShaderErrorM']<.0001 for r in report['masterRigs']),report
 assert report['topology']=={'vertices':533,'triangles':896,'components':1,'boundaryLoops':4,'nonmanifoldEdges':0},report
 assert report['draw']['vertexAttributes']<=report['draw']['vertexAttributeLimit'],report
 page.evaluate("async()=>{await illustratedPreview.hybrid.prepareTeams(['chroi-tum-chas']);await hybridTeams.setPair(['chroi-tum-chas','tum-nup-2']);}")
 for posture in ['seated','standing','caller','controller','helm']:
  page.locator('#posture').select_option(posture)
  for t in [0,.19,.38,.57]:page.evaluate('(t)=>illustratedPreview.seek(t)',t);page.locator('#scene').screenshot(path=str(out/f'{posture}-{t}.png'))
 page.locator('#study-focus').select_option('face');page.locator('#posture').select_option('caller');page.locator('#scene').screenshot(path=str(out/'collar-face.png'))
 assert not errors,errors
 report.update(url=args.url,posesPerMasterRig=34,actualShaderErrors=errors,signedUniversalCollisionProof=False)
 (out/'check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(report,ensure_ascii=False));b.close()
