// --------- Style imports
import '~/styles/fontsLoader.styl';
import '~/styles/global.styl';

// --------- Code imports
import { createApp } from 'vue';

import App from '~/App.vue';
import { createPinia } from 'pinia';
import createVueRouter from '~/Router';

import swAPI from '~/serviceWorker/swAPI';

// --------- Init WS
await swAPI.register();

// -------- Create App
const pinia = createPinia();
const router = createVueRouter();
createApp(App).use(pinia).use(router).mount('#app');
