import { collection, addDoc, query, orderBy, onSnapshot, doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc, deleteDoc, getDocs, where } from "firebase/firestore";
import { db } from "./firebase";
import { UserProfile } from "./auth";

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  likes: string[];
  commentCount: number;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

// ---- POSTS ----

export const createPost = async (author: UserProfile, content: string, imageUrl?: string) => {
  try {
    const newPost: Omit<Post, "id"> = {
      authorId: author.uid,
      authorName: `${author.firstName} ${author.lastName}`,
      authorUsername: author.username,
      authorAvatar: author.avatarUrl,
      content,
      imageUrl,
      createdAt: new Date().toISOString(),
      likes: [],
      commentCount: 0,
    };
    
    const docRef = await addDoc(collection(db, "posts"), newPost);
    return docRef.id;
  } catch (error) {
    console.error("Failed to create post:", error);
    throw error;
  }
};

export const subscribeToFeed = (callback: (posts: Post[]) => void) => {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  return onSnapshot(q, 
    (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
    },
    (error) => {
      console.error("Firestore Error in subscribeToFeed:", error);
    }
  );
};

// ---- LIKES & COMMENTS ----

export const toggleLike = async (postId: string, userId: string, isLiked: boolean) => {
  try {
    const postRef = doc(db, "posts", postId);
    if (isLiked) {
      await updateDoc(postRef, { likes: arrayRemove(userId) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(userId) });
    }
  } catch (error) {
    console.error("Failed to toggle like:", error);
  }
};

export const addComment = async (postId: string, author: UserProfile, content: string) => {
  try {
    const comment: Omit<Comment, "id"> = {
      authorId: author.uid,
      authorName: `${author.firstName} ${author.lastName}`,
      authorAvatar: author.avatarUrl,
      content,
      createdAt: new Date().toISOString(),
    };
    
    const commentsCol = collection(db, "posts", postId, "comments");
    await addDoc(commentsCol, comment);
    
    // Update comment count
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      await updateDoc(postRef, { commentCount: (postSnap.data().commentCount || 0) + 1 });
    }
  } catch (error) {
    console.error("Failed to add comment:", error);
  }
};

export const subscribeToComments = (postId: string, callback: (comments: Comment[]) => void) => {
  const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
  return onSnapshot(q, 
    (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
    },
    (error) => {
      console.error("Firestore Error in subscribeToComments:", error);
    }
  );
};

// ---- SOCIAL GRAPH ----

export interface FriendRequest {
  id: string; // The ID of the friendship document
  fromId: string;
  fromName: string;
  fromUsername: string;
  fromAvatar?: string;
  toId: string;
  toName: string;
  toUsername: string;
  toAvatar?: string;
  status: "pending" | "accepted";
  createdAt: string;
}

export const sendFriendRequest = async (from: UserProfile, to: UserProfile) => {
  try {
    const request: Omit<FriendRequest, "id"> = {
      fromId: from.uid,
      fromName: `${from.firstName} ${from.lastName}`,
      fromUsername: from.username,
      fromAvatar: from.avatarUrl || "",
      toId: to.uid,
      toName: `${to.firstName} ${to.lastName}`,
      toUsername: to.username,
      toAvatar: to.avatarUrl || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, "friendships"), request);
  } catch (error) {
    console.error("Failed to send friend request:", error);
    throw error;
  }
};

export const acceptFriendRequest = async (requestId: string) => {
  try {
    const reqRef = doc(db, "friendships", requestId);
    await updateDoc(reqRef, { status: "accepted" });
  } catch (error) {
    console.error("Failed to accept friend request:", error);
  }
};

export const rejectFriendRequest = async (requestId: string) => {
  try {
    await deleteDoc(doc(db, "friendships", requestId));
  } catch (error) {
    console.error("Failed to reject friend request:", error);
  }
};

export const subscribeToFriendRequests = (userId: string, callback: (requests: FriendRequest[]) => void) => {
  const q = query(
    collection(db, "friendships"),
    where("toId", "==", userId),
    where("status", "==", "pending")
  );
  
  return onSnapshot(q, 
    (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FriendRequest)));
    },
    (error) => {
      console.error("Firestore Error in subscribeToFriendRequests:", error);
    }
  );
};

export const subscribeToFriends = (userId: string, callback: (friends: FriendRequest[]) => void) => {
  // Split into two queries (fromId and toId) then merge client-side
  // This avoids the Firestore SDK type incompatibility with or() + where() composite filters
  const mergedMap = new Map<string, FriendRequest>();

  const notify = () => callback(Array.from(mergedMap.values()));

  const q1 = query(collection(db, "friendships"), where("status", "==", "accepted"), where("fromId", "==", userId));
  const q2 = query(collection(db, "friendships"), where("status", "==", "accepted"), where("toId", "==", userId));

  const unsub1 = onSnapshot(q1,
    (snap) => { snap.docs.forEach(d => mergedMap.set(d.id, { id: d.id, ...d.data() } as FriendRequest)); notify(); },
    (e) => console.error("Firestore Error in subscribeToFriends (fromId):", e)
  );

  const unsub2 = onSnapshot(q2,
    (snap) => { snap.docs.forEach(d => mergedMap.set(d.id, { id: d.id, ...d.data() } as FriendRequest)); notify(); },
    (e) => console.error("Firestore Error in subscribeToFriends (toId):", e)
  );

  return () => { unsub1(); unsub2(); };
};

export const blockUser = async (userId: string, blockedUserId: string) => {
  try {
    await addDoc(collection(db, "blockedUsers"), {
      userId,
      blockedUserId,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to block user:", error);
  }
};

export const subscribeToBlockedUsers = (userId: string, callback: (blocks: any[]) => void) => {
  const q = query(collection(db, "blockedUsers"), where("userId", "==", userId));
  return onSnapshot(q, 
    (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    },
    (error) => {
      console.error("Firestore Error in subscribeToBlockedUsers:", error);
    }
  );
};
