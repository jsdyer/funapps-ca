import test from 'node:test';
import assert from 'node:assert/strict';

// Exercise the custom-element lifecycle against DOM contracts without a browser.
// Native HTMLElement.hidden coerces assigned values to Boolean; assigning an
// event callback to it both hides the element and invalidates the listener.
class ElementStub extends EventTarget {
  #hidden=false;
  nodes=new Map();
  dataset={};
  classList={toggle(){}};
  get hidden(){return this.#hidden;}
  set hidden(value){this.#hidden=Boolean(value);}
  querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new ElementStub());return this.nodes.get(selector);}
  querySelectorAll(){return [];}
  setAttribute(){}
  focus(){}
}

test('Fundy mounts visible with valid listeners, paints the start screen, and safely pauses',async()=>{
  const saved=new Map();
  const set=(name,value)=>{saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,writable:true,configurable:true});};
  let Game;
  const document=new EventTarget();document.hidden=false;document.getElementById=()=>new ElementStub();
  set('HTMLElement',ElementStub);set('document',document);set('window',new EventTarget());
  set('customElements',{define(name,constructor){assert.equal(name,'fundy-run');Game=constructor;}});
  set('matchMedia',()=>({matches:false}));set('localStorage',{getItem(){return null},setItem(){}});
  set('requestAnimationFrame',()=>1);set('cancelAnimationFrame',()=>{});
  try{
    await import('../web/run.js');
    const game=new Game();
    assert.doesNotThrow(()=>game.connectedCallback());
    assert.equal(game.hidden,false);
    assert.match(game.overlay.innerHTML,/Play boat run/);
    assert.equal(game.querySelector('#cargo').textContent,'0 / 10');
    game.start();
    const key=(repeat)=>({key:'p',code:'KeyP',repeat,target:{closest:()=>null},preventDefault(){}});
    game.keydown(key(false));assert.equal(game.s.phase,'paused');
    game.keydown(key(true));assert.equal(game.s.phase,'paused');
    game.axis=1;game.target=80;game.resume();assert.equal(game.axis,0);assert.equal(game.target,null);
    document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));assert.equal(game.s.phase,'paused');
    assert.doesNotThrow(()=>game.disconnectedCallback());
  }finally{
    for(const [name,descriptor] of saved)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
  }
});
