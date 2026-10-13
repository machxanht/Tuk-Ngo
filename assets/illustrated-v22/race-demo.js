/* A short autonomous race on the painted course. Gate crossings use the bow,
   not the centre of the hull. The distance is illustrative, not surveyed. */
(()=>{
 const config=TukNgoConfig,rules=config.race,W=config.camera.width,H=config.camera.height;
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 let elapsed=0,follow=true,bowAnchor=null;
 const duration=rules.countdown+Math.max(...rules.boats.map(b=>b.finishTime));
 function rampIntegral(t,start,length){const q=Math.max(0,t-start);return q<length?q*q/(2*length):q-length/2;}
 function sample(stamp=elapsed){
  const clock=clamp(stamp,0,duration),run=Math.max(0,clock-rules.countdown);
  const stage=clock<rules.countdown?'countdown':clock<duration?'racing':'finished';
  const boats=rules.boats.map(b=>{
   const u=clamp(run/b.finishTime),progress=clamp(u+b.earlyLead*Math.sin(Math.PI*u));
   const bowLocal=bowAnchor||{x:config.boat.hull.x+rules.bowSource[0]*config.boat.hull.sx,y:config.boat.hull.y+rules.bowSource[1]*config.boat.hull.sy};
   const startY=b.y+bowLocal.y*b.scale;
   const distance=(rules.start-rules.finish)/(1+rules.riverSlope**2),travel=distance*progress;
   const bow={x:rules.start+rules.riverSlope*(startY-530)-travel,y:startY+rules.riverSlope*travel};
   const rowingTime=Math.min(run,b.finishTime),finished=run>=b.finishTime;
   // Integrating the tempo keeps the four painted poses continuous during
   // acceleration; multiplying time by a changing tempo would jump poses.
   const cadence=72+b.tempoOffset+16*clamp(rowingTime/7)+14*clamp((rowingTime-25)/6);
   const cycles=(72+b.tempoOffset)/60*rowingTime+16/60*rampIntegral(rowingTime,0,7)+14/60*rampIntegral(rowingTime,25,6);
   return {...b,progress,bow,x:bow.x-bowLocal.x*b.scale,y:bow.y-bowLocal.y*b.scale,
    finished,cadence,cycles:(stage==='countdown'||finished)? .75:cycles,
    motion:stage==='countdown'||finished?0:clamp(rowingTime/2,.18,1)};
  });
  const leader=boats.reduce((a,b)=>a.progress>=b.progress?a:b);
  const winner=boats.filter(b=>b.finished).sort((a,b)=>a.finishTime-b.finishTime)[0]?.id||null;
  const progress=leader.progress,zoom=follow?1+(rules.zoom-1)*Math.sin(Math.PI*progress)**2:1;
  const left=Math.min(...boats.map(b=>b.bow.x)),right=Math.max(...boats.map(b=>b.x+2220*b.scale));
  const camera={zoom,x:clamp((left+right)/2,W/(2*zoom),W-W/(2*zoom)),y:clamp(780,H/(2*zoom),H-H/(2*zoom))};
  return {elapsed:clock,run,stage,countdown:Math.ceil(rules.countdown-clock),boats,leader:leader.id,winner,camera,duration,follow};
 }
 function buoy(ctx,x,y,finish){
  ctx.fillStyle='#4d66554d';ctx.beginPath();ctx.ellipse(x,y+10,20,6,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=finish?'#ad3527':'#347350';ctx.beginPath();ctx.ellipse(x,y,12,15,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff2ce';ctx.fillRect(x-10,y-5,20,5);
 }
 function drawGates(ctx,state){
  for(const [axis,finish] of [[rules.start,false],[rules.finish,true]]){
   const gateX=y=>axis+rules.riverSlope*(y-530),bottom=(1290-rules.riverSlope*axis+530*rules.riverSlope**2)/(1+rules.riverSlope**2);
   ctx.save();ctx.strokeStyle=finish?'#fff8e7bd':'#f4f5d590';ctx.lineWidth=5;ctx.setLineDash([14,13]);
   ctx.beginPath();ctx.moveTo(gateX(532),532);ctx.lineTo(gateX(bottom),bottom);ctx.stroke();ctx.setLineDash([]);
   for(let y=550;y<bottom;y+=120)buoy(ctx,gateX(y),y,finish);
   const x=gateX(535);ctx.fillStyle=finish?'#a92f25':'#245d48';ctx.fillRect(x-99,496,198,43);
   ctx.font='600 29px FestivalKhmer';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff0be';
   ctx.fillText(finish?'ទីបញ្ចប់':'ចាប់ផ្តើម',x,516,186);
   if(!finish&&state.stage==='countdown'){
    for(let i=0;i<3;i++){ctx.fillStyle=i<state.countdown?'#cc573c':'#97ae94';ctx.beginPath();ctx.arc(x-31+i*31,557,10,0,Math.PI*2);ctx.fill();}
   }
   ctx.restore();
  }
 }
 window.illustratedRace={sample,drawGates,setBowAnchor(point){bowAnchor={x:point[0],y:point[1]};},advance(dt){elapsed=clamp(elapsed+Math.max(0,dt),0,duration);},reset(){elapsed=0;},seek(stamp){elapsed=clamp(Number(stamp)||0,0,duration);},toggleCamera(){follow=!follow;},get state(){return sample();}};
})();
