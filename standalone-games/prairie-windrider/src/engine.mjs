export const COLS=12, ROWS=8;
export const HEADINGS=[
 {name:'North',short:'N',x:0,y:-1},{name:'Northeast',short:'NE',x:1,y:-1},
 {name:'East',short:'E',x:1,y:0},{name:'Southeast',short:'SE',x:1,y:1},
 {name:'South',short:'S',x:0,y:1},{name:'Southwest',short:'SW',x:-1,y:1},
 {name:'West',short:'W',x:-1,y:0},{name:'Northwest',short:'NW',x:-1,y:-1}
];
const station=(x,y,name,kind='elevator')=>({x,y,name,kind});
const blocks=(kind,cells)=>cells.map(([x,y])=>({x,y,kind}));
export const COURSES=[
 {name:'A sea of grass',subtitle:'Your first inland delivery',letter:'“No tide chart needed. Though I brought one, just in case.”',brief:'A steady breeze carries you east. Stop at Golden Elevator, then bring the last postcard to Big Sky Depot.',start:{x:1,y:6},finish:{x:10,y:2},stations:[station(5,6,'Golden Elevator'),station(10,2,'Big Sky Depot','depot')],wind:[{x:1,y:0}],obstacles:[...blocks('marsh',[[3,2],[4,2],[3,3],[4,3]]),...blocks('fence',[[8,6],[8,7]])],limit:7,par:3},
 {name:'The crosswind run',subtitle:'The wind has other plans',letter:'“It’s a fair bit flatter than Cape Breton. The wind is familiar.”',brief:'The breeze alternates east and north. Deliver to the red elevator and the roadside café, then pull into the depot.',start:{x:1,y:6},finish:{x:10,y:1},stations:[station(4,2,'Red Elevator'),station(9,5,'Prairie Café','cafe')],wind:[{x:1,y:0},{x:0,y:-1}],obstacles:[...blocks('marsh',[[6,3],[6,4],[7,3]]),...blocks('fence',[[3,5],[4,5]])],limit:11,par:7},
 {name:'Around the slough',subtitle:'Give the water some room',letter:'“I came to the Prairies and still managed to find water.”',brief:'The middle is wet ground. Plan around the slough, drop both postcards, and finish at the northeast depot.',start:{x:1,y:6},finish:{x:10,y:1},stations:[station(2,1,'North Field'),station(9,6,'Harvest Hall','cafe')],wind:[{x:1,y:0},{x:0,y:1},{x:-1,y:0}],obstacles:blocks('marsh',[[5,2],[6,2],[4,3],[5,3],[6,3],[7,3],[5,4],[6,4]]),limit:12,par:8},
 {name:'Fence-line figures',subtitle:'A little room to tack',letter:'“On the water, the fence posts would be a concern.”',brief:'Short sails are useful here. Find the gaps between the fences and deliver all three postcards before the depot closes.',start:{x:1,y:6},finish:{x:10,y:1},stations:[station(3,1,'West Elevator'),station(6,6,'Grain Exchange'),station(10,5,'Corner Store','cafe')],wind:[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}],obstacles:[...blocks('fence',[[4,2],[4,3],[4,4],[7,1],[7,2],[7,5],[7,6]]),...blocks('marsh',[[9,3],[10,3]])],limit:14,par:9},
 {name:'Last post, long light',subtitle:'The whole horizon is yours',letter:'“Sending this one home. Wish you could see the size of the sky.”',brief:'A final loop between three prairie stops. Read the four-part forecast, keep clear of wet ground, and bring the mail buggy home.',start:{x:1,y:6},finish:{x:1,y:6},stations:[station(2,1,'Sunrise Elevator'),station(10,1,'Far Horizon'),station(9,6,'Evening Café','cafe')],wind:[{x:1,y:0},{x:0,y:-1},{x:-1,y:0},{x:0,y:1}],obstacles:[...blocks('marsh',[[5,2],[6,2],[5,3],[6,3],[5,4]]),...blocks('fence',[[3,5],[4,5],[8,3],[8,4]])],limit:16,par:12}
];
export const coordinate=({x,y})=>String.fromCharCode(65+x)+(y+1);
export const windAt=(course,state)=>course.wind[state.moves%course.wind.length];
export const windName=w=>w.x>0?'East':w.x<0?'West':w.y>0?'South':w.y<0?'North':'Calm';
const same=(a,b)=>a.x===b.x&&a.y===b.y;
export function initialState(course){return {x:course.start.x,y:course.start.y,moves:0,delivered:[],trail:[],status:'playing'};}
function intersects(a,b,cell){
 const minX=cell.x-.43,maxX=cell.x+.43,minY=cell.y-.43,maxY=cell.y+.43;
 let lo=0,hi=1;const dx=b.x-a.x,dy=b.y-a.y;
 for(const [p,q] of [[-dx,a.x-minX],[dx,maxX-a.x],[-dy,a.y-minY],[dy,maxY-a.y]]){
  if(p===0){if(q<0)return false;continue;}const r=q/p;
  if(p<0)lo=Math.max(lo,r);else hi=Math.min(hi,r);if(lo>hi)return false;
 }return true;
}
export function preview(course,state,heading,power){
 const d=HEADINGS[heading],wind=windAt(course,state);
 if(!d||!Number.isInteger(power)||power<1||power>3)return {valid:false,reason:'Choose a direction and one, two or three sail units.'};
 const target={x:state.x+d.x*power+wind.x,y:state.y+d.y*power+wind.y};
 if(state.status!=='playing')return {valid:false,target,reason:'This delivery round has ended.'};
 if(target.x<0||target.x>=COLS||target.y<0||target.y>=ROWS)return {valid:false,target,reason:'That sail goes beyond the course. Change direction or use less sail.'};
 if(same(state,target))return {valid:false,target,reason:'The wind cancels that sail. Try another setting or wait with the brake on.'};
 const hit=course.obstacles.find(o=>intersects(state,target,o));
 if(hit)return {valid:false,target,reason:hit.kind==='marsh'?'That path crosses wet ground. Sail around the blue slough.':'That path crosses a fence. Choose a gap or a shorter sail.'};
 const arrivals=course.stations.map((s,i)=>same(s,target)&&!state.delivered.includes(i)?i:-1).filter(i=>i>=0);
 return {valid:true,target,arrivals,reason:arrivals.length?`Postcard delivery at ${course.stations[arrivals[0]].name}.`:same(target,course.finish)?'Depot landing. All postcards must be delivered to finish.':`Clear landing at ${coordinate(target)}.`};
}
function settle(course,s){const complete=s.delivered.length===course.stations.length&&same(s,course.finish);return {...s,status:complete?'won':s.moves>=course.limit?'lost':'playing'};}
export function sail(course,state,heading,power){const p=preview(course,state,heading,power);if(!p.valid)return state;return settle(course,{...state,...p.target,moves:state.moves+1,delivered:[...state.delivered,...p.arrivals],trail:[...state.trail,{from:{x:state.x,y:state.y},to:p.target}]});}
export function wait(course,state){if(state.status!=='playing')return state;return settle(course,{...state,moves:state.moves+1,trail:[...state.trail,{from:{x:state.x,y:state.y},to:{x:state.x,y:state.y}}]});}
export function stars(course,state){if(state.status!=='won')return 0;return state.moves<=course.par?3:state.moves<=course.par+2?2:1;}
export function solve(course,start=initialState(course)){
 const queue=[{state:start,path:[]}],seen=new Set();
 for(let i=0;i<queue.length;i++){
  const {state:s,path}=queue[i];if(s.status==='won')return path;if(s.status!=='playing')continue;
  const key=[s.x,s.y,s.moves%course.wind.length,s.delivered.slice().sort().join(',')].join(':');if(seen.has(key))continue;seen.add(key);
  for(let heading=0;heading<8;heading++)for(let power=1;power<=3;power++){
   const next=sail(course,s,heading,power);if(next!==s)queue.push({state:{...next,trail:[]},path:[...path,{heading,power}]});
  }
  const next=wait(course,s);queue.push({state:{...next,trail:[]},path:[...path,{wait:true}]});
 }return null;
}
