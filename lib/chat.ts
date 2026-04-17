import { collection, addDoc, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db } from "./firebase";
import { Message } from "@/types";

export const sendMessage = async (message: Omit<Message, "id" | "timestamp">) => {
  const docRef = await addDoc(collection(db, "messages"), {
    ...message,
    timestamp: new Date().toISOString(),
  });
  return docRef.id;
};

export const subscribeToMessages = (callback: (messages: Message[]) => void) => {
  const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
  });
};
export const createGroup = async (group: { name: string, description: string, visibility: "public"|"private", members: string[], ownerId: string }) => {
  const docRef = await addDoc(collection(db, "groups"), {
    ...group,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
};

export const subscribeToGroups = (callback: (groups: any[]) => void) => {
  const q = query(collection(db, "groups"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

export const subscribeToGroupMessages = (groupId: string, callback: (messages: Message[]) => void) => {
  const q = query(collection(db, "messages"), where("groupId", "==", groupId));
  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
    // Sort locally to avoid Missing Composite Index error on Firestore
    msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    callback(msgs);
  });
};
