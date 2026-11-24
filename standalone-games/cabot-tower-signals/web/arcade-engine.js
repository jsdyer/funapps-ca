export const ROUND_SECONDS = 40;
export const DOT_HOLD = 2.2;
export const FIELD = {width: 960, height: 610, minX: 90, maxX: 880, minY: 85, maxY: 390};
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function newReception(){return {phase:'ready',elapsed:0,x:480,y:230,dots:0,charge:0,combo:0,score:0};}
export function startReception(){return {...newReception(),phase:'playing'};}
export function togglePause(s){return s.phase==='playing'?{...s,phase:'paused'}:s.phase==='paused'?{...s,phase:'playing'}:s;}
export function signalTarget(s){const bases=[[535,185],[695,270],[345,190]], b=bases[Math.min(s.dots,2)];return {x:b[0]+Math.sin(s.elapsed*.65+s.dots)*43,y:b[1]+Math.cos(s.elapsed*.9+s.dots)*26,radius:94};}
export function stepReception(state,dt,input={}){
 if(state.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return state;
 dt=Math.min(dt,.05);
 const s={...state,elapsed:Math.min(ROUND_SECONDS,state.elapsed+dt)};
 const wind=Math.sin(s.elapsed*1.3)*16;
 if(input.target&&Number.isFinite(input.target.x)&&Number.isFinite(input.target.y)){
  const dx=input.target.x-s.x,dy=input.target.y-s.y,d=Math.hypot(dx,dy),step=Math.min(d,800*dt);
  if(d){s.x+=dx/d*step;s.y+=dy/d*step;}
 }else {s.x+=(clamp(Number(input.dx)||0,-1,1)*360+wind)*dt;s.y+=(clamp(Number(input.dy)||0,-1,1)*320+Math.cos(s.elapsed)*8)*dt;}
 s.x=clamp(s.x,FIELD.minX,FIELD.maxX);s.y=clamp(s.y,FIELD.minY,FIELD.maxY);
 const target=signalTarget(s),locked=Math.hypot(s.x-target.x,s.y-target.y)<=target.radius;
 s.charge=clamp(s.charge+dt*(locked?1:-.45),0,DOT_HOLD);s.combo=locked?s.combo+dt:0;
 if(s.charge>=DOT_HOLD){s.dots++;s.charge=0;s.score+=100;if(s.dots===3){s.phase='won';s.score+=Math.round((ROUND_SECONDS-s.elapsed)*10);}}
 if(s.elapsed>=ROUND_SECONDS&&s.phase==='playing')s.phase='ended';
 return s;
}
