"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { UserProfile } from "@/lib/auth";
import { subscribeToUsers } from "@/lib/firestore";
import { 
  sendFriendRequest, 
  acceptFriendRequest, 
  rejectFriendRequest, 
  subscribeToFriendRequests, 
  subscribeToFriends,
  FriendRequest 
} from "@/lib/social";

export default function SocialGraphPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"find" | "friends" | "requests">("find");
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<FriendRequest[]>([]);

  useEffect(() => {
    const unsubUsers = subscribeToUsers("volunteer", setUsers);
    return () => unsubUsers();
  }, []);

  useEffect(() => {
    if (profile?.uid) {
      const unsubReq = subscribeToFriendRequests(profile.uid, setRequests);
      const unsubFri = subscribeToFriends(profile.uid, setFriends);
      return () => { unsubReq(); unsubFri(); };
    }
  }, [profile?.uid]);

  if (!profile) return null;

  // Derived state to disable "Add Friend" buttons
  const isFriend = (uid: string) => friends.some(f => f.fromId === uid || f.toId === uid);
  const isPending = (uid: string) => requests.some(r => r.fromId === uid) || 
    // Also need to check if WE sent a request to THEM (not fully subscribed to our sent requests right now, but good enough for MVP)
    false; 

  const suggestedUsers = users.filter(u => u.uid !== profile.uid && !isFriend(u.uid));

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Social Network</h1>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Connect with other volunteers, make friends, and collaborate.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 16 }}>
        <button onClick={() => setTab("find")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: tab === "find" ? "rgba(20,184,196,0.15)" : "transparent", color: tab === "find" ? "#14b8c4" : "#94a3b8", fontWeight: 600, cursor: "pointer" }}>
          🔍 Find People
        </button>
        <button onClick={() => setTab("friends")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: tab === "friends" ? "rgba(20,184,196,0.15)" : "transparent", color: tab === "friends" ? "#14b8c4" : "#94a3b8", fontWeight: 600, cursor: "pointer" }}>
          👥 My Friends ({friends.length})
        </button>
        <button onClick={() => setTab("requests")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: tab === "requests" ? "rgba(20,184,196,0.15)" : "transparent", color: tab === "requests" ? "#14b8c4" : "#94a3b8", fontWeight: 600, cursor: "pointer", position: "relative" }}>
          🔔 Requests
          {requests.length > 0 && (
            <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "#fff", fontSize: 10, borderRadius: 10, padding: "2px 6px" }}>{requests.length}</span>
          )}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        
        {/* FIND SCREEN */}
        {tab === "find" && suggestedUsers.map(u => (
          <div key={u.uid} className="glass-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(20,184,196,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, overflow: "hidden" }}>
              {u.avatarUrl ? <img src={u.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#f0f9fa" }}>{u.firstName} {u.lastName}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>@{u.username}</div>
            </div>
            <button 
              onClick={() => sendFriendRequest(profile, u)}
              disabled={isPending(u.uid)}
              style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid rgba(20,184,196,0.3)", background: "rgba(20,184,196,0.1)", color: "#14b8c4", fontSize: 12, fontWeight: 600, cursor: isPending(u.uid) ? "not-allowed" : "pointer" }}
            >
              {isPending(u.uid) ? "Sent" : "Add"}
            </button>
          </div>
        ))}

        {/* REQUESTS SCREEN */}
        {tab === "requests" && requests.length === 0 && (
          <div style={{ color: "#94a3b8", fontSize: 14 }}>No pending friend requests.</div>
        )}
        {tab === "requests" && requests.map(req => (
          <div key={req.id} className="glass-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, overflow: "hidden" }}>
                {req.fromAvatar ? <img src={req.fromAvatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#f0f9fa" }}>{req.fromName}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>@{req.fromUsername}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => acceptFriendRequest(req.id)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Accept</button>
              <button onClick={() => rejectFriendRequest(req.id)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontWeight: 600, cursor: "pointer" }}>Decline</button>
            </div>
          </div>
        ))}

        {/* FRIENDS SCREEN */}
        {tab === "friends" && friends.length === 0 && (
          <div style={{ color: "#94a3b8", fontSize: 14 }}>You don't have any friends yet. Add some from the Find People tab!</div>
        )}
        {tab === "friends" && friends.map(f => {
          const isMeFrom = f.fromId === profile.uid;
          const friendName = isMeFrom ? f.toName : f.fromName;
          const friendUsername = isMeFrom ? f.toUsername : f.fromUsername;
          const friendAvatar = isMeFrom ? f.toAvatar : f.fromAvatar;

          return (
            <div key={f.id} className="glass-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, overflow: "hidden" }}>
                {friendAvatar ? <img src={friendAvatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#f0f9fa", display: "flex", alignItems: "center", gap: 6 }}>
                  {friendName} <span style={{ fontSize: 10, background: "#22c55e", padding: "2px 6px", borderRadius: 10, color: "#fff" }}>Friend</span>
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>@{friendUsername}</div>
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
