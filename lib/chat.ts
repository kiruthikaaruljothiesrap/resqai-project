import { collection, addDoc, query, orderBy, onSnapshot, where, updateDoc, arrayUnion, doc, deleteDoc } from "firebase/firestore";
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

export const joinGroup = async (groupId: string, userId: string) => {
  const groupRef = doc(db, "groups", groupId);
  await updateDoc(groupRef, {
    members: arrayUnion(userId)
  });
};

export const sendCommunityInvite = async (communityId: string, communityName: string, senderId: string, receiverId: string) => {
  const invite = {
    communityId,
    communityName,
    senderId,
    receiverId,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await addDoc(collection(db, "communityInvites"), invite);
};

export const subscribeToCommunityInvites = (userId: string, callback: (invites: any[]) => void) => {
  const q = query(collection(db, "communityInvites"), where("receiverId", "==", userId), where("status", "==", "pending"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

export const acceptCommunityInvite = async (inviteId: string, communityId: string, userId: string) => {
  const groupRef = doc(db, "groups", communityId);
  await updateDoc(groupRef, {
    members: arrayUnion(userId)
  });
  await updateDoc(doc(db, "communityInvites", inviteId), { status: "accepted" });
};

export const rejectCommunityInvite = async (inviteId: string) => {
  await deleteDoc(doc(db, "communityInvites", inviteId));
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

export const subscribeToDirectMessages = (userId1: string, userId2: string, callback: (messages: Message[]) => void) => {
  const dmId = [userId1, userId2].sort().join('_');
  const q = query(collection(db, "messages"), where("dmId", "==", dmId));
  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
    msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    callback(msgs);
  });
};
