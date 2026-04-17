import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where, addDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { Need, Task } from "@/types";
import { UserProfile } from "@/lib/auth";

// User queries
export const subscribeToUsers = (role: "volunteer" | "ngo", callback: (users: UserProfile[]) => void) => {
  const q = query(collection(db, "users"), where("role", "==", role));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as UserProfile));
    callback(users);
  });
};

export const subscribeToTaskCounts = (callback: (data: any) => void) => {
  // We can fetch tasks and infer activity
  const q = query(collection(db, "tasks"));
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Task));
    const stats = {
      completed: tasks.filter(t => t.status === "completed").length,
      assigned: tasks.filter(t => t.status === "accepted" || t.status === "in_progress" || t.status === "proof_submitted").length,
      open: tasks.filter(t => t.status === "pending").length,
    };
    callback(stats);
  });
};

// Needs and Tasks
export const createNeed = async (need: Omit<Need, "id" | "createdAt">) => {
  const docRef = await addDoc(collection(db, "needs"), {
    ...need,
    createdAt: new Date().toISOString(),
  });
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
};

export const subscribeToNeeds = (callback: (needs: Need[]) => void) => {
  const q = query(collection(db, "needs"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Need));
  });
};

export const updateNeedStatus = async (needId: string, status: Need["status"]) => {
  await updateDoc(doc(db, "needs", needId), { status });
};

// Tasks
export const createTask = async (task: Omit<Task, "id" | "assignedAt">) => {
  const docRef = await addDoc(collection(db, "tasks"), {
    ...task,
    assignedAt: new Date().toISOString(),
  });
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
};

export const subscribeToTasks = (userId: string, role: "volunteer" | "ngo", callback: (tasks: Task[]) => void) => {
  const field = role === "volunteer" ? "volunteerId" : "ngoId";
  const q = query(collection(db, "tasks"), where(field, "==", userId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as Task));
  });
};

export const updateTaskStatus = async (taskId: string, status: Task["status"]) => {
  await updateDoc(doc(db, "tasks", taskId), { status });
};
