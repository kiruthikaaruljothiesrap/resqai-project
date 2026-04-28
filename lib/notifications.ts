import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, where } from "firebase/firestore";
import app, { db } from "./firebase";

export interface AppNotification {
  id: string;
  userId: string; // The user receiving the notification
  title: string;
  body: string;
  type: "task_assigned" | "friend_request" | "system" | "broadcast" | "task";
  isRead: boolean;
  createdAt: string;
  link?: string;
}

// ---- FCM PUSH NOTIFICATIONS ----

export const requestFirebaseNotificationPermission = async (userId: string) => {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    try {
      const messaging = getMessaging(app);
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        if (!process.env.NEXT_PUBLIC_FCM_VAPID_KEY) {
          console.warn("FCM VAPID Key missing. Push notifications will not work.");
          return;
        }
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY
        });
        
        if (token) {
          // Save this token to the user document so the backend can send push messages
          const userRef = doc(db, "users", userId);
          await updateDoc(userRef, { fcmToken: token });
        }
      }
    } catch (error) {
      console.error("FCM Token generation failed:", error);
    }
  }
};

export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (typeof window !== "undefined") {
    try {
      const messaging = getMessaging(app);
      return onMessage(messaging, (payload) => {
        callback(payload);
      });
    } catch (e) {}
  }
  return () => {};
};

// ---- IN-APP NOTIFICATIONS ----

export interface CreateNotificationParams {
  userId: string;
  title: string;
  body: string;
  type: AppNotification["type"];
  link?: string;
}

export const createNotification = async ({ userId, title, body, type, link }: CreateNotificationParams) => {
  try {
    const notification: Omit<AppNotification, "id"> = {
      userId,
      title,
      body,
      type,
      isRead: false,
      createdAt: new Date().toISOString(),
      link,
    };
    
    await addDoc(collection(db, "notifications"), notification);
  } catch (error) {
    console.error("Failed to create in-app notification:", error);
  }
};

export const subscribeToNotifications = (userId: string, callback: (notifications: AppNotification[]) => void) => {
  const q = query(
    collection(db, "notifications"), 
    where("userId", "==", userId)
  );
  
  return onSnapshot(q, 
    (snapshot) => {
      let notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
      // Sort in memory to avoid missing index errors
      notifs.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(notifs);
    },
    (error) => {
      console.error("Firestore Error in subscribeToNotifications:", error);
    }
  );
};

export const markNotificationRead = async (notificationId: string) => {
  try {
    const ref = doc(db, "notifications", notificationId);
    await updateDoc(ref, { isRead: true });
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
  }
};
