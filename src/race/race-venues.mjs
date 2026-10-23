export const RACE_VENUES=Object.freeze({
 maspero:{id:'maspero',name:{vi:'Maspéro · Sóc Trăng',km:'ម៉ាស្ពេរ៉ូ · ឃ្លាំង',en:'Maspéro · Soc Trang'},length:1200,width:61,finishX:1090,kind:'balanced',startEnd:200,finalStart:950,drain:.05,boostDrain:9,recover:6,current:1,steeringLimit:4.2,description:{vi:'Đua đôi cân bằng · 1.200 m',km:'ប្រណាំងគូ · ១២០០ ម៉ែត្រ',en:'Balanced head-to-head · 1,200 m'}},
 'phnom-penh':{id:'phnom-penh',name:{vi:'Phnom Penh · Tonle Sap',km:'ភ្នំពេញ · ទន្លេសាប',en:'Phnom Penh · Tonle Sap'},length:1700,width:180,finishX:1090,kind:'endurance',startEnd:200,finalStart:1450,drain:.14,boostDrain:10,recover:5,current:1.9,steeringLimit:4.2,description:{vi:'Đường trường · quản lý thể lực · 1.700 m',km:'ប្រណាំងចម្ងាយវែង · ១៧០០ ម៉ែត្រ',en:'Endurance · stronger currents · 1,700 m'}},
 'siem-reap':{id:'siem-reap',name:{vi:'Siem Reap · Sông đô thị',km:'សៀមរាប · ស្ទឹងសៀមរាប',en:'Siem Reap · City river'},length:500,width:38,finishX:1090,kind:'sprint',startEnd:80,finalStart:350,drain:.03,boostDrain:6.5,recover:4,current:.45,steeringLimit:2.4,description:{vi:'Nước rút · giữ đường hẹp · 500 m',km:'ប្រណាំងល្បឿន · ៥០០ ម៉ែត្រ',en:'Short sprint · narrow corridor · 500 m'}},
});
export const raceVenue=id=>RACE_VENUES[id]||RACE_VENUES.maspero;
export const venueRaceX=(venue,distance)=>venue.finishX+venue.length-distance;
export function venueStage(distance,venue){return distance<venue.startEnd?'start':distance<venue.finalStart?'cruise':'final';}
// Project venue milestones onto the existing audio pack; last-100/50 stay exact.
export function commentaryDistance(distance,venue){
 if(venue.id==='maspero')return distance;
 const remaining=venue.length-distance;
 if(remaining<=50)return 1200-remaining;
 if(remaining<=100)return 1100+(100-remaining);
 if(distance>=venue.finalStart)return 950+(distance-venue.finalStart)/(venue.length-100-venue.finalStart)*150;
 if(distance>=venue.length/2)return 600+(distance-venue.length/2)/(venue.finalStart-venue.length/2)*350;
 if(distance>=venue.startEnd)return 200+(distance-venue.startEnd)/(venue.length/2-venue.startEnd)*400;
 return distance/venue.startEnd*200;
}
