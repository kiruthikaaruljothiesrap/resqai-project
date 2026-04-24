"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { createGroup, subscribeToGroups, subscribeToGroupMessages, sendMessage, subscribeToDirectMessages, joinGroup, sendCommunityInvite, subscribeToCommunityInvites, acceptCommunityInvite, rejectCommunityInvite } from "@/lib/chat";
import { Message } from "@/types";
import { subscribeToUsers } from "@/lib/firestore";
import { UserProfile } from "@/lib/auth";
import { FriendRequest, subscribeToFriendRequests, subscribeToFriends, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, blockUser, subscribeToBlockedUsers } from "@/lib/social";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function CommunityPage() {
  const { profile } = useAuth();
  
  const [mainTab, setMainTab] = useState<"groups" | "friends">("groups");
  
  // Groups State
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [tab, setTab] = useState<"public" | "private" | "invites">("public");
  const [input, setInput] = useState("");
  const [groups, setGroups] = useState<any[]>([]);
  const [communityInvites, setCommunityInvites] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupType, setNewGroupType] = useState<"public"|"private">("public");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Friends State
  const [friendTab, setFriendTab] = useState<"list" | "requests">("list");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showInviteMembers, setShowInviteMembers] = useState(false);
  const [searchFriend, setSearchFriend] = useState("");
  const [searchMyFriends, setSearchMyFriends] = useState("");
  const [volunteers, setVolunteers] = useState<UserProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [activeFriend, setActiveFriend] = useState<FriendRequest | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  const [activeFriendChat, setActiveFriendChat] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<Message[]>([]);
  const [dmInput, setDmInput] = useState("");

  useEffect(() => {
    const unsub = subscribeToGroups(setGroups);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (activeGroup && mainTab === "groups") {
      const unsub = subscribeToGroupMessages(activeGroup, setMessages);
      return () => unsub();
    }
  }, [activeGroup, mainTab]);

  useEffect(() => {
    if (activeFriendChat && profile?.uid) {
      const unsub = subscribeToDirectMessages(profile.uid, activeFriendChat, setDmMessages);
      return () => unsub();
    }
  }, [activeFriendChat, profile?.uid]);

  useEffect(() => {
    let unsubUsers = subscribeToUsers("volunteer", setVolunteers);
    let unsubReq = () => {};
    let unsubFriends = () => {};
    let unsubInvites = () => {};
    let unsubBlocked = () => {};

    if (profile?.uid) {
      unsubReq = subscribeToFriendRequests(profile.uid, setFriendRequests);
      unsubFriends = subscribeToFriends(profile.uid, setFriends);
      unsubInvites = subscribeToCommunityInvites(profile.uid, setCommunityInvites);
      unsubBlocked = subscribeToBlockedUsers(profile.uid, setBlockedUsers);
    }
    return () => { unsubUsers(); unsubReq(); unsubFriends(); unsubInvites(); unsubBlocked(); };
  }, [profile?.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, dmMessages]);

  // Set initial active group if none is selected
  useEffect(() => {
    if (mainTab === "groups" && !activeGroup && groups.length > 0) {
      const publicG = groups.filter(g => g.visibility === "public");
      if (publicG.length > 0) setActiveGroup(publicG[0].id);
    }
  }, [groups, activeGroup, mainTab]);

  const displayedGroups = groups.filter(g => g.visibility === tab || (tab === "private" && g.members?.includes(profile?.uid)));
  const activeGroupData = groups.find(g => g.id === activeGroup);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !profile) return;
    try {
      const id = await createGroup({
        name: newGroupName,
        description: newGroupDesc,
        visibility: newGroupType,
        members: [profile.uid],
        ownerId: profile.uid,
      });
      setShowCreate(false);
      setNewGroupName("");
      setNewGroupDesc("");
      setActiveGroup(id);
      setTab(newGroupType);
    } catch (e) {
      alert("Failed to create group.");
    }
  };

  const sendMsg = async () => {
    if (!input.trim() || !profile || !activeGroup) return;
    await sendMessage({
      senderId: profile.uid,
      senderName: profile.firstName + ' ' + (profile.lastName || ""),
      content: input,
      type: "text",
      groupId: activeGroup
    } as any);
    setInput("");
  };

  const sendDirectMsg = async () => {
    if (!dmInput.trim() || !profile || !activeFriendChat) return;
    const dmId = [profile.uid, activeFriendChat].sort().join('_');
    await sendMessage({
      senderId: profile.uid,
      senderName: profile.firstName + ' ' + (profile.lastName || ""),
      content: dmInput,
      type: "text",
      dmId: dmId
    } as any);
    setDmInput("");
  };

  const nearbyVolunteers = volunteers.filter(v => 
    v.uid !== profile?.uid && 
    !friends.some(f => f.fromId === v.uid || f.toId === v.uid) &&
    !friendRequests.some(f => f.fromId === v.uid || f.toId === v.uid) &&
    !blockedUsers.some(b => b.blockedUserId === v.uid) &&
    v.role === "volunteer"
  ).map(v => {
    let distance = Infinity;
    if (profile?.location?.lat && profile?.location?.lng && v.location?.lat && v.location?.lng) {
       distance = haversineKm(profile.location.lat, profile.location.lng, v.location.lat, v.location.lng);
    }
    return { ...v, distance };
  }).sort((a, b) => a.distance - b.distance);

  const filteredVolunteers = searchFriend 
    ? nearbyVolunteers.filter(v => (v.username||"").toLowerCase().includes(searchFriend.toLowerCase()) || v.firstName.toLowerCase().includes(searchFriend.toLowerCase()))
    : nearbyVolunteers;

  const uniqueFriends = Array.from(new Map(friends.filter(f => {
    const friendId = f.fromId === profile?.uid ? f.toId : f.fromId;
    return !blockedUsers.some(b => b.blockedUserId === friendId);
  }).map(f => {
    const friendId = f.fromId === profile?.uid ? f.toId : f.fromId;
    return [friendId, f];
  })).values());

  const filteredMyFriends = uniqueFriends.filter(f => {
    if (!searchMyFriends) return true;
    const isMe = f.fromId === profile?.uid;
    const friendName = (isMe ? f.toName : f.fromName).toLowerCase();
    const friendUname = (isMe ? f.toUsername : f.fromUsername).toLowerCase();
    const s = searchMyFriends.toLowerCase();
    return friendName.includes(s) || friendUname.includes(s);
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Community</h1>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>Connect with the volunteer network and manage groups</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => setShowAddFriend(true)} style={{
            padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(20,184,196,0.5)",
            background: "rgba(20,184,196,0.1)", color: "#14b8c4",
            fontWeight: 700, cursor: "pointer", fontSize: 13,
          }}>+ Add Friend</button>
          
          <button onClick={() => setShowCreate(true)} style={{
            padding: "10px 16px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg,#14b8c4,#0f6b71)", color: "#fff",
            fontWeight: 700, cursor: "pointer", fontSize: 13,
          }}>+ Create Group</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <button onClick={() => setMainTab("groups")} style={{
          padding: "8px 16px", borderRadius: 8, border: "none",
          fontWeight: 700, cursor: "pointer", fontSize: 14,
          background: mainTab === "groups" ? "rgba(255,255,255,0.1)" : "transparent",
          color: mainTab === "groups" ? "#fff" : "#94a3b8"
        }}>💬 Groups</button>
        <button onClick={() => setMainTab("friends")} style={{
          padding: "8px 16px", borderRadius: 8, border: "none",
          fontWeight: 700, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 8,
          background: mainTab === "friends" ? "rgba(255,255,255,0.1)" : "transparent",
          color: mainTab === "friends" ? "#fff" : "#94a3b8"
        }}>
          👥 Friends Network
          {friendRequests.length > 0 && (
            <span style={{ background: "#ef4444", color: "#fff", padding: "2px 6px", borderRadius: 10, fontSize: 11 }}>{friendRequests.length}</span>
          )}
        </button>
      </div>

      {showAddFriend && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-card fade-up" style={{ width: 480, padding: 32, display: "flex", flexDirection: "column", maxHeight: "80vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Add Volunteer Friend</h2>
              <button onClick={() => setShowAddFriend(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>
            
            <input value={searchFriend} onChange={e => setSearchFriend(e.target.value)} placeholder="🔍 Search by username or name..." 
                   style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 8, color: "#f0f9fa", fontSize: 14, marginBottom: 16 }} />
            
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredVolunteers.length === 0 ? <p style={{color: "#94a3b8", textAlign: "center", padding: 20}}>No nearby volunteers found.</p> : filteredVolunteers.map(v => (
                <div key={v.uid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                     <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(20,184,196,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{v.avatarUrl ? <img src={v.avatarUrl} style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover"}}/> : "👤"}</div>
                     <div>
                       <div style={{ fontWeight: 600, fontSize: 14 }}>{v.firstName} {v.lastName}</div>
                       <div style={{ fontSize: 12, color: "#94a3b8" }}>@{v.username} · {v.distance === Infinity ? "Location unknown" : `${v.distance.toFixed(1)} km away`}</div>
                     </div>
                   </div>
                   <button onClick={async () => {
                     if (!profile) return;
                     await sendFriendRequest(profile, v);
                     alert(`Friend request sent to ${v.firstName}!`);
                   }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "rgba(20,184,196,0.15)", color: "#14b8c4", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                     + Add
                   </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCreate && (
         <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
           <div className="glass-card fade-up" style={{ width: 420, padding: 32 }}>
             <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Create New Group</h2>
             <div style={{ marginBottom: 14 }}>
               <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 6 }}>Group Name</label>
               <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g. CSR Medical Unit" style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 8, color: "#f0f9fa", fontSize: 14 }} />
             </div>
             <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
               <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#94a3b8", cursor: "pointer" }}>Cancel</button>
               <button onClick={handleCreateGroup} style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#14b8c4,#0f6b71)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Create →</button>
             </div>
           </div>
         </div>
      )}

      {showInviteMembers && activeGroupData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-card fade-up" style={{ width: 420, padding: 32, display: "flex", flexDirection: "column", maxHeight: "80vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Invite to {activeGroupData.name}</h2>
              <button onClick={() => setShowInviteMembers(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredMyFriends.length === 0 ? <p style={{color: "#94a3b8", textAlign: "center", padding: 20}}>You have no friends to invite.</p> : filteredMyFriends.map(f => {
                 const isMe = f.fromId === profile?.uid;
                 const friendUserId = isMe ? f.toId : f.fromId;
                 const friendName = isMe ? f.toName : f.fromName;
                 const friendAvatar = isMe ? f.toAvatar : f.fromAvatar;
                 const isMember = activeGroupData.members?.includes(friendUserId);
                 
                 return (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                     <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                       <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(20,184,196,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{friendAvatar ? <img src={friendAvatar} style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover"}}/> : "👤"}</div>
                       <div style={{ fontWeight: 600, fontSize: 14 }}>{friendName}</div>
                     </div>
                     {isMember ? (
                        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Joined</span>
                     ) : (
                        <button onClick={async () => {
                           if (!profile) return;
                           await sendCommunityInvite(activeGroupData.id, activeGroupData.name, profile.uid, friendUserId);
                           alert(`Invite sent to ${friendName}!`);
                        }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "rgba(20,184,196,0.15)", color: "#14b8c4", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                           + Invite
                        </button>
                     )}
                  </div>
                 );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="responsive-chat-grid">
        {/* Left Sidebar */}
        <div className="glass-card responsive-chat-left" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", padding: "8px", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {mainTab === "groups" ? (
              (["public", "private", "invites"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: "8px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", justifyContent: "center", gap: 6,
                  background: tab === t ? "rgba(20,184,196,0.15)" : "transparent", color: tab === t ? "#14b8c4" : "#64748b",
                }}>
                  {t === "public" ? "🌐 Public" : t === "private" ? "🔒 Private" : "📥 Invites"}
                  {t === "invites" && communityInvites.length > 0 && <span style={{ background: "#ef4444", color: "#fff", padding: "0px 6px", borderRadius: 10, fontSize: 11 }}>{communityInvites.length}</span>}
                </button>
              ))
            ) : (
              (["list", "requests"] as const).map((t) => (
                <button key={t} onClick={() => setFriendTab(t)} style={{
                  flex: 1, padding: "8px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", justifyContent: "center", gap: 6,
                  background: friendTab === t ? "rgba(20,184,196,0.15)" : "transparent", color: friendTab === t ? "#14b8c4" : "#64748b",
                }}>
                  {t === "list" ? "👥 Friends" : "📥 Requests"}
                  {t === "requests" && friendRequests.length > 0 && <span style={{ background: "#ef4444", color: "#fff", padding: "0px 6px", borderRadius: 10, fontSize: 11 }}>{friendRequests.length}</span>}
                </button>
              ))
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {mainTab === "groups" ? (
              // GROUP LIST OR INVITES
              tab === "invites" ? (
                communityInvites.length === 0 ? <div style={{padding:20, color:"#94a3b8", textAlign:"center"}}>No pending invites.</div> : communityInvites.map(inv => (
                  <div key={inv.id} style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(20,184,196,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📥</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#f0f9fa" }}>{inv.communityName}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>Invited you</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                       <button onClick={async () => {
                         if (!profile) return;
                         await acceptCommunityInvite(inv.id, inv.communityId, profile.uid);
                         alert(`Joined ${inv.communityName}!`);
                       }} style={{ flex: 1, padding: "6px", borderRadius: 6, border: "none", background: "rgba(34,197,94,0.15)", color: "#22c55e", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>✅ Join</button>
                       <button onClick={() => rejectCommunityInvite(inv.id)} style={{ flex: 1, padding: "6px", borderRadius: 6, border: "none", background: "rgba(239,68,68,0.15)", color: "#ef4444", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>❌ Decline</button>
                    </div>
                  </div>
                ))
              ) : (
                // NORMAL GROUP DISPLAY
                displayedGroups.length === 0 ? <div style={{padding:20, color:"#94a3b8", textAlign:"center"}}>No groups found.</div> : displayedGroups.map((g) => (
                  <button key={g.id} onClick={() => setActiveGroup(g.id)} style={{
                    width: "100%", padding: "14px 16px", border: "none", textAlign: "left", cursor: "pointer",
                    background: activeGroup === g.id ? "rgba(20,184,196,0.1)" : "transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(20,184,196,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{g.visibility === "private" ? "🔒" : "🌍"}</div>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#f0f9fa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.name}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{g.members?.length || 1} members</div>
                      </div>
                    </div>
                  </button>
                ))
              )
            ) : (
              // FRIENDS LIST & REQUESTS
              friendTab === "requests" ? (
                friendRequests.length === 0 ? <div style={{padding:20, color:"#94a3b8", textAlign:"center"}}>No pending requests.</div> : friendRequests.map(r => (
                  <div key={r.id} style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(20,184,196,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>{r.fromAvatar ? <img src={r.fromAvatar} style={{width:"100%",height:"100%",borderRadius:"50%"}}/> : "👤"}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#f0f9fa" }}>{r.fromName}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>@{r.fromUsername}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                       <button onClick={() => acceptFriendRequest(r.id)} style={{ flex: 1, padding: "6px", borderRadius: 6, border: "none", background: "rgba(34,197,94,0.15)", color: "#22c55e", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>✅ Accept</button>
                       <button onClick={() => rejectFriendRequest(r.id)} style={{ flex: 1, padding: "6px", borderRadius: 6, border: "none", background: "rgba(239,68,68,0.15)", color: "#ef4444", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>❌ Reject</button>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div style={{ padding: "10px 16px", display: "flex", gap: 8, alignItems: "center" }}>
                    <input value={searchMyFriends} onChange={e => setSearchMyFriends(e.target.value)} placeholder="🔍 Search friends..." 
                           style={{ flex: 1, padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 8, color: "#f0f9fa", fontSize: 13 }} />
                    <button onClick={() => { setIsSelectMode(!isSelectMode); setSelectedFriends([]); }} style={{ padding: "8px", borderRadius: 8, border: "1px solid rgba(20,184,196,0.3)", background: isSelectMode ? "rgba(20,184,196,0.2)" : "transparent", color: "#14b8c4", cursor: "pointer" }}>
                       ☑ Enable Select Options
                    </button>
                  </div>
                  {isSelectMode && selectedFriends.length > 0 && (
                     <div style={{ padding: "10px 16px", display: "flex", gap: 10, background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <button onClick={async () => {
                             if (!confirm(`Are you sure you want to disconnect from ${selectedFriends.length} friends?`)) return;
                             for (const fId of selectedFriends) await rejectFriendRequest(fId);
                             setSelectedFriends([]);
                             setIsSelectMode(false);
                        }} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.5)", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>❌ Disconnect Selected</button>
                        <button onClick={async () => {
                             if (!confirm(`Are you sure you want to BLOCK ${selectedFriends.length} friends?`)) return;
                             for (const fId of selectedFriends) {
                                const blockedUid = uniqueFriends.find(f => f.id === fId)?.fromId === profile?.uid ? uniqueFriends.find(f => f.id === fId)?.toId : uniqueFriends.find(f => f.id === fId)?.fromId;
                                await rejectFriendRequest(fId);
                                if (profile && blockedUid) await blockUser(profile.uid, blockedUid);
                             }
                             setSelectedFriends([]);
                             setIsSelectMode(false);
                             alert("Users successfully blocked.");
                        }} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.5)", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>🚫 Block Selected</button>
                     </div>
                  )}
                  {filteredMyFriends.length === 0 ? <div style={{padding:20, color:"#94a3b8", textAlign:"center"}}>You have no friends yet. Add nearby volunteers!</div> : filteredMyFriends.map(f => {
                     const isMe = f.fromId === profile?.uid;
                     const friendName = isMe ? f.toName : f.fromName;
                     const friendUname = isMe ? f.toUsername : f.fromUsername;
                     const friendAvatar = isMe ? f.toAvatar : f.fromAvatar;
                     
                     return (
                        <div key={f.id} style={{ display: "flex", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                           {isSelectMode && (
                              <input type="checkbox" checked={selectedFriends.includes(f.id)} onChange={(e) => {
                                 if (e.target.checked) setSelectedFriends(s => [...s, f.id]);
                                 else setSelectedFriends(s => s.filter(id => id !== f.id));
                              }} style={{ marginLeft: 16, width: 18, height: 18, cursor: "pointer" }} />
                           )}
                           <button onClick={() => { if (!isSelectMode) { setActiveFriend(f); setActiveFriendChat(null); } else {
                               if (selectedFriends.includes(f.id)) setSelectedFriends(s => s.filter(id => id !== f.id));
                               else setSelectedFriends(s => [...s, f.id]);
                           }}} style={{
                             flex: 1, padding: "14px 16px", border: "none", textAlign: "left", cursor: "pointer",
                             background: activeFriend?.id === f.id && !isSelectMode ? "rgba(20,184,196,0.1)" : "transparent",
                           }}>
                             <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                               <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(20,184,196,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{friendAvatar ? <img src={friendAvatar} style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover"}}/> : "👤"}</div>
                               <div style={{ flex: 1, overflow: "hidden" }}>
                                 <div style={{ fontWeight: 600, fontSize: 14, color: "#f0f9fa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{friendName}</div>
                                 <div style={{ fontSize: 12, color: "#64748b" }}>@{friendUname}</div>
                               </div>
                             </div>
                           </button>
                        </div>
                     );
                  })}
                </>
              )
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="glass-card responsive-chat-right" style={{ display: "flex", flexDirection: "column" }}>
          {mainTab === "groups" ? (
            activeGroupData ? (
              <>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(20,184,196,0.1)", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{activeGroupData.visibility === "private" ? "🔒" : "🌍"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{activeGroupData.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{activeGroupData.description || "Community Group"}</div>
                  </div>
                  <button onClick={() => setShowInviteMembers(true)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(20,184,196,0.3)", background: "transparent", color: "#14b8c4", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
                    + Invite Friends
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  {messages.map((msg) => {
                    const isMe = msg.senderId === profile?.uid;
                    return (
                      <div key={msg.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                        {!isMe && <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(20,184,196,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>👤</div>}
                        <div>
                          {!isMe && (
                            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#14b8c4" }}>{msg.senderName}</span>
                            </div>
                          )}
                          <div style={{ fontSize: 14, color: isMe ? "#fff" : "#cbd5e1", marginTop: 4, background: isMe ? "linear-gradient(135deg,#14b8c4,#0f6b71)" : "rgba(255,255,255,0.05)", padding: "8px 12px", borderRadius: isMe ? "12px 4px 12px 12px" : "4px 12px 12px 12px" }}>{msg.content}</div>
                          <div style={{ fontSize: 11, color: "#475569", marginTop: 4, textAlign: isMe ? "right" : "left" }}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(20,184,196,0.1)", display: "flex", gap: 10 }}>
                  <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMsg()}
                    placeholder={`Message ${activeGroupData.name}…`}
                    style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "1px solid rgba(20,184,196,0.2)", background: "rgba(255,255,255,0.05)", color: "#f0f9fa", fontSize: 14, outline: "none" }}
                  />
                  <button onClick={sendMsg} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#14b8c4,#0f6b71)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>→</button>
                </div>
              </>
            ) : (
               <div style={{flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8"}}>
                  Select a group to start messaging
               </div>
            )
          ) : (
            activeFriend ? (() => {
               const isMe = activeFriend.fromId === profile?.uid;
               const friendUserId = isMe ? activeFriend.toId : activeFriend.fromId;
               const friendName = isMe ? activeFriend.toName : activeFriend.fromName;
               const friendUname = isMe ? activeFriend.toUsername : activeFriend.fromUsername;
               const friendAvatar = isMe ? activeFriend.toAvatar : activeFriend.fromAvatar;

               if (activeFriendChat === friendUserId) {
                 return (
                   <>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(20,184,196,0.1)", display: "flex", alignItems: "center", gap: 12 }}>
                      <button onClick={() => setActiveFriendChat(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, marginRight: 8 }}>←</button>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(20,184,196,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{friendAvatar ? <img src={friendAvatar} style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover"}}/> : "👤"}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{friendName}</div>
                        <div style={{ fontSize: 12, color: "#22c55e" }}>Direct Message</div>
                      </div>
                    </div>

                    <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                      {dmMessages.length === 0 ? <p style={{color: "#94a3b8", textAlign: "center", marginTop: 20}}>Say hello to {friendName}!</p> : null}
                      {dmMessages.map((msg) => {
                        const isMyMsg = msg.senderId === profile?.uid;
                        return (
                          <div key={msg.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", alignSelf: isMyMsg ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                            {!isMyMsg && <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(20,184,196,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>👤</div>}
                            <div>
                              <div style={{ fontSize: 14, color: isMyMsg ? "#fff" : "#cbd5e1", background: isMyMsg ? "linear-gradient(135deg,#14b8c4,#0f6b71)" : "rgba(255,255,255,0.05)", padding: "8px 12px", borderRadius: isMyMsg ? "12px 4px 12px 12px" : "4px 12px 12px 12px" }}>{msg.content}</div>
                              <div style={{ fontSize: 11, color: "#475569", marginTop: 4, textAlign: isMyMsg ? "right" : "left" }}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(20,184,196,0.1)", display: "flex", gap: 10 }}>
                      <input value={dmInput} onChange={(e) => setDmInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendDirectMsg()}
                        placeholder={`Message ${friendName}…`}
                        style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "1px solid rgba(20,184,196,0.2)", background: "rgba(255,255,255,0.05)", color: "#f0f9fa", fontSize: 14, outline: "none" }}
                      />
                      <button onClick={sendDirectMsg} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#14b8c4,#0f6b71)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>→</button>
                    </div>
                   </>
                 );
               }

               return (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                   <div style={{ width: 100, height: 100, borderRadius: "50%", background: "rgba(20,184,196,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, marginBottom: 20 }}>{friendAvatar ? <img src={friendAvatar} style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover"}}/> : "👤"}</div>
                   <h2 style={{ fontSize: 24, fontWeight: 800 }}>{friendName}</h2>
                   <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>@{friendUname}</p>
                   
                   <div style={{ display: "flex", gap: 10 }}>
                     <button onClick={() => setActiveFriendChat(friendUserId)} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#14b8c4,#0f6b71)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>💬 Start Chat</button>
                     <button onClick={async () => {
                         if (!confirm("Are you sure you want to completely disconnect from this user?")) return;
                         await rejectFriendRequest(activeFriend.id);
                         setActiveFriend(null);
                     }} style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.5)", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontWeight: 700, cursor: "pointer" }}>❌ Disconnect / Block</button>
                   </div>
                </div>
               );
            })() : (
               <div style={{flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8"}}>
                  Select a friend to view details
               </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
