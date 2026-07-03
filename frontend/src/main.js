import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import VueVirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import './style.css'
import api from './api' // Assume an axios instance

// Convert base64 VAPID string to Uint8Array for Web Push
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Service Worker & Web Push Registration
async function registerServiceWorkerAndPush() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker Registered');

      // Request Notification Permission
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Fetch VAPID Key from Backend
        const vapidRes = await api.get('/api/push/vapidPublicKey');
        const convertedVapidKey = urlBase64ToUint8Array(vapidRes.data.publicKey);

        // Subscribe to Push
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });

        // Send to backend
        await api.post('/api/push/subscribe', subscription);
        console.log('Push Notifications Subscribed!');
      }
    } catch (e) {
      console.error('PWA/Push setup failed:', e);
    }
  }
}
registerServiceWorkerAndPush();

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(VueVirtualScroller)

app.mount('#app')
