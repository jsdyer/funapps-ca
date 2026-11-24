export type RunMode = 'demo' | 'playing' | 'paused' | 'won' | 'over';
export type TrailObject = { id:number; kind:'rock'|'postcard'; x:number; y:number; hit:boolean };
export type RunState = { mode:RunMode; elapsed:number; distance:number; y:number; vy:number; hearts:number; cards:number; invincible:number; nextSpawn:number; serial:number; objects:TrailObject[] };
export const RUN_SECONDS=48;
export const GROUND=374;
export function newRun(mode:RunMode='playing'):RunState { return {mode,elapsed:0,distance:0,y:GROUND,vy:0,hearts:3,cards:0,invincible:0,nextSpawn:.3,serial:0,objects:[]}; }
export function jump(s:RunState):RunState { return (s.mode==='playing'||s.mode==='demo')&&s.y>=GROUND-.1 ? {...s,vy:-650} : s; }
export function pauseRun(s:RunState):RunState { return s.mode==='playing'?{...s,mode:'paused'}:s; }
export function resumeRun(s:RunState):RunState { return s.mode==='paused'?{...s,mode:'playing'}:s; }
export function tickRun(previous:RunState,delta:number):RunState {
  if(previous.mode!=='playing'&&previous.mode!=='demo') return previous;
  const dt=Math.max(0,Math.min(.05,Number.isFinite(delta)?delta:0));
  let s={...previous,objects:previous.objects.map(o=>({...o}))};
  const speed=230+Math.min(s.elapsed,48)*.7;
  if(s.mode==='demo'&&s.objects.some(o=>o.kind==='rock'&&o.x>152&&o.x<260&&!o.hit))s=jump(s);
  s.elapsed+=dt;s.distance+=speed*dt;s.invincible=Math.max(0,s.invincible-dt);
  s.vy+=1760*dt;s.y=Math.min(GROUND,s.y+s.vy*dt);if(s.y===GROUND)s.vy=0;
  while(s.elapsed>=s.nextSpawn){const kind=s.serial%3===1?'rock':'postcard';s.objects.push({id:s.serial++,kind,x:1030,y:kind==='rock'?GROUND-12:GROUND-(s.serial%3===1?30:88),hit:false});s.nextSpawn+=kind==='rock'?1.35:1.75;}
  for(const o of s.objects){o.x-=speed*dt;if(o.hit)continue;
    const close=Math.abs(o.x-164)<(o.kind==='rock'?28:34);
    if(close&&o.kind==='postcard'&&Math.abs(o.y-(s.y-31))<39){o.hit=true;s.cards++;}
    if(close&&o.kind==='rock'&&s.y>GROUND-39&&s.invincible===0){o.hit=true;if(s.mode==='playing')s.hearts--;s.invincible=1.25;}
  }
  s.objects=s.objects.filter(o=>o.x>-60);
  if(s.mode==='playing'&&s.hearts<=0)s.mode='over';
  else if(s.mode==='playing'&&s.elapsed>=RUN_SECONDS){s.elapsed=RUN_SECONDS;s.mode='won';}
  if(s.mode==='demo'&&s.elapsed>RUN_SECONDS)return newRun('demo');
  return s;
}
