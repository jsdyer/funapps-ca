<script lang="ts">
  import {onMount} from 'svelte';
  import {initialHarvest,startHarvest,pickHarvest,tickHarvest,pauseHarvest,resumeHarvest} from './arcade-engine';
  let farm=$state.raw(initialHarvest());
  let best=$state(0);
  let frame=0,last=0;
  let reduced=$state(false);
  let popPlot=$state(-1);
  let popUntil=0;
  const time=$derived(Math.ceil(farm.remaining));
  function begin(){farm=startHarvest();last=0;popPlot=-1;}
  function pick(index:number){if(farm.status==='ready')begin();const before=farm;farm=pickHarvest(farm,index);if(farm!==before){popPlot=index;popUntil=performance.now()+450;}}
  function pause(){farm=farm.status==='paused'?resumeHarvest(farm):pauseHarvest(farm);last=0;}
  function autoPause(){farm=pauseHarvest(farm);last=0;}
  function key(event:KeyboardEvent){
    if(event.metaKey||event.ctrlKey||event.altKey||event.repeat)return;
    const el=event.target as HTMLElement;
    if(['INPUT','TEXTAREA','SELECT'].includes(el?.tagName))return;
    if(/^[1-9]$/.test(event.key)){event.preventDefault();pick(Number(event.key)-1);}
    else if(['p','P','Escape'].includes(event.key)){event.preventDefault();pause();}
    else if(event.code==='Space'&&!['BUTTON','A'].includes(el?.tagName)){event.preventDefault();if(farm.status==='ready'||farm.status==='finished')begin();else pause();}
  }
  onMount(()=>{
    try{best=Math.max(0,Number(localStorage.getItem('funapps-pei-quick-best'))||0);}catch{}
    const media=matchMedia('(prefers-reduced-motion: reduce)');reduced=media.matches;
    const motion=()=>reduced=media.matches;media.addEventListener('change',motion);
    const visibility=()=>{if(document.hidden)autoPause();};
    document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',autoPause);
    const loop=(now:number)=>{const dt=last?Math.min((now-last)/1000,.1):0;last=now;const status=farm.status;farm=tickHarvest(farm,dt);if(popPlot!==-1&&now>popUntil)popPlot=-1;if(status==='playing'&&farm.status==='finished'){best=Math.max(best,farm.score);try{localStorage.setItem('funapps-pei-quick-best',String(best));}catch{}}frame=requestAnimationFrame(loop);};frame=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(frame);media.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',autoPause);};
  });
</script>
<svelte:window onkeydown={key}/>
<svelte:head><title>PEI Potato Harvest — Red Soil Rush | FunApps</title><meta name="description" content="Potatoes are popping out of PEI’s red soil! Tap the golden potatoes, leave the rocks, and bring in a quick 45-second harvest."/></svelte:head>
<div class="harvest-game" class:demo={farm.status==='ready'} class:paused={farm.status==='paused'} class:reduced>
<header><a class="brand" href="https://funapps.ca/">f<span>.</span></a><div class="title"><p>PRINCE EDWARD ISLAND</p><h1>Potato Harvest<span>Red soil rush.</span></h1></div><a class="planner" href="?mode=planner">Season planner</a><button class="pause" onclick={pause} disabled={!['playing','paused'].includes(farm.status)}>{farm.status==='paused'?'Resume':'Pause'}</button></header>
<main>
  <section class="hud" aria-label="Harvest score"><div><span>TIME</span><strong>{time}<small>s</small></strong></div><div><span>POTATOES</span><strong>{farm.harvested}</strong></div><div class="points"><span>POINTS</span><strong>{farm.score}</strong></div><div class="best"><span>BEST</span><strong>{best}</strong></div></section>
  <section class="field" aria-label="Potato field">
    <svg class="landscape" viewBox="0 0 1000 280" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="1000" height="280" fill="#9ed8e4"/><circle cx="787" cy="58" r="37" fill="#ffe68b"/>
      <g class="clouds" fill="#e3f4e8"><ellipse cx="130" cy="50" rx="60" ry="10"/><ellipse cx="188" cy="66" rx="43" ry="8"/><ellipse cx="622" cy="39" rx="57" ry="10"/></g>
      <path d="M0 120Q120 100 250 125T520 119T800 127T1000 119V280H0Z" fill="#55a8b6"/><path d="M0 146Q180 58 350 135T700 127T1000 142V280H0Z" fill="#8eb55a"/><path d="M0 189Q220 93 438 168T1000 166V280H0Z" fill="#608744"/>
      <g transform="translate(688 111)"><rect x="0" y="0" width="93" height="60" fill="#fff4d7"/><path d="M-10 6 45-36 103 6Z" fill="#b7503e"/><rect x="36" y="26" width="22" height="34" fill="#a94735"/><rect x="12" y="18" width="15" height="18" fill="#75bbc9"/><rect x="68" y="18" width="15" height="18" fill="#75bbc9"/><path d="M111 36h142m-136-16v45m39-45v45m39-45v45m39-45v45" stroke="#fff4d7" stroke-width="7"/></g>
      <path d="M0 209Q350 153 1000 209V280H0Z" fill="#b95837"/><path d="M0 244Q350 179 1000 243M0 267Q350 197 1000 267" fill="none" stroke="#d88151" stroke-width="9"/>
    </svg>
    <div class="field-heading"><span>FRESH FROM THE ISLAND</span><span class="breeze">✦ A good day for digging.</span></div>
    <div class="plots">
    {#each farm.plots as crop,index}
      <button class="plot" class:potato={crop?.kind==='potato'} class:rock={crop?.kind==='rock'} class:empty={!crop} class:success={popPlot===index&&farm.lastGood} class:ouch={popPlot===index&&!farm.lastGood} style={`--plot:${index};--demo-delay:${index*.37}s`} onclick={()=>pick(index)} disabled={['paused','finished'].includes(farm.status)} aria-label={`${crop?.kind==='potato'?'Harvest potato':crop?.kind==='rock'?'Rock — leave it':'Empty soil'} at plot ${index+1} (key ${index+1})`}>
        <span class="soil-back"></span>
        <span class="crop-wrap">
        {#if crop?.kind==='potato'}
          <svg class="crop-art" viewBox="0 0 160 140" aria-hidden="true"><path d="M74 37Q58 7 41 18Q43 44 74 46M77 36Q90 4 115 12Q113 43 81 47" fill="#89ad45"/><path d="M77 49V22" stroke="#4f8039" stroke-width="7" stroke-linecap="round"/><path d="M39 56C58 31 103 38 117 61C140 101 111 130 72 129C36 128 17 99 39 56Z" fill="#edbc69"/><path d="M39 56C22 87 33 122 73 129C42 124 49 75 64 47Z" fill="#d89547"/><path d="M65 61 69 60M99 78 103 77M67 107 71 108M98 107 100 108" stroke="#b87a42" stroke-width="5" stroke-linecap="round"/><path d="M76 74q9-11 18-5" fill="none" stroke="#ffd799" stroke-width="8" stroke-linecap="round"/></svg>
        {:else if crop?.kind==='rock'}
          <svg class="crop-art stone" viewBox="0 0 160 140" aria-hidden="true"><path d="M25 113 35 70 67 47 107 55 135 99 123 123H42Z" fill="#797b8b"/><path d="m35 70 42 15 30-30-40-8Z" fill="#a7adb3"/><path d="m77 85 58 14-12 24H74Z" fill="#5a6273"/><path d="m49 69 17-8m22 8 9-4" stroke="#ccd0ce" stroke-width="5" stroke-linecap="round"/></svg>
        {/if}
        </span><span class="soil-front"></span><kbd>{index+1}</kbd>
        {#if crop}<span class="life" aria-hidden="true"><i style={`transform:scaleX(${crop.life/crop.duration})`}></i></span>{/if}
        {#if popPlot===index}<span class="pop-score">{farm.lastGood?'+':'−'}{farm.lastGood?10+Math.min(10,Math.floor(farm.combo/5)*2):10}</span>{/if}
      </button>
    {/each}
    </div>
    {#if farm.status!=='playing'}
    <div class="play-card">
      {#if farm.status==='ready'}<p class="eyebrow">45 SECONDS · ONE BIG HARVEST</p><h2>They’re popping up!</h2><p>Tap potatoes. Leave the rocks.</p><button class="play" onclick={begin}>Start picking</button><small>Or tap a potato · keys 1–9</small>
      {:else if farm.status==='paused'}<p class="eyebrow">TOOLS DOWN</p><h2>A little breather.</h2><button class="play" onclick={pause}>Back to the field</button><button class="text" onclick={begin}>Start a fresh harvest</button>
      {:else}<p class="eyebrow">HARVEST COMPLETE</p><h2>Some good spuds.</h2><strong class="result-score">{farm.score}</strong><p>{farm.harvested} potatoes in the basket.</p><button class="play" onclick={begin}>Pick another batch</button>{/if}
    </div>
    {/if}
  </section>
  <div class="basket-bar"><div class="basket" aria-hidden="true">▤<span>🥔</span></div><p role="status" aria-live="polite">{farm.feedback}</p>{#if farm.combo>=5}<span class="combo">{farm.combo} in a row</span>{/if}</div>
</main>
<footer><span>Red soil. Salt air. Very quick potatoes.</span><span>Tap or use 1–9 · P to pause</span></footer>
</div>
<style>
:global(*){box-sizing:border-box}:global(html),:global(body){margin:0;min-height:100%;background:#244c43;color:#3d322b;font-family:Inter,ui-sans-serif,system-ui,sans-serif}:global(button),:global(a){-webkit-tap-highlight-color:transparent}:global(button){font:inherit;cursor:pointer;touch-action:manipulation}:global(button:focus-visible),:global(a:focus-visible){outline:4px solid #f9d77c;outline-offset:4px}:global(button:disabled){cursor:default}.harvest-game{max-width:1100px;min-height:100dvh;margin:auto;padding:12px 22px 10px;background:#fff4dc;display:flex;flex-direction:column}header{display:flex;gap:17px;align-items:center;padding-bottom:12px}.brand{text-decoration:none;font-weight:900;font-size:40px;line-height:1;color:#315e4b}.brand span{color:#ca5a39}.title p{margin:0 0 4px;color:#926646;letter-spacing:.15em;font-weight:900;font-size:10px}.title h1{font-family:Georgia,serif;font-size:27px;margin:0;line-height:1}.title h1 span{display:inline;font:500 13px system-ui;margin-left:12px;color:#ac7752}.planner{margin-left:auto;font-size:13px;color:#74694c}.pause{font-size:14px;font-weight:800;padding:10px 16px;border:1px solid #c6c99d;border-radius:9px;background:#edf0d2;color:#405d40}.pause:disabled{opacity:.45}main{display:flex;flex-direction:column;flex:1}.hud{display:flex;gap:38px;border:1px solid #dbc9ab;border-radius:16px 16px 0 0;background:#fffaf0;padding:10px 22px}.hud div{display:flex;align-items:center;gap:9px}.hud span{font-size:11px;letter-spacing:.08em;font-weight:900;color:#947b5b}.hud strong{font-size:26px;font-variant-numeric:tabular-nums}.hud strong small{font-size:15px;padding-left:2px}.points{margin-left:auto}.best strong{color:#ba9576}.field{position:relative;isolation:isolate;overflow:hidden;border:1px solid #9d4d30;border-top:0;background:#b95938;min-height:430px;height:clamp(430px,67dvh,650px);border-radius:0 0 15px 15px;box-shadow:inset 0 -10px #934528}.landscape{position:absolute;inset:0 0 auto;width:100%;height:37%;min-height:165px}.clouds{animation:cloud 34s linear infinite}.field-heading{position:absolute;top:16px;left:22px;right:22px;display:flex;justify-content:space-between;color:#325d56;letter-spacing:.1em;font-size:10px;font-weight:900}.breeze{letter-spacing:0;color:#47786d;font-weight:600}.plots{position:absolute;top:27%;bottom:20px;left:12%;right:12%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);column-gap:20px;row-gap:2px}.plot{position:relative;isolation:isolate;min-width:0;min-height:0;border:0;padding:0;background:transparent;border-radius:45%;touch-action:manipulation}.plot:focus-visible{outline-offset:1px}.soil-back{position:absolute;bottom:6%;left:7%;right:7%;height:38%;background:#633925;border-radius:50%;box-shadow:0 -5px #9a452b,0 5px #d9844f}.soil-front{position:absolute;left:5%;right:5%;bottom:0;height:27%;border-radius:0 0 50% 50%;background:#b95938;border-top:6px solid #dc8e55;z-index:3}.soil-front:after{content:'';position:absolute;left:10%;right:10%;bottom:20%;height:4px;background:#ca7043;transform:rotate(-2deg);border-radius:50%}.crop-wrap{position:absolute;bottom:5%;left:14%;right:14%;height:100%;overflow:hidden}.crop-art{height:100%;width:100%;transform-origin:bottom;animation:pop .2s ease-out;filter:drop-shadow(4px 3px 0 #64362222)}.stone{height:92%;margin-top:8%}.plot.potato:hover .crop-art{filter:brightness(1.15)}.plot:active .crop-art{transform:scale(.9)}kbd{position:absolute;left:9%;bottom:28%;z-index:5;font:700 11px system-ui;color:#d8a172;opacity:.8}.life{position:absolute;bottom:5%;left:30%;right:30%;height:4px;z-index:5;background:#7e382b;border-radius:5px;overflow:hidden}.life i{display:block;background:#ffe29c;width:100%;height:100%;transform-origin:left}.pop-score{position:absolute;z-index:8;top:10%;left:40%;font-size:30px;font-weight:900;color:#fff5bb;text-shadow:0 2px #784c25;animation:score .45s ease-out both;pointer-events:none}.ouch .pop-score{color:#ffded6}.play-card{position:absolute;z-index:10;top:52%;left:50%;transform:translate(-50%,-50%);background:#fff8e9f5;border:1px solid #fffce9;border-radius:20px;width:292px;padding:23px 21px;text-align:center;box-shadow:0 12px 40px #5d2a2c55}.eyebrow{font-weight:900;font-size:10px;letter-spacing:.1em;color:#a26b3c;margin:0 0 10px}.play-card h2{font:700 28px/1.08 Georgia,serif;margin:5px 0 12px}.play-card p:not(.eyebrow){font-size:14px;margin:10px 0 15px}.play-card small{display:block;color:#997b5e;font-size:11px;margin-top:11px}.play{display:block;width:100%;border:0;border-radius:12px;padding:15px;background:#477c43;box-shadow:0 4px #2a532b;font-size:18px;font-weight:850;color:#fff9df}.play:active{transform:translateY(3px);box-shadow:0 1px #2a532b}.text{background:none;border:0;text-decoration:underline;color:#8f745a;padding:14px 0 0;font-size:12px}.result-score{font-size:42px;color:#527242}.basket-bar{display:flex;align-items:center;gap:15px;min-height:60px;padding:10px 18px;background:#eee8c8;border:1px solid #dacead;border-radius:14px;margin-top:9px}.basket{position:relative;font-size:40px;line-height:1;color:#926037;width:46px;flex-shrink:0}.basket span{position:absolute;left:8px;top:-5px;font-size:23px;transform:rotate(-15deg)}.basket-bar p{margin:0;font-weight:750;font-size:15px}.combo{margin-left:auto;font-size:12px;font-weight:900;color:#527942;white-space:nowrap}footer{display:flex;justify-content:space-between;padding-top:8px;font-size:11px;color:#96785e}.demo .crop-art{animation:peek 3.8s ease-in-out infinite;animation-delay:var(--demo-delay)}.paused *{animation-play-state:paused!important}@keyframes pop{from{transform:translateY(80%)}to{transform:translateY(0)}}@keyframes peek{0%,100%{transform:translateY(85%)}20%,75%{transform:translateY(0)}}@keyframes score{from{transform:translateY(0);opacity:1}to{transform:translateY(-30px);opacity:0}}@keyframes cloud{to{transform:translateX(-150px)}}@media(max-width:650px){.harvest-game{padding:10px 10px 8px}header{gap:10px}.brand{font-size:30px}.title p{font-size:8px}.title h1{font-size:21px}.title h1 span{display:none}.planner{font-size:11px;max-width:50px;line-height:1.15}.pause{font-size:12px;padding:9px}.hud{gap:14px;padding:9px 12px}.hud div{flex-direction:column;align-items:flex-start;gap:2px}.hud span{font-size:9px}.hud strong{font-size:23px}.field{height:clamp(390px,65dvh,600px);min-height:390px}.field-heading{left:12px;right:12px;font-size:8px}.breeze{display:none}.plots{left:4%;right:4%;top:26%;bottom:18px;column-gap:5px;row-gap:8px}.crop-wrap{left:5%;right:5%}.soil-front{border-top-width:4px}.play-card{width:245px;padding:19px 17px}.play-card h2{font-size:24px}.play{font-size:17px;padding:13px}.basket-bar{gap:10px;padding:7px 10px;min-height:54px}.basket-bar p{font-size:12px}.combo{font-size:10px}.basket{font-size:33px;width:36px}.basket span{font-size:19px}footer{font-size:9px}footer span:last-child{display:none}kbd{font-size:10px;left:8%}}@media(max-height:700px) and (min-width:651px){.harvest-game{padding-top:7px}.field{min-height:350px;height:58dvh}.plots{top:27%}header{padding-bottom:8px}.hud{padding-block:7px}.basket-bar{min-height:45px;padding-block:4px}.title h1{font-size:23px}.basket{font-size:32px}.basket span{font-size:19px}}@media(prefers-reduced-motion:reduce){:global(*),:global(*:before),:global(*:after){animation:none!important;transition:none!important}}.reduced .crop-art{animation:none!important}
</style>
