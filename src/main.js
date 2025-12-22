import { createApp } from 'vue'
import App from './App.vue'

// Vuetify (Material Design)
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'

import './assets/styles/main.css'

const vuetify = createVuetify({
	theme: {
		defaultTheme: 'dark'
	}
})

createApp(App)
	.use(vuetify)
	.mount('#app')
