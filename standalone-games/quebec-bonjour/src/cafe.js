import Alpine from 'alpinejs';
import {MENU,REQUESTS,optionsFor,initialVisit,beginVisit,choosePhrase,tickVisit,pauseVisit,resumeVisit} from './cafe-engine.mjs';
Alpine.data('cafe',()=>({
  state:initialVisit(),menu:MENU,requests:REQUESTS,english:false,phrasebook:false,frame:0,last:0,visits:0,
  init(){
    try{this.visits=Math.max(0,Number(localStorage.getItem('funapps-bonjour-restaurant-visits'))||0)}catch{}
    this.onKey=e=>{if(e.ctrlKey||e.metaKey||e.altKey||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;if(['1','2','3'].includes(e.key)&&!e.repeat){e.preventDefault();this.choose(Number(e.key)-1)}else if((e.key.toLowerCase()==='p'||e.key==='Escape')&&!e.repeat){e.preventDefault();this.pause()}else if(e.code==='Space'&&!['BUTTON','A'].includes(e.target?.tagName)){e.preventDefault();if(e.repeat)return;if(this.state.status==='ready'||this.state.status==='finished')this.begin();else this.pause()}};
    this.onHidden=()=>{if(document.hidden)this.autoPause()};this.onBlur=()=>this.autoPause();
    window.addEventListener('keydown',this.onKey);window.addEventListener('blur',this.onBlur);document.addEventListener('visibilitychange',this.onHidden);
    const frame=t=>{const dt=this.last?Math.min((t-this.last)/1000,.1):0;this.last=t;const old=this.state.status;this.state=tickVisit(this.state,dt);if(old==='playing'&&this.state.status==='finished'){this.visits++;try{localStorage.setItem('funapps-bonjour-restaurant-visits',String(this.visits))}catch{}}this.frame=requestAnimationFrame(frame)};this.frame=requestAnimationFrame(frame);
  },
  destroy(){cancelAnimationFrame(this.frame);window.removeEventListener('keydown',this.onKey);window.removeEventListener('blur',this.onBlur);document.removeEventListener('visibilitychange',this.onHidden)},
  begin(){this.state=beginVisit();this.last=0;this.english=false;this.phrasebook=false},
  choose(index){if(this.state.status==='ready')this.begin();const option=this.options[index];if(option)this.state=choosePhrase(this.state,option.id)},
  pause(){this.state=this.state.status==='paused'?resumeVisit(this.state):pauseVisit(this.state);this.last=0},
  autoPause(){this.state=pauseVisit(this.state);this.last=0},
  get request(){return REQUESTS[this.state.step]},get wanted(){return MENU[this.request.item]},get options(){return optionsFor(this.state.step)},
  get helpVisible(){return this.state.step<2||this.english},get learning(){return this.state.ordered.map((id,index)=>({id,fr:optionsFor(index).find(o=>o.id===id).fr,en:optionsFor(index).find(o=>o.id===id).en}))}
}));
Alpine.start();
