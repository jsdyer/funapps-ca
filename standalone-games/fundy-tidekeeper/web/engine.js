export const TIDES = [
  { name: 'Low water', short: 'Low', height: 0, direction: 'The flats are open.' },
  { name: 'Water returning', short: 'In', height: 1, direction: 'The lowest paths disappear.' },
  { name: 'Rising tide', short: 'Rise', height: 2, direction: 'Only high paths remain.' },
  { name: 'High water', short: 'High', height: 3, direction: 'Wait on an island or use a bridge.' },
  { name: 'Falling tide', short: 'Fall', height: 2, direction: 'The water is on its way out.' },
  { name: 'Water retreating', short: 'Out', height: 1, direction: 'More paths are opening.' },
];
const N = {
  h: { id:'h', name:'Harbour', x:115, y:360, type:'harbour' },
  r: { id:'r', name:'Red Rock', x:315, y:395, type:'rock' },
  g: { id:'g', name:'Spruce Isle', x:285, y:180, type:'tree' },
  b: { id:'b', name:'Beacon', x:680, y:145, type:'lighthouse' },
  w: { id:'w', name:'Watch Hill', x:500, y:305, type:'house' },
  s: { id:'s', name:'Seal Cove', x:740, y:395, type:'seal' },
  n: { id:'n', name:'North Point', x:465, y:100, type:'flag' },
};
const task=(id,from,to,kind,label)=>({id,from,to,kind,label});
const level=(name,subtitle,brief,nodes,edges,tasks,startPhase,limit,par)=>({ name,subtitle,brief,nodes:nodes.map(id=>N[id]),edges:edges.map(([a,b,height])=>({a,b,height})),tasks,startPhase,limit,par,start:'h' });
export const LEVELS = [
  level('The first lantern','01 · A small beginning','The beacon keeper needs a fresh lantern. Carry it from Harbour to Beacon, then come home. Every crossing or wait advances the tide.', ['h','g','b'], [['h','g',1],['g','b',2]], [task('lantern','h','b','supply','Fresh lantern')],0,10,6),
  level('A way back','02 · Two errands, one tide','Take a food parcel to Watch Hill. A walker at Red Rock is waiting for a lift home. The low shortcut is tempting, but the high path stays open longer.', ['h','r','g','w'], [['h','r',0],['h','g',2],['r','w',1],['g','w',2]], [task('food','h','w','supply','Food parcel'),task('walker','r','h','visitor','Stranded walker')],5,11,6),
  level('The northern light','03 · Read the water','Collect a replacement lens at North Point and deliver it to Beacon. The bridge between the two stays above the tide. Bring a visitor at Spruce Isle home, too.', ['h','g','n','b','w'], [['h','g',1],['g','n',1],['n','b',3],['b','w',2],['w','h',2],['g','w',0]], [task('lens','n','b','supply','Beacon lens'),task('visitor','g','h','visitor','Island visitor')],2,14,9),
  level('Seal Cove supper','04 · Follow the long shore','Deliver supper to Seal Cove and collect the surveyor at North Point. You can carry both. Finish the round back at Harbour before your shift ends.', ['h','r','g','n','w','s'], [['h','r',1],['h','g',0],['g','n',1],['n','w',2],['w','s',1],['s','r',2],['r','w',0]], [task('supper','h','s','supply','Warm supper'),task('surveyor','n','h','visitor','Coast surveyor')],0,14,8),
  level('Before the fog','05 · Three deliveries','Carry the beacon oil, collect a chart at Watch Hill for North Point, and bring the birdwatcher back from Seal Cove. Plan a full circuit while the paths are clear.', ['h','r','g','n','b','w','s'], [['h','r',1],['h','g',2],['g','n',0],['n','b',3],['b','s',1],['s','r',2],['r','w',0],['w','g',1],['w','b',2]], [task('oil','h','b','supply','Beacon oil'),task('chart','w','n','supply','Survey chart'),task('birdwatcher','s','h','visitor','Birdwatcher')],4,16,10),
  level('Keeper of the bay','06 · The whole archipelago','One final round: a radio to Watch Hill, a lens from Red Rock to Beacon, a parcel from North Point to Seal Cove, and a visitor home. Keep an eye on tomorrow’s water.', ['h','r','g','n','b','w','s'], [['h','r',0],['h','g',1],['g','n',2],['n','b',1],['b','s',2],['s','r',1],['r','w',2],['w','g',0],['w','b',3]], [task('radio','h','w','supply','Weather radio'),task('lens','r','b','supply','Spare lens'),task('parcel','n','s','supply','Research parcel'),task('visitor','g','h','visitor','Returning visitor')],1,19,12),
];
export function settle(level,state) {
  const cargo=state.cargo.map((status,i)=>status===1&&level.tasks[i].to===state.at?2:status);
  for(let i=0;i<cargo.length;i++) if(cargo[i]===0&&level.tasks[i].from===state.at) cargo[i]=1;
  const complete=cargo.every(v=>v===2)&&state.at===level.start;
  return {...state,cargo,status:complete?'won':state.turn>=level.limit?'lost':'playing'};
}
export function initialState(level) {return settle(level,{at:level.start,phase:level.startPhase,turn:0,cargo:level.tasks.map(()=>0),status:'playing'});}
export function connections(level,state) {return level.edges.filter(e=>e.a===state.at||e.b===state.at).map(e=>({...e,to:e.a===state.at?e.b:e.a,open:TIDES[state.phase].height<=e.height}));}
export function move(level,state,action) {
  if(state.status!=='playing')return state;
  if(action!=='wait'&&!connections(level,state).some(e=>e.to===action&&e.open))return state;
  return settle(level,{...state,at:action==='wait'?state.at:action,phase:(state.phase+1)%TIDES.length,turn:state.turn+1,cargo:[...state.cargo]});
}
export function shortestSolution(level,state=initialState(level)) {
  if(state.status==='won')return [];
  const queue=[{state,path:[]}],seen=new Set();
  for(let i=0;i<queue.length;i++) {
    const cur=queue[i];
    const key=[cur.state.at,cur.state.phase,...cur.state.cargo].join(':');
    if(seen.has(key))continue;seen.add(key);
    if(cur.state.status!=='playing')continue;
    for(const action of [...connections(level,cur.state).filter(e=>e.open).map(e=>e.to),'wait']) {
      const next=move(level,cur.state,action),path=[...cur.path,action];
      if(next.status==='won')return path;
      if(next.status==='playing')queue.push({state:next,path});
    }
  }
  return null;
}
export function stars(level,state) {if(state.status!=='won')return 0;return state.turn<=level.par?3:state.turn<=level.par+3?2:1;}
