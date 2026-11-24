export const ROUND_SECONDS=45;
export const STAGES=[{name:'Scenic falls',goal:24,width:.105,color:'#53d4dc',icon:'≋'},{name:'Riverside garden',goal:28,width:.085,color:'#b2e879',icon:'✿'},{name:'Power station',goal:32,width:.07,color:'#ffd46f',icon:'ϟ'}] as const;
export type Mode='demo'|'playing'|'paused'|'won'|'finished';
export type WaterState={mode:Mode;time:number;stageTime:number;stage:number;x:number;aim:number;axis:number;fill:number;collected:number;spilled:number;completed:number;score:number;flash:number};
export const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
export function fresh(mode:Mode='demo'):WaterState{return{mode,time:0,stageTime:0,stage:0,x:.5,aim:.5,axis:0,fill:0,collected:0,spilled:0,completed:0,score:0,flash:0};}
export const begin=()=>fresh('playing');
export function pause(s:WaterState):WaterState{return s.mode==='playing'?{...s,mode:'paused',axis:0}:s;}
export function resume(s:WaterState):WaterState{return s.mode==='paused'?{...s,mode:'playing',axis:0}:s;}
export function aim(s:WaterState,x:number):WaterState{return Number.isFinite(x)?{...s,aim:clamp(x,.12,.88),axis:0}:s;}
export function steer(s:WaterState,axis:number):WaterState{return{...s,axis:clamp(axis,-1,1),aim:s.x};}
export function basin(s:WaterState):number{return .5+Math.sin(s.stageTime*(.65+s.stage*.1))*(.20+s.stage*.055);}
export function inGlow(s:WaterState):boolean{return Math.abs(s.x-basin(s))<=STAGES[s.stage].width;}
export function tick(s:WaterState,seconds:number):WaterState{
 if(!['playing','demo'].includes(s.mode)||!Number.isFinite(seconds)||seconds<=0)return s;
 const dt=Math.min(seconds,.05),n={...s,time:s.time+dt,stageTime:s.stageTime+dt,flash:Math.max(0,s.flash-dt)};
 if(n.mode==='demo')n.aim=basin(n);
 const vx=n.axis?n.axis*.63:clamp((n.aim-n.x)*10,-1,1);n.x=clamp(n.x+vx*dt,.12,.88);
 const water=6*dt,hit=inGlow(n),used=hit?Math.min(water,STAGES[n.stage].goal-n.fill):0;
 n.fill+=used;n.collected+=used;n.spilled+=water-used;n.score=Math.floor(n.collected*10);
 if(n.fill>=STAGES[n.stage].goal-1e-8){
  n.completed++;n.flash=.7;
  if(n.stage===2){if(n.mode==='demo')return fresh();n.mode='won';n.score+=Math.ceil(ROUND_SECONDS-n.time)*10;n.axis=0;return n;}
  n.stage++;n.stageTime=0;n.fill=0;
 }
 if(n.mode==='playing'&&n.time>=ROUND_SECONDS){n.time=ROUND_SECONDS;n.mode='finished';n.axis=0;}
 return n;
}
