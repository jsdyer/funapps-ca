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
source=source.replace('window.__SG={G,startRun,GAMES}', 'window.__SG={G,startRun,GAMES,ctx}');
vm.runInContext(source,context);
const {G,ctx}=context.__SG;const cx=ctx();let calls=0;
cx.after(100,()=>calls++);G.paused=true;for(let i=0;i<20;i++)frame();assert.equal(calls,0,'paused scheduled work must remain frozen');
G.paused=false;for(let i=0;i<3;i++)frame();assert.equal(calls,1,'scheduled callback runs once after resume');
let ticks=0;cx.every(100,()=>ticks++);document.hidden=true;for(let i=0;i<20;i++)frame();assert.equal(ticks,0,'hidden tab must not spawn enemies');
document.hidden=false;for(let i=0;i<3;i++)frame();assert.ok(ticks>0);cx.cleanup();const before=ticks;for(let i=0;i<10;i++)frame();assert.equal(ticks,before,'finished round releases its animation and interval work');
console.log('PASS: syntax, pause/hidden timer freeze, single delayed callback, round cleanup');
