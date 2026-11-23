<script setup lang="ts">
import {computed,ref,watch,nextTick} from 'vue';
import {locations,edges,required,place,adjacent,initialState,start,move,moveReason,act,actionReason,night,finish,complete,points,currentWeather,weather,type State,type Action} from './engine';
const state=ref<State>(initialState());
const modal=ref<'intro'|'help'|'restart'|'journal'|null>('intro');
const nightConfirm=ref(false);
const best=ref(0);
try{best.value=Number(localStorage.getItem('funapps-arctic-best')||0);if(!Number.isFinite(best.value))best.value=0;}catch{}
const here=computed(()=>place(state.value.at));
const forecast=computed(()=>currentWeather(state.value));
const nextWeather=computed(()=>weather[state.value.day]??null);
const routes=computed(()=>adjacent(state.value.at).map(place));
const surveyCount=computed(()=>required.filter(id=>state.value.observations.includes(id)).length);
const sheltered=computed(()=>state.value.camps.includes(state.value.at));
const terminal=computed(()=>['won','ended'].includes(state.value.status));
const noteCount=computed(()=>state.value.observations.length);
const resultScore=computed(()=>points(state.value));
watch(()=>state.value.status,v=>{if(v==='won'){best.value=Math.max(best.value,resultScore.value);try{localStorage.setItem('funapps-arctic-best',String(best.value));}catch{}}});
function update(s:State){state.value=s;nightConfirm.value=false;}
function travel(id:string){if(modal.value||terminal.value)return;update(move(state.value,id));}
function action(a:Action){update(act(state.value,a));}
function begin(){update(start(state.value));modal.value=null;}
function reset(){state.value=initialState();nightConfirm.value=false;modal.value='intro';}
function endDay(){if(state.value.actions>0&&!nightConfirm.value){nightConfirm.value=true;return;}update(night(state.value));}
function open(v:typeof modal.value){modal.value=v;nextTick(()=>document.querySelector<HTMLButtonElement>('.modal button')?.focus());}
function close(){modal.value=null;}
function trap(e:KeyboardEvent){if(e.key==='Escape'&&modal.value!=='intro'){close();return;}if(e.key!=='Tab')return;const elements=[...document.querySelectorAll<HTMLButtonElement>('.modal button:not([disabled]),.modal a')];const first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
const polygon=(x:number,y:number)=>`${x-104},${y-48} ${x+2},${y-87} ${x+112},${y-36} ${x+112},${y+30} ${x},${y+79} ${x-104},${y+24}`;
const tileColors:Record<string,string>={coast:'#a3bcc2',plain:'#b4c4bf',lake:'#86aeb7',tundra:'#abb8a1',mountain:'#8da2aa',glacier:'#c1d9dc'};
const isReachable=(id:string)=>state.value.status==='active'&&state.value.actions>0&&adjacent(state.value.at).includes(id);
</script>

<template>
<div class="app-shell" :inert="modal!==null">
<header class="topbar"><a href="https://funapps.ca" class="brand"><span class="brand-symbol">✳</span> FUNAPPS <span class="brand-divider">/</span> <span class="collection">FARTHER AFIELD</span></a><div class="top-actions"><button @click="open('help')">Field guide</button><button @click="open('restart')">New expedition</button></div></header>
<main>
<section class="masthead"><div><p class="eyebrow">A MARITIMER HEADS NORTH</p><h1>North of<br><em>the Harbour.</em></h1><p class="lead">Different horizon. Same good mittens.<br>Bring a notebook, make a plan, and come home with a story.</p></div><div class="mission-stamp"><span>THE NORTHERN NOTEBOOK</span><svg viewBox="0 0 120 72" aria-hidden="true"><path d="M6 65 37 13 58 49 80 6 114 65Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="m25 33 12-20 13 23-12-4-6 5Z M65 34 15-28 16 30-16-7Z" fill="currentColor"/><circle cx="12" cy="13" r="5" fill="currentColor"/></svg><strong>6 days · 3 observations</strong><small>One very different kind of coast.</small></div></section>

<section class="supplies" aria-label="Expedition supplies">
<div><span>FIELD DAY</span><strong>{{state.day}} <small>/ 6</small></strong><em>{{state.actions}} {{state.actions===1?'action':'actions'}} left</em></div>
<div :class="{low:state.energy<=3}"><span>ENERGY</span><strong>{{Math.max(0,state.energy)}}<small>/10</small></strong><meter min="0" max="10" :value="Math.max(0,state.energy)" aria-label="Energy"/></div>
<div :class="{low:state.warmth<=3}"><span>WARMTH</span><strong>{{Math.max(0,state.warmth)}}<small>/10</small></strong><meter min="0" max="10" :value="Math.max(0,state.warmth)" aria-label="Warmth"/></div>
<div :class="{low:state.rations<=2}"><span>RATIONS</span><strong>{{state.rations}}</strong><em>Rest & overnight stays</em></div>
<div><span>FIELD NOTES</span><strong>{{surveyCount}}<small>/3 required</small></strong><em>{{state.kits}} camp {{state.kits===1?'kit':'kits'}} left</em></div>
</section>

<div v-if="terminal" class="result" :class="{success:state.status==='won'}" role="region" aria-label="Expedition result">
<div class="result-mark">{{state.status==='won'?'✦':'⌁'}}</div><div><p class="eyebrow">{{state.status==='won'?'ALL NOTES ACCOUNTED FOR':'ANOTHER DAY, ANOTHER ROUTE'}}</p><h2>{{state.status==='won'?'Home with a story.':'The team heads home.'}}</h2><p>{{state.status==='won'?'Three observations recorded and the whole team back at Harbour base. A good bit farther than the usual coastal ramble.':state.reason}}</p><p v-if="state.status==='ended'">{{state.message}}</p><div class="result-buttons"><button class="primary" @click="open('journal')">Open the notebook</button><button class="secondary" @click="reset">Plan another expedition</button></div></div><div class="score"><strong>{{resultScore.toLocaleString()}}</strong><span>EXPEDITION POINTS</span><small>{{noteCount}} notes · {{state.camps.length-2}} camps built</small><small v-if="best">Best successful trip: {{best.toLocaleString()}}</small></div>
</div>

<div class="game-layout">
<section class="map-card" aria-label="Expedition map"><div class="map-heading"><div><p class="eyebrow">YOUR LITTLE PATCH OF THE NORTH</p><h2>{{here.name}}</h2></div><button class="text-button" @click="open('journal')">Notebook <span>{{noteCount}}</span></button></div>
<div class="map-scroll"><svg class="terrain-map" viewBox="0 0 960 670" role="img" aria-label="Fictional Arctic expedition map. Connected destinations also have labelled travel buttons beside the map.">
<defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#8cb3bc" stroke-width=".6" opacity=".12"/></pattern><pattern id="water" width="80" height="60" patternUnits="userSpaceOnUse"><path d="M6 28q10-7 20 0m24 18q10-7 20 0" fill="none" stroke="#84abb4" stroke-width="1" opacity=".19"/></pattern><filter id="shadow"><feDropShadow dx="0" dy="11" stdDeviation="10" flood-color="#061b28" flood-opacity=".5"/></filter></defs>
<rect width="960" height="670" fill="#173849"/><rect width="960" height="670" fill="url(#grid)"/><path d="M0 420Q140 340 160 435T400 620L420 670H0Z" fill="#1d4756"/><rect width="960" height="670" fill="url(#water)"/>
<path d="M150 210 420 98 800 120 845 410 575 638 242 570 120 390Z" fill="#496473" opacity=".46"/>
<text x="65" y="85" class="map-label">THE NORTHERN NOTEBOOK</text><text x="65" y="108" class="map-subtitle">FICTIONAL FIELD AREA · NOT TO SCALE</text><text x="72" y="592" class="sea-label">a colder kind of coast</text>
<g v-for="loc in locations" :key="loc.id" filter="url(#shadow)">
<polygon :points="polygon(loc.x,loc.y+13)" fill="#405e69"/><polygon :points="polygon(loc.x,loc.y)" :fill="tileColors[loc.terrain]" stroke="#d0e3dc" stroke-opacity=".3" stroke-width="1.4"/>
<path :d="`M${loc.x-88} ${loc.y-26}q58-30 134 5m-134 23q82-26 176 0m-140 30q45-12 88 0`" stroke="#e4eddf" stroke-opacity=".25" fill="none" stroke-width="2"/>
</g>
<g v-for="(edge,i) in edges" :key="i"><path :d="`M${place(edge[0]).x} ${place(edge[0]).y+20}L${place(edge[1]).x} ${place(edge[1]).y+20}`" :class="['trail',{available:isReachable(edge[0])&&edge[1]===state.at||isReachable(edge[1])&&edge[0]===state.at}]"/></g>
<g v-for="loc in locations" :key="`art-${loc.id}`" :transform="`translate(${loc.x},${loc.y})`" class="terrain-art">
<template v-if="loc.terrain==='mountain'||loc.terrain==='glacier'"><path d="M-72 12-27-72 23 12Z" fill="#466575"/><path d="m-27-72 50 84H-8Z" fill="#324f63"/><path d="m-45-40 18-32 21 35-19-9-8 10Z" fill="#e0eff0"/><path d="M-4 18 39-52 83 18Z" fill="#74919f"/><path d="m39-52 44 70H48Z" fill="#567a8c"/><path d="m24-28 15-24 16 26-15-7-7 7Z" fill="#edf4ef"/><path v-if="loc.terrain==='glacier'" d="m-9 22 18-30 24 10 19 24-12 21-35-4Z" fill="#d6eeed" stroke="#8db5c2" stroke-width="2"/></template>
<template v-if="loc.terrain==='lake'"><ellipse cx="0" cy="-12" rx="58" ry="23" fill="#4d91a1" stroke="#c9e5de" stroke-width="4"/><path d="M-39-16H18m-21 9h36m-53 8h27" stroke="#a4d5d9" stroke-width="2"/></template>
<template v-if="loc.terrain==='tundra'"><g v-for="(pos,i) in [[-53,-9],[-18,-28],[28,-16],[55,10],[-4,8]]" :key="i" :transform="`translate(${pos})`"><path d="M0 8V-8m0 6-8-6m8 12 7-6" stroke="#526f67" stroke-width="2"/><circle cy="-10" r="4" fill="#cd8e91"/><circle cx="-8" cy="-7" r="3" fill="#daabb1"/></g></template>
<template v-if="loc.id==='base'"><path d="M-45 11V-30H5V11Z" fill="#d4ded8"/><path d="m-53-31 33-25 34 25Z" fill="#c67568"/><path d="M-10 11v-22H0V11" fill="#3b6170"/><path d="M-34-19h13v12h-13Z" fill="#f7dca7"/><path d="M41-2V-59m-8 8 8-12 8 12m-14 8h12" fill="none" stroke="#d3ded8" stroke-width="3"/></template>
<template v-if="loc.id==='fjord'"><path d="M-35-28q10-12 20 0 10-12 20 0m13 13q9-10 18 0 9-10 18 0" stroke="#f1f3e7" stroke-width="3" fill="none"/><path d="M-45 3q18-12 34-2t44 6" stroke="#d5e4df" stroke-width="2" fill="none"/></template>
<g v-if="state.camps.includes(loc.id)&&loc.id!=='base'" transform="translate(38,5)"><path d="M-28 15 0-23 28 15Z" fill="#e9a28b"/><path d="m0-23 28 38H4Z" fill="#b9695d"/><path d="M-11 15 0-5 10 15Z" fill="#375260"/></g>
</g>
<g v-for="loc in locations" :key="`node-${loc.id}`" :transform="`translate(${loc.x},${loc.y+36})`" :class="['map-node',{current:state.at===loc.id,reachable:isReachable(loc.id),recorded:state.observations.includes(loc.id)}]" role="button" :tabindex="isReachable(loc.id)?0:-1" :aria-disabled="!isReachable(loc.id)" :aria-label="`${loc.name}${state.at===loc.id?', you are here':isReachable(loc.id)?', travel for one action':', not directly reachable'}`" @click="isReachable(loc.id)&&travel(loc.id)" @keydown.enter.prevent="isReachable(loc.id)&&travel(loc.id)" @keydown.space.prevent="isReachable(loc.id)&&travel(loc.id)">
<circle v-if="state.at===loc.id" r="20" class="location-ring"/><circle r="13"/><text text-anchor="middle" y="5" class="marker-icon">{{state.at===loc.id?'●':state.observations.includes(loc.id)?'✓':loc.kind==='survey'?'✦':loc.kind==='postcard'?'○':'·'}}</text><rect x="-83" y="22" width="166" height="27" rx="4"/><text text-anchor="middle" y="41" class="node-label">{{loc.name}}</text>
</g>
<g transform="translate(867,70)" class="compass"><path d="M0 0V60M-18 30h36M0 0-6 16H6Z" fill="#a8c9ca" stroke="#a8c9ca"/><text x="0" y="-12" text-anchor="middle">N</text></g>
</svg></div>
<div class="map-key"><span><i class="key-current"/> Your team</span><span><i class="key-trail"/> Next trails</span><span>✦ Required survey</span><span>○ Optional note</span></div>
<div class="location-story"><span class="story-number">{{String(state.visited.length).padStart(2,'0')}}</span><div><h3>{{here.title}}</h3><p>{{here.description}}</p></div></div>
<p class="message" role="status">{{state.message}}</p>
</section>

<aside class="field-panel">
<section class="forecast"><div class="forecast-top"><span class="eyebrow">TODAY’S FORECAST</span><span class="weather-icon" aria-hidden="true">{{forecast.icon}}</span></div><h2>{{forecast.name}}</h2><p>{{forecast.detail}}</p><div class="tomorrow"><span>{{nextWeather?'Tomorrow':'Tomorrow’s plan'}}</span><strong>{{nextWeather?.name??'Home with the notebook'}}</strong></div></section>
<section class="actions-panel"><p class="eyebrow">AT {{here.name.toUpperCase()}}</p><button class="primary observation" @click="action('observe')" :disabled="!!actionReason(state,'observe')"><span>{{state.observations.includes(state.at)?'Already recorded':here.kind==='postcard'?'Collect a field note':'Record observation'}}</span><small>1 action · 1 energy · 1 warmth</small></button><p class="action-explainer" v-if="actionReason(state,'observe')">{{actionReason(state,'observe')}}</p>
<div class="camp-actions"><button @click="action('camp')" :disabled="!!actionReason(state,'camp')"><strong>{{sheltered?'Camp is here':'Establish camp'}}</strong><small>1 action · 1 kit · 1 ration</small></button><button @click="action('rest')" :disabled="!!actionReason(state,'rest')"><strong>{{sheltered?'Sheltered rest':'Trailside rest'}}</strong><small>1 action · 1 ration · +{{sheltered?5:3}} energy & warmth</small></button></div>
<button v-if="state.at==='base'&&complete(state)&&state.status==='active'" class="finish-button" @click="update(finish(state))">Hand in the notebook <small>Finish the expedition · no action needed</small></button>
</section>
<section class="routes-panel"><p class="eyebrow">CHOOSE YOUR NEXT TRAIL</p><div class="route-buttons"><button v-for="loc in routes" :key="loc.id" @click="travel(loc.id)" :disabled="!!moveReason(state,loc.id)"><span class="route-icon">{{loc.kind==='survey'?'✦':loc.kind==='postcard'?'○':'⌂'}}</span><span><strong>{{loc.name}}</strong><small>1 action · 2 energy · {{forecast.cold}} warmth</small></span><span v-if="state.observations.includes(loc.id)" class="tick">✓</span></button></div><p class="warning" v-if="!terminal&&(state.energy<=2||state.warmth<=forecast.cold)">Rest before moving: this weather or effort could end your expedition.</p><p class="action-explainer" v-if="state.actions===0&&!terminal">All three actions used. Choose your overnight stop.</p></section>
<section class="night-panel"><p class="eyebrow">{{sheltered?'A SHELTERED NIGHT':'AN EXPOSED NIGHT'}}</p><p v-if="sheltered">One ration. Restore up to 5 energy and warmth. Begin tomorrow with three actions.</p><p v-else>One ration. Restore up to 3 energy, but lose <strong>{{forecast.night}} warmth</strong>. A camp makes nights warmer.</p><p v-if="nightConfirm" class="confirm-copy">{{state.actions}} unused {{state.actions===1?'action':'actions'}}. Finish today anyway?</p><div class="night-buttons"><button v-if="nightConfirm" class="secondary" @click="nightConfirm=false">Keep exploring</button><button class="night-button" :disabled="state.status!=='active'" @click="endDay">{{nightConfirm?'Yes, end the day':state.day===6?'End the expedition':'Settle in for the night'}}</button></div></section>
</aside>
</div>

<section class="notebook-progress"><div><p class="eyebrow">THE REASON YOU CAME</p><h2>Three notes to bring home.</h2><p>Visit each research stop, record its observation, then return to Harbour base.</p></div><div class="objective-cards"><article v-for="id in required" :key="id" :class="{done:state.observations.includes(id)}"><span>{{state.observations.includes(id)?'✓':'✦'}}</span><h3>{{place(id).name}}</h3><p>{{state.observations.includes(id)?'Recorded in your notebook':'One observation to record'}}</p></article></div></section>
<details class="field-guide"><summary>How the expedition works</summary><p>Three actions per day. Travel uses one action, two energy, and the warmth shown in the forecast. Observations use one action, one energy and one warmth. Keep energy and warmth above zero. A camp costs an action, a kit and a ration; it remains available for the rest of the expedition. Rest anywhere for a ration, with better recovery at camp. Nights cost a ration and reset your actions. Finish at Harbour base by the end of day six.</p><p>Mirror lake and Quiet inlet add optional notes and points. Your score rewards observations, spare days, remaining supplies and a completed return. Only your best successful score is saved. Reloading starts a fresh expedition.</p></details>
</main>
<footer><span>Inspired by the northern landscapes of Canada. A fictional field area, route and resource model—not real expedition advice.</span><a href="https://parks.canada.ca/pn-np/nu/quttinirpaaq/nature" target="_blank" rel="noopener">Explore real Arctic landscapes</a><small>Vue + TypeScript + SVG · No accounts, no downloads</small></footer>
</div>

<div v-if="modal" class="modal-backdrop" @keydown="trap"><section class="modal" role="dialog" aria-modal="true" :aria-labelledby="modal==='intro'?'intro-title':'modal-title'">
<template v-if="modal==='intro'"><div class="modal-mountains" aria-hidden="true">✦</div><p class="eyebrow">THE NORTHERN NOTEBOOK</p><h2 id="intro-title">The sea is familiar.<br><em>The rest is new.</em></h2><p>You’re a Maritime visitor joining a small, fictional northern research team. In six days, collect three observations and bring the notebook back to Harbour base.</p><ol class="guide-list"><li><strong>Make three moves a day.</strong> Follow connected trails, record observations, establish a camp or rest.</li><li><strong>Read the forecast.</strong> Cold uses warmth. Travel uses energy. Camps make nights and rest breaks more useful.</li><li><strong>Bring your notes home.</strong> The glacier, weather ridge and tundra garden are required. Two other stops are just for the story.</li></ol><p class="tip">A first-route tip: start at Canvas shelter, continue to Glacier lookout, and record its observation. You can build a camp farther along.</p><button class="primary" @click="begin">Head north</button><p class="modal-note">No timer. Click, tap, or use Tab and Enter. Routes and supplies are fictional game rules.</p></template>
<template v-else-if="modal==='help'"><p class="eyebrow">A LITTLE PLANNING GOES A LONG WAY</p><h2 id="modal-title">Your field guide.</h2><ul class="guide-list"><li>Make up to three actions per day. Travelling: 2 energy and 1–2 warmth. Observing: 1 energy and 1 warmth.</li><li>Camp setup: 1 kit and 1 ration. Rest: 1 ration, restoring up to 5 energy/warmth at camp, or 3 elsewhere.</li><li>Every overnight stay uses 1 ration. Camp nights add up to 5 energy and warmth. Exposed nights add 3 energy but lose the shown warmth.</li><li>Keep energy and warmth above zero. Finish all three observations and return to Harbour base by day six. Handing in the notebook takes no action.</li><li>Your two camp kits stay where you deploy them. Harbour base and Canvas shelter already have camps.</li></ul><button class="primary" @click="close">Back to the field</button></template>
<template v-else-if="modal==='restart'"><p class="eyebrow">A FRESH PAGE</p><h2 id="modal-title">Plan another expedition?</h2><p>This replaces the current trip. Your best successful score stays saved.</p><div class="modal-actions"><button class="primary" @click="reset">Start fresh</button><button class="secondary" @click="close">Keep this expedition</button></div></template>
<template v-else><p class="eyebrow">THE NORTHERN NOTEBOOK</p><h2 id="modal-title">A few things worth keeping.</h2><p>{{surveyCount}} of 3 observations · {{noteCount-surveyCount}} optional {{noteCount-surveyCount===1?'note':'notes'}}</p><div class="journal"><article v-for="(entry,i) in state.journal" :key="i"><span>{{String(state.journal.length-i).padStart(2,'0')}}</span><p>{{entry}}</p></article></div><button class="primary" @click="close">Close the notebook</button></template>
</section></div>
</template>
