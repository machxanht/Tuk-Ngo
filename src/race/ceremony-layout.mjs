import {COURSE} from './maspero-course.mjs';
import {courseZ} from './maspero-layout.mjs';

// Opening-film formation: closely spaced parallel hulls at the main stand.
export function ceremonyPlacement(index,time=0){
 const row=Math.floor(index/9),lane=index%9,x=COURSE.standX+(row-3)*34+(lane%2)*2+Math.sin(index*7.3)*.7-Math.sin(time*.09+index*.4)*.35;
 const z=(lane-4)*7.2+Math.sin(index*17.13)*.35;
 return {x,y:Math.sin(time*.9+index)*.025,z:courseZ(x,z),yaw:Math.PI+Math.sin(index*3.1)*.025+Math.sin(time*.17+index)*.004};
}
