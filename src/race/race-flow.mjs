// Authored racing aid, not measured hydrology. Spatially stable and reusable
// by another venue; never depends on player/rival gap or team identity.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function riverFlow(distance,lateral=0,seed=17){
 const phase=((seed>>>0)%997)/997*Math.PI*2;
 const center=2.25*Math.sin(distance/100+phase)+.45*Math.sin(distance/43+phase*.7);
 const slope=.0225*Math.cos(distance/100+phase)+.45/43*Math.cos(distance/43+phase*.7);
 const alignment=1-smooth(.55,1.7,Math.abs(lateral-center));
 const strength=smooth(35,100,distance)*(1-smooth(1140,1200,distance));
 return {center,slope,alignment,boost:.045*alignment*strength,crossCurrent:(.04*Math.sin(distance/76+phase)+.025*Math.sin(distance/31))*strength};
}
