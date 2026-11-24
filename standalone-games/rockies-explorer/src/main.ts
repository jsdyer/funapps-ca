import { mount } from 'svelte';
import QuickPlay from './QuickPlay.svelte';
if(new URLSearchParams(location.search).get('mode')==='planner'){
 Promise.all([import('./App.svelte'),import('./styles.css')]).then(([{default:App}])=>mount(App,{target:document.getElementById('app')!}));
}else mount(QuickPlay,{target:document.getElementById('app')!});
