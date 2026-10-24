import {createRaceGame} from './gameplay.mjs';
import {ONLINE_PROTOCOL,cleanPlayerName} from './online-rules.mjs';
import {sealGuestProfile,openGuestProfile} from './profile-transfer.mjs';

const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
const write=(key,value)=>{try{value==null?localStorage.removeItem(key):localStorage.setItem(key,JSON.stringify(value));}catch{/* A guest can still play for this page session. */}};
export function createSessionGame(options){
 const offline=createRaceGame(options);let active=false,state=null,source=null,received=0,send=()=>{},input={row:false,boost:false,steer:0},nudge=null;
 const game={
  get state(){return active?state:offline.state;},
  get online(){return active;},
  connectOnline(onInput){active=true;send=onInput;source=null;input={row:false,boost:false,steer:0};state={...offline.snapshot(),phase:'ready',mode:'online'};},
  receiveOnline(value){if(!active)return;source=structuredClone(value);received=performance.now();state=structuredClone(value);},
  disconnectOnline(){active=false;source=null;clearTimeout(nudge);input={row:false,boost:false,steer:0};},
  snapshot(){return active?{...state,distances:[...state.distances],speeds:[...state.speeds],finishTimes:[...state.finishTimes]}:offline.snapshot();},
  advance(seconds){
   if(!active){offline.advance(seconds);return;}if(!source)return;
   // Short extrapolation smooths 10 Hz authoritative packets. Freeze after
   // 150 ms without a packet; never invent finish crossings or a result.
   const age=Math.min(.15,Math.max(0,(performance.now()-received)/1000)),racing=source.phase==='racing';
   state={...source,distances:source.distances.map((distance,i)=>source.finishTimes[i]!=null?distance:Math.min(source.raceLength-.001,distance+(racing?source.speeds[i]*age:0))),speeds:[...source.speeds],finishTimes:[...source.finishTimes],elapsed:source.elapsed+(racing?age:0),beatPhase:source.beatPhase+(racing?age*source.cadence/60:0),aiPhase:(source.aiPhase+(racing?age*source.aiCadence/60:0))%1,countdown:Math.max(0,source.countdown-(source.phase==='countdown'?age:0)),introElapsed:(source.introElapsed||0)+(source.phase==='intro'?age:0),rowingHeld:input.row||input.boost,boostHeld:input.boost,steeringInput:input.steer};
   state.gap=state.distances[0]-state.distances[1];
  },
  setRowingHeld(held){if(!active)return offline.setRowingHeld(held);input.row=!!held;state.rowingHeld=input.row||input.boost;send(input);},
  setBoostHeld(held){if(!active)return offline.setBoostHeld(held);input.boost=!!held;state.boostHeld=input.boost;send(input);},
  setSteering(value){if(!active)return offline.setSteering(value);input.steer=Number.isFinite(value)?Math.max(-1,Math.min(1,value)):0;state.steeringInput=input.steer;send(input);},
  nudgeSteering(direction){if(!active)return offline.nudgeSteering(direction);game.setSteering(direction);clearTimeout(nudge);nudge=setTimeout(()=>game.setSteering(0),800);},
  stroke(options){if(!active)return offline.stroke(options);return state.phase==='racing'?{quality:'perfect',error:0,beat:Math.round(state.beatPhase)}:null;},
  reset(...args){game.disconnectOnline();return offline.reset(...args);},
 };
 for(const name of ['start','pause','resume','setPace','surge','skipIntro','completeRace'])game[name]=(...args)=>active?false:offline[name](...args);
 for(const [name,value] of Object.entries(offline))if(typeof value==='function'&&!(name in game))game[name]=(...args)=>active?false:value.apply(offline,args);
 return game;
}

export function createOnlineClient({baseUrl,venueId,endpointUrl='',onChange=(_state)=>{},onGame=(_snapshot,_room)=>{}}){
 const credentialKey='tukngo-online-guest',roomKey='tukngo-online-room-'+venueId;
 let credential=read(credentialKey),state={status:'idle',room:null,leaderboard:null,ping:null,error:'',busy:false,name:read('tukngo-online-name')||'',queued:false},endpoint='',configuration=null,sessionPromise=null,pendingAction=null,leavePromise=null,socket=null,roomCode='',disposed=false,generation=0,operation=0,retry=0,retryTimer=null,poll=null,heartbeat=null,inputTimer=null,sequence=0,input={row:false,boost:false,steer:0},dirty=false;
 const emit=patch=>{state={...state,...patch};onChange(state);};
 async function configure(){if(endpoint)return;if(configuration)return configuration;configuration=(async()=>{let address=endpointUrl;if(!address){const response=await fetch(baseUrl+'online-config.json',{cache:'no-cache'});if(!response.ok)throw new Error('server-not-configured');address=(await response.json()).url;}const url=new URL(address);if(url.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('server-not-configured');endpoint=url.origin;})();try{await configuration;}catch(error){configuration=null;throw error;}}
 async function request(path,method='GET',data,authenticated=true,token=credential?.token){
  await configure();const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{const response=await fetch(endpoint+path,{method,signal:controller.signal,headers:{...(authenticated&&token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});const result=await response.json();if(!response.ok)throw new Error(result.error||'connection-error');return result;}finally{clearTimeout(timeout);}
 }
 async function session(){if(credential)return credential;if(!sessionPromise)sessionPromise=request('/session','POST',{},false).then(value=>{credential=value;write(credentialKey,credential);return credential;}).finally(()=>{sessionPromise=null;});return sessionPromise;}
 function handleError(error){emit({error:error.message==='Failed to fetch'||error.name==='AbortError'?'connection-error':error.message,busy:false});}
 function stopQueue(){clearInterval(poll);poll=null;}
 function send(value){if(socket?.readyState===1)socket.send(JSON.stringify(value));}
 function sendInput(){if(state.room?.status!=='running')return;send({type:'input',...input,seq:++sequence});dirty=false;}
 function connect(code){
  if(disposed)return;const current=++generation;roomCode=code;write(roomKey,code);socket?.close();clearInterval(heartbeat);clearInterval(inputTimer);clearTimeout(retryTimer);
  emit({status:retry?'reconnecting':'connecting',busy:false,queued:false,error:''});stopQueue();
  socket=new WebSocket(endpoint.replace(/^http/,'ws')+'/rooms/'+code+'/socket',['tukngo','token.'+credential.token]);
  socket.onopen=()=>{if(current!==generation)return;retry=0;emit({status:'connected',error:''});heartbeat=setInterval(()=>send({type:'ping',at:Date.now()}),2000);inputTimer=setInterval(()=>{if(dirty||state.room?.status==='running')sendInput();},100);};
  socket.onmessage=event=>{if(current!==generation)return;let packet;try{packet=JSON.parse(event.data);}catch{return;}
   if(packet.type==='pong'){emit({ping:Math.max(0,Date.now()-packet.at)});return;}
   if(packet.room){if(packet.room.protocol!==ONLINE_PROTOCOL){emit({error:'protocol-mismatch'});socket.close(4002);return;}sequence=Math.max(sequence,packet.room.inputSequence??-1);emit({room:packet.room,status:'connected',error:''});if(['finished','cancelled'].includes(packet.room.status))write(roomKey,null);}
   if(packet.game)onGame(packet.game,packet.room);
  };
  socket.onerror=()=>{/* Close handles reconnection once, including timeouts. */};
  socket.onclose=event=>{if(current!==generation||disposed)return;clearInterval(heartbeat);clearInterval(inputTimer);input={row:false,boost:false,steer:0};
   if(event.code===4001||event.code===4002){emit({status:'disconnected',error:event.code===4001?'duplicate-session':'protocol-mismatch'});return;}
   if(['finished','cancelled'].includes(state.room?.status)){emit({status:'disconnected'});return;}
   emit({status:'reconnecting',error:'reconnecting'});if(retry++<5)retryTimer=setTimeout(()=>connect(code),Math.min(4000,500*2**retry));else emit({status:'disconnected',error:'connection-error'});
  };
 }
 const api={
  get state(){return state;},get playerId(){return credential?.id;},get savedRoom(){return read(roomKey);},
  async exportProfile(password){await session();return sealGuestProfile({...credential,name:state.name},password);},
  async importProfile(bytes,password){
   if(state.busy||state.queued||state.room&&!['finished','cancelled'].includes(state.room.status))throw Error('already-in-room');
   const current=++operation;emit({busy:true});
   try{const candidate=await openGuestProfile(bytes,password);
    const leaderboard=await request('/leaderboard?venueId='+venueId,'GET',null,true,candidate.token);
    if(current!==operation||disposed)return false;
    // Apply only after local decryption and real server verification succeed.
    ++generation;socket?.close();socket=null;clearInterval(heartbeat);clearInterval(inputTimer);write(roomKey,null);roomCode='';
    credential={id:candidate.id,token:candidate.token};write(credentialKey,credential);api.setName(cleanPlayerName(candidate.name));emit({room:null,leaderboard,status:'available',error:'',ping:null});return true;
   }finally{if(current===operation)emit({busy:false});}
  },
  async open(){const current=++operation;if(leavePromise)await leavePromise;if(current!==operation||disposed)return;emit({busy:true,error:''});try{await session();const health=await request('/health','GET',null,false);if(current!==operation||disposed)return;if(!health.ok||health.protocol!==ONLINE_PROTOCOL)throw new Error('server-not-configured');emit({status:'available',busy:false});const previous=read(roomKey);if(previous&&current===operation){try{const room=await request('/rooms/'+previous);if(current!==operation||disposed)return;if(room.status!=='cancelled')connect(previous);else {write(roomKey,null);emit({room});}}catch{write(roomKey,null);}}await api.refresh();}catch(error){if(current===operation)handleError(error);}},
  setName(name){emit({name});write('tukngo-online-name',name);},
  async refresh(){try{await session();const leaderboard=await request('/leaderboard?venueId='+venueId);emit({leaderboard,error:''});}catch(error){handleError(error);}},
  async play(kind,selection,code=''){
   if(state.busy)return;const current=++operation;emit({busy:true,error:''});try{await session();const value={...selection,venueId,name:cleanPlayerName(state.name||'Rower '+credential.id.slice(0,4))};api.setName(value.name);
    const task=request(kind==='queue'?'/queue':kind==='create'?'/rooms':'/rooms/'+code+'/join','POST',value);pendingAction=task;
    const result=await task;if(pendingAction===task)pendingAction=null;
    if(current!==operation||disposed)return;
    if(result.roomCode)connect(result.roomCode);else {emit({queued:true,busy:false,status:'queued'});stopQueue();poll=setInterval(async()=>{try{const result=await request('/queue?venueId='+venueId);if(current!==operation||disposed)return;if(result.roomCode)connect(result.roomCode);else if(!result.queued){stopQueue();emit({queued:false,status:'available',error:'queue-expired'});}}catch(error){if(current!==operation)return;stopQueue();emit({queued:false,status:'disconnected'});handleError(error);}},1800);}
   }catch(error){if(current===operation)handleError(error);}
  },
  ready(value){send({type:'ready',ready:!!value});},
  input(value){input={...value};dirty=true;},
  leave(){if(leavePromise)return leavePromise;const oldCode=roomCode,current=++operation,pending=pendingAction;++generation;clearTimeout(retryTimer);clearInterval(heartbeat);clearInterval(inputTimer);stopQueue();send({type:'leave'});socket?.close();socket=null;roomCode='';write(roomKey,null);emit({room:null,queued:false,status:'available',busy:true,error:'',ping:null});leavePromise=(async()=>{try{if(pending)await pending.catch(()=>{});if(credential)await request('/queue?venueId='+venueId,'DELETE');}catch(error){if(oldCode&&current===operation)handleError(error);}finally{leavePromise=null;pendingAction=null;if(current===operation)emit({busy:false});}})();return leavePromise;},
  reconnect(){if(roomCode){retry=0;connect(roomCode);}else void api.open();},
  dispose(){disposed=true;++generation;++operation;clearTimeout(retryTimer);clearInterval(heartbeat);clearInterval(inputTimer);stopQueue();socket?.close();socket=null;},
 };
 return api;
}
