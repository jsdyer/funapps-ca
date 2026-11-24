import { createApp } from 'vue';
import QuickPlay from './QuickPlay.vue';
if(new URLSearchParams(location.search).get('mode')==='planner'){
 Promise.all([import('./App.vue'),import('./style.css')]).then(([{default:App}])=>createApp(App).mount('#app'));
}else createApp(QuickPlay).mount('#app');
