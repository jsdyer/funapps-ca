import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
for(const script of scripts)new vm.Script(script);
let source=scripts.at(-1);
const elements=new Map();
function element(){return {style:{},dataset:{},hidden:false,innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){},contains(){return false}},setAttribute(){},addEventListener(){},removeEventListener(){},focus(){},appendChild(){},append(){},remove(){},querySelector(){return element()},querySelectorAll(){return []},getBoundingClientRect(){return {left:0,top:0,width:500,height:500}},clientWidth:500,clientHeight:500,firstChild:{textContent:''}};}
const document={hidden:false,querySelector:s=>{if(!elements.has(s))elements.set(s,element());return elements.get(s)},querySelectorAll:()=>[],getElementById:s=>document.querySelector('#'+s),createElement:element,addEventListener(){},body:element()};
let time=0,nextId=1;const frames=new Map();
const sandbox={console,document,performance:{now:()=>time},localStorage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}},navigator:{},location:{href:'https://example.test/'},innerWidth:1000,innerHeight:700,requestAnimationFrame:f=>{const id=nextId++;frames.set(id,f);return id},cancelAnimationFrame:id=>frames.delete(id),setTimeout:()=>nextId++,clearTimeout(){},setInterval:()=>nextId++,clearInterval(){},addEventListener(){},removeEventListener(){}};
sandbox.window=sandbox;
const context=vm.createContext(sandbox);
function frame(ms=50){time+=ms;const current=[...frames.values()];frames.clear();for(const cb of current)cb(time);}
source=source.replace('window.__G={S,spawnGuest,serve,expire,fireEvent,startGame,endGame,AUDIO,assignNeed}', 'window.__G={S,SP,CD,loop,freshState,gameAfter,tickGameTimers}');
vm.runInContext(source,context);
const t=context.__G;t.S.screen='play';let count=0;t.gameAfter(()=>count++,100);t.S.paused=true;t.tickGameTimers(1);assert.equal(count,0);
t.S.paused=false;t.tickGameTimers(.11);assert.equal(count,1);
t.gameAfter(()=>count++,100);t.freshState();t.S.screen='play';t.tickGameTimers(1);assert.equal(count,1,'callbacks cannot leak into a new run');
t.SP.active=true;t.SP.pos=.4;t.SP.dirn=1;t.SP.speed=1;t.CD.active=true;t.CD.done=false;t.CD.t=6;t.S.paused=true;t.loop(1000);assert.equal(t.SP.pos,.4);assert.equal(t.CD.t,6,'pause freezes both minigames');
t.S.paused=false;document.hidden=true;t.loop(1100);assert.equal(t.SP.pos,.4);assert.equal(t.CD.t,6,'hidden tab freezes minigames');
console.log('PASS: syntax, pause timer freeze, new-run cleanup, rhythm/candle minigame pause');
