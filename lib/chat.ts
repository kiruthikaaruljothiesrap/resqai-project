import { collection, addDoc, query, orderBy, onSnapshot, where, updateDoc, arrayUnion, doc, deleteDoc, limit } from "firebase/firestore";
import { db } from "./firebase";
import { Message } from "@/types";

export const sendMessage = async (message: Omit<Message, "id" | "timestamp">) => {
  try {
    const docRef = await addDoc(collection(db, "messages"), {
      ...message,
      timestamp: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Failed to send message:", error);
    throw error;
  }
};

export const subscribeToMessages = (callback: (messages: Message[]) => void) => {
  // Adding a limit to prevent connection issues with massive message history
  const q = query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(100));
  return onSnapshot(q, 
    (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      // Sort asc for UI
      msgs.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      callback(msgs);
    },
    (error) => {
      console.error("Firestore Error in subscribeToMessages:", error);
    }
  );
};

export const createGroup = async (group: { name: string, description: string, visibility: "public"|"private", members: string[], ownerId: string }) => {
  try {
    const docRef = await addDoc(collection(db, "groups"), {
      ...group,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Failed to create group:", error);
    throw error;
  }
};

export const joinGroup = async (groupId: string, userId: string) => {
  try {
    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, {
      members: arrayUnion(userId)
    });
  } catch (error) {
    console.error("Failed to join group:", error);
  }
};

export const sendCommunityInvite = async (communityId: string, communityName: string, senderId: string, receiverId: string) => {
  try {
    const invite = {
      communityId,
      communityName,
      senderId,
      receiverId,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await addDoc(collection(db, "communityInvites"), invite);
  } catch (error) {
    console.error("Failed to send community invite:", error);
  }
};

export const subscribeToCommunityInvites = (userId: string, callback: (invites: any[]) => void) => {
  const q = query(collection(db, "communityInvites"), where("receiverId", "==", userId), where("status", "==", "pending"));
  return onSnapshot(q, 
    (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    },
    (error) => {
      console.error("Firestore Error in subscribeToCommunityInvites:", error);
    }
  );
};

export const acceptCommunityInvite = async (inviteId: string, communityId: string, userId: string) => {
  try {
    const groupRef = doc(db, "groups", communityId);
    await updateDoc(groupRef, {
      members: arrayUnion(userId)
    });
    await updateDoc(doc(db, "communityInvites", inviteId), { status: "accepted" });
  } catch (error) {
    console.error("Failed to accept invite:", error);
  }
};

export const rejectCommunityInvite = async (inviteId: string) => {
  try {
    await deleteDoc(doc(db, "communityInvites", inviteId));
  } catch (error) {
    console.error("Failed to reject invite:", error);
  }
};

export const subscribeToGroups = (callback: (groups: any[]) => void) => {
  const q = query(collection(db, "groups"));
  return onSnapshot(q, 
    (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    },
    (error) => {
      console.error("Firestore Error in subscribeToGroups:", error);
    }
  );
};

export const subscribeToGroupMessages = (groupId: string, callback: (messages: Message[]) => void) => {
  const q = query(collection(db, "messages"), where("groupId", "==", groupId));
  return onSnapshot(q, 
    (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      callback(msgs);
    },
    (error) => {
      console.error("Firestore Error in subscribeToGroupMessages:", error);
    }
  );
};

export const subscribeToDirectMessages = (userId1: string, userId2: string, callback: (messages: Message[]) => void) => {
  const dmId = [userId1, userId2].sort().join('_');
  const q = query(collection(db, "messages"), where("dmId", "==", dmId));
  return onSnapshot(q, 
    (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      callback(msgs);
    },
    (error) => {
      console.error("Firestore Error in subscribeToDirectMessages:", error);
    }
  );
};
