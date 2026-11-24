export type HarvestStatus='ready'|'playing'|'paused'|'finished';
export type Pop={kind:'potato'|'rock';life:number;duration:number;id:number};
export type HarvestState={status:HarvestStatus;remaining:number;score:number;harvested:number;rocks:number;missed:number;combo:number;plots:(Pop|null)[];spawnIn:number;nextId:number;feedback:string;lastPlot:number;lastGood:boolean};
export const ROUND_SECONDS=45;
export function initialHarvest():HarvestState {
  const plots:(Pop|null)[]=Array(9).fill(null);
  plots[0]={kind:'potato',life:3,duration:3,id:1};plots[4]={kind:'potato',life:3.8,duration:3.8,id:2};plots[8]={kind:'rock',life:4.2,duration:4.2,id:3};
  return{status:'ready',remaining:ROUND_SECONDS,score:0,harvested:0,rocks:0,missed:0,combo:0,plots,spawnIn:.6,nextId:4,feedback:'Tap potatoes. Leave the rocks.',lastPlot:-1,lastGood:false};
}
export function startHarvest():HarvestState{return {...initialHarvest(),status:'playing',feedback:'Bring in the harvest!'};}
export function pauseHarvest(s:HarvestState):HarvestState{return s.status==='playing'?{...s,status:'paused'}:s;}
export function resumeHarvest(s:HarvestState):HarvestState{return s.status==='paused'?{...s,status:'playing'}:s;}
export function pickHarvest(s:HarvestState,index:number):HarvestState{
  if(s.status!=='playing'||!Number.isInteger(index)||index<0||index>8||!s.plots[index])return s;
  const item=s.plots[index]!;const plots=s.plots.map((p,i)=>i===index?null:p);
  if(item.kind==='rock')return{...s,plots,rocks:s.rocks+1,combo:0,score:Math.max(0,s.score-10),lastPlot:index,lastGood:false,feedback:'Just a rock! Look for the golden potatoes.'};
  const combo=s.combo+1,points=10+Math.min(10,Math.floor(combo/5)*2);
  return{...s,plots,harvested:s.harvested+1,score:s.score+points,combo,lastPlot:index,lastGood:true,feedback:combo%5===0?`${combo} in a row! +${points}`:`Fresh from the red soil! +${points}`};
}
export function tickHarvest(s:HarvestState,dt:number,random:number=Math.random(),kindRandom:number=Math.random()):HarvestState{
  if(s.status!=='playing'||!Number.isFinite(dt)||dt<=0)return s;
  const elapsed=Math.min(dt,.1,s.remaining),remaining=Math.max(0,s.remaining-elapsed);
  if(remaining<=1e-8)return {...s,remaining:0,status:'finished',feedback:'A fine Island harvest!'};
  let missed=0;
  const plots=s.plots.map(p=>{if(!p)return null;if(p.life<=elapsed){if(p.kind==='potato')missed++;return null;}return{...p,life:p.life-elapsed}});
  let spawnIn=s.spawnIn-elapsed,nextId=s.nextId;
  const open=plots.map((p,i)=>p===null?i:-1).filter(i=>i>=0);
  if(spawnIn<=0&&open.length){
    const r=Math.min(.99999,Math.max(0,Number.isFinite(random)?random:.5));
    const index=open[Math.floor(r*open.length)],kind=kindRandom<.18?'rock':'potato';
    const duration=3.1-(ROUND_SECONDS-remaining)/70;
    plots[index]={kind,life:duration,duration,id:nextId++};
    spawnIn=Math.max(.43,.75-(ROUND_SECONDS-remaining)/150);
  }
  return {...s,plots,remaining,spawnIn,nextId,missed:s.missed+missed,combo:missed?0:s.combo};
}
