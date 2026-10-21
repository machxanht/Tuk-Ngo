import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(import.meta.url);
const flag=name=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1];};
let playwright;
for(const candidate of [flag('--playwright'),process.env.PLAYWRIGHT_MODULE,'playwright',resolve(root,'../asset-studio/browser-qa/node_modules/playwright')].filter(Boolean)){
 try{playwright=require(candidate);break;}catch{}
}
if(!playwright)throw Error('Playwright is required for browser QA. Supply --playwright /path/to/playwright.');
const publicRoot=resolve(root,'public');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.mp3':'audio/mpeg','.ttf':'font/ttf'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');let path=resolve(publicRoot,'.'+decodeURIComponent(url.pathname));
  if(!path.startsWith(publicRoot+sep)){res.writeHead(403).end();return;}
  if((await stat(path)).isDirectory())path=resolve(path,'index.html');
  const raw=await readFile(path),headers={'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
  const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
  if(range){const start=Number(range[1]),end=Math.min(Number(range[2]||raw.length-1),raw.length-1);if(start>end){res.writeHead(416).end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${raw.length}`,'Content-Length':end-start+1}).end(raw.subarray(start,end+1));}
  else res.writeHead(200,{...headers,'Content-Length':raw.length}).end(raw);
 }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=flag('--url')||`http://127.0.0.1:${server.address().port}/audio-dashboard/`;
const browser=await playwright.chromium.launch({channel:flag('--channel')||'msedge',headless:true});
const results=[];
async function run(name,test){
 if(flag('--case')&&!new RegExp(flag('--case'),'i').test(name))return;
 const context=await browser.newContext({viewport:{width:1024,height:768},acceptDownloads:true});
 const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 try{await test(context);assert.deepEqual(errors,[],'Uncaught browser errors');results.push({name,status:'pass'});console.log('PASS '+name);}
 catch(e){results.push({name,status:'fail',error:e.message,browserErrors:errors});console.log('FAIL '+name+': '+e.message.split('\n')[0]);}
 finally{await context.close();}
}
async function open(context,seed){
 if(seed!==undefined)await context.addInitScript(({value,origin})=>{
  if(location.origin===origin&&!sessionStorage.getItem('audio-qa-seeded')){
   localStorage.setItem('tukngo-audio-review',typeof value==='string'?value:JSON.stringify(value));
   sessionStorage.setItem('audio-qa-seeded','1');
  }
 },{value:seed,origin:new URL(url).origin});
 const p=await context.newPage();p.setDefaultTimeout(5000);await p.goto(url);await p.waitForFunction(()=>window.AudioStudio);return p;
}
const choose=(p,id)=>p.locator(`[data-item="${id}"]`).click();
try{
 await run('No MP3 preload; actual native playback',async c=>{let requests=0;const p=await c.newPage();p.on('request',r=>{if(/\.mp3(?:\?|$)/.test(r.url()))requests++;});await p.goto(url);await p.waitForFunction(()=>window.AudioStudio);assert.equal(requests,0);await p.locator('#play').click();await p.waitForFunction(()=>document.querySelector('#player').currentTime>.1);});
 await run('Malformed JSON recovers without deleting its stored bytes',async c=>{const p=await open(c,'{broken');assert.equal(await p.locator('.item').count(),29);assert.equal(await p.evaluate(()=>localStorage.getItem('tukngo-audio-review')),'{broken');assert.equal(await p.evaluate(()=>localStorage.getItem('tukngo-audio-review-recovery')),'{broken');});
 await run('Array-shaped saved reviews do not lose new notes/verdicts',async c=>{
  const p=await open(c,{schema:2,reviews:[],choices:{},edits:{}});await p.locator('#advance').uncheck();await p.locator('#review-note').fill('Giữ ghi chú khi tải lại');await p.locator('[data-review="fix"]').click();
  await p.reload();await p.waitForFunction(()=>window.AudioStudio);
  assert.equal(await p.locator('#review-note').inputValue(),'Giữ ghi chú khi tải lại');assert.equal(await p.locator('#review-state').textContent(),'Cần sửa');
 });
 await run('Primitive saved variant map cannot break audio selection',async c=>{
  const p=await open(c,{schema:2,reviews:{},choices:'damaged',edits:{}});await choose(p,'cup-champion');await p.locator('#variant').selectOption('agy-ai-champion-kos-thum-km');await p.locator('#play').click();await p.waitForFunction(()=>document.querySelector('#player').currentTime>.1);assert((await p.locator('#player').getAttribute('src')).includes('champion-kos-thum'));
 });
 await run('Unknown saved verdict becomes pending',async c=>{
  const p=await open(c);await p.locator('#advance').uncheck();await p.locator('[data-review="pass"]').click();await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('tukngo-audio-review'));for(const r of Object.values(s.reviews))r.status='unexpected';localStorage.setItem('tukngo-audio-review',JSON.stringify(s));});await p.reload();await p.waitForFunction(()=>window.AudioStudio);const entries=await p.evaluate(()=>window.AudioStudio.getReview().entries);assert.equal(entries.find(e=>e.itemId==='ceremony-teams'&&e.language==='km').status,'pending');
 });
 await run('Failed audio cannot pass; retry recovers (simulated HTTP 404)',async c=>{
  const p=await open(c),pattern='**/khmer-review/ai-ceremony-teams-km.mp3*';await p.route(pattern,r=>r.fulfill({status:404,body:'missing'}));await p.locator('#play').click();await p.waitForFunction(()=>document.querySelector('#play-status').textContent.includes('Không tải được'));assert(await p.locator('[data-review="pass"]').isDisabled());
  if(flag('--screenshot')){const path=resolve(root,flag('--screenshot'));await mkdir(dirname(path),{recursive:true});await p.screenshot({path,fullPage:false});}
  await p.unroute(pattern);await p.locator('#play').click();await p.waitForFunction(()=>document.querySelector('#player').currentTime>.1);assert(await p.locator('[data-review="pass"]').isEnabled());
 });
 await run('Cancelled resume rejection cannot overwrite next item (simulated play rejection)',async c=>{
  const p=await open(c);await p.locator('#play').click();await p.waitForFunction(()=>document.querySelector('#player').currentTime>.1);await p.locator('#play').click();
  await p.evaluate(()=>{const a=document.querySelector('#player');a.play=()=>new Promise((resolve,reject)=>window.rejectOldPlay=reject);});await p.locator('#play').click();await p.locator('#next').click();const before=await p.locator('#play-status').textContent();await p.evaluate(()=>window.rejectOldPlay(Error('cancelled')));await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal(await p.locator('#play-status').textContent(),before);
 });
 await run('Play after natural end restarts the recording',async c=>{
  const p=await open(c);await choose(p,'go');await p.locator('#play').click();await p.waitForFunction(()=>document.querySelector('#player').duration>0);await p.evaluate(()=>{const a=document.querySelector('#player');a.currentTime=Math.max(0,a.duration-.05);});await p.waitForFunction(()=>document.querySelector('#player').ended);await p.locator('#play').click();await p.waitForFunction(()=>{const a=document.querySelector('#player');return !a.paused&&!a.ended&&a.currentTime<a.duration/2;});
 });
 await run('Switching groups/languages clears the old recording',async c=>{const p=await open(c);await p.locator('#play').click();await p.waitForFunction(()=>document.querySelector('#player').currentTime>.1);await p.locator('[data-lang="vi"]').click();assert.equal(await p.locator('#player').getAttribute('src'),null);await p.locator('[data-view="teams"]').click();assert.equal(await p.locator('#player').getAttribute('src'),null);});
 await run('Editing the required words invalidates the old verdict',async c=>{const p=await open(c);await p.locator('#advance').uncheck();await p.locator('[data-review="pass"]').click();await p.locator('#more summary').click();await p.locator('#edit-km').fill('សាកល្បង ពាក្យថ្មី');assert.equal((await p.evaluate(()=>window.AudioStudio.getReview().entries)).find(e=>e.itemId==='ceremony-teams'&&e.language==='km').status,'pending');});
 await run('JSON/CSV downloads preserve notes and UTF-8',async c=>{const p=await open(c);await p.locator('#review-note').fill('ខ្មែរ — ghi chú');await p.locator('.tools summary').click();for(const [button,kind]of [['#export-json','json'],['#export-csv','csv']]){const event=p.waitForEvent('download');await p.locator(button).click();const download=await event,text=await readFile(await download.path(),'utf8');assert(text.includes('ខ្មែរ — ghi chú'));if(kind==='json')assert.equal(JSON.parse(text).schema,2);else assert(text.startsWith('\ufeff'));}});
 await run('A missing Vietnamese recording cannot be approved',async c=>{const p=await open(c);await p.locator('[data-view="teams"]').click();await p.locator('#search').fill('can_tho-11');await p.locator('[data-lang="vi"]').click();assert(await p.locator('#play').isDisabled());assert(await p.locator('[data-review="pass"]').isDisabled());});
 await run('Phone drawer and empty results remain usable',async c=>{const p=await open(c);await p.setViewportSize({width:390,height:844});assert(await p.locator('#library').isHidden());await p.locator('#toggle-list').click();assert(await p.locator('#library').isVisible());await choose(p,'go');assert(await p.locator('#library').isHidden());await p.locator('#toggle-list').click();await p.locator('#search').fill('not-a-real-team');assert.equal(await p.locator('.item').count(),0);assert(await p.locator('.review').isHidden());assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);});
 await run('Khmer greeting shows its own short meaning, not the Vietnamese broadcast paragraph',async c=>{
  const p=await open(c);await choose(p,'flyover');assert.equal(await p.locator('#text-vi').textContent(),'Quý khán giả thân mến.');assert((await p.locator('#warning').textContent()).includes('chưa mô tả toàn cảnh'));await p.locator('[data-lang="vi"]').click();assert((await p.locator('#text-vi').textContent()).includes('sáu mươi đội'));assert(await p.locator('#km-panel').isHidden());
 });
 await run('Resolved match and champion display exact names and scope, without literal placeholders',async c=>{
  const p=await open(c);await choose(p,'team-introduction');assert(!(await p.locator('.transcripts').textContent()).includes('{'));assert((await p.locator('#text-vi').textContent()).includes('Tum Núp 2 gặp Kos Thum 1'));assert((await p.locator('#warning').textContent()).includes('Không dùng cho đội khác'));
  await choose(p,'cup-champion');await p.locator('#variant').selectOption('agy-ai-champion-kos-thum-km');assert((await p.locator('#text-km').textContent()).includes('កោះធំ ១'));assert(!(await p.locator('#text-km').textContent()).includes('ទុំនុប'));assert((await p.locator('#text-vi').textContent()).includes('Kos Thum 1'));await p.locator('#play').click();await p.waitForFunction(()=>document.querySelector('#player').currentTime>.1);assert((await p.locator('#player').getAttribute('src')).includes('/repairs/champion-kos-thum.mp3'));
  if(flag('--content-screenshot')){const path=resolve(root,flag('--content-screenshot'));await mkdir(dirname(path),{recursive:true});await p.screenshot({path,fullPage:true});}
  if(flag('--viewport-screenshots'))for(const viewport of [{width:1024,height:768},{width:768,height:1024},{width:390,height:844}]){
   await p.setViewportSize(viewport);await p.evaluate(()=>scrollTo(0,0));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const path=resolve(root,flag('--viewport-screenshots'),`corrected-${viewport.width}x${viewport.height}.png`);await mkdir(dirname(path),{recursive:true});await p.screenshot({path});
  }
 });
 await run('Carrier is labelled as an incomplete connector and does not borrow Tum Nup wording',async c=>{
  const p=await open(c);await choose(p,'team-introduction');await p.locator('#variant').selectOption('agy-ai-intro-carrier-km');assert(!(await p.locator('#text-km').textContent()).includes('ទុំនុប'));assert((await p.locator('#warning').textContent()).includes('chưa phải một lời bình hoàn chỉnh'));assert((await p.locator('#variant option:checked').textContent()).includes('chưa có tên đội'));
 });
 await run('Review advances through every variant before leaving the cue',async c=>{
  const p=await open(c);await choose(p,'cup-champion');const keys=await p.locator('#variant option').evaluateAll(nodes=>nodes.map(n=>n.value));assert.equal(keys.length,3);
  for(let i=0;i<keys.length;i++){
   assert.equal(await p.locator('#variant').inputValue(),keys[i]);await p.locator('[data-review="pass"]').click();
   if(i<keys.length-1){assert.equal(await p.locator('[data-item="cup-champion"]').getAttribute('aria-pressed'),'true');assert(await p.locator('[data-item="cup-champion"] .status-dot.pending').count());}
  }
  assert(await p.locator('[data-item="cup-champion"] .status-dot.pass').count());const rows=(await p.evaluate(()=>window.AudioStudio.getReview().entries)).filter(r=>r.itemId==='cup-champion'&&r.language==='km');assert(rows.every(r=>r.status==='pass'));
 });
 await run('Pending filter keeps remaining variants after marking one for repair',async c=>{
  const p=await open(c);await p.locator('#review-filter').selectOption('pending');await choose(p,'cup-champion');await p.locator('[data-review="fix"]').click();assert.equal(await p.locator('[data-item="cup-champion"]').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('#variant').inputValue(),'agy-ai-champion-kos-thum-km');assert((await p.locator('#progress').textContent()).includes('1/'));
 });
 await run('Shared name variants never acquire a fabricated Kos Thum 1 suffix',async c=>{
  const p=await open(c);await p.locator('[data-view="teams"]').click();await p.locator('#search').fill('ca_mau-06');await choose(p,'ca_mau-06');const labels=await p.locator('#variant option').allTextContents();assert(labels.length);assert(labels.every(t=>!t.includes('Kos Thum 1')));
 });
 await run('Changed labels invalidate approval while retaining the listening note',async c=>{
  const p=await open(c);await p.locator('#advance').uncheck();await p.locator('#review-note').fill('Ghi chú cần giữ');await p.locator('[data-review="pass"]').click();await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('tukngo-audio-review'));for(const r of Object.values(s.reviews))r.labelSignature='old copied label';localStorage.setItem('tukngo-audio-review',JSON.stringify(s));});await p.reload();await p.waitForFunction(()=>window.AudioStudio);assert.equal(await p.locator('#review-state').textContent(),'Chưa duyệt');assert.equal(await p.locator('#review-note').inputValue(),'Ghi chú cần giữ');
 });
 await run('Cue navigation follows race stages and puts sprint effort before the last hundred metres',async c=>{
  const p=await open(c),order=await p.evaluate(()=>window.AudioStudio.getVisible());assert(order.indexOf('start-drive')<order.indexOf('cruise'));assert(order.indexOf('sprint-effort')<order.indexOf('last-hundred'));assert.equal(order.at(-1),'cup-champion');
  await p.locator('[data-view="teams"]').click();await p.locator('[data-lang="vi"]').click();await p.locator('#search').fill('can_tho-11');await p.locator('#review-filter').selectOption('issue');assert.equal(await p.locator('.item').count(),1,'Missing audio remains in the issue filter');
 });
}finally{await browser.close();await new Promise(r=>server.close(r));}
const report={suite:'Audio dashboard browser regression',cases:results,passed:results.filter(r=>r.status==='pass').length,failed:results.filter(r=>r.status==='fail').length,limits:'Simulated error cases verify recovery only. Native pronunciation and semantic correctness are not certified.'};
if(flag('--report')){const path=resolve(root,flag('--report'));await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,failed:report.failed}));if(report.failed)process.exitCode=1;
