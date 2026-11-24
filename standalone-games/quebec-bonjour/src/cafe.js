import Alpine from 'alpinejs';
import {FOODS,initialCafe,startCafe,pauseCafe,resumeCafe,serveCafe,tickCafe} from './cafe-engine.mjs';
Alpine.data('cafe',()=>({
  state:initialCafe(),foods:FOODS,best:0,frame:0,last:0,beat:0,
  init(){
    try{this.best=Math.max(0,Number(localStorage.getItem('funapps-bonjour-cafe-best'))||0)}catch{}
    this.onKey=e=>{if(e.ctrlKey||e.metaKey||e.altKey||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return; if(['1','2','3'].includes(e.key)&&!e.repeat){e.preventDefault();this.serve(FOODS[Number(e.key)-1].id)}else if((e.key==='p'||e.key==='Escape')&&!e.repeat){e.preventDefault();this.pause()}else if(e.code==='Space'&&!['BUTTON','A'].includes(e.target?.tagName)){e.preventDefault();if(this.state.status==='ready'||this.state.status==='finished')this.begin();else this.pause()}};
    this.onHidden=()=>{if(document.hidden)this.autoPause()};this.onBlur=()=>this.autoPause();
    window.addEventListener('keydown',this.onKey);window.addEventListener('blur',this.onBlur);document.addEventListener('visibilitychange',this.onHidden);
    const frame=t=>{const dt=this.last?Math.min((t-this.last)/1000,.1):0;this.last=t;const old=this.state.status;this.state=tickCafe(this.state,dt,Math.random());if(old==='playing'&&this.state.status==='finished'){this.best=Math.max(this.best,this.state.score);try{localStorage.setItem('funapps-bonjour-cafe-best',String(this.best))}catch{}}this.frame=requestAnimationFrame(frame)};this.frame=requestAnimationFrame(frame);
  },
  destroy(){cancelAnimationFrame(this.frame);window.removeEventListener('keydown',this.onKey);window.removeEventListener('blur',this.onBlur);document.removeEventListener('visibilitychange',this.onHidden)},
  begin(){this.state=startCafe();this.last=0},
  serve(food){if(this.state.status==='ready')this.begin();this.state=serveCafe(this.state,food);this.beat++},
  pause(){this.state=this.state.status==='paused'?resumeCafe(this.state):pauseCafe(this.state);this.last=0},
  autoPause(){this.state=pauseCafe(this.state);this.last=0},
  food(id){return FOODS.find(f=>f.id===id)},
  get time(){return Math.ceil(this.state.remaining)},
  get banner(){return this.state.status==='ready'?'A café full of bonjours.':this.state.status==='paused'?'Taking a little break.':this.state.status==='finished'?'Merci, neighbour!':''}
}));
Alpine.start();
