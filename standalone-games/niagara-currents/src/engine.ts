export type Dir = 0 | 1 | 2 | 3;
export type Kind = 'straight' | 'bend' | 'split';
export type Tile = {id:number;x:number;y:number;kind:Kind;solution:number;initial:number;fixed:boolean};
export type Goal = {name:string;kind:'falls'|'garden'|'power';cell:number;dir:Dir;need:number};
export type Level = {title:string;note:string;letter:string;width:number;height:number;source:number;water:number;tiles:Tile[];goals:Goal[];par:number};
export const DIRS = [{x:0,y:-1,name:'north'},{x:1,y:0,name:'east'},{x:0,y:1,name:'south'},{x:-1,y:0,name:'west'}];
const BASE:Record<Kind,number[]> = {straight:[0,2],bend:[0,1],split:[0,1,2]};
export const ports=(kind:Kind,rotation:number)=>BASE[kind].map(d=>(d+rotation)%4).sort((a,b)=>a-b);
const equal=(a:number[],b:number[])=>a.length===b.length&&a.every((v,i)=>v===b[i]);
export const correctlyOriented=(tile:Tile,r:number)=>equal(ports(tile.kind,r),ports(tile.kind,tile.solution));
type Point=[number,number];
type Destination={name:string;kind:Goal['kind'];at:Point;need:number};
function make(title:string,note:string,letter:string,width:number,source:Point,paths:Point[][],destinations:Destination[],seed:number):Level{
 const masks=new Map<number,Set<number>>(), id=([x,y]:Point)=>y*width+x;
 const add=(p:Point,d:number)=>{const i=id(p);if(!masks.has(i))masks.set(i,new Set());masks.get(i)!.add(d)};
 add(source,0);
 for(const path of paths)for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];const d=DIRS.findIndex(v=>a[0]+v.x===b[0]&&a[1]+v.y===b[1]);if(d<0)throw Error('Nonadjacent path');add(a,d);add(b,(d+2)%4)}
 for(const g of destinations)add(g.at,2);
 const goals=destinations.map(g=>({...g,cell:id(g.at),dir:2 as Dir}));
 const tiles:Tile[]=[...masks.entries()].sort((a,b)=>a[0]-b[0]).map(([i,mask])=>{
  const want=[...mask].sort((a,b)=>a-b);let kind:Kind='straight',solution=-1;
  for(const k of Object.keys(BASE) as Kind[])for(let r=0;r<4;r++)if(equal(ports(k,r),want)){kind=k;solution=r;break}
  if(solution<0)throw Error('Unsupported channel');
  const fixed=i===id(source)||goals.some(g=>g.cell===i);
  let offset=fixed?0:((i*7+seed*3)%4);
  if(seed===0)offset=(i===5||i===10)?3:0;
  return {id:i,x:i%width,y:Math.floor(i/width),kind,solution,initial:(solution+offset)%4,fixed};
 });
 const par=tiles.reduce((n,t)=>n+(t.fixed?0:[0,1,2,3].find(r=>correctlyOriented(t,(t.initial+r)%4))!),0);
 return {title,note,letter,width,height:width,source:id(source),water:12,tiles,goals,par};
}
export const LEVELS:Level[]=[
 make('A bend in the day','One source, one destination. Follow the open ends from the intake to the falls.','Back home I watch the tide come in. Here, the whole river seems to take a leap.',4,[1,0],[[[1,0],[1,1],[2,1],[2,2],[1,2],[1,3]]],[{name:'Scenic falls',kind:'falls',at:[1,3],need:12}],0),
 make('A little for the garden','A three-way channel divides the incoming flow evenly between its two exits.','The gardens could use a drink too. Twelve little drops ought to go a fair way.',4,[1,0],[[[1,0],[1,1],[0,1],[0,2],[0,3]],[[1,1],[2,1],[2,2],[2,3]]],[{name:'Scenic falls',kind:'falls',at:[0,3],need:6},{name:'Mist garden',kind:'garden',at:[2,3],need:6}],1),
 make('The long way round','Keep the two branches connected. Each destination needs exactly half the flow.','A turbine instead of a fishing boat. Still a good way to put moving water to work.',4,[0,0],[[[0,0],[0,1],[1,1],[2,1],[3,1],[3,2],[3,3]],[[1,1],[1,2],[1,3]]],[{name:'Scenic falls',kind:'falls',at:[3,3],need:6},{name:'Little turbine',kind:'power',at:[1,3],need:6}],2),
 make('Three kinds of current','Split twelve into six and six, then divide one branch again. Watch the target amounts.','One current for the view, one for the flowers, one for the lights. That feels about right.',4,[2,0],[[[2,0],[2,1],[1,1],[0,1],[0,2],[0,3]],[[2,1],[3,1],[3,2],[3,3]],[[3,2],[2,2],[2,3]]],[{name:'Scenic falls',kind:'falls',at:[0,3],need:6},{name:'Mist garden',kind:'garden',at:[2,3],need:3},{name:'Little turbine',kind:'power',at:[3,3],need:3}],3),
 make('Across the limestone','A larger chart with two splitters. The longest route is not always the largest share.','I packed a raincoat for the spray. Never thought I would need it this far from the sea.',5,[2,0],[[[2,0],[2,1],[1,1],[1,2],[0,2],[0,3],[0,4]],[[1,2],[2,2],[3,2],[3,1],[4,1],[4,2],[4,3],[4,4]],[[3,2],[3,3],[2,3],[2,4]]],[{name:'Scenic falls',kind:'falls',at:[0,4],need:6},{name:'Mist garden',kind:'garden',at:[2,4],need:3},{name:'Little turbine',kind:'power',at:[4,4],need:3}],4),
 make('The keeper’s postcard','One final chart. Keep every drop connected and deliver exactly what each destination needs.','Dear home: the falls are grand, the garden is green, and I have finally learned which way is upstream.',5,[0,0],[[[0,0],[0,1],[1,1],[2,1],[2,0],[3,0],[4,0],[4,1],[4,2],[4,3],[4,4]],[[2,1],[2,2],[1,2],[1,3],[1,4]],[[2,2],[3,2],[3,3],[3,4]]],[{name:'Scenic falls',kind:'falls',at:[4,4],need:6},{name:'Mist garden',kind:'garden',at:[1,4],need:3},{name:'Little turbine',kind:'power',at:[3,4],need:3}],5),
];
export const initialBoard=(l:Level)=>Object.fromEntries(l.tiles.map(t=>[t.id,t.initial])) as Record<number,number>;
export function rotate(l:Level,board:Record<number,number>,cell:number){const t=l.tiles.find(t=>t.id===cell);return !t||t.fixed?board:{...board,[cell]:((board[cell]??t.initial)+1)%4};}
export type Flow = {delivered:number[];spill:number;trapped:number;wet:Record<number,number>;leaks:number[];won:boolean;total:number};
export function simulate(l:Level,board:Record<number,number>):Flow{
 const out:Flow={delivered:l.goals.map(()=>0),spill:0,trapped:0,wet:{},leaks:[],won:false,total:l.water};
 const byId=new Map(l.tiles.map(t=>[t.id,t]));
 const leak=(cell:number,amount:number)=>{out.spill+=amount;if(!out.leaks.includes(cell))out.leaks.push(cell)};
 function walk(cell:number,incoming:number,amount:number,visited:Set<string>){
  if(!amount)return;const tile=byId.get(cell);if(!tile){leak(cell,amount);return}
  const r=board[cell];if(!Number.isInteger(r)||r<0||r>3){leak(cell,amount);return}
  const open=ports(tile.kind,r);if(!open.includes(incoming)){leak(cell,amount);return}
  const key=cell+':'+incoming;if(visited.has(key)){out.trapped+=amount;return}
  const nextVisited=new Set(visited).add(key);out.wet[cell]=(out.wet[cell]??0)+amount;
  const exits=open.filter(d=>d!==incoming);if(!exits.length){leak(cell,amount);return}
  exits.forEach((d,i)=>{
   const share=Math.floor(amount/exits.length)+(i<amount%exits.length?1:0);if(!share)return;
   const g=l.goals.findIndex(g=>g.cell===cell&&g.dir===d);if(g>=0){out.delivered[g]+=share;return}
   const nx=tile.x+DIRS[d].x,ny=tile.y+DIRS[d].y;
   if(nx<0||ny<0||nx>=l.width||ny>=l.height){leak(cell,share);return}
   walk(ny*l.width+nx,(d+2)%4,share,nextVisited);
  });
 }
 walk(l.source,0,l.water,new Set());
 out.won=out.spill===0&&out.trapped===0&&out.delivered.every((n,i)=>n===l.goals[i].need);
 return out;
}
export function hint(l:Level,board:Record<number,number>){
 const tile=l.tiles.find(t=>!t.fixed&&!correctlyOriented(t,board[t.id]));
 return tile?{board:{...board,[tile.id]:tile.solution},tile}:null;
}
export const stars=(l:Level,moves:number,hints:number)=>hints===0&&moves<=l.par+3?3:hints<=1&&moves<=l.par+8?2:1;
