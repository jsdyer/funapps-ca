export const TOUR_SECONDS=55;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const PLACES=['Ingonish','Neils Harbour','Pleasant Bay','Chéticamp'];
export function newDrive(){return{status:'ready',elapsed:0,z:0,x:0,speed:45,daylight:55,objects:[],serial:0,spawn:.7,photos:0,bumps:0,score:0,invulnerable:0,event:'',eventTime:0};}
export function startDrive(){return{...newDrive(),status:'driving'};}
export function pauseDrive(s){if(s.status==='driving')s.status='paused';}
export function resumeDrive(s){if(s.status==='paused')s.status='driving';}
export function driveStep(s,input,seconds){if(s.status!=='driving'||!Number.isFinite(seconds)||seconds<=0)return;let left=Math.min(seconds,.25);while(left>0&&s.status==='driving'){const dt=Math.min(left,1/60);left-=dt;tick(s,input,dt);}}
function tick(s,input,dt){s.elapsed=Math.min(TOUR_SECONDS,s.elapsed+dt);s.daylight=TOUR_SECONDS-s.elapsed;s.speed+=clamp((input.brake?25:55)-s.speed,-70*dt,32*dt);s.z+=s.speed*dt*3.5;s.eventTime=Math.max(0,s.eventTime-dt);s.invulnerable=Math.max(0,s.invulnerable-dt);const direction=Number(!!input.right)-Number(!!input.left);if(direction)s.x+=direction*1.8*dt;else if(Number.isFinite(input.target))s.x+=clamp(input.target-s.x,-2.6*dt,2.6*dt);s.x=clamp(s.x,-1,1);s.spawn-=dt;
 if(s.spawn<=0){const i=s.serial++;s.objects.push({id:i,kind:i%4===3?'rock':'photo',x:[0,-.68,.68,0,.68,0,-.68,.68][i%8],y:0,taken:false});s.spawn+=1.45;}
 for(const o of s.objects){const before=o.y;o.y+=dt*(s.speed/55)*.32;if(before<1&&o.y>=1&&!o.taken){o.taken=true;if(Math.abs(s.x-o.x)<.30){if(o.kind==='photo'){s.photos++;s.score+=100;s.event='Postcard collected!';s.eventTime=1.1;}else if(s.invulnerable===0){s.bumps++;s.invulnerable=1.5;s.event='Bump! Keep cruising';s.eventTime=1.1;}}}}
 s.objects=s.objects.filter(o=>o.y<1.3);if(s.elapsed>=TOUR_SECONDS){s.status='finished';s.score+=Math.max(0,4-s.bumps)*100;}
}
