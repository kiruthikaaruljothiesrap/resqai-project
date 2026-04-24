// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Avoid crashing if credentials aren't passed dynamically. 
// A full implementation requires firebase.initializeApp({ ... }) with matching config.
self.addEventListener('push', function(event) {
  console.log('[firebase-messaging-sw.js] Received background message ', event);
  
  if (event.data) {
     const payload = event.data.json();
     const notificationTitle = payload.notification?.title || 'ResQAI Update';
     const notificationOptions = {
       body: payload.notification?.body || 'New alert from ResQAI.',
       icon: '/logo.png'
     };

     event.waitUntil(
       self.registration.showNotification(notificationTitle, notificationOptions)
     );
  }
});
