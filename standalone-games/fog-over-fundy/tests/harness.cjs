const vm=require('node:vm');
function harness(html,exportCode){
 let now=1000,id=0;const timers=new Map(),rafs=new Map(),nodes=new Map(),winListeners={};
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.style={};this.children=[];this.className='';this.attributes={};this.listeners={};this.hidden=false;this.textContent='';this.isConnected=true;this._html='';const self=this;this.classList={contains:c=>self.className.split(/\s+/).includes(c),add:(...cs)=>{self.className=[...new Set([...self.className.split(/\s+/).filter(Boolean),...cs])].join(' ')},remove:(...cs)=>{self.className=self.className.split(/\s+/).filter(c=>!cs.includes(c)).join(' ')},toggle:(c,v)=>{v=v??!self.classList.contains(c);v?self.classList.add(c):self.classList.remove(c);return v}}}
  set innerHTML(v){this._html=v;for(const c of this.children)c.isConnected=false;this.children=[]}get innerHTML(){return this._html}
  appendChild(c){this.children.push(c);c.parentElement=this;return c}get firstElementChild(){return this.children[0]}
  setAttribute(k,v){this.attributes[k]=String(v)}getAttribute(k){return this.attributes[k]}
  addEventListener(k,fn,options={}){(this.listeners[k]??=[]).push({fn,options})}
  dispatch(k,event={}){const e={target:this,currentTarget:this,preventDefault(){},stopPropagation(){},button:0,pointerId:1,pointerType:'mouse',...event};for(const {fn,options}of this.listeners[k]||[])if(!options.signal?.aborted)fn(e);return e}
  querySelector(s){return this._qs??=new Element()}
  focus(){doc.activeElement=this}remove(){this.isConnected=false;if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this)}
  matches(s){return s.split(',').includes(this.tagName.toLowerCase())}
  getBoundingClientRect(){return {left:0,top:0,width:960,height:540}}
  setPointerCapture(){}
  getContext(){return new Proxy({createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)})}
 }
 const node=id=>{if(!nodes.has(id))nodes.set(id,new Element(id.match(/Btn$/)?'button':'div'));return nodes.get(id)};
 const doc={getElementById:node,querySelector:s=>node(s.slice(1)),createElement:t=>new Element(t),body:new Element('body'),addEventListener:(k,fn)=>(winListeners['document:'+k]??=[]).push(fn),hidden:false};
 const ctx={document:doc,window:{},devicePixelRatio:1,performance:{now:()=>now},localStorage:{getItem(){throw Error('storage blocked')},setItem(){throw Error('storage blocked')}},AbortController,console,Math,Set,Map,Number,Array,setTimeout:(fn,ms)=>{const n=++id;timers.set(n,{fn,due:now+ms});return n},clearTimeout:n=>timers.delete(n),requestAnimationFrame:fn=>{const n=++id;rafs.set(n,fn);return n},cancelAnimationFrame:n=>rafs.delete(n),addEventListener:(k,fn)=>(winListeners[k]??=[]).push(fn)};
 vm.createContext(ctx);let js=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].at(-1)[1];if(js.includes('})();'))js=js.replace(/\}\)\(\);\s*$/,exportCode+'\n})();');else js+='\n'+exportCode;vm.runInContext(js,ctx);
 return {ctx,node,doc,run:s=>vm.runInContext(s,ctx),timers,rafs,setTime:t=>now=t,advance:ms=>{now+=ms;for(const[n,t]of [...timers])if(t.due<=now){timers.delete(n);t.fn()}},frame:ms=>{now+=ms;for(const[n,fn]of [...rafs]){rafs.delete(n);fn(now)}},event:(k,e={})=>{for(const fn of winListeners[k]||[])fn({target:node('game'),preventDefault(){},stopPropagation(){},repeat:false,...e})}};
}
module.exports={harness};
