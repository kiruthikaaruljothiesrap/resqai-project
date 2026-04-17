"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { createGroup, subscribeToGroups, subscribeToGroupMessages, sendMessage } from "@/lib/chat";
import { Message } from "@/types";

export default function CommunityPage() {
  const { profile } = useAuth();
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [tab, setTab] = useState<"public" | "private">("public");
  
  const [input, setInput] = useState("");
  const [groups, setGroups] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupType, setNewGroupType] = useState<"public"|"private">("public");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToGroups(setGroups);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (activeGroup) {
      const unsub = subscribeToGroupMessages(activeGroup, setMessages);
      return () => unsub();
    }
  }, [activeGroup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Set initial active group if none is selected
  useEffect(() => {
    if (!activeGroup && groups.length > 0) {
      const publicG = groups.filter(g => g.visibility === "public");
      if (publicG.length > 0) setActiveGroup(publicG[0].id);
    }
  }, [groups, activeGroup]);

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
      groupId: activeGroup // ensure lib/chat accepts extra payload -> it spreads it
    } as any);
    setInput("");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Community</h1>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>Join groups and connect with the volunteer network</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          padding: "10px 20px", borderRadius: 10, border: "none",
          background: "linear-gradient(135deg,#14b8c4,#0f6b71)", color: "#fff",
          fontWeight: 700, cursor: "pointer", fontSize: 14,
        }}>+ Create Group</button>
      </div>

      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-card" style={{ width: 420, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Create New Group</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 6 }}>Group Name</label>
              <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g. CSR Medical Unit" style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 8, color: "#f0f9fa", fontSize: 14 }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 6 }}>Description</label>
              <input value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="What is this group for?" style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 8, color: "#f0f9fa", fontSize: 14 }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 6 }}>Type</label>
              <select value={newGroupType} onChange={e => setNewGroupType(e.target.value as any)} style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 8, color: "#f0f9fa", fontSize: 14 }}>
                <option value="public">🌐 Public</option>
                <option value="private">🔒 Private (invite only)</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#94a3b8", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleCreateGroup} style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#14b8c4,#0f6b71)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Create →</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, height: "calc(100vh - 220px)" }}>
        <div className="glass-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", padding: "8px", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {(["public", "private"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: "8px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                background: tab === t ? "rgba(20,184,196,0.15)" : "transparent", color: tab === t ? "#14b8c4" : "#64748b",
              }}>{t === "public" ? "🌐 Public" : "🔒 Private"}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {displayedGroups.length === 0 ? <div style={{padding:20, color:"#94a3b8", textAlign:"center"}}>No groups found.</div> : displayedGroups.map((g) => (
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
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ display: "flex", flexDirection: "column" }}>
          {activeGroupData ? (
            <>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(20,184,196,0.1)", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>{activeGroupData.visibility === "private" ? "🔒" : "🌍"}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{activeGroupData.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{activeGroupData.description || "Community Group"}</div>
                </div>
                {activeGroupData.visibility === "private" && activeGroupData.ownerId === profile?.uid && (
                  <button style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(20,184,196,0.3)", background: "transparent", color: "#14b8c4", fontSize: 12 }}>
                    + Add Members
                  </button>
                )}
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
          )}
        </div>
      </div>
    </div>
  );
}
