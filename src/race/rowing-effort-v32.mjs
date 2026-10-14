// Keep the catch at each beat boundary. Sprint spends less time in the pull
// and more in recovery, using the same contact-calibrated joint trajectory.
export function strokePhase(phase,effort=0){
 const p=((phase%1)+1)%1,e=Math.max(0,Math.min(1,Number.isFinite(effort)?effort:0));
 return p+.07*e*(1-Math.cos(p*Math.PI*2));
}
