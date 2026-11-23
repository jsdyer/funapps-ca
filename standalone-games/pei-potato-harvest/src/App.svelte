<script lang="ts">
  import { initialState, VARIETIES, WEATHER, ORDERS, plant, waterField, refill, compost, ready, expectedYield, harvest, orderAvailable, deliver, sellSurplus, advance, result } from './engine';
  import type { Variety, State } from './engine';
  let farm: State = $state.raw(initialState());
  let selected = $state(0);
  let welcome = $state(true);
  let help = $state(false);
  let confirmRestart = $state(false);
  let confirmAdvance = $state(false);
  let best = $state(0);
  try { best = Math.max(0, Number(localStorage.getItem('funapps-pei-harvest-best')) || 0); } catch {}
  const field = $derived(farm.fields[selected]);
  const crop = $derived(field.crop);
  const weather = $derived(WEATHER[farm.day - 1]);
  const summary = $derived(result(farm));
  const locked = $derived(farm.actions === 0 || farm.finished);
  const varieties = Object.keys(VARIETIES) as Variety[];
  function act(next: State) { farm = next; confirmAdvance = false; }
  function nextTurn() {
    if (farm.actions > 0 && !confirmAdvance) { confirmAdvance = true; return; }
    farm = advance(farm); confirmAdvance = false;
    if (farm.finished && summary.score > best) { best = summary.score; try { localStorage.setItem('funapps-pei-harvest-best', String(best)); } catch {} }
  }
  function restart() { farm = initialState(); selected = 0; confirmRestart = false; confirmAdvance = false; welcome = false; }
  function modalFocus(node: HTMLElement) {
    const previous = document.activeElement as HTMLElement | null;
    node.focus();
    function trap(event: KeyboardEvent) {
      if (event.key === 'Tab') {
        const nodes = Array.from(node.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]'));
        if (!nodes.length) return;
        if (event.shiftKey && (document.activeElement === nodes[0] || document.activeElement === node)) { event.preventDefault(); nodes.at(-1)!.focus(); }
        else if (!event.shiftKey && (document.activeElement === nodes.at(-1) || document.activeElement === node)) { event.preventDefault(); nodes[0].focus(); }
      }
    }
    node.addEventListener('keydown', trap);
    return { destroy() { node.removeEventListener('keydown', trap); previous?.focus(); } };
  }
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape') { help = false; confirmRestart = false; confirmAdvance = false; } }}/>

<div class="app-shell" inert={welcome || help || confirmRestart || farm.finished}>
  <header class="topbar">
    <a href="https://funapps.ca" class="brand"><span class="brand-mark">f.</span> FunApps <span class="brand-divider">/</span> Island collection</a>
    <div class="top-actions"><span class="built-tag">PEI · CANADA</span><button class="quiet" onclick={() => help = true}>How to play</button><button class="quiet" onclick={() => confirmRestart = true}>New season</button></div>
  </header>

  <main>
    <section class="hero">
      <div class="hero-copy"><div class="eyebrow">A little land. A whole lot of possibility.</div><h1>Potato <em>Harvest</em><span class="title-dot">.</span></h1><p>Tend the red earth. Read the sky.<br/>Bring a little Island goodness to the table.</p><div class="season-stamp"><span>PRINCE EDWARD ISLAND</span><strong>YOUR FIRST SEASON</strong></div></div>
      <svg class="hero-art" viewBox="0 0 580 270" role="img" aria-label="Illustration of rolling red-soil fields, a farmhouse and a sea-blue horizon on Prince Edward Island">
        <defs><clipPath id="hill"><path d="M0 175 Q160 90 330 165 Q480 110 580 155 V270H0Z"/></clipPath></defs>
        <rect width="580" height="270" fill="#dce9e1"/><circle cx="440" cy="61" r="34" fill="#efd48c"/>
        <path d="M0 129 Q100 114 190 133 T390 126 T580 125V205H0Z" fill="#9bbbbe"/>
        <path d="M0 157 Q150 105 290 153 T580 150 V270H0Z" fill="#7c986d"/>
        <path d="M0 175 Q160 90 330 165 Q480 110 580 155 V270H0Z" fill="#bd7651"/>
        <g clip-path="url(#hill)" stroke="#d99b6a" stroke-width="12" fill="none"><path d="M-50 310Q110 120 390 130"/><path d="M0 330Q160 133 450 137"/><path d="M70 340Q220 142 520 145"/><path d="M155 340Q295 151 610 158"/><path d="M250 340Q370 168 650 180"/><path d="M360 340Q430 190 650 210"/></g>
        <g transform="translate(300 98)"><rect x="8" y="15" width="68" height="47" rx="2" fill="#f6efd9"/><path d="M0 18L42-9L84 18Z" fill="#405849"/><rect x="36" y="34" width="17" height="28" fill="#ae5946"/><rect x="17" y="27" width="11" height="12" fill="#799c9c"/><rect x="60" y="27" width="10" height="12" fill="#799c9c"/><rect x="61" y="-7" width="8" height="17" fill="#ba6b50"/></g>
        <g transform="translate(177 138)"><path d="M0 0L-12 37H12Z" fill="#395746"/><rect x="-2" y="32" width="4" height="14" fill="#644c36"/><path d="M-26 12L-37 44H-15Z" fill="#49684c"/></g>
        <g transform="translate(440 201) rotate(-13)"><rect x="0" y="-21" width="43" height="18" rx="4" fill="#d6a449"/><rect x="4" y="-40" width="24" height="24" rx="3" fill="#cf8b36"/><rect x="9" y="-36" width="15" height="16" fill="#cce3db"/><circle cx="10" cy="0" r="13" fill="#38483b"/><circle cx="40" cy="0" r="9" fill="#38483b"/><circle cx="10" cy="0" r="5" fill="#d5ba79"/></g>
        <path d="M45 62q8-9 16 0q8-9 16 0M94 44q6-7 12 0q6-7 12 0" fill="none" stroke="#4c716b" stroke-width="2"/>
      </svg>
    </section>

    <section class="season-bar" aria-label="Farm resources">
      <div class="turn-block"><span class="eyebrow">GROWING SEASON</span><div><strong>{String(farm.day).padStart(2, '0')}</strong><span> / 12 turns</span></div></div>
      <div class="resource"><span class="resource-label">Work left</span><strong>{farm.actions}<small> / 4 actions</small></strong><div class="action-dots" aria-hidden="true">{#each [0,1,2,3] as dot}<i class:filled={dot < farm.actions}></i>{/each}</div></div>
      <div class="resource"><span class="resource-label">Farm funds</span><strong>${farm.cash}</strong><small>Seeds & soil care</small></div>
      <div class="resource"><span class="resource-label">Rain tank</span><strong>{farm.water}<small> / 12 barrels</small></strong><button class="text-btn" disabled={locked || farm.water === 12} onclick={() => act(refill(farm))}>Refill +6 · 1 action</button></div>
      <div class="resource order-progress"><span class="resource-label">Community orders</span><strong>{summary.core}<small> / 3 filled</small></strong><small>{farm.delivered.includes('chef') ? 'Chef’s bonus delivered' : summary.core === 3 ? 'Goal complete · try the bonus' : 'Fill all three to win'}</small></div>
    </section>

    <div class="game-layout">
      <section class="fields-area">
        <div class="section-heading"><div><div class="eyebrow">YOUR PATCH OF THE ISLAND</div><h2>Four fields, one good season.</h2></div><span class="tiny-note">Select a field to tend it</span></div>
        <div class="field-grid">
          {#each farm.fields as f, i}
            {@const isReady = ready(f)}
            <button class="field-card" class:selected={selected === i} class:ripe={isReady} onclick={() => selected = i} aria-pressed={selected === i} aria-label={`${f.name}, ${f.crop ? VARIETIES[f.crop.variety].name + (isReady ? ', ready to harvest' : ', growing') : 'empty field'}`}>
              <div class="field-topline"><span class="field-number">0{i + 1}</span><span class="field-status">{isReady ? 'READY TO LIFT' : f.crop ? 'GROWING' : 'READY TO PLANT'}</span></div>
              <svg class="field-art" viewBox="0 0 270 108" aria-hidden="true">
                <path d="M10 33L141 5L260 36L130 95Z" fill="#b96b4a"/><path d="M10 33L130 95L260 36V48L130 107L10 46Z" fill="#945035"/>
                <g stroke="#d89a6b" stroke-width="4"><path d="M33 34L143 83M59 28L169 72M86 22L196 62M113 16L222 51"/></g>
                {#if f.crop}
                  {#each [0,1,2] as row}{#each [0,1,2] as col}
                    <g transform={`translate(${54 + col*35 + row*22} ${28 + col*14 - row*8})`}>
                      {#if f.crop.age === 0}<ellipse cx="0" cy="2" rx="6" ry="3" fill="#74492e"/><path d="M0 1V-7M0-3L-5-7M0-3L5-8" stroke="#8aa15e" stroke-width="2"/>
                      {:else}<path d={`M0 4V${-8-Math.min(3,f.crop.age)*3}`} stroke="#496744" stroke-width="2"/><ellipse cx="-6" cy="-7" rx={5 + Math.min(3,f.crop.age)} ry="4" transform="rotate(25 -6 -7)" fill={f.crop.health < 50 ? '#b6a460' : '#5b7d49'}/><ellipse cx="5" cy="-13" rx={5 + Math.min(3,f.crop.age)} ry="4" transform="rotate(-25 5 -13)" fill={f.crop.health < 50 ? '#9b9655' : '#6e9152'}/>{#if f.crop.age > 1}<ellipse cx="-3" cy="-19" rx="5" ry="3" fill="#84a35d"/>{/if}{#if isReady}<ellipse cx="0" cy="5" rx="7" ry="5" fill={VARIETIES[f.crop.variety].color}/><circle cx="-2" cy="4" r="1" fill="#805b35"/>{/if}{/if}
                    </g>
                  {/each}{/each}
                {/if}
              </svg>
              <div class="field-name"><h3>{f.name}</h3><span>{f.crop ? VARIETIES[f.crop.variety].short : 'Open earth'}</span></div>
              <div class="field-footer"><span class="moisture" aria-label={`${f.moisture} of 4 moisture`}>{#each [1,2,3,4] as drop}<i class:wet={drop <= f.moisture}></i>{/each}<small>Moisture</small></span><span>{f.crop ? isReady ? `${expectedYield(f).premium + expectedYield(f).regular} crates` : `${f.crop.age}/${VARIETIES[f.crop.variety].days} grown` : `Soil ${f.fertility}%`}</span></div>
            </button>
          {/each}
        </div>
        <div class="forecast"><div class="weather-symbol" aria-hidden="true">{weather.icon}</div><div class="forecast-text"><span class="eyebrow">WHEN YOU END THIS TURN</span><h3>{weather.name}</h3><p>{weather.note}</p></div><div class="forecast-next"><span>Next forecast</span><strong>{WEATHER[farm.day]?.name ?? 'Season complete'}</strong></div></div>
        <div class="turn-controls"><p>{confirmAdvance ? `You have ${farm.actions} unused ${farm.actions === 1 ? 'action' : 'actions'}. End this turn anyway?` : farm.actions === 0 ? 'A good day’s work. Let the fields grow.' : 'Take up to four actions, then let the season move on.'}</p><div>{#if confirmAdvance}<button class="secondary" onclick={() => confirmAdvance = false}>Keep working</button>{/if}<button class="primary end-turn" onclick={nextTurn}>{farm.day === 12 ? 'Finish the season' : confirmAdvance ? 'Yes, end turn' : 'End turn & grow'}</button></div></div>
      </section>

      <aside class="field-inspector" aria-label="Selected field actions">
        <div class="inspector-heading"><span class="eyebrow">FIELD 0{selected+1}</span><h2>{field.name}</h2><span class="soil-tag">Red earth · soil {field.fertility}%</span></div>
        {#if !crop}
          <p class="inspector-copy">Choose what goes in the ground. Each planting takes one action.</p>
          <div class="seed-options">
            {#each varieties as variety}{@const v = VARIETIES[variety]}
              <button class="seed-choice" disabled={locked || farm.cash < v.cost || farm.day + v.days > 12} onclick={() => act(plant(farm, selected, variety))}><span class="potato-icon" style={`--potato:${v.color}`} aria-hidden="true"></span><span><strong>{v.name}</strong><small>{v.days} turns · up to {v.yield} crates</small></span><b>${v.cost}</b></button>
            {/each}
          </div>
          {#if farm.day > 7}<p class="small-note">Seeds that cannot ripen by turn 12 are unavailable.</p>{/if}
        {:else}
          <div class="crop-detail"><span class="potato-icon large" style={`--potato:${VARIETIES[crop.variety].color}`} aria-hidden="true"></span><h3>{VARIETIES[crop.variety].name}</h3><p>{ready(field) ? 'The crop is ready. Lift it while it’s lovely.' : `${VARIETIES[crop.variety].days - crop.age} more growing ${VARIETIES[crop.variety].days - crop.age === 1 ? 'turn' : 'turns'} until harvest.`}</p></div>
          <div class="health-row"><span>Crop health <b>{crop.health}%</b></span><div class="health-track"><i style={`width:${crop.health}%`} class:stressed={crop.health < 60}></i></div><small>{crop.health >= 80 ? 'Premium crop · all crates earn the best grade' : crop.health >= 60 ? 'Mixed grade · half the crates are premium' : crop.health >= 50 ? 'Regular grade · keep the crop watered' : 'Stressed · reduced yield'}</small></div>
          <button class="primary harvest-button" disabled={locked || !ready(field)} onclick={() => act(harvest(farm, selected))}>{ready(field) ? `Harvest ${expectedYield(field).regular + expectedYield(field).premium} crates · 1 action` : 'Still growing'}</button>
          {#if ready(field)}<p class="small-note">Leaving ripe potatoes for two more turns starts lowering their grade.</p>{/if}
        {/if}
        <div class="field-care"><button class="secondary" disabled={locked || farm.water < 2 || field.moisture === 4} onclick={() => act(waterField(farm, selected))}><span>Water field</span><small>1 action · 2 barrels · moisture to 4</small></button><button class="secondary" disabled={locked || farm.cash < 5 || field.fertility === 100} onclick={() => act(compost(farm, selected))}><span>Add compost</span><small>1 action · $5 · soil +40, crop health +20</small></button></div>
        <div class="field-tip"><span>GOOD TO KNOW</span><p>{crop && field.moisture + weather.moisture <= 0 && !ready(field) ? 'This forecast will leave your crop dry. Water now to avoid losing 20 health.' : 'Crops at 80% health or better harvest as premium. Regular crates still fill community orders.'}</p></div>
      </aside>
    </div>

    <section class="market-section">
      <div class="section-heading"><div><div class="eyebrow">FROM YOUR FIELDS TO THEIR TABLES</div><h2>The community order board.</h2></div><span class="tiny-note">Deliveries take 1 action · premium crates earn +$2 each</span></div>
      <div class="order-grid">{#each ORDERS as order}{@const done = farm.delivered.includes(order.id)}{@const available = orderAvailable(farm, order.id)}
        <article class="order-card" class:done class:bonus={order.premiumOnly}><div class="order-label">{order.premiumOnly ? 'BONUS ORDER' : 'COMMUNITY ORDER'}<span>{done ? '✓' : '○'}</span></div><h3>{order.name}</h3><p>{order.caption}</p><div class="order-requirement"><strong>{order.quantity} crates</strong><span>{order.variety ? VARIETIES[order.variety].name : 'Any premium potatoes'}</span></div><button class:available disabled={done || !available || locked} onclick={() => act(deliver(farm, order.id))}>{done ? 'Delivered with care' : available ? `Deliver · $${order.reward}${order.premiumOnly ? '' : '+'}` : `Gather crop · $${order.reward}${order.premiumOnly ? '' : '+'}`}</button></article>
      {/each}</div>
    </section>

    <div class="bottom-grid"><section class="storehouse"><div class="section-heading"><div><div class="eyebrow">FRESH FROM THE FIELD</div><h2>Your storehouse.</h2></div><span class="tiny-note">Stored crops keep until season’s end</span></div>{#each varieties as key}{@const x=farm.stock[key]}<div class="stock-row"><span class="potato-icon small" style={`--potato:${VARIETIES[key].color}`} aria-hidden="true"></span><strong>{VARIETIES[key].short}</strong><span>{x.regular} regular <b>·</b> {x.premium} premium</span><button class="text-btn" disabled={locked || x.regular + x.premium === 0} onclick={() => act(sellSurplus(farm,key))}>Sell all · ${x.regular*VARIETIES[key].price+x.premium*(VARIETIES[key].price+2)}</button></div>{/each}<p class="small-note">Keep crates for orders first. Farm-gate sales take 1 action; remaining stock sells automatically at the end.</p></section><section class="farm-journal"><div class="eyebrow">NOTES FROM THE FARM</div><h2>The day’s work.</h2><p class="latest-note" aria-live="polite" aria-atomic="true">{farm.log[0]}</p><ul>{#each farm.log.slice(1,4) as entry}<li>{entry}</li>{/each}</ul></section></div>
  </main>
  <footer><span>Made for a little Island escape.</span><span>Fictional farm · 12 compressed growing turns · <a href="https://www.tourismpei.com/askanislander/questions/when-is-the-potato-harvest-and-where-are-the-potato-fields" target="_blank" rel="noreferrer">Real PEI harvests</a></span><span>Built with Svelte + TypeScript</span></footer>
</div>

{#if welcome || help || confirmRestart || farm.finished}
  <div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1" use:modalFocus>
    {#if farm.finished}
      <span class="eyebrow">THE SEASON IS IN</span><div class="result-medal" aria-hidden="true">{summary.won ? '✦' : '❋'}</div><h2 id="modal-title">{summary.title}.</h2><p>{summary.won ? 'All three community orders delivered. The Island ate well, and you grew something good.' : 'The season has closed. Try a mix of crops, read the forecast, and save your harvest for the order board.'}</p><div class="result-stats"><div><strong>{summary.score}</strong><span>Season score</span></div><div><strong>${farm.cash}</strong><span>Farm funds</span></div><div><strong>{farm.harvested}</strong><span>Crates grown</span></div></div><p class="result-detail">{summary.core}/3 community orders · {farm.premiumHarvested} premium crates · Best score {best}</p><div class="modal-actions"><button class="primary" onclick={restart}>Grow another season</button><a class="secondary" href="https://funapps.ca">Back to FunApps</a></div>
    {:else if confirmRestart}
      <span class="eyebrow">A FRESH PATCH</span><h2 id="modal-title">Start a new season?</h2><p>Your current fields, crates and funds will be reset. Your best score stays.</p><div class="modal-actions"><button class="primary" onclick={() => confirmRestart = false}>Keep this season</button><button class="secondary" onclick={restart}>Start over</button></div>
    {:else}
      <span class="eyebrow">WELCOME TO YOUR LITTLE ISLAND FARM</span><h2 id="modal-title">Good things grow<br/>in red earth.</h2><p>Plan a twelve-turn season and fill <strong>three community orders</strong>. There’s no timer—just a little land, a weather forecast and your next good decision.</p>
      <ol class="how-list"><li><span>01</span><div><strong>Plant a little of everything.</strong><p>Select a field, then choose seeds. Reds take 3 growing turns, golds 4 and russets 5.</p></div></li><li><span>02</span><div><strong>Make four moves. Watch the sky.</strong><p>Planting, watering, harvesting and delivery each take one action. End a turn to apply its forecast and grow your crops. Dry crops lose health.</p></div></li><li><span>03</span><div><strong>Harvest, then deliver.</strong><p>Ready crops need lifting. Send crates to all three community orders to win. The chef’s premium order is a bonus.</p></div></li></ol>
      <div class="welcome-tip">First-season tip: plant reds, golds and russets in your first turn. Before a dry breeze, give growing fields enough water to stay above zero.</div><p class="small-note">Mouse, touch or Tab + Enter. Nothing happens until you end a turn. Reloading starts a new season; your best score is saved on this device.</p><button class="primary full" onclick={() => { welcome = false; help = false; }}>{welcome ? 'Let’s get planting' : 'Back to the fields'}</button>
    {/if}
  </div></div>
{/if}
