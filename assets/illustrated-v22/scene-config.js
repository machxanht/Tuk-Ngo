/* One visual contract for the current 2.5D direction. Coordinates are art units,
   not a surveyed map. Every mode uses the same hull, crew and visual style. */
(()=>{
 const config={
  revision:'hybrid-v29',
  style:{id:'painted-daylight',description:'Minh họa mềm, nét rõ, nắng sáng, màu tự nhiên',banner:'#a91e19',bannerText:'#ffe4a0'},
  camera:{id:'bank-side-elevated',description:'Nhìn ngang từ bờ gần, hơi từ trên xuống',width:2400,height:1500,workshopHeight:860,maxRenderWidth:1600,maxPixelRatio:1.5,direction:-1},
  modes:{demo:{label:'Đua thử',boats:2,camera:'bank-side-elevated'},play:{label:'Đua nhanh',boats:2,camera:'bank-side-elevated'},practice:{label:'Tập chèo',boats:1,camera:'bank-side-elevated'},workshop:{label:'Xưởng ghe',boats:1,camera:'bank-side-elevated'}},
  assets:{hull:'hull-slim-bow-v23.webp',bridge:'bridge-c247-perspective-v23.webp'},
  boat:{hull:{x:65,y:230,sx:.96,sy:.61,width:2172,height:724},
   profile:[[250,429,499],[350,451,523],[450,467,534],[600,475,540],[800,472,536],[1000,460,522],[1200,443,503],[1400,421,478],[1600,396,449],[1800,363,412],[1900,342,389],[2000,313,360],[2100,299,303]],
   crew:{rows:25,seatedRows:8,firstRowX:470,rowPitch:53,controllerGap:35,callerX:335,controllerX:1100,helmFirstX:1835,helmPitch:68},
   lanes:[{id:'far',x:238,y:243,scale:.86,phase:.12},{id:'near',x:190,y:462,scale:.90,phase:0}]
  },
  race:{countdown:3,start:870,finish:180,riverSlope:.145,bowSource:[30,343],zoom:1.16,
   boats:[{id:'far',name:'Ghe 1',scale:.62,y:420,finishTime:42,earlyLead:-.018,tempoOffset:0},
          {id:'near',name:'Ghe 2',scale:.66,y:660,finishTime:43.3,earlyLead:.025,tempoOffset:3}]},
  layout:{
   far:{crowdRows:7,crowdColumns:156,crowdStep:15.6,frontY:423,rowDepth:6,humanHeight:[43,55],roadY:393,walkY:412},
   near:{crowdRows:5,crowdColumns:81,crowdStep:30,frontY:1420,slope:-.145,rowDepth:17,humanHeight:[102,118],roadY:1620,roadSlope:-.117,walkOffsetFromRoad:-12,roadEdge:[[0,1505],[400,1468],[1000,1400],[1570,1321],[1900,1273],[2240,1165],[2400,1135]]},
   mainStand:{x:675,y:444,height:297,banner:{x:681,y:232,width:798,height:53},frontClip:[130,399,1100,51]},
   nearStand:{x:380,y:1410,height:230,banner:{x:403,y:1392,width:600,height:34},frontClip:[0,1360,920,65]},
   bridge:{id:'C247',x:1920,y:245,scale:.78,deck:[{x:1965,y:414},{x:2450,y:631}]},
   bridge30April:{visibility:'other-course-end',note:'Khác đầu tuyến; không đặt cạnh C247 trong cùng khung đua'},
   buildingHeights:[190,125,185,245,118,190],
   plantHeights:[210,190,200,88,145,55],
   farStalls:{positions:[45,1270,1380,1490,1600,1710,1820],y:423,height:88},
   nearStalls:[{x:1570,y:1285,height:190,variant:1,vendor:2},{x:1900,y:1238,height:205,variant:0,vendor:4},{x:2240,y:1132,height:200,variant:3,vendor:0}],
   layerOrder:['sky','houses-trees','road-traffic','stands-stalls','far-crowd','upstream-bridge','river-boats','near-crowd-stands','near-stalls','near-road-traffic']
  },
  development:{primary:'quick-race',sequence:['practice','quick-race','tournament'],tournamentStatus:'planned',boatAnimation:'continuous-skinned-3d',raceStatus:'playable-quick-race-and-automatic-demo'}
 };
 function freeze(object){Object.values(object).forEach(value=>{if(value&&typeof value==='object')freeze(value);});return Object.freeze(object);}
 window.TukNgoConfig=freeze(config);
})();
