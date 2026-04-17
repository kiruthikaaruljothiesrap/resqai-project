export interface VolunteerType {
  id: string;
  label: string;
  icon: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Need {
  id: string;
  title: string;
  description: string;
  location: { lat: number; lng: number; address: string };
  priority: "low" | "medium" | "high" | "critical";
  requiredSkills: string[];
  ngoId: string;
  ngoName: string;
  ngoContact: string;
  status: "open" | "assigned" | "completed";
  createdAt: string;
}

export interface Task {
  id: string;
  needId: string;
  volunteerId: string;
  volunteerName: string;
  ngoId: string;
  title: string;
  description: string;
  status: "pending" | "accepted" | "in_progress" | "proof_submitted" | "completed" | "rejected";
  points: number;
  estimatedHours: number;
  actualHours?: number;
  proofUrls?: string[];
  ngoRating?: number;
  ngoNotes?: string;
  assignedAt: string;
  completedAt?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  type: "text" | "image" | "voice";
}

export interface Group {
  id: string;
  name: string;
  description: string;
  type: "public" | "private";
  members: string[];
  adminId: string;
  createdAt: string;
  lastMessage?: string;
}

export interface Broadcast {
  id: string;
  ngoId: string;
  title: string;
  message: string;
  channels: ("app" | "sms" | "whatsapp")[];
  sentAt: string;
  recipientCount: number;
}

export const VOLUNTEER_TYPES: VolunteerType[] = [
  { id: "medical", label: "Medical / First Aid", icon: "🏥" },
  { id: "engineering", label: "Engineering / Technical", icon: "⚙️" },
  { id: "rescue", label: "Search & Rescue", icon: "🚁" },
  { id: "logistics", label: "Logistics / Supply", icon: "🚚" },
  { id: "education", label: "Education / Training", icon: "📚" },
  { id: "counseling", label: "Counseling / Support", icon: "💙" },
  { id: "legal", label: "Legal Aid", icon: "⚖️" },
  { id: "it", label: "IT / Communications", icon: "💻" },
  { id: "construction", label: "Construction / Repair", icon: "🏗️" },
  { id: "food", label: "Food & Nutrition", icon: "🍽️" },
];

export const BADGES: Badge[] = [
  { id: "first_task", name: "First Responder", icon: "🌟", color: "#f59e0b" },
  { id: "ten_tasks", name: "Dedicated Helper", icon: "🏅", color: "#6366f1" },
  { id: "fifty_tasks", name: "Community Champion", icon: "🏆", color: "#10b981" },
  { id: "top_rated", name: "Top Rated", icon: "⭐", color: "#f97316" },
  { id: "medical_expert", name: "Medical Expert", icon: "⚕️", color: "#ec4899" },
];
