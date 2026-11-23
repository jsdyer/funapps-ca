import {LEVELS,TIDES,initialState,connections,move,shortestSolution,stars} from './engine.js';
const ICONS={
 harbour:'<path d="M-28 8h56l-9 12h-35z" fill="#183f3c"/><path d="M-14 7V-13H8V7z" fill="#f9edd0"/><path d="M-19-13 0-24 16-13z" fill="#bd6347"/><path d="M-7-7h7v8h-7z" fill="#477b76"/><path d="M20 6v-24" stroke="#183f3c" stroke-width="3"/>',
 lighthouse:'<path d="M-14 21-9-25H9l5 46z" fill="#fff8df"/><path d="M-13 8h26v10h-26zM-11-11h22v9h-22z" fill="#c55f46"/><path d="M-14-26 0-36l14 10z" fill="#173f3d"/><path d="M-5-24h10v10H-5z" fill="#f6c66e"/><path d="m-18-21-25-7v12zm36 0 25-7v12z" fill="#ffe8a6" opacity=".6"/>',
 tree:'<path d="M0 23V-10m-21 28V-3m40 23V-3" stroke="#7a5c3a" stroke-width="4"/><path d="m-17 6 17-37L17 6zm-17 9 13-29 13 29zm41 2 12-29 13 29z" fill="#215348"/>',
 rock:'<path d="m-29 14 8-24 20-13 23 8 11 29z" fill="#bd7d5c"/><path d="m-21-10 20-13 4 37h-32z" fill="#d9a17d"/><path d="m3-1 13-7 5 15" stroke="#996244" stroke-width="2" fill="none"/>',
 house:'<rect x="-21" y="-8" width="42" height="30" rx="2" fill="#fff4dc"/><path d="m-28-8 28-22 28 22z" fill="#ac6749"/><path d="M-5 7H5v15H-5z" fill="#285d56"/><path d="M-15-1h7v7h-7zm23 0h7v7H8z" fill="#93bdb0"/>',
 seal:'<ellipse cx="0" cy="12" rx="27" ry="12" fill="#536b68"/><ellipse cx="-19" cy="2" rx="12" ry="14" fill="#69827b"/><path d="m20 12 19-8-6 15z" fill="#536b68"/><circle cx="-23" cy="-1" r="2" fill="#183c3a"/><path d="m-27 6-10-1m11 4-10 3" stroke="#183c3a" stroke-width="1.5"/>',
 flag:'<path d="M-3 23v-50" stroke="#244b45" stroke-width="4"/><path d="M-1-27h30l-9 9 9 9H-1z" fill="#d47b51"/><path d="M-23 23q5-17 21-16t22 16" fill="#6c8c60"/>',
};
const nodeBy=(level,id)=>level.nodes.find(n=>n.id===id);
class FundyGame extends HTMLElement {
  connectedCallback(){
    this.index=0;this.history=[];this.notice='Your lantern is on board. Cross to Spruce Isle to begin.';this.best=LEVELS.map(()=>0);this.saveOK=true;
    try{const stored=JSON.parse(localStorage.getItem('fundy-tidekeeper-v1')||'null');if(Array.isArray(stored)&&stored.length===LEVELS.length)this.best=stored.map(v=>Number.isInteger(v)&&v>=0&&v<=3?v:0);}catch{this.saveOK=false;}
    this.state=initialState(this.level);
    this.innerHTML='<div class="game-body"></div><p class="sr-only announcer" aria-live="polite" aria-atomic="true"></p>';
    this.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(button&&!button.disabled)this.act(button.dataset.action);});
    this.addEventListener('change',e=>{if(e.target.matches('#chapter'))this.choose(Number(e.target.value));});
    this.keyHandler=e=>{
      if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.target.closest('input,select,textarea'))return;
      if(e.key.toLowerCase()==='w'||(e.code==='Space'&&!e.target.closest('button,a,summary'))){e.preventDefault();this.act('wait');}
      if(e.key.toLowerCase()==='u'){e.preventDefault();this.act('undo');}
      if(e.key.toLowerCase()==='r'){e.preventDefault();this.act('restart');}
      if(/^[1-7]$/.test(e.key)){const node=this.level.nodes[Number(e.key)-1];if(node){e.preventDefault();this.act('go:'+node.id);}}
    };
    document.addEventListener('keydown',this.keyHandler);this.render();
  }
  disconnectedCallback(){document.removeEventListener('keydown',this.keyHandler);}
  get level(){return LEVELS[this.index];}
  choose(index){if(!Number.isInteger(index)||!LEVELS[index])return;this.index=index;this.state=initialState(this.level);this.history=[];this.notice='A new round begins. '+this.level.brief;this.render();}
  act(action){
    if(action==='restart'){this.state=initialState(this.level);this.history=[];this.notice='Round restarted. Your cargo is ready at Harbour.';return this.render();}
    if(action==='undo'){if(this.history.length){this.state=this.history.pop();this.notice='Last turn undone. You are at '+nodeBy(this.level,this.state.at).name+'.';this.render();}return;}
    if(action==='next'){return this.choose((this.index+1)%LEVELS.length);}
    if(action==='hint'){
      const path=shortestSolution(this.level,this.state);
      this.notice=path===null?'There is not enough time left for this round. Undo a few turns or restart.':path.length===0?'All errands complete. A fine day’s work.':path[0]==='wait'?'Keeper’s tip: wait on this island for one turn. The water will change.':'Keeper’s tip: cross to '+nodeBy(this.level,path[0]).name+' next.';
      return this.render();
    }
    if(this.state.status!=='playing')return;
    let target=action==='wait'?'wait':action.startsWith('go:')?action.slice(3):null;if(!target)return;
    if(target===this.state.at){this.notice='You are at '+nodeBy(this.level,target).name+'. Choose a connected island or wait.';return this.render();}
    const next=move(this.level,this.state,target);
    if(next===this.state){
      const route=connections(this.level,this.state).find(e=>e.to===target);
      this.notice=route?'That causeway is underwater. Check the tide forecast or choose another route.':'There is no direct path from here. Follow a marked causeway.';return this.render();
    }
    const old=this.state;this.history.push(old);this.state=next;
    const events=this.level.tasks.flatMap((t,i)=>old.cargo[i]!==next.cargo[i]?[next.cargo[i]===1?'Collected '+t.label.toLowerCase()+'.':'Delivered '+t.label.toLowerCase()+'.']:[]);
    this.notice=(target==='wait'?'You waited safely at '+nodeBy(this.level,next.at).name+'.':'Arrived at '+nodeBy(this.level,next.at).name+'.')+' '+events.join(' ')+' '+TIDES[next.phase].name+'.';
    if(next.status==='won'){
      this.best[this.index]=Math.max(this.best[this.index],stars(this.level,next));
      try{localStorage.setItem('fundy-tidekeeper-v1',JSON.stringify(this.best));this.saveOK=true;}catch{this.saveOK=false;}
      this.notice='Round complete! Everyone and everything is where they belong. '+next.turn+' turns, '+stars(this.level,next)+' of 3 lanterns.';
    }else if(next.status==='lost'){this.notice='Your shift has ended. Undo a turn or restart to find a quicker route.';}
    this.render();
  }
  scene(){
    const {level,state}=this,water=TIDES[state.phase].height;
    const paths=level.edges.map(e=>{
      const a=nodeBy(level,e.a),b=nodeBy(level,e.b),open=water<=e.height;
      return `<g class="causeway ${open?'open':'covered'}"><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="path-base"/><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="path-middle"/>${e.height===3?`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="bridge-rail"/>`:''}</g>`;
    }).join('');
    const islands=level.nodes.map((n,i)=>{
      const rx=55+(3-water)*6,ry=33+(3-water)*5;
      return `<g transform="translate(${n.x} ${n.y})"><ellipse cx="2" cy="8" rx="${rx+8}" ry="${ry+5}" fill="#b5cfb7" opacity=".42"/><ellipse rx="${rx}" ry="${ry}" fill="#d8c496"/><ellipse cy="-5" rx="48" ry="28" fill="${n.type==='rock'?'#b99171':'#9cae7c'}"/><ellipse cx="-9" cy="-10" rx="32" ry="20" fill="${n.type==='rock'?'#cfa27e':'#bbc095'}"/><g transform="translate(0 -12)">${ICONS[n.type]}</g><text y="65" class="island-name">${i+1}. ${n.name}</text></g>`;
    }).join('');
    const nodes=level.nodes.map((n,i)=>{
      const current=n.id===state.at,edge=connections(level,state).find(e=>e.to===n.id),ready=state.status==='playing'&&edge?.open;
      const job=level.tasks.some((t,j)=>(state.cargo[j]===0&&t.from===n.id)||(state.cargo[j]===1&&t.to===n.id));
      return `<button class="island-button ${current?'current':''} ${ready?'reachable':''}" style="left:${n.x/8.8}%;top:${n.y/5.5}%" data-action="go:${n.id}" aria-label="${i+1}. ${n.name}${current?', you are here':ready?', crossing clear':edge?', path underwater':', no direct path'}">${current?'<span class="keeper" aria-hidden="true">●</span>':ready?'<span class="landing" aria-hidden="true">+</span>':''}${job?'<span class="job-dot" aria-hidden="true">!</span>':''}</button>`;
    }).join('');
    return `<div class="chart tide-${water}"><svg class="map" viewBox="0 0 880 550" role="img" aria-label="Island chart. Solid sandy causeways are open; dotted blue causeways are underwater. Island buttons and route list provide navigation."><defs><pattern id="ripple" width="100" height="75" patternUnits="userSpaceOnUse"><path d="M6 30q8-4 16 0m45 32q9-4 18 0" stroke="#d4e5da" stroke-width="1.5" opacity=".38" fill="none"/></pattern></defs><rect width="880" height="550" fill="url(#ripple)"/><path d="M0 450q55-21 72 20t60 80H0zM0 0h140q-10 34-48 36T0 115z" fill="#c0c7a2"/><path d="M0 473q48-15 62 18t29 59H0zM0 0h100Q77 17 56 19T0 70z" fill="#a9b28b"/><text x="35" y="54" class="map-label">FUNDY COAST</text><text x="45" y="503" class="map-label">A CHART OF SMALL ERRANDS</text>${paths}${islands}<g transform="translate(807 70)" class="compass"><path d="M0-23v46m-16-23h32M0-23-5-8H5z" fill="#416f68" stroke="#416f68"/><text x="0" y="-31">N</text></g><g fill="none" stroke="#e2ece1" stroke-width="2.5"><path d="M530 470q9-9 18 0 9-9 18 0M603 57q7-7 14 0 7-7 14 0"/></g></svg>${nodes}<span class="chart-corner">${TIDES[state.phase].name.toUpperCase()}</span></div>`;
  }
  render(){
    const focus=document.activeElement?.dataset?.action;
    const {level,state}=this,links=connections(level,state),complete=state.cargo.filter(x=>x===2).length;
    const left=level.limit-state.turn,won=state.status==='won',lost=state.status==='lost';
    this.querySelector('.game-body').innerHTML=`
    <section class="chapter-bar"><div><span class="eyebrow">${level.subtitle}</span><h2>${level.name}</h2></div><label class="chapter-picker">Choose a round<select id="chapter">${LEVELS.map((l,i)=>`<option value="${i}" ${i===this.index?'selected':''}>${i+1}. ${l.name}${this.best[i]?' · '+this.best[i]+'/3':''}</option>`).join('')}</select></label></section>
    <div class="game-layout"><div class="sea-panel">
    <div class="chart-heading"><div><span class="location-dot"></span> AT ${nodeBy(level,state.at).name.toUpperCase()}</div><span><strong>${state.turn}</strong> / ${level.limit} turns</span></div>
    ${this.scene()}
    <div class="legend"><span><i class="clear-line"></i> Open causeway</span><span><i class="wet-line"></i> Underwater</span><span><i class="you-dot"></i> You</span><span><i class="errand-dot">!</i> An errand</span></div>
    <div class="notice ${won?'success':lost?'danger':''}"><span class="notice-label">${won?'HOME, SAFE & SOUND':lost?'END OF SHIFT':'KEEPER’S LOG'}</span><p>${this.notice}</p></div>
    ${state.status==='playing'?`<div class="route-section"><p class="eyebrow">Your next crossing</p><div class="route-buttons">${links.map(e=>`<button data-action="go:${e.to}" class="route ${e.open?'':'underwater'}" ${!e.open?'disabled':''}><span class="route-number">${level.nodes.findIndex(n=>n.id===e.to)+1}</span><span><strong>${nodeBy(level,e.to).name}</strong><small>${e.open?(e.height===3?'Bridge · always open':'Causeway clear'):'Underwater · wait for '+(e.height===0?'low water':e.height===1?'lower tide':'high water to pass')}</small></span></button>`).join('')}<button class="wait-button" data-action="wait"><span class="wait-icon" aria-hidden="true">◷</span><span><strong>Wait one turn</strong><small>Stay on this island</small></span></button></div></div>`:`<div class="result"><div><span class="result-stars" aria-label="${stars(level,state)} of 3 lanterns">${won?'✦'.repeat(stars(level,state))+'◇'.repeat(3-stars(level,state)):'◷'}</span><h3>${won?(this.index===5?'Keeper of the whole bay.':'A good day on the water.'):'The tide has other plans.'}</h3><p>${won?`Finished in ${state.turn} turns. ${level.par} turns or fewer earns all three lanterns.`:'Nothing is lost. Undo your last turn or try a different route.'}</p></div><button class="primary" data-action="${won?'next':'restart'}">${won?(this.index===5?'Back to the first round':'Next round'):'Try this round again'}</button></div>`}
    <div class="tools"><button data-action="undo" ${!this.history.length?'disabled':''}>Undo <kbd>U</kbd></button><button data-action="restart">Restart <kbd>R</kbd></button><button data-action="hint">Keeper’s hint</button><span>${left} turns left</span></div>
    </div>
    <aside class="shore-panel"><section class="brief"><p class="eyebrow">Today’s round</p><p>${level.brief}</p></section>
    <section class="tide-card"><div class="section-title"><h3>Tide almanac</h3><span>6-step cycle</span></div><div class="tide-now"><span class="tide-symbol" aria-hidden="true">${state.phase===0?'≋':state.phase<3?'↟':state.phase===3?'≈':'↡'}</span><div><strong>${TIDES[state.phase].name}</strong><p>${TIDES[state.phase].direction}</p></div></div><div class="forecast" aria-label="Tide forecast, now and next five turns">${Array.from({length:6},(_,i)=>{const p=TIDES[(state.phase+i)%6];return `<div class="forecast-step ${i===0?'now':''}"><span>${i===0?'NOW':'+'+i}</span><div class="bar-space"><i style="height:${18+p.height*12}px"></i></div><small>${p.short}</small></div>`;}).join('')}</div><p class="tide-note">Crossings use the tide shown <strong>now</strong>. Then the water advances one step. Waiting also takes one turn.</p></section>
    <section class="manifest"><div class="section-title"><h3>On the round</h3><span>${complete} / ${level.tasks.length}</span></div><ul>${level.tasks.map((t,i)=>`<li class="cargo-${state.cargo[i]}"><span class="cargo-icon" aria-hidden="true">${state.cargo[i]===2?'✓':t.kind==='visitor'?'♙':'▣'}</span><div><strong>${t.label}</strong><p>${state.cargo[i]===0?'Collect at '+nodeBy(level,t.from).name:state.cargo[i]===1?'On board · to '+nodeBy(level,t.to).name:'Delivered to '+nodeBy(level,t.to).name}</p></div></li>`).join('')}<li class="return-home"><span class="cargo-icon" aria-hidden="true">⌂</span><div><strong>Finish at Harbour</strong><p>After all deliveries are done</p></div></li></ul></section>
    <details class="howto"><summary>How to be a tidekeeper</summary><div><p>Tap a connected island or use a crossing button. Blue dotted paths are flooded. Each crossing takes one turn; every island is safe to wait on.</p><p>Pickups and deliveries happen automatically. There is room for every passenger and parcel.</p><p>Complete the errands and return to Harbour within ${level.limit} turns. Finish in ${level.par} or fewer for three lanterns. Undo and hints are always free.</p><p><strong>Keyboard:</strong> island numbers 1–7, W to wait, U to undo, R to restart. Tab and Enter work on every button. Space also waits when no control is focused.</p></div></details>
    <div class="progress"><span class="eyebrow">YOUR KEEPER’S RECORD</span><div class="progress-marks">${this.best.map((b,i)=>`<span class="${b?'earned':''}" title="Round ${i+1}: ${b} of 3 lanterns">${b?'✦':'·'}</span>`).join('')}<strong>${this.best.reduce((a,b)=>a+b,0)} / 18</strong></div><small>${this.saveOK?'Best lanterns are saved on this browser.':'Progress is available for this visit; browser storage is unavailable.'}</small></div>
    </aside></div>`;
    this.querySelector('.announcer').textContent=this.notice;
    if(focus){const target=[...this.querySelectorAll('[data-action]')].find(el=>el.dataset.action===focus&&!el.disabled);target?.focus({preventScroll:true});}
  }
}
customElements.define('fundy-game',FundyGame);
