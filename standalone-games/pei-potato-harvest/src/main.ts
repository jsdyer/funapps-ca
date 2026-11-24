import { mount } from 'svelte';
const target=document.getElementById('app')!;
if(new URLSearchParams(location.search).get('mode')==='planner'){
  Promise.all([import('./App.svelte'),import('./styles.css')]).then(([{default:App}])=>mount(App,{target}));
}else{
  import('./Arcade.svelte').then(({default:Arcade})=>mount(Arcade,{target}));
}
