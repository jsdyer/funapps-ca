export const NODES = [
 {id:'camp',x:150,y:570,name:'Trailhead',kind:'camp',rest:true,note:'Your picnic table and the start of a very good day.'},
 {id:'pine',x:210,y:190,name:'Leaning pine',kind:'photo',stamp:'WOODLAND',note:'A pine leans over still water. One quiet frame, just for you.'},
 {id:'marsh',x:540,y:130,name:'Wildflower marsh',kind:'photo',stamp:'WILDFLOWERS',note:'Purple flowers and golden grasses ripple in the afternoon breeze.'},
 {id:'lagoon',x:890,y:230,name:'Lagoon lookout',kind:'photo',stamp:'LAGOON',note:'Park your bike on the marked trail and enjoy the saltwater view.'},
 {id:'river',x:850,y:560,name:'River bend',kind:'photo',stamp:'RIVER',note:'The river curls through Acadian woodland. A perfect final postcard.'},
 {id:'shelter',x:525,y:385,name:'Rest shelter',kind:'rest',rest:true,note:'A shady picnic shelter. A short break restores your energy.'},
 {id:'birds',x:590,y:635,name:'Bird hide',kind:'bonus',stamp:'BIRDSONG',note:'You wait quietly. A great blue heron lifts off above the reeds.'}
];
export const EDGES = [
 {a:'camp',b:'pine',minutes:24,energy:22,terrain:'Woodland',bend:[95,340]},
 {a:'pine',b:'marsh',minutes:20,energy:18,terrain:'Meadow',bend:[355,110]},
 {a:'marsh',b:'lagoon',minutes:23,energy:23,terrain:'Gravel',bend:[735,135]},
 {a:'lagoon',b:'river',minutes:25,energy:22,terrain:'Riverside',bend:[955,395]},
 {a:'river',b:'birds',minutes:18,energy:16,terrain:'Woodland',bend:[730,640]},
 {a:'birds',b:'camp',minutes:28,energy:23,terrain:'Meadow',bend:[365,660]},
 {a:'camp',b:'shelter',minutes:23,energy:23,terrain:'Gravel',bend:[320,465]},
 {a:'pine',b:'shelter',minutes:26,energy:25,terrain:'Woodland',bend:[385,260]},
 {a:'marsh',b:'shelter',minutes:17,energy:16,terrain:'Meadow',bend:[465,260]},
 {a:'shelter',b:'lagoon',minutes:24,energy:23,terrain:'Woodland',bend:[730,355]},
 {a:'shelter',b:'river',minutes:25,energy:25,terrain:'Gravel',bend:[675,490]},
 {a:'shelter',b:'birds',minutes:16,energy:16,terrain:'Riverside',bend:[545,510]}
];
export const REQUIRED=NODES.filter(n=>n.kind==='photo').map(n=>n.id);
export const node=id=>NODES.find(n=>n.id===id);
export const neighbours=id=>EDGES.filter(e=>e.a===id||e.b===id).map(e=>({edge:e,node:node(e.a===id?e.b:e.a)}));
export const newTrip=()=>({at:'camp',minutes:0,energy:100,photos:[],distance:0,status:'ready',ride:null,rests:0});
export function pointOnEdge(edge,from,t){const a=node(from),b=node(edge.a===from?edge.b:edge.a),[cx,cy]=edge.bend;return{x:(1-t)**2*a.x+2*(1-t)*t*cx+t*t*b.x,y:(1-t)**2*a.y+2*(1-t)*t*cy+t*t*b.y};}
export function beginRide(s,id){if(s.status!=='playing'||s.ride)return false;const option=neighbours(s.at).find(n=>n.node.id===id);if(!option)return false;if(s.energy<option.edge.energy)return false;s.ride={edge:option.edge,from:s.at,to:id,progress:0};return true;}
export function tickRide(s,seconds){if(s.status!=='playing'||!s.ride)return null;const r=s.ride;const old=r.progress;r.progress=Math.min(1,r.progress+Math.max(0,seconds)/(r.edge.minutes*.38));const delta=r.progress-old;s.minutes+=r.edge.minutes*delta;s.energy=Math.max(0,s.energy-r.edge.energy*delta);s.distance+=delta*r.edge.minutes/12;
 if(s.minutes>=240){s.status='lost';s.ride=null;return 'late';}if(r.progress===1){s.at=r.to;s.ride=null;return 'arrived';}return null;}
export function takePhoto(s){if(s.status!=='playing'||s.ride)return false;const n=node(s.at);if(!n.stamp||s.photos.includes(n.id))return false;s.photos.push(n.id);s.minutes+=4;checkDeadline(s);return true;}
function checkDeadline(s){if(s.minutes>=240)s.status='lost';}
export function rest(s){if(s.status!=='playing'||s.ride||s.energy>=99)return false;const fast=!!node(s.at).rest;s.energy=Math.min(100,s.energy+(fast?65:38));s.minutes+=fast?12:18;s.rests++;checkDeadline(s);return true;}
export function finish(s){if(s.status!=='playing'||s.ride||s.at!=='camp'||!REQUIRED.every(id=>s.photos.includes(id)))return false;s.status='won';return true;}
export const score=s=>Math.max(0,Math.round(s.photos.length*200+(240-s.minutes)*3+s.energy));
