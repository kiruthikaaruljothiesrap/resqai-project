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
};

export const subscribeToFeed = (callback: (posts: Post[]) => void) => {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
  });
};

// ---- LIKES & COMMENTS ----

export const toggleLike = async (postId: string, userId: string, isLiked: boolean) => {
  const postRef = doc(db, "posts", postId);
  if (isLiked) {
    await updateDoc(postRef, { likes: arrayRemove(userId) });
  } else {
    await updateDoc(postRef, { likes: arrayUnion(userId) });
  }
};

export const addComment = async (postId: string, author: UserProfile, content: string) => {
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
};

export const subscribeToComments = (postId: string, callback: (comments: Comment[]) => void) => {
  const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
  });
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
};

export const acceptFriendRequest = async (requestId: string) => {
  const reqRef = doc(db, "friendships", requestId);
  await updateDoc(reqRef, { status: "accepted" });
};

export const rejectFriendRequest = async (requestId: string) => {
  await deleteDoc(doc(db, "friendships", requestId));
};

export const subscribeToFriendRequests = (userId: string, callback: (requests: FriendRequest[]) => void) => {
  const q = query(
    collection(db, "friendships"),
    where("toId", "==", userId),
    where("status", "==", "pending")
  );
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FriendRequest)));
  });
};

export const subscribeToFriends = (userId: string, callback: (friends: FriendRequest[]) => void) => {
  // Since we require an OR query which is newer/complex, we'll fetch both directions where accepted
  // Option 1: Firebase V9 `or` (if supported in this version)
  // We'll just fetch all friendships involving the user entirely.
  const q = query(collection(db, "friendships"));
  return onSnapshot(q, (snapshot) => {
    const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FriendRequest));
    const myFriends = all.filter(f => 
      f.status === "accepted" && (f.fromId === userId || f.toId === userId)
    );
    callback(myFriends);
  });
};

export const blockUser = async (userId: string, blockedUserId: string) => {
  await addDoc(collection(db, "blockedUsers"), {
    userId,
    blockedUserId,
    createdAt: new Date().toISOString()
  });
};

export const subscribeToBlockedUsers = (userId: string, callback: (blocks: any[]) => void) => {
  const q = query(collection(db, "blockedUsers"), where("userId", "==", userId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};
