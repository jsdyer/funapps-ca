export const ROUND_SECONDS=50;
export const PLAYER_Y=.79;
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function fresh(mode='demo') {return {mode,time:0,x:.5,target:.5,axis:0,objects:[],spawn:0,serial:0,mail:0,bumps:0,missed:0,score:0,invulnerable:0,flash:0};}
export function begin(){return fresh('playing');}
export function pause(s){return s.mode==='playing'?{...s,mode:'paused',axis:0}:s;}
export function resume(s){return s.mode==='paused'?{...s,mode:'playing',axis:0}:s;}
export function target(s,x){return Number.isFinite(x)?{...s,target:clamp(x,.12,.88),axis:0}:s;}
export function steer(s,axis){return {...s,axis:clamp(axis,-1,1),target:s.x};}
export function windAt(time){return Math.sin(time*.6)*.045+Math.sin(time*1.37)*.018;}
export function stars(s){return s.mail>=24?3:s.mail>=14?2:1;}
export function tick(s,elapsed){
 if(!['playing','demo'].includes(s.mode)||!Number.isFinite(elapsed)||elapsed<=0)return s;
 const dt=Math.min(elapsed,.05),n={...s,objects:s.objects.map(o=>({...o})),time:s.time+dt,invulnerable:Math.max(0,s.invulnerable-dt),flash:Math.max(0,s.flash-dt)};
 if(n.mode==='demo'){
  const next=n.objects.filter(o=>o.kind==='mail'&&o.y<PLAYER_Y).sort((a,b)=>b.y-a.y)[0];
  n.target=next?.x??.5;
 }
 const motion=n.axis?n.axis*.65:clamp((n.target-n.x)*8,-.7,.7);
 n.x=clamp(n.x+(motion+windAt(n.time))*dt,.12,.88);
 n.spawn-=dt;
 if(n.spawn<=0){
  const id=n.serial++,lane=[.5,.34,.67,.5,.76,.24,.5,.66,.35][id%9];
  n.objects.push({id,kind:'mail',x:lane,y:id===0?.48:.16,speed:.27+(n.time/ROUND_SECONDS)*.08});
  if(id%3===2)n.objects.push({id:1000+id,kind:'bale',x:lane>.5?.25:.75,y:.12,speed:.30+(n.time/ROUND_SECONDS)*.06});
  n.spawn=.8;
 }
 const remaining=[];
 for(const o of n.objects){
  const oldY=o.y;o.y+=o.speed*dt;
  const crossing=oldY<PLAYER_Y+.035&&o.y>=PLAYER_Y-.04;
  const hit=crossing&&Math.abs(o.x-n.x)<(o.kind==='mail'?.064:.067);
  if(hit&&o.kind==='mail'){n.mail++;n.score+=100;n.flash=.25;continue;}
  if(hit&&o.kind==='bale'&&!n.invulnerable){n.bumps++;n.score=Math.max(0,n.score-75);n.invulnerable=1.2;continue;}
  if(o.y>1.07){if(o.kind==='mail')n.missed++;continue;}remaining.push(o);
 }
 n.objects=remaining;
 if(n.mode==='playing'&&n.time>=ROUND_SECONDS){n.mode='finished';n.time=ROUND_SECONDS;n.axis=0;}
 if(n.mode==='demo'&&n.time>18)return fresh();
 return n;
}
