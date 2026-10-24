import {DurableObject} from 'cloudflare:workers';
import {createOnlineSimulation,cleanPlayerName,cleanInput,ratingChange,disconnectDecision,departureWinner,ONLINE_PROTOCOL} from '../src/race/online-rules.mjs';
import {RACE_VENUES} from '../src/race/race-venues.mjs';
import {isVenueTeam,roomTeamsMatchVenue} from '../src/race/festival-teams.mjs';

const prefixes={maspero:'M','phnom-penh':'P','siem-reap':'S'},alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(code,status=400)=>{throw Object.assign(new Error(code),{status});};
const directoryFor=(env,venue,qa=false)=>env.DIRECTORIES.getByName(venue+(qa?':qa':''));
const venueFor=code=>Object.keys(prefixes).find(id=>prefixes[id]===code?.[0]);
function roomCode(venue){return prefixes[venue]+[...crypto.getRandomValues(new Uint8Array(7))].map(n=>alphabet[n%alphabet.length]).join('');}
function venueId(value){if(!Object.hasOwn(RACE_VENUES,value))fail('invalid-venue');return value;}
function choice(value,profile){const venue=venueId(value.venueId);if(!isVenueTeam(venue,value.teamId))fail('invalid-team');return {...profile,name:cleanPlayerName(value.name),teamId:value.teamId,construction:value.construction==='dugout'?'dugout':'plywood',venueId:venue};}
function base64(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
function bytes(value){return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}
async function key(env){if(!env.SESSION_SECRET)fail('server-not-configured',503);return crypto.subtle.importKey('raw',new TextEncoder().encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function issue(env,qa=false){const id=crypto.randomUUID(),claim=base64(new TextEncoder().encode(JSON.stringify({id,created:Date.now(),qa}))),signature=base64(await crypto.subtle.sign('HMAC',await key(env),new TextEncoder().encode(claim)));return {id,token:claim+'.'+signature};}
async function authenticate(request,env){
 const authorization=request.headers.get('Authorization')?.replace(/^Bearer /,'')||request.headers.get('Sec-WebSocket-Protocol')?.split(',').map(s=>s.trim()).find(s=>s.startsWith('token.'))?.slice(6);
 try{if(!authorization||authorization.length>512)fail('unauthorized',401);const [claim,signature]=authorization.split('.');if(!await crypto.subtle.verify('HMAC',await key(env),bytes(signature),new TextEncoder().encode(claim)))fail('unauthorized',401);const value=JSON.parse(new TextDecoder().decode(bytes(claim)));if(!/^[a-f0-9-]{36}$/.test(value.id)||Date.now()-value.created>366*86400000)fail('unauthorized',401);return {id:value.id,qa:value.qa===true};}catch{fail('unauthorized',401);}
}
async function body(request){if(Number(request.headers.get('Content-Length'))>2048)fail('request-too-large',413);const text=await request.text();if(text.length>2048)fail('request-too-large',413);try{return JSON.parse(text);}catch{fail('invalid-json');}}

export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin'),allowed=env.ALLOWED_ORIGINS.split(',').includes(origin),url=new URL(request.url);
  if(origin&&!allowed)return json({error:'origin-not-allowed'},403);
  let response;
  try{
   if(request.method==='OPTIONS')response=new Response(null,{status:204});
   else if(url.pathname==='/health')response=json({ok:!!env.SESSION_SECRET,protocol:ONLINE_PROTOCOL,ruleset:'ngo-two-buttons'});
   else if(url.pathname==='/session'&&request.method==='POST'){
    // Session creation is subject to the same per-IP durable limiter as API calls.
    const ip=request.headers.get('CF-Connecting-IP')||'local';
    const hash=base64(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip)));
    const gate=env.DIRECTORIES.getByName('session-gate-'+hash);
    const qa=!!env.QA_SECRET&&request.headers.get('X-QA-Token')===env.QA_SECRET;
    if(!qa&&!await gate.allowSession())fail('rate-limited',429);
    response=json(await issue(env,qa),201);
   }else if(url.pathname==='/leaderboard'&&request.method==='GET'){
    const venue=venueId(url.searchParams.get('venueId'));
    const profile=request.headers.has('Authorization')?await authenticate(request,env):null;
    response=json(await directoryFor(env,venue,profile?.qa).leaderboard(profile?.id));
   }else{
    const profile=await authenticate(request,env);
    if(url.pathname==='/queue'){
     const value=request.method==='POST'?await body(request):{venueId:url.searchParams.get('venueId')};
     const directory=directoryFor(env,venueId(value.venueId),profile.qa);
     if(request.method==='POST')response=json(await directory.queue(choice(value,profile)));
     else if(request.method==='GET')response=json(await directory.queueStatus(profile.id));
     else if(request.method==='DELETE')response=json(await directory.cancel(profile.id));
     else fail('method-not-allowed',405);
    }else if(url.pathname==='/rooms'&&request.method==='POST'){
     const player=choice(await body(request),profile);response=json(await directoryFor(env,player.venueId,profile.qa).createRoom(player),201);
    }else{
     const match=url.pathname.match(/^\/rooms\/([MPS][A-Z2-9]{7})(\/join|\/socket)?$/);
     if(!match)fail('not-found',404);
     const code=match[1],venue=venueFor(code),room=env.ROOMS.getByName(code);
     if(match[2]==='/join'&&request.method==='POST'){const value=await body(request);if(value.venueId!==venue)fail('wrong-map');response=json(await directoryFor(env,venue,profile.qa).joinRoom(code,choice(value,profile)));}
     else if(match[2]==='/socket'&&request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
      const forwarded=new Request(request);forwarded.headers.set('X-Player-ID',profile.id);return room.fetch(forwarded);
     }else if(!match[2]&&request.method==='GET')response=json(await room.inspect(profile.id));
     else fail('method-not-allowed',405);
    }
   }
  }catch(error){const known={'room-not-found':404,'not-in-room':403,'room-full':409,'room-exists':409,'already-in-room':409};const message=Object.keys(known).find(code=>error.message?.includes(code))||error.message;const status=Number(error.status)||known[message]||500;response=json({error:status===500?'server-error':message},status);}
  const headers=new Headers(response.headers);headers.set('Vary','Origin');headers.set('X-Content-Type-Options','nosniff');
  if(allowed){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Headers','Authorization,Content-Type,X-QA-Token');headers.set('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');}
  return new Response(response.body,{status:response.status,headers});
 },
};

// One directory per course: independent queues and course-specific Elo tables.
// Session rate-limit objects share the class but never hold player race data.
export class RaceDirectory extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.sql=ctx.storage.sql;
  this.sql.exec('CREATE TABLE IF NOT EXISTS queue (id TEXT PRIMARY KEY, player TEXT NOT NULL, room TEXT, touched REAL NOT NULL)');
  this.sql.exec('CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, name TEXT NOT NULL, rating INTEGER NOT NULL DEFAULT 1000, wins INTEGER NOT NULL DEFAULT 0, losses INTEGER NOT NULL DEFAULT 0, draws INTEGER NOT NULL DEFAULT 0, best REAL)');
  this.sql.exec('CREATE TABLE IF NOT EXISTS results (id TEXT PRIMARY KEY, payload TEXT NOT NULL, created REAL NOT NULL)');
 }
 async allowSession(){const now=Date.now(),value=await this.ctx.storage.get('session-limit')||{start:now,count:0};if(now-value.start>3600000){value.start=now;value.count=0;}if(value.count>=8)return false;value.count++;await this.ctx.storage.put('session-limit',value);return true;}
 prune(){this.sql.exec('DELETE FROM queue WHERE touched < ?',Date.now()-1800000);this.sql.exec('DELETE FROM queue WHERE room IS NULL AND touched < ?',Date.now()-12000);}
 async queue(player){
  this.prune();const current=this.sql.exec('SELECT room FROM queue WHERE id=?',player.id).toArray()[0];
  if(current?.room)return {roomCode:current.room};
  this.sql.exec('INSERT INTO queue(id,player,room,touched) VALUES(?,?,NULL,?) ON CONFLICT(id) DO UPDATE SET player=excluded.player,touched=excluded.touched',player.id,JSON.stringify(player),Date.now());
  let other=this.sql.exec('SELECT * FROM queue WHERE id<>? AND room IS NULL ORDER BY touched LIMIT 1',player.id).toArray()[0];
  // An old browser can still be polling a queue created before a roster split.
  while(other&&!roomTeamsMatchVenue({venueId:player.venueId,players:[JSON.parse(other.player)]})){this.sql.exec('DELETE FROM queue WHERE id=?',other.id);other=this.sql.exec('SELECT * FROM queue WHERE id<>? AND room IS NULL ORDER BY touched LIMIT 1',player.id).toArray()[0];}
  if(!other)return {queued:true};
  const code=roomCode(player.venueId),opponent=JSON.parse(other.player);
  this.sql.exec('UPDATE queue SET room=?,touched=? WHERE id IN (?,?)',code,Date.now(),player.id,opponent.id);
  try{await this.env.ROOMS.getByName(code).initialize(code,player.venueId,[opponent,player],true);}catch(error){this.sql.exec('DELETE FROM queue WHERE room=?',code);throw error;}
  return {roomCode:code};
 }
 queueStatus(id){this.prune();const row=this.sql.exec('SELECT room FROM queue WHERE id=?',id).toArray()[0];if(row)this.sql.exec('UPDATE queue SET touched=? WHERE id=?',Date.now(),id);return row?{queued:!row.room,roomCode:row.room}:{queued:false};}
 async cancel(id){const row=this.sql.exec('SELECT room FROM queue WHERE id=?',id).toArray()[0];if(row?.room)await this.env.ROOMS.getByName(row.room).leave(id);this.sql.exec('DELETE FROM queue WHERE id=?',id);return {cancelled:true};}
 async createRoom(player){this.prune();if(this.sql.exec('SELECT id FROM queue WHERE id=?',player.id).toArray().length)fail('already-in-room',409);const code=roomCode(player.venueId);this.sql.exec('INSERT INTO queue VALUES(?,?,?,?)',player.id,JSON.stringify(player),code,Date.now());try{await this.env.ROOMS.getByName(code).initialize(code,player.venueId,[player],false);}catch(error){this.sql.exec('DELETE FROM queue WHERE room=?',code);throw error;}return {roomCode:code};}
 async joinRoom(code,player){this.prune();const old=this.sql.exec('SELECT room FROM queue WHERE id=?',player.id).toArray()[0];if(old&&old.room!==code)fail('already-in-room',409);this.sql.exec('INSERT INTO queue VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET touched=excluded.touched',player.id,JSON.stringify(player),code,Date.now());try{return await this.env.ROOMS.getByName(code).join(player);}catch(error){if(!old)this.sql.exec('DELETE FROM queue WHERE id=?',player.id);throw error;}}
 release(ids,code){for(const id of ids)this.sql.exec('DELETE FROM queue WHERE id=? AND room=?',id,code);}
 record(result){
  const old=this.sql.exec('SELECT payload FROM results WHERE id=?',result.id).toArray()[0];if(old)return JSON.parse(old.payload);
  let changes=[];
  this.ctx.storage.transactionSync(()=>{
   for(const player of result.players)this.sql.exec('INSERT INTO players(id,name) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name',player.id,player.name);
   const profiles=result.players.map(player=>this.sql.exec('SELECT * FROM players WHERE id=?',player.id).one());
   const score=result.winner==null?.5:result.winner===0?1:0,delta=ratingChange(profiles[0].rating,profiles[1].rating,score);
   changes=profiles.map((player,i)=>{const change=i===0?delta:-delta,won=result.winner===i,lost=result.winner!=null&&!won,time=result.times[i];this.sql.exec('UPDATE players SET rating=MAX(100,rating+?),wins=wins+?,losses=losses+?,draws=draws+?,best=CASE WHEN ? IS NULL THEN best ELSE MIN(COALESCE(best,?),?) END WHERE id=?',change,won?1:0,lost?1:0,result.winner==null?1:0,time,time,time,player.id);return {id:player.id,before:player.rating,after:Math.max(100,player.rating+change),change};});
   this.sql.exec('INSERT INTO results VALUES(?,?,?)',result.id,JSON.stringify(changes),Date.now());
  });return changes;
 }
 leaderboard(viewerId){const order='ORDER BY rating DESC,wins DESC,id';const rows=this.sql.exec('SELECT *,wins+losses+draws AS matches FROM players '+order+' LIMIT 50').toArray().map((row,i)=>({...row,rank:i+1}));const viewer=viewerId?this.sql.exec('SELECT *,wins+losses+draws AS matches FROM players WHERE id=?',viewerId).toArray()[0]:null;if(viewer)viewer.rank=this.sql.exec('SELECT COUNT(*)+1 AS rank FROM players WHERE rating>? OR (rating=? AND wins>?) OR (rating=? AND wins=? AND id<?)',viewer.rating,viewer.rating,viewer.wins,viewer.rating,viewer.wins,viewer.id).one().rank;return {rows,viewer:viewer||null,total:this.sql.exec('SELECT COUNT(*) AS n FROM players').one().n,updatedAt:Date.now()};}
}

export class RaceRoom extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.room=null;this.simulation=null;this.timer=null;this.saving=false;this.tickCount=0;this.lastTick=Date.now();
  ctx.blockConcurrencyWhile(async()=>{this.room=await ctx.storage.get('room');if(this.room&&!roomTeamsMatchVenue(this.room)&&['waiting','running'].includes(this.room.status)){await this.finish(null,'cancelled');return;}if(this.room?.checkpoints){this.simulation=createOnlineSimulation(this.room.venueId,this.room.seed);this.simulation.restore(this.room.checkpoints);if(this.room.status==='running'){this.lastTick=Date.now();this.ensureTimer();}}});
 }
 async initialize(code,venueId,players,ranked){if(this.room)fail('room-exists',409);if(!roomTeamsMatchVenue({venueId,players}))fail('invalid-team');this.room={code,venueId,players:players.map(p=>({...p,ready:false,connected:false,lastSeen:Date.now(),lastInput:0,sequence:-1})),ranked,status:'waiting',created:Date.now(),seed:crypto.getRandomValues(new Uint32Array(1))[0],result:null,changes:[],settled:false};await this.save();await this.ctx.storage.setAlarm(Date.now()+600000);}
 async save(){if(!this.room)return;if(this.simulation)this.room.checkpoints=this.simulation.checkpoint();await this.ctx.storage.put('room',this.room);}
 publicRoom(id){const room=this.room;return {code:room.code,venueId:room.venueId,ranked:room.ranked,status:room.status,playerIndex:room.players.findIndex(p=>p.id===id),inputSequence:room.players.find(p=>p.id===id)?.sequence??-1,players:room.players.map(({id,name,teamId,construction,ready,connected})=>({id,name,teamId,construction,ready,connected})),result:room.result,changes:room.changes,settled:room.settled,protocol:ONLINE_PROTOCOL};}
 inspect(id){if(!this.room)fail('room-not-found',404);if(!this.room.players.some(p=>p.id===id))fail('not-in-room',403);return this.publicRoom(id);}
 async join(player){if(!this.room)fail('room-not-found',404);if(player.venueId!==this.room.venueId)fail('wrong-map');if(!isVenueTeam(this.room.venueId,player.teamId))fail('invalid-team');if(!roomTeamsMatchVenue(this.room)&&['waiting','running'].includes(this.room.status))await this.finish(null,'cancelled');if(this.room.players.some(p=>p.id===player.id))return {roomCode:this.room.code};if(this.room.status!=='waiting'||this.room.players.length>=2||this.room.ranked||!!player.qa!==!!this.room.players[0].qa)fail('room-full',409);this.room.players.push({...player,ready:false,connected:false,lastSeen:Date.now(),lastInput:0,sequence:-1});await this.save();this.broadcast();return {roomCode:this.room.code};}
 async fetch(request){
  const id=request.headers.get('X-Player-ID');if(!this.room||!this.room.players.some(p=>p.id===id))return json({error:'not-in-room'},403);
  if(!roomTeamsMatchVenue(this.room)&&['waiting','running'].includes(this.room.status))await this.finish(null,'cancelled');
  const player=this.room.players.find(p=>p.id===id);for(const old of this.ctx.getWebSockets(id))old.close(4001,'Replaced by a new connection');
  const [client,server]=Object.values(new WebSocketPair());this.ctx.acceptWebSocket(server,[id]);server.serializeAttachment({id,rateAt:Date.now(),rate:0});player.connected=true;player.lastSeen=Date.now();player.lastInput=0;
  await this.save();this.broadcast();server.send(JSON.stringify({type:'room',room:this.publicRoom(id)}));if(this.room.status==='running')this.ensureTimer();
  return new Response(null,{status:101,webSocket:client,headers:{'Sec-WebSocket-Protocol':'tukngo'}});
 }
 async webSocketMessage(ws,message){
  const attachment=ws.deserializeAttachment(),now=Date.now();if(typeof message!=='string'||message.length>2048){ws.close(1009,'Message too large');return;}
  if(now-attachment.rateAt>1000){attachment.rateAt=now;attachment.rate=0;}if(++attachment.rate>50){ws.close(1008,'Rate limited');return;}ws.serializeAttachment(attachment);
  let value;try{value=JSON.parse(message);}catch{return;}
  const index=this.room?.players.findIndex(p=>p.id===attachment.id),player=this.room?.players[index];if(!player)return;player.lastSeen=now;
  if(!roomTeamsMatchVenue(this.room)&&['waiting','running'].includes(this.room.status)){await this.finish(null,'cancelled');return;}
  if(value.type==='ping'){ws.send(JSON.stringify({type:'pong',at:value.at}));return;}
  if(value.type==='ready'&&this.room.status==='waiting'){
   player.ready=value.ready===true;await this.save();this.broadcast();
   if(this.room.status==='waiting'&&this.room.players.length===2&&this.room.players.every(p=>p.ready&&p.connected)){
    this.simulation=createOnlineSimulation(this.room.venueId,this.room.seed);this.room.status='running';this.room.started=Date.now();this.lastTick=Date.now();await this.save();this.ensureTimer();this.broadcast();
   }
  }else if(value.type==='input'&&this.room.status==='running'){
   if(!Number.isSafeInteger(value.seq)||value.seq<=player.sequence)return;player.sequence=value.seq;player.lastInput=now;this.simulation.input(index,cleanInput(value));
  }else if(value.type==='leave')await this.leave(player.id);
 }
 ensureTimer(){if(!this.timer)this.timer=setInterval(()=>{void this.tick().catch(()=>{this.room.status='cancelled';this.stopTimer();this.broadcast();void this.save();});},50);}
 stopTimer(){if(this.timer)clearInterval(this.timer);this.timer=null;}
 async tick(){
  if(this.room.status!=='running'){this.stopTimer();return;}const now=Date.now(),dt=Math.min(.25,Math.max(0,(now-this.lastTick)/1000));this.lastTick=now;
  this.room.players.forEach((player,i)=>{if(now-player.lastInput>1500)this.simulation.input(i,{});});
  this.simulation.advance(dt);this.tickCount++;
  const times=this.simulation.games.map(game=>game.state.finishTimes[0]);
  const departure=disconnectDecision(this.room.players,now);
  if(times.every(t=>t!=null))await this.finish(Math.abs(times[0]-times[1])<=.03?null:times[0]<times[1]?0:1,'finish');
  else if(departure){if(times.some(time=>time!=null))await this.finish(times.findIndex(time=>time!=null),'disconnect');else if(departure.cancelled)await this.finish(null,'cancelled');else await this.finish(departure.winner,'disconnect');}
  else if(now-this.room.started>Math.max(240000,RACE_VENUES[this.room.venueId].length/3*1000+45000)){
   if(times.some(t=>t!=null))await this.finish(times[0]!=null?0:1,'timeout');else await this.finish(null,'cancelled');
  }
  if(this.tickCount%2===0)this.broadcast();
  if(this.tickCount%20===0&&!this.saving){this.saving=true;try{await this.save();}finally{this.saving=false;}}
 }
 snapshot(index){if(!this.simulation)return null;const value=this.simulation.snapshot(index);if(this.room.status==='finished'){value.phase='finished';value.result=this.room.result.winner==null?'tie':this.room.result.winner===index?'win':value.finishTimes[0]==null?'dnf':'loss';value.speeds=[0,0];value.rowingHeld=false;value.boostActive=false;}return value;}
 broadcast(){if(!this.room)return;for(const ws of this.ctx.getWebSockets()){const id=ws.deserializeAttachment()?.id,index=this.room.players.findIndex(p=>p.id===id);if(index<0)continue;try{ws.send(JSON.stringify({type:'state',room:this.publicRoom(id),game:this.snapshot(index),serverAt:Date.now()}));}catch{/* Close handler owns presence updates. */}}}
 async finish(winner,reason){
  if(['finished','cancelled'].includes(this.room.status))return;
  this.stopTimer();this.room.status=reason==='cancelled'?'cancelled':'finished';this.room.result={winner,reason,times:this.simulation?.games.map(game=>game.state.finishTimes[0])||[null,null]};
  // Persist the decided result before invoking the idempotent ranking transaction.
  await this.save();try{await this.settle();await this.ctx.storage.setAlarm(Date.now()+600000);}catch{await this.ctx.storage.setAlarm(Date.now()+5000);}this.broadcast();
 }
 async settle(){const room=this.room;if(room.settled)return;const directory=directoryFor(this.env,room.venueId,room.players[0].qa);if(room.ranked&&room.status==='finished'){room.changes=await directory.record({id:room.code,players:room.players,winner:room.result.winner,times:room.result.times});}await directory.release(room.players.map(p=>p.id),room.code);room.settled=true;await this.save();}
 async leave(id){const index=this.room?.players.findIndex(p=>p.id===id);if(index==null||index<0)return;const active=this.room.status==='running',started=this.simulation?.games[0].state.phase!=='intro'&&this.simulation?.games[0].state.phase!=='countdown';if(active&&started){const times=this.simulation.games.map(game=>game.state.finishTimes[0]);await this.finish(departureWinner(times,index),times.some(time=>time!=null)?'finish':'forfeit');}else if(this.room.status==='waiting'||active)await this.finish(null,'cancelled');for(const ws of this.ctx.getWebSockets(id))ws.close(1000,'Left room');}
 async webSocketClose(ws,code,reason,wasClean){const id=ws.deserializeAttachment()?.id;if(this.ctx.getWebSockets(id).some(other=>other!==ws&&other.readyState===1))return;const player=this.room?.players.find(p=>p.id===id);if(player){player.connected=false;player.lastSeen=Date.now();if(this.room.status==='waiting')player.ready=false;await this.save();this.broadcast();}try{ws.close(code===1006?1000:code,reason);}catch{} }
 async webSocketError(ws){await this.webSocketClose(ws,1000,'Connection interrupted',false);}
 async alarm(){if(!this.room)return;if(this.room.status==='waiting')await this.finish(null,'cancelled');else if(this.room.status==='running'){this.ensureTimer();await this.ctx.storage.setAlarm(Date.now()+60000);}else if(!this.room.settled){await this.settle();this.broadcast();await this.ctx.storage.setAlarm(Date.now()+600000);}else{for(const ws of this.ctx.getWebSockets())ws.close(1000,'Room expired');await this.ctx.storage.deleteAll();this.room=null;}}
}
