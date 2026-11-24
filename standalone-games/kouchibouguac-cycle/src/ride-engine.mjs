export const DURATION=50;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function newRide(){return {status:'ready',elapsed:0,x:0,photos:0,hits:0,score:0,objects:[],spawn:0.65,serial:0,invulnerable:0,event:'',eventTime:0};}
export function startRide(){return {...newRide(),status:'playing'};}
export function pauseRide(s){if(s.status==='playing')s.status='paused';}
export function resumeRide(s){if(s.status==='paused')s.status='playing';}
export function advanceRide(s,input,seconds){
 if(s.status!=='playing'||!Number.isFinite(seconds)||seconds<=0)return;
 let remaining=Math.min(seconds,.25);
 while(remaining>0&&s.status==='playing'){const dt=Math.min(remaining,1/60);remaining-=dt;tick(s,input,dt);}
}
function tick(s,input,dt){
 s.elapsed=Math.min(DURATION,s.elapsed+dt);s.invulnerable=Math.max(0,s.invulnerable-dt);s.eventTime=Math.max(0,s.eventTime-dt);
 const steer=(Number(!!input.right)-Number(!!input.left));
 if(steer)s.x=clamp(s.x+steer*1.8*dt,-1,1);else if(Number.isFinite(input.target))s.x+=clamp(input.target-s.x,-2.6*dt,2.6*dt);
 s.spawn-=dt;
 if(s.spawn<=0){const i=s.serial++,photo=i%3!==2;const lane=[0,-.72,.72,0,.72,-.72,-.72,0,.72][i%9];s.objects.push({id:i,kind:photo?'photo':'log',x:lane,y:-.1,taken:false});s.spawn+=1.15;}
 for(const o of s.objects){const before=o.y;o.y+=dt*(.34+s.elapsed*.0013);if(before<.76&&o.y>=.76&&!o.taken){o.taken=true;if(Math.abs(s.x-o.x)<.31){if(o.kind==='photo'){s.photos++;s.score+=100;s.event='Photo collected!';s.eventTime=1;}else if(!s.invulnerable){s.hits++;s.invulnerable=1.8;s.event='Bump! Keep riding';s.eventTime=1.2;}}}}
 s.objects=s.objects.filter(o=>o.y<1.2);
 if(s.elapsed>=DURATION){s.status='finished';s.score+=Math.max(0,3-s.hits)*100;}
}
