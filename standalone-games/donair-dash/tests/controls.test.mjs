import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createGame,startGame,setPlayer} from '../engine.mjs';

const source=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
function controls(){
  const handlers=new Map(),game=startGame(createGame());
  const elements=new Map();
  const $=id=>{if(!elements.has(id))elements.set(id,{
    addEventListener(name,fn){handlers.set(`${id}:${name}`,fn);},
    getBoundingClientRect(){return {left:0,width:1000};},setPointerCapture(){},focus(){}
  });return elements.get(id);};
  const context=vm.createContext({game,setPlayer,$,canvas:$('canvas')});
  const start=source.indexOf('function aim('),end=source.indexOf('function resize()',start);
  vm.runInContext(`let pointer=null,controlDirection=0;const heldDirections=new Map();${source.slice(start,end)}\nglobalThis.direction=()=>controlDirection;`,context);
  const fire=(id,type,options={})=>handlers.get(`${id}:${type}`)({pointerId:1,detail:1,clientX:500,preventDefault(){},...options});
  return {game,fire,direction:context.direction};
}

test('releasing a touch movement button does not add a surprise extra step',()=>{
  const {game,fire,direction}=controls();
  fire('right','pointerdown');assert.equal(direction(),1);
  const before=game.playerX;
  fire('right','pointerup');fire('right','click');
  assert.equal(game.playerX,before);assert.equal(direction(),0);
  fire('right','click',{detail:0});assert.ok(game.playerX>before);
});

test('releasing one touch keeps the other held movement active',()=>{
  const {fire,direction}=controls();
  fire('left','pointerdown',{pointerId:1});
  fire('right','pointerdown',{pointerId:2});assert.equal(direction(),0);
  fire('left','pointerup',{pointerId:1});assert.equal(direction(),1);
  fire('right','lostpointercapture',{pointerId:2});assert.equal(direction(),0);
});

test('canvas drag belongs to the original pointer and cancellation releases it',()=>{
  const {game,fire}=controls();
  fire('canvas','pointerdown',{pointerId:1,clientX:300});
  fire('canvas','pointerdown',{pointerId:2,clientX:800});
  fire('canvas','pointermove',{pointerId:2,clientX:900});assert.equal(game.playerX,.3);
  fire('canvas','pointerup',{pointerId:2});
  fire('canvas','pointermove',{pointerId:1,clientX:400});assert.equal(game.playerX,.4);
  fire('canvas','pointercancel',{pointerId:1});
  fire('canvas','pointermove',{pointerId:1,clientX:500});assert.equal(game.playerX,.4);
});
