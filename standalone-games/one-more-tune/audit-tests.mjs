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
source=source.replace('})();',"globalThis.__test={newState,defaultMods,spawnBurst,getScores,loop,update,setState:s=>{state=s;mods=defaultMods()}};})();");
vm.runInContext(source,context);
const t=context.__test;
assert.equal(t.getScores().length,0,'blocked storage must not prevent loading');
context.localStorage.getItem=()=>'{"score":10}';assert.equal(t.getScores().length,0,'wrong save shape is ignored');
context.localStorage.getItem=()=> '[{"score":5,"set":1,"combo":1},{"score":"bad"}]';assert.equal(t.getScores().length,1);
const state=t.newState();state.running=true;t.setState(state);t.spawnBurst('tea',3);state.paused=true;t.loop(1000);
assert.equal(state.pendingSpawns.length,3);assert.equal(state.requests.length,0,'pause must freeze event spawns');
state.paused=false;t.update(.2);assert.equal(state.requests.length,2,'spawns advance with gameplay time');
assert.equal(state.pendingSpawns.length,1);t.setState(t.newState());assert.equal(t.newState().pendingSpawns.length,0);
console.log('PASS: syntax, blocked/corrupt saves, pause-safe event spawns, clean new run');
