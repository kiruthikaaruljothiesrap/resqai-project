// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing the generated config
// Note: We access config via query params injected by next config or hardcode
// If this isn't configured later, the service worker will silently fail without breaking the app.
try {
  const firebaseConfig = {
    apiKey: "replace_with_your_api_key_later",
    authDomain: "replace_with_your_auth_domain",
    projectId: "replace_with_your_project_id",
    storageBucket: "replace_with_your_storage_bucket",
    messagingSenderId: "replace_with_your_messaging_sender_id",
    appId: "replace_with_your_app_id"
  };

  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || 'ResQAI Update';
    const notificationOptions = {
      body: payload.notification?.body,
      icon: '/logo.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.log("FCM SW init skipped:", e.message);
}
