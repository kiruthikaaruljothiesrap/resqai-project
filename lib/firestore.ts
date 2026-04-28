import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where, addDoc, serverTimestamp, orderBy, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Need, Task, Broadcast } from "@/types";
import { UserProfile } from "@/lib/auth";

// User queries
export const subscribeToUsers = (role: "volunteer" | "ngo", callback: (users: UserProfile[]) => void) => {
  const q = query(collection(db, "users"), where("role", "==", role));
  return onSnapshot(q, 
    (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as UserProfile));
      callback(users);
    },
    (error) => {
      console.error("Firestore Error in subscribeToUsers:", error);
    }
  );
};

export const subscribeToTaskCounts = (callback: (data: any) => void) => {
  // We can fetch tasks and infer activity
  // LIMITing here to avoid massive data transfer if tasks grow too large
  const q = query(collection(db, "tasks"), orderBy("assignedAt", "desc"));
  return onSnapshot(q, 
    (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Task));
      const stats = {
        completed: tasks.filter(t => t.status === "completed").length,
        assigned: tasks.filter(t => t.status === "accepted" || t.status === "in_progress" || t.status === "proof_submitted").length,
        open: tasks.filter(t => t.status === "pending").length,
      };
      callback(stats);
    },
    (error) => {
      console.error("Firestore Error in subscribeToTaskCounts:", error);
    }
  );
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
  return onSnapshot(q, 
    (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Need));
    },
    (error) => {
      console.error("Firestore Error in subscribeToNeeds:", error);
    }
  );
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
  return onSnapshot(q, 
    (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as Task));
    },
    (error) => {
      console.error(`Firestore Error in subscribeToTasks (${role}):`, error);
    }
  );
};

export const updateTaskStatus = async (taskId: string, status: Task["status"]) => {
  await updateDoc(doc(db, "tasks", taskId), { status });
};

// Fetch a single user profile (used to get real NGO contact info)
export const getNGOProfile = async (ngoId: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, "users", ngoId));
  return snap.exists() ? (snap.data() as UserProfile) : null;
};

// Get all volunteers (for broadcast fan-out)
export const getAllVolunteerIds = async (): Promise<string[]> => {
  const q = query(collection(db, "users"), where("role", "==", "volunteer"));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.id);
};

// Save a broadcast record to Firestore
export const saveBroadcast = async (broadcast: Omit<Broadcast, "id" | "sentAt" | "recipientCount">, recipientCount: number) => {
  const docRef = await addDoc(collection(db, "broadcasts"), {
    ...broadcast,
    recipientCount,
    sentAt: new Date().toISOString(),
  });
  return docRef.id;
};

// Subscribe to broadcast history for an NGO
export const subscribeToBroadcasts = (ngoId: string, callback: (broadcasts: Broadcast[]) => void) => {
  const q = query(collection(db, "broadcasts"), where("ngoId", "==", ngoId), orderBy("sentAt", "desc"));
  return onSnapshot(q,
    (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Broadcast));
    },
    (error) => {
      console.error("Firestore Error in subscribeToBroadcasts:", error);
    }
  );
};

// Get total hours worked by a volunteer from completed tasks
export const subscribeToVolunteerHours = (volunteerId: string, callback: (hours: number) => void) => {
  const q = query(
    collection(db, "tasks"),
    where("volunteerId", "==", volunteerId),
    where("status", "==", "completed")
  );
  return onSnapshot(q,
    (snapshot) => {
      const total = snapshot.docs.reduce((sum, d) => {
        const task = d.data() as Task;
        return sum + (task.actualHours ?? task.estimatedHours ?? 0);
      }, 0);
      callback(total);
    },
    (error) => {
      console.error("Firestore Error in subscribeToVolunteerHours:", error);
    }
  );
};
