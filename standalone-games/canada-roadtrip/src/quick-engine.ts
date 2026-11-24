export const views = [
 {name:'Pacific sunset',region:'British Columbia',kind:'coast'},
 {name:'Mountain morning',region:'The Rockies',kind:'mountain'},
 {name:'Prairie grain elevator',region:'Saskatchewan',kind:'prairie'},
 {name:'Big-sky bison',region:'Manitoba',kind:'bison'},
 {name:'Lake Superior',region:'Ontario',kind:'lake'},
 {name:'The city skyline',region:'Ontario',kind:'city'},
 {name:'Riverside village',region:'Québec',kind:'village'},
 {name:'Covered bridge',region:'New Brunswick',kind:'bridge'},
 {name:'Harbour lighthouse',region:'Nova Scotia',kind:'lighthouse'},
 {name:'Colourful harbour',region:'Newfoundland',kind:'village'},
] as const;
export const duration=48;
export type QuickState={phase:'demo'|'playing'|'paused'|'done';time:number;score:number;cards:number[];cooldown:number;flash:number;message:string};
export function fresh(phase:QuickState['phase']='demo'):QuickState{return {phase,time:0,score:0,cards:[],cooldown:0,flash:0,message:'Tap SNAP when a view reaches the frame.'};}
export function viewX(index:number,time:number){return 1100-(time-index*4.3+1.2)*175;}
export function inFrame(s:QuickState){return views.map((_,i)=>i).find(i=>!s.cards.includes(i)&&Math.abs(viewX(i,s.time)-500)<=92);}
export function advance(s:QuickState,dt:number):QuickState{
 if(s.phase!=='playing'&&s.phase!=='demo'||!Number.isFinite(dt)||dt<=0)return s;
 const step=Math.min(dt,.1),time=s.time+step;
 if(s.phase==='demo')return {...s,time:time%duration};
 return {...s,time:Math.min(duration,time),cooldown:Math.max(0,s.cooldown-step),flash:Math.max(0,s.flash-step),phase:time>=duration?'done':'playing'};
}
export function snap(s:QuickState):QuickState{
 if(s.phase!=='playing'||s.cooldown>0)return s;
 const i=inFrame(s);
 if(i===undefined)return {...s,cooldown:.25,flash:.12,message:'Wait for the next view to enter the frame.'};
 const points=Math.round(200-Math.abs(viewX(i,s.time)-500));
 return {...s,cards:[...s.cards,i],score:s.score+points,cooldown:.3,flash:.2,message:`${views[i].name} captured! +${points}`};
}
export function pause(s:QuickState):QuickState{return s.phase==='playing'?{...s,phase:'paused'}:s;}
export function resume(s:QuickState):QuickState{return s.phase==='paused'?{...s,phase:'playing'}:s;}
