export type SledMode='demo'|'playing'|'paused'|'won'|'over';
export type Drop={id:number;kind:'crate'|'ice';x:number;y:number;hit:boolean};
export type SledState={mode:SledMode;elapsed:number;x:number;hearts:number;crates:number;invincible:number;nextSpawn:number;serial:number;drops:Drop[]};
export const SLED_SECONDS=45;
export const PLAYER_Y=420;
export function newSled(mode:SledMode='playing'):SledState{return {mode,elapsed:0,x:480,hearts:3,crates:0,invincible:0,nextSpawn:.1,serial:0,drops:[]};}
export function pauseSled(s:SledState):SledState{return s.mode==='playing'?{...s,mode:'paused'}:s;}
export function resumeSled(s:SledState):SledState{return s.mode==='paused'?{...s,mode:'playing'}:s;}
export function tickSled(previous:SledState,delta:number,steer:number=0,target:number|null=null):SledState{
 if(previous.mode!=='playing'&&previous.mode!=='demo')return previous;
 const dt=Math.max(0,Math.min(.05,Number.isFinite(delta)?delta:0));const s={...previous,drops:previous.drops.map(o=>({...o}))};
 s.elapsed+=dt;s.invincible=Math.max(0,s.invincible-dt);
 let desired=target;
 if(s.mode==='demo'){const prize=s.drops.find(o=>o.kind==='crate'&&!o.hit&&o.y>160);desired=prize?.x??480+Math.sin(s.elapsed*.8)*150;const danger=s.drops.find(o=>o.kind==='ice'&&!o.hit&&o.y>220&&o.y<465);if(danger)desired=s.x<danger.x?Math.min(s.x,danger.x-110):Math.max(s.x,danger.x+110);}
 if(desired!==null){const safe=Number.isFinite(desired)?desired:s.x;s.x+=Math.max(-460*dt,Math.min(460*dt,safe-s.x));}
 else s.x+=Math.max(-1,Math.min(1,steer))*430*dt;
 s.x=Math.max(95,Math.min(865,s.x));
 while(s.elapsed>=s.nextSpawn){const lanes=[230,480,730,350,610];const kind=s.serial%3===2?'ice':'crate';s.drops.push({id:s.serial,kind,x:lanes[(s.serial*3)%lanes.length],y:-45,hit:false});s.serial++;s.nextSpawn+=1.12;}
 for(const o of s.drops){o.y+=(164+s.elapsed*1.2)*dt;if(o.hit)continue;if(Math.abs(o.y-PLAYER_Y)<35&&Math.abs(o.x-s.x)<(o.kind==='ice'?48:43)){o.hit=true;if(o.kind==='crate')s.crates++;else if(s.invincible===0){if(s.mode==='playing')s.hearts--;s.invincible=1.15;}}}
 s.drops=s.drops.filter(o=>o.y<600);
 if(s.mode==='playing'&&s.hearts<=0)s.mode='over';else if(s.mode==='playing'&&s.elapsed>=SLED_SECONDS){s.elapsed=SLED_SECONDS;s.mode='won';}
 if(s.mode==='demo'&&s.elapsed>SLED_SECONDS)return newSled('demo');return s;
}
