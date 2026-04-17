import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  User,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "./firebase";

export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: "volunteer" | "ngo" | "admin";
  avatarUrl?: string;
  profileImageType?: "avatar" | "upload" | "google" | "drive";
  avatarId?: string;
  volunteerType?: string;
  status: "online" | "busy" | "offline" | "pending_verification" | "verified" | "rejected";
  ngoRegistrationNo?: string;
  ngoEstablishedYear?: string;
  ngoCertificateUrl?: string;
  score: number;
  badges: string[];
  location?: { lat: number; lng: number; address?: string };
  phoneNo?: string;
  whatsappNo?: string;
  phoneVerified?: boolean;
  createdAt: string;
}

export async function signUp(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  username: string,
  role: "volunteer" | "ngo" | "admin",
  phoneNo?: string,
  whatsappNo?: string,
  volunteerType?: string,
  ngoRegistrationNo?: string,
  ngoEstablishedYear?: string,
  ngoCertificateUrl?: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  // Check unique username BEFORE writing the doc
  const q = query(collection(db, "users"), where("username", "==", username));
  const snap = await getDocs(q);
  
  if (!snap.empty) {
    await user.delete();
    const suggested = `${username}${Math.floor(100 + Math.random() * 900)}`;
    throw new Error(`Username "${username}" is taken. Would you like to use "${suggested}"?`);
  }

  await updateProfile(user, { displayName: `${firstName} ${lastName}` });
  await sendEmailVerification(user);

  const profile: UserProfile = {
    uid: user.uid,
    firstName,
    lastName,
    username,
    email,
    role,
    status: role === "ngo" ? "pending_verification" : "online",
    score: 0,
    badges: [],
    phoneNo: phoneNo || "",
    whatsappNo: whatsappNo || phoneNo || "",
    phoneVerified: false,
    createdAt: new Date().toISOString(),
    ...(role === "volunteer" && volunteerType ? { volunteerType } : {}),
    ...(role === "ngo" ? {
      ngoRegistrationNo: ngoRegistrationNo || "",
      ngoEstablishedYear: ngoEstablishedYear || "",
      ngoCertificateUrl: ngoCertificateUrl || "",
    } : {})
  };

  await setDoc(doc(db, "users", user.uid), profile);
  return user;
}

export async function logIn(identifier: string, password: string): Promise<User> {
  let email = identifier;

  if (!identifier.includes("@")) {
    // Try username first
    const byUsername = query(collection(db, "users"), where("username", "==", identifier.toLowerCase()));
    const snapU = await getDocs(byUsername);
    if (!snapU.empty) {
      email = snapU.docs[0].data().email;
    } else {
      // Try phone number
      const byPhone = query(collection(db, "users"), where("phoneNo", "==", identifier));
      const snapP = await getDocs(byPhone);
      if (!snapP.empty) {
        email = snapP.docs[0].data().email;
      } else {
        throw new Error(`No account found for "${identifier}". Try your email, username, or phone number.`);
      }
    }
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  
  if (!credential.user.emailVerified) {
    throw new Error("Please verify your email address before logging in. Check your inbox.");
  }
  
  return credential.user;
}

export async function logInWithGoogle(role: "volunteer" | "ngo"): Promise<User> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const user = credential.user;

  // Check if they already exist in Firestore
  const docRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    // New Google user -> Create profile
    const names = (user.displayName || "New User").split(" ");
    const firstName = names[0];
    const lastName = names.slice(1).join(" ") || "";
    const username = (user.email?.split("@")[0] || `user${user.uid.slice(0, 5)}`).toLowerCase();

    const profile: UserProfile = {
      uid: user.uid,
      firstName,
      lastName,
      username,
      email: user.email || "",
      avatarUrl: user.photoURL || undefined,
      role,
      status: "online",
      score: 0,
      badges: [],
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, profile);
  }

  return user;
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docSnap = await getDoc(doc(db, "users", uid));
  return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
}

export async function updateUserStatus(uid: string, status: "online" | "busy" | "offline") {
  await updateDoc(doc(db, "users", uid), { status });
}
