<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { stops, routes, stopById, options, newGame, travel, act, reason, actionReason, score, type State, type Action, type Route } from './engine';
const saveKey='funapps-canada-roadtrip-v1';
function load():State {
 try { const s=JSON.parse(localStorage.getItem(saveKey)||'null');
  if(s && stops.some(n=>n.id===s.location) && ['ready','active','won','ended'].includes(s.status) && ['days','fuel','money','energy','condition'].every(k=>Number.isFinite(s[k])&&s[k]>=0) && ['visited','cards'].every(k=>Array.isArray(s[k])&&s[k].every((id:string)=>stops.some(n=>n.id===id))) && Array.isArray(s.journal)&&s.journal.every((j:unknown)=>typeof j==='string')&&typeof s.message==='string')return s;
 }catch{} return newGame();
}
const state=ref<State>(load());
const current=computed(()=>stopById(state.value.location));
const choices=computed(()=>options(state.value.location));
const selected=ref(choices.value[0]?.to||'stjohns');
const selectedRoute=computed(()=>choices.value.find(r=>r.to===selected.value)||choices.value[0]);
const destination=computed(()=>selectedRoute.value?stopById(selectedRoute.value.to):current.value);
const help=ref(false);const confirmRestart=ref(false);const journal=ref(false);const cardView=ref(false);
const modalOpen=computed(()=>state.value.status==='ready'||help.value||confirmRestart.value||cardView.value);
watch(modalOpen,async(open)=>{if(open){await nextTick();document.querySelector<HTMLButtonElement>('.modal .primary, .modal button')?.focus();}},{immediate:true});
const provinces=computed(()=>new Set(state.value.visited.map(id=>stopById(id).region)).size);
const travelled=(r:Route)=>state.value.visited.some((id,i)=>id===r.from&&state.value.visited[i+1]===r.to);
const available=(id:string)=>choices.value.some(r=>r.to===id)&&state.value.status==='active';
const travelledCount=computed(()=>state.value.visited.length-1);
const fuelPrice=computed(()=>Math.min(20,100-state.value.fuel)*2);
watch(state,s=>{try{localStorage.setItem(saveKey,JSON.stringify(s));}catch{}},{deep:true});
function begin(){state.value={...state.value,status:'active'};}
function drive(){if(selectedRoute.value){state.value=travel(state.value,selectedRoute.value);selected.value=choices.value[0]?.to||'stjohns';}}
function doAction(a:Action){state.value=act(state.value,a);}
function restart(){state.value=newGame();selected.value='revelstoke';confirmRestart.value=false;cardView.value=false;journal.value=false;}
function end(){state.value={...state.value,status:'ended',message:'You called it a trip. There is always another road to try.'};}
</script>

<template>
 <div class="shell" :inert="modalOpen">
  <header class="topbar"><a href="https://funapps.ca" class="brand"><span class="brand-mark">f.</span> FunApps</a><div class="top-actions"><span class="edition">THE GREAT CANADIAN ROAD TRIP</span><button class="text-button" @click="help=true">How to play</button><button class="text-button" @click="confirmRestart=true">New trip</button></div></header>
  <main>
   <section class="heading"><div><p class="eyebrow">A LITTLE PLANNING. A LOT OF OPEN ROAD.</p><h1>Postcards <em>from Canada</em><span class="maple">✦</span></h1><p class="subtitle">Vancouver to St. John’s. Make the miles mean something.</p></div><div class="trip-badge"><span>YOUR TRAVEL JOURNAL</span><strong>{{ state.cards.length }} <small>postcards</small></strong><button @click="cardView=true">Open collection</button></div></section>
   <section class="dashboard" aria-label="Trip supplies">
    <div :class="{low:state.days<5}"><span>TRIP TIME</span><strong>{{ state.days }} <small>days left</small></strong></div>
    <div :class="{low:state.money<160}"><span>ROAD FUND</span><strong>${{ state.money.toLocaleString() }}</strong></div>
    <div :class="{low:state.fuel<25}"><span>FUEL</span><strong>{{ state.fuel }}<small>/100</small></strong><meter :value="state.fuel" max="100" aria-label="Fuel"/></div>
    <div :class="{low:state.condition<20}"><span>VAN CONDITION</span><strong>{{ state.condition }}<small>%</small></strong><meter :value="state.condition" max="100" aria-label="Van condition"/></div>
    <div :class="{low:state.energy<1}"><span>DRIVER ENERGY</span><strong>{{ state.energy }}<small>/5</small></strong><div class="energy" aria-hidden="true"><i v-for="i in 5" :class="{full:i<=state.energy}"/></div></div>
   </section>
   <div class="game-grid">
    <section class="map-panel" aria-label="Route map">
     <div class="panel-heading"><div><span class="eyebrow">THE ROAD AHEAD</span><h2>{{ current.name }} <span>· {{ current.region }}</span></h2></div><button class="text-button" @click="journal=!journal">{{ journal?'Show map':'Trip journal' }}</button></div>
     <div v-if="journal" class="journal"><p class="eyebrow">{{ travelledCount }} LEGS · {{ provinces }} PROVINCES · {{ score(state) }} POINTS</p><h3>A story worth the drive.</h3><ol><li v-for="(entry,i) in state.journal" :key="i">{{ entry }}</li></ol></div>
     <div v-else class="map-wrap">
      <svg class="canada-map" viewBox="0 0 1120 490" role="img" aria-label="Stylized branching route across southern Canada. Choose your next stop using the route buttons beside the map.">
       <defs><pattern id="map-grid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M 35 0 L 0 0 0 35" fill="none" stroke="#b9d7d1" stroke-width=".6"/></pattern><filter id="paper-shadow"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#144d4820"/></filter></defs>
       <rect width="1120" height="490" fill="#dceee9"/><rect width="1120" height="490" fill="url(#map-grid)"/>
       <path class="land" d="M49 35L260 22 300 80 352 39 416 71 445 26 532 60 551 95 608 96 622 148 661 154 673 205 712 204 733 175 759 128 803 90 857 104 898 73 930 106 951 145 915 181 883 193 867 220 843 233 850 268 893 280 903 303 893 320 918 328 931 352 922 388 894 380 865 347 841 349 824 331 790 340 745 351 720 380 694 415 663 435 639 407 646 382 611 360 578 350 553 356 519 346 454 347 390 347 333 347 279 347 220 347 170 347 109 346 91 321 62 303 78 285 62 272 67 251 49 229 62 215 48 194 62 171 51 153 71 128 54 103Z"/>
       <path class="land" d="M990 157L1012 166 1027 147 1056 166 1051 186 1075 202 1068 224 1045 230 1057 252 1032 270 1006 257 987 271 973 248 991 226 974 209 982 189 967 176Z"/>
       <path class="land" d="M66 296L79 311 82 334 63 328 48 309Z"/>
       <path class="province-line" d="M206 62L207 168 245 252 275 347M308 72L308 347M411 78L411 347M510 70L510 248 540 302 552 350M658 188L683 252 704 341M840 241L844 325"/>
       <path class="lake" d="M545 321Q565 291 587 308L612 314 600 330 582 331 571 323ZM620 347Q633 334 644 352L655 371 639 370ZM650 385L681 395 672 409 647 402M696 361Q706 350 717 354L714 366 700 370"/>
       <path class="lake" d="M482 230L494 243 490 274 482 280 475 261Z"/>
       <g class="mountains" fill="none" stroke="#93a69b" stroke-width="2" stroke-linejoin="round"><path d="M123 183l12-22 13 22m-2 25 14-24 15 24m-8 25 12-23 12 23m-6-70 12-24 12 24m-1 89 12-24 13 24m-78-116 10-20 11 20m-41-39 10-20 11 20"/></g>
       <text x="56" y="404" class="water-label">PACIFIC</text><text x="55" y="425" class="water-label">OCEAN</text><text x="983" y="374" class="water-label">ATLANTIC</text><text x="995" y="395" class="water-label">OCEAN</text>
       <text x="320" y="133" class="region-label">THE PRAIRIES</text><text x="535" y="210" class="region-label">LAKES & PINES</text><text x="741" y="118" class="region-label">QUÉBEC</text><text x="855" y="441" class="region-label">THE ATLANTIC CHAPTER</text>
       <g v-for="r in routes" :key="r.from+r.to"><line :x1="stopById(r.from).x" :y1="stopById(r.from).y" :x2="stopById(r.to).x" :y2="stopById(r.to).y" :class="['route-line',{travelled:travelled(r),available:r.from===state.location,selected:r.from===state.location&&r.to===selected}]"/></g>
       <g v-for="s in stops" :key="s.id" :transform="`translate(${s.x} ${s.y})`" :class="['map-stop',{visited:state.visited.includes(s.id),current:s.id===state.location,next:available(s.id),chosen:s.id===selected&&available(s.id)}]" @click="available(s.id)&&(selected=s.id)">
        <circle v-if="s.id===state.location" r="18" class="current-halo"/><circle r="7"/><circle v-if="state.visited.includes(s.id)&&s.id!==state.location" r="2" class="dot"/>
        <text :y="['vancouver','banff','regina','winnipeg','toronto','halifax'].includes(s.id)?25:-15" :text-anchor="s.id==='stjohns'?'end':'middle'">{{ s.name }}</text>
       </g>
       <g :transform="`translate(${current.x-13} ${current.y-37})`" class="van-marker"><rect x="0" y="0" width="27" height="18" rx="4" fill="#df7548" stroke="#fff9ea" stroke-width="2"/><path d="M5 4h7v6H5zm10 0h7v6h-7z" fill="#fff9ea"/><circle cx="6" cy="19" r="3" fill="#244943"/><circle cx="21" cy="19" r="3" fill="#244943"/></g>
       <g transform="translate(1040 55)" class="compass"><path d="M0-16L-5 1H5Z" fill="#285e56"/><path d="M0 17L-5 1H5Z" fill="#99b4aa"/><text y="-24" text-anchor="middle">N</text></g>
      </svg>
     </div>
     <div class="map-caption"><div><i class="legend travelled"/> Your journey <i class="legend available"/> Next roads <i class="legend later"/> Possible routes</div><span>Illustrated route map · not to scale</span></div>
     <div class="stop-story"><span class="chapter-number">{{ String(state.visited.length).padStart(2,'0') }}</span><div><h3>{{ current.title }}</h3><p>{{ current.detail }}</p></div></div>
     <div class="message" role="status" aria-live="polite"><span aria-hidden="true">✦</span> {{ state.message }}</div>
    </section>
    <aside class="route-panel">
     <p class="eyebrow">CHOOSE YOUR NEXT CHAPTER</p><h2>{{ state.status==='won'?'Coast to coast.':state.status==='ended'?'A trip to remember.':'Take the scenic route.' }}</h2>
     <template v-if="state.status==='active'||state.status==='ready'">
      <p class="route-help">Choose a road. Its full cost is shown before you leave.</p>
      <div class="route-choices"><button v-for="r in choices" :key="r.to" :class="['route-card',{selected:r.to===selected}]" :aria-pressed="r.to===selected" @click="selected=r.to"><span class="route-card-top"><strong>{{ stopById(r.to).name }}</strong><span class="radio"/></span><span>{{ r.label }}</span><div class="costs"><b>{{r.days}} days</b><b>{{r.fuel}} fuel</b><b>${{r.cost}}</b><b>−{{r.wear}} van</b></div></button></div>
      <p v-if="selectedRoute" class="route-note">{{ selectedRoute.to==='stjohns'?'Includes a fictional, compressed drive to the ferry, crossing, and Newfoundland road leg.':'Each road leg uses 1 driver energy. Rest restores all 5.' }}</p>
      <button class="primary drive" :disabled="!selectedRoute||!!reason(state,selectedRoute)" @click="drive">Drive to {{ destination.name }}</button>
      <p v-if="selectedRoute&&state.status==='active'&&reason(state,selectedRoute)" class="blocked">{{ reason(state,selectedRoute) }}</p>
      <div class="pitstop"><h3>While you’re here</h3><p>Make a memory, or get ready for the road.</p>
       <button class="service postcard" :disabled="!!actionReason(state,'postcard')" @click="doAction('postcard')"><span class="service-icon">▧</span><span><strong>{{ state.cards.includes(state.location)?'Postcard collected':'Explore & collect a postcard' }}</strong><small>{{ state.cards.includes(state.location)?current.card:`1 day · $${current.cardCost} · +100 points` }}</small></span></button>
       <div class="service-grid"><button class="service" :disabled="!!actionReason(state,'fuel')" @click="doAction('fuel')"><strong>Fuel +{{ Math.min(20,100-state.fuel) }}</strong><small>${{ fuelPrice }} · no time</small></button><button class="service" :disabled="!!actionReason(state,'rest')" @click="doAction('rest')"><strong>Rest</strong><small>1 day · $20</small></button><button class="service" :disabled="!!actionReason(state,'repair')" @click="doAction('repair')"><strong>Repair +50</strong><small>1 day · $80</small></button></div>
       <p class="small-note">Fuel tops up by 20 (max 100). Repairs cap at 100. Road costs include meals and stays.</p>
      </div>
     </template>
     <template v-else>
      <div class="arrival-art"><span>{{ state.status==='won'?'✦':'▧' }}</span><p>{{ state.status==='won'?'PACIFIC TO ATLANTIC':current.name.toUpperCase() }}</p><strong>{{ score(state).toLocaleString() }}</strong><small>JOURNEY POINTS</small></div><p class="end-copy">{{ state.status==='won'?`An ocean at each end, ${provinces} provinces in between, and ${state.cards.length} postcards to keep.`:`Your story reached ${current.name}. Try a shorter route, fewer detours, or more careful pit stops next time.` }}</p><button class="primary" @click="cardView=true">See your postcards</button><button class="secondary" @click="restart">Plan another journey</button><p class="small-note">Score: postcards ×100, provinces ×45, days left ×12, spare dollars ÷10, and 500 for finishing.</p>
     </template>
    </aside>
   </div>
   <footer><span>A fictional summer road trip, inspired by real places. Costs, roads and travel times are game rules.</span><button v-if="state.status==='active'" class="text-button" @click="end">End this trip</button><span v-else>Built with Vue + TypeScript + SVG</span></footer>
  </main>
 </div>
 <div v-if="state.status==='ready'||help||confirmRestart||cardView" class="modal-backdrop" @keydown.esc="help=false;confirmRestart=false;cardView=false">
  <section v-if="confirmRestart" class="modal small-modal" role="dialog" aria-modal="true" aria-labelledby="restart-title"><p class="eyebrow">A FRESH PAGE</p><h2 id="restart-title">Start a new trip?</h2><p>This replaces your current saved journey and postcard collection.</p><div class="modal-actions"><button class="secondary" @click="confirmRestart=false">Keep this trip</button><button class="primary" @click="restart">Start fresh</button></div></section>
  <section v-else-if="cardView" class="modal collection-modal" role="dialog" aria-modal="true" aria-labelledby="collection-title"><div class="collection-title"><div><p class="eyebrow">YOUR ROADSIDE COLLECTION</p><h2 id="collection-title">Wish you were here.</h2></div><button class="text-button" @click="cardView=false">Close</button></div><p>{{ state.cards.length }} postcards · {{ provinces }} provinces visited · {{ score(state).toLocaleString() }} points</p><div class="postcard-grid"><article v-for="id in state.cards" :key="id" :class="['collected-card',stopById(id).type]"><div class="postcard-art"><span class="postmark">CANADA<br>BY ROAD</span><svg viewBox="0 0 260 110" aria-hidden="true"><circle cx="193" cy="31" r="17" fill="#f4c56d"/><path v-if="stopById(id).type==='mountain'" d="M0 110L65 26 112 90 153 15 235 110Z" fill="#3b7067"/><path v-else-if="stopById(id).type==='city'" d="M30 110V55H55V110M75 110V39H105V110M124 110V61H157V110M180 110V43H210V110" stroke="#326860" stroke-width="24"/><path v-else-if="stopById(id).type==='prairie'" d="M0 71Q75 39 145 72T260 71V110H0Z" fill="#bd964c"/><path v-else d="M0 75Q60 43 129 77T260 68V110H0Z" fill="#3b7067"/><path d="M0 96Q72 80 130 99T260 91V110H0Z" fill="#8dbeb5"/></svg></div><h3>{{ stopById(id).name }}</h3><p>{{ stopById(id).card }}</p></article></div></section>
  <section v-else class="modal intro-modal" role="dialog" aria-modal="true" aria-labelledby="intro-title"><div class="intro-art"><svg viewBox="0 0 600 170" aria-hidden="true"><circle cx="470" cy="45" r="27" fill="#f5c372"/><path d="M0 170L104 38 196 142 281 12 412 170Z" fill="#72978a"/><path d="M190 170L340 50 450 165 544 61 600 120V170Z" fill="#315f55"/><path d="M0 150Q150 108 300 150T600 144V170H0Z" fill="#c4cf9c"/><path d="M270 170L301 119 333 170" fill="#f5ead3"/><rect x="293" y="126" width="33" height="25" rx="5" fill="#d96f45"/><rect x="299" y="131" width="21" height="9" rx="2" fill="#f8edcb"/><circle cx="299" cy="151" r="4" fill="#254c44"/><circle cx="321" cy="151" r="4" fill="#254c44"/></svg></div><div class="intro-content"><p class="eyebrow">ONE VAN. TWO OCEANS. YOUR ROUTE.</p><h2 id="intro-title">The best part is<br><em>what’s in between.</em></h2><p>Get from Vancouver to St. John’s in <strong>32 game days</strong> with <strong>$1,500</strong>. Your route is yours to choose.</p><ol class="how-list"><li><b>Pick a road.</b> Compare time, fuel, money and van wear before every leg.</li><li><b>Keep rolling.</b> Refuel, rest every five legs, and repair when condition runs low.</li><li><b>Make it memorable.</b> Spend a day at a stop to collect its postcard. Aim for seven or more.</li></ol><p class="small-note">Tap or click the controls. Tab and Enter work too. No timer. Your trip saves on this device when storage is available. This map and all travel costs are fictional game abstractions.</p><button class="primary" @click="help=false;state.status==='ready'&&begin()">{{ state.status==='ready'?'Start your trip':'Back to the road' }}</button></div></section>
 </div>
</template>
