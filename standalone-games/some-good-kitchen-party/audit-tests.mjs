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
// Exercise the delivery guard without requiring a WebGL context.
const delivery=source.slice(source.indexOf('function deliver(g){'),source.indexOf('// ------------------------------------------------',source.indexOf('function deliver(g){')));
// Only the first guard needs to run for an already-served or mismatched guest.
const fnStart=delivery.indexOf('function deliver(g){');const guard=delivery.slice(fnStart,delivery.indexOf("  g.state='served'"))+'return "accepted"; }';
context.S={carrying:'TEA'};vm.runInContext(guard,context);
assert.equal(context.deliver({state:'served',item:'TEA'}),undefined,'served guests cannot be scored twice');
assert.equal(context.deliver({state:'waiting',item:'SNACK'}),undefined,'wrong item cannot be delivered');
assert.equal(context.deliver({state:'waiting',item:'TEA'}),'accepted');
context.S.carrying=null;assert.equal(context.deliver({state:'waiting',item:null}),undefined,'empty hands cannot deliver');
const interactStart=source.indexOf('function interact(){');const interactEnd=source.indexOf('function setCarry',interactStart);
context.AU={ensure(){}};context.S={mode:'play',paused:false};context.currentTarget={type:'guest',ref:{state:'served'}};context.findTarget=()=>null;
vm.runInContext(source.slice(interactStart,interactEnd),context);context.interact();assert.equal(context.currentTarget,null,'action recomputes the current target');
assert.match(html,/This game needs WebGL/);assert.match(html,/Back to FunApps/);
console.log('PASS: syntax, duplicate/wrong-item delivery guard, fresh action targets, WebGL fallback');
