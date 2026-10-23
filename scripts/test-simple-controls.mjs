import assert from 'node:assert/strict';
import * as T from 'three';
import {createRaceGame} from '../src/race/gameplay.mjs';
import {createRaceControls} from '../src/race/race-controls.mjs';
import {createDeviceSteering,screenTilt} from '../src/race/device-steering.mjs';
import {displayLod} from '../src/race/render-lod.mjs';
const race=()=>{const g=createRaceGame();g.start('easy',{simpleControls:true,steeringEnabled:true});g.advance(3);return g;};
const g=race(),controls=createRaceControls(g);controls.rowDown('row');g.advance(5);const normalSpeed=g.state.speeds[0],normalStamina=g.state.stamina;
assert(normalStamina<100&&normalStamina>95);controls.boostDown('boost');g.advance(3);assert(g.state.speeds[0]>normalSpeed*1.15);assert(g.state.stamina<normalStamina-25);
controls.release('row');assert(g.state.rowingHeld&&g.state.boostHeld);g.advance(8);assert(g.state.boostExhausted&&!g.state.boostActive);assert(g.state.stamina>=0);
controls.release('boost');const exhausted=g.state.stamina;g.advance(4);assert(g.state.stamina>exhausted+23);assert(!g.state.boostExhausted);controls.boostDown('again');g.advance(.2);assert(g.state.boostActive);g.pause();assert(!g.state.boostHeld&&!g.state.rowingHeld);controls.clear();
controls.setDeviceSteering(.8);g.resume();controls.rowDown('row');controls.setDeviceSteering(.8);g.advance(2);assert(g.state.lateralPositions[0]>.1);controls.clear();assert.equal(g.state.steeringInput,0);
let baseline;for(const fps of[15,30,60]){const game=race();game.setRowingHeld(true);while(game.state.phase==='racing')game.advance(1/fps);assert.equal(game.state.result,'win');assert(game.state.stamina<80&&game.state.stamina>30);if(baseline)assert.deepEqual(game.snapshot(),baseline);else baseline=game.snapshot();}
for(const [angle,beta,gamma,sign]of[[0,0,20,1],[0,0,-20,-1],[90,20,0,1],[270,20,0,-1],[180,0,20,-1]])assert.equal(Math.sign(screenTilt(beta,gamma,angle)),sign);
let now=0,heartbeat,output=0,permissionCalls=0;const listeners=new Map(),statuses=[];
const host={isSecureContext:true,performance:{now:()=>now},DeviceOrientationEvent:{requestPermission(){assert(listeners.has('deviceorientation'),'Listener must precede the permission promise');permissionCalls++;return Promise.resolve('granted');}},screen:{orientation:{angle:0,addEventListener(){},removeEventListener(){}}},addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type),setInterval:fn=>(heartbeat=fn,1),clearInterval(){}};
const tilt=createDeviceSteering({host,onInput:value=>output=value,onState:s=>statuses.push(s)});const pending=tilt.enable();assert.equal(permissionCalls,1,'Request inside activation, before awaiting assets');await pending;
function samples(beta,gamma,n=12){for(let i=0;i<n;i++){now+=20;listeners.get('deviceorientation')({beta,gamma});}}
samples(30,0,4);assert.equal(tilt.status,'active');samples(30,22);assert(output>.8);samples(30,-22,20);assert(output<-.8);samples(30,0,20);tilt.calibrate();samples(30,1);assert(Math.abs(output)<.01);now+=1800;heartbeat();assert.equal(tilt.status,'active','Stationary tilt must not time out');assert(Math.abs(output)<.01);tilt.dispose();assert(!listeners.has('deviceorientation'));
const denied=createDeviceSteering({host:{...host,DeviceOrientationEvent:{requestPermission:()=>Promise.resolve('denied')}}});assert.equal(await denied.enable(),'denied');denied.dispose();
const silent=createDeviceSteering({host});await silent.enable();now+=1800;heartbeat();assert.equal(silent.status,'unsupported');silent.dispose();
const source=new T.SphereGeometry(1,40,30),original=Array.from(source.index.array),lod=await displayLod(source,.25,.03,true);assert(lod.index.count<source.index.count*.5);assert(lod.attributes.position.count<source.attributes.position.count);assert.deepEqual(Array.from(source.index.array),original);for(const id of lod.index.array)assert(id<lod.attributes.position.count);source.dispose();lod.dispose();
console.log('Simple controls: two contacts, real stamina drain/recovery, boost exhaustion, pause reset, tilt mapping/calibration/permissions/timeout, 15/30/60 FPS determinism, display-only LOD passed.');
