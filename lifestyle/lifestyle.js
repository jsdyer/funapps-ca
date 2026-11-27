(() => {
  'use strict';
  const main = document.querySelector('[data-app]');
  if (!main) return;
  const slug = main.dataset.app, form = main.querySelector('form');
  const records = [...main.querySelectorAll('.result')];
  const fields = [...form.querySelectorAll('select')];
  const money = cents => 'CAD $'+(cents/100).toFixed(2);
  const snapshot = JSON.parse(document.querySelector('#app-state').textContent);
  const sourceNote = document.querySelector('#source-note');
  let priceData = snapshot;
  const fresh = value => {
    const age = Date.now()-Date.parse(value?.checked);
    return Number.isFinite(age) && age>=-300000 && age<24*60*60*1000;
  };
  function priceFor(row) {
    const p = priceData.prices?.[row.dataset.id];
    return fresh(priceData) && p && Number.isInteger(p.cents) && p.cents>=0 ? p : null;
  }
  function update(){
    const values = Object.fromEntries(fields.map(field=>[field.name,field.value]));
    let shown=0;
    for(const row of records){
      const d=row.dataset;
      let match=fields.every(({name})=>{
        const value=values[name];
        if(!value || name==='sale')return true;
        if(name==='minutes')return Number(d.minutes)<=Number(value);
        if(name==='budget')return Number(d.cents)<=Number(value);
        return d[name]===value;
      });
      if(slug==='game-night'){
        const p=priceFor(row);
        const message=p ? money(p.cents)+(p.discount>0?' · '+p.discount+'% off':' · regular price') : 'Price unavailable · check Steam Canada';
        row.querySelector('.price').textContent=message;
        if(fresh(priceData))match=match&&!!p&&p.cents<1500&&(!values.sale||p.discount>0);
        else if(values.sale)match=false;
      }
      row.hidden=!match;if(match)shown++;
    }
    document.querySelector('#count').textContent=shown+' '+(shown===1?'pick':'picks')+(slug==='game-night'&&!fresh(priceData)?' to look up':'');
    document.querySelector('#no-results').hidden=shown!==0;
  }
  const params = new URLSearchParams(location.search);
  for(const field of fields)if([...field.options].some(o=>o.value===params.get(field.name)))field.value=params.get(field.name);
  function updateUrl(){
    const url=new URL(location.href);
    for(const f of fields){if(f.value)url.searchParams.set(f.name,f.value);else url.searchParams.delete(f.name);}
    history.replaceState(null,'',url);
    update();
  }
  form.addEventListener('change',updateUrl);
  form.addEventListener('reset',()=>setTimeout(updateUrl,0));
  form.hidden=false;
  if(slug==='canadian-finds'){
    let saved;
    try{const raw=JSON.parse(localStorage.getItem('funapps-gift-shortlist')||'[]');saved=new Set(Array.isArray(raw)?raw:[]);}catch{saved=new Set();}
    const total=document.querySelector('#shortlist-total');
    function drawTotal(){
      const picks=records.filter(r=>saved.has(r.dataset.id));
      const cents=picks.reduce((sum,row)=>sum+Number(row.dataset.cents),0);
      total.textContent=picks.length?picks.map(r=>r.querySelector('h2').textContent).join(' + ')+' · '+money(cents)+' before tax and shipping.':'Your shortlist is empty.';
    }
    for(const row of records){
      const box=row.querySelector('.shortlist');box.checked=saved.has(row.dataset.id);
      box.addEventListener('change',()=>{
        if(box.checked)saved.add(row.dataset.id);else saved.delete(row.dataset.id);
        try{localStorage.setItem('funapps-gift-shortlist',JSON.stringify([...saved]));}catch{}
        drawTotal();
      });
    }
    drawTotal();
  }
  update();
  if(slug==='game-night'){
    const displayTime=()=>new Intl.DateTimeFormat('en-CA',{dateStyle:'medium',timeStyle:'short',hour12:false}).format(new Date(priceData.checked));
    sourceNote.textContent=fresh(priceData)?'Saved Canadian prices checked '+displayTime()+'. Looking for a newer check…':'Checking Canadian prices. Until they load, these are unpriced suggestions.';
    fetch('/.netlify/functions/game-prices',{signal:AbortSignal.timeout(10000)})
      .then(async response=>{
        if(!response.ok)throw Error('unavailable');
        const latest=await response.json();
        if(!fresh(latest)||!latest.prices||!Object.keys(latest.prices).length)throw Error('no usable prices');
        priceData=latest;
        sourceNote.textContent='Canadian Steam prices checked '+displayTime()+'. Only games below $15 CAD are shown.';
      }).catch(()=>{
        sourceNote.textContent=fresh(priceData)?'Steam is temporarily unavailable. Showing saved prices checked '+displayTime()+'.':'Current prices are unavailable. These are unpriced suggestions. Check Steam before buying.';
      }).finally(update);
  }
})();
