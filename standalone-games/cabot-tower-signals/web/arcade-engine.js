export const ROUND_SECONDS = 40;
export const DOT_HOLD = 2.2;
export const DOT_BASE = 100;
export const PRECISION_BONUS = 400;
export const FIELD = {width: 960, height: 610, minX: 90, maxX: 880, minY: 85, maxY: 390};
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function newReception(){return {phase:'ready',elapsed:0,x:480,y:230,dots:0,charge:0,precision:0,precisionSum:0,combo:0,score:0,lastDotScore:0,timeBonus:0};}
export function startReception(){return {...newReception(),phase:'playing'};}
export function togglePause(s){return s.phase==='playing'?{...s,phase:'paused'}:s.phase==='paused'?{...s,phase:'playing'}:s;}
export function signalTarget(s){const bases=[[535,185],[695,270],[345,190]], b=bases[Math.min(s.dots,2)];return {x:b[0]+Math.sin(s.elapsed*.65+s.dots)*43,y:b[1]+Math.cos(s.elapsed*.9+s.dots)*26,radius:94};}
export function signalQuality(s){const t=signalTarget(s);return clamp(1-Math.hypot(s.x-t.x,s.y-t.y)/t.radius,0,1);}
export function liveScore(s){if(s.phase==='won'||s.phase==='ended')return s.score;return s.score+Math.floor((DOT_BASE*s.charge+PRECISION_BONUS*s.precision)/DOT_HOLD);}
export function receptionAccuracy(s){return s.dots?Math.round(s.precisionSum/s.dots*100):0;}
export function stepReception(state,dt,input={}){
 if(state.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return state;
 dt=Math.min(dt,.05,ROUND_SECONDS-state.elapsed);
 const s={...state,elapsed:Math.min(ROUND_SECONDS,state.elapsed+dt)};
 const wind=Math.sin(s.elapsed*1.3)*16;
 if(input.target&&Number.isFinite(input.target.x)&&Number.isFinite(input.target.y)){
  const dx=input.target.x-s.x,dy=input.target.y-s.y,d=Math.hypot(dx,dy),step=Math.min(d,800*dt);
  if(d){s.x+=dx/d*step;s.y+=dy/d*step;}
 }else {s.x+=(clamp(Number(input.dx)||0,-1,1)*360+wind)*dt;s.y+=(clamp(Number(input.dy)||0,-1,1)*320+Math.cos(s.elapsed)*8)*dt;}
 s.x=clamp(s.x,FIELD.minX,FIELD.maxX);s.y=clamp(s.y,FIELD.minY,FIELD.maxY);
 const target=signalTarget(s),locked=Math.hypot(s.x-target.x,s.y-target.y)<=target.radius;
 if(locked){
  // Score only the progress retained in this dot, never repeated time in the glow.
  const gained=Math.min(dt,DOT_HOLD-s.charge);
  s.charge+=gained;s.precision+=signalQuality(s)*gained;s.combo+=dt;
 }else{
  const before=s.charge;s.charge=Math.max(0,before-dt*.45);
  s.precision=before?s.precision*s.charge/before:0;s.combo=0;
 }
 if(s.charge>=DOT_HOLD-1e-9){
  const accuracy=clamp(s.precision/DOT_HOLD,0,1);
  s.lastDotScore=DOT_BASE+Math.round(PRECISION_BONUS*accuracy);s.score+=s.lastDotScore;s.precisionSum+=accuracy;
  s.dots++;s.charge=0;s.precision=0;
  if(s.dots===3){s.phase='won';s.timeBonus=Math.round((ROUND_SECONDS-s.elapsed)*10);s.score+=s.timeBonus;}
 }
 if(s.elapsed>=ROUND_SECONDS&&s.phase==='playing')s.phase='ended';
 return s;
}
