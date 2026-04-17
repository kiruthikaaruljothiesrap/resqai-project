"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToMessages, sendMessage } from "@/lib/chat";
import { subscribeToUsers } from "@/lib/firestore";
import { subscribeToFriends, FriendRequest } from "@/lib/social";
import { UserProfile } from "@/lib/auth";
import { Message } from "@/types";

const botReplies = [
  "I'm available to help! Can you tell me more about the task?",
  "Based on your location, there are 3 high-priority requests near you.",
  "Your current score is 1,240 pts. You need 760 more to reach Expert level!",
  "The nearest task is 1.2km away – a medical emergency in Sector 7.",
  "You have unread notifications. Check the bell icon in the top bar.",
];

export default function ChatPage() {
  const { profile } = useAuth();
  const [activeChat, setActiveChat] = useState<"bot" | "community" | string>("bot"); // string = userId for 1:1
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  
  const [botMessages, setBotMessages] = useState<{ id: number; from: "bot" | "me"; text: string; time: string }[]>([
    { id: 1, from: "bot", text: "👋 Hi! I'm your ResQAI assistant. How can I help you today?", time: "Now" },
  ]);

  // Load bot chat from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("resqaiBotChat");
    if (saved) {
      try { setBotMessages(JSON.parse(saved)); } 
      catch (e) {}
    }
  }, []);

  // Save bot chat to local storage whenever it changes
  useEffect(() => {
    if (botMessages.length > 1) {
      localStorage.setItem("resqaiBotChat", JSON.stringify(botMessages));
    }
  }, [botMessages]);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [botLoading, setBotLoading] = useState(false);
  const [friends, setFriends] = useState<FriendRequest[]>([]);

  useEffect(() => {
    const unsubMessages = subscribeToMessages(setMessages);
    const unsubUsers = subscribeToUsers("volunteer", setUsers); // also search volunteers
    
    let unsubFriends = () => {};
    if (profile?.uid) {
      unsubFriends = subscribeToFriends(profile.uid, setFriends);
    }
    
    return () => { unsubMessages(); unsubUsers(); unsubFriends(); };
  }, [profile?.uid]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, botMessages, activeChat, botLoading]);

  // Derive friend IDs
  const friendIds = friends.map(f => f.fromId === profile?.uid ? f.toId : f.fromId);
  
  const activeUser = users.find(u => u.uid === activeChat);
  const searchedUsers = users.filter(u => 
    friendIds.includes(u.uid) && 
    (search ? u.username.toLowerCase().includes(search.toLowerCase()) : true) && 
    u.uid !== profile?.uid
  );

  const sendMsg = async () => {
    if (!input.trim() || !profile) return;
    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const cachedInput = input;
    setInput("");

    if (activeChat === "bot") {
      setBotMessages((prev) => [
        ...prev,
        { id: Date.now(), from: "me" as const, text: cachedInput, time: nowStr },
      ]);
      setBotLoading(true);

      try {
        const systemPrompt = `You are the ResQAI Assistant, an AI built to help volunteers respond to disasters. Provide very concise, step-by-step emergency guidance (Medical, Fire, Flood). The user's name is ${profile.firstName} and specialtiy is ${profile.volunteerType || 'general'}. Never hallucinate medical decisions, but offer strict standard first-aid formatting. Use bullet points where necessary. Keep it under 150 words.`;
        
        const res = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ systemPrompt, message: cachedInput }),
        });
        const data = await res.json();
        
        setBotMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, from: "bot" as const, text: data.success ? data.text : `⚠️ ${data.error}`, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
        ]);
      } catch (err) {
        setBotMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, from: "bot" as const, text: "⚠️ Failed to connect to AI.", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
        ]);
      } finally {
        setBotLoading(false);
      }
    } else {
      // In a real advanced app, we'd add channelId. For now everything broadcasts globally 
      // but client filters. Here we just use the global stream for MVP.
      await sendMessage({
        senderId: profile.uid,
        senderName: profile.firstName + ' ' + profile.lastName,
        content: activeChat === "community" ? cachedInput : `[@${activeUser?.username}] ${cachedInput}`,
        type: "text",
      });
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Chat</h1>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Real-time messaging with NGOs, volunteers, and AI</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, height: "calc(100vh - 200px)" }}>
        {/* Contact list */}
        <div className="glass-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
          
          {/* Search bar */}
          <div style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <input 
               value={search} 
               onChange={e => setSearch(e.target.value)} 
               placeholder="Search by username..." 
               style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(20,184,196,0.3)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, outline: "none" }}
            />
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {searchedUsers.map(u => (
               <button key={u.uid} onClick={() => { setActiveChat(u.uid); setSearch(""); }} style={{
                padding: "14px 16px", border: "none", textAlign: "left", cursor: "pointer", width: "100%",
                background: activeChat === u.uid ? "rgba(20,184,196,0.12)" : "transparent",
                borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s",
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(20,184,196,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, overflow: "hidden" }}>
                     {u.avatarUrl ? (
                       u.avatarUrl.startsWith("http") || u.avatarUrl.startsWith("data:") ? (
                         <img src={u.avatarUrl} alt="" style={{width:'100%',height:'100%',borderRadius:'50%'}}/>
                       ) : (
                         <span>{u.avatarUrl}</span>
                       )
                     ) : "👤"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#f0f9fa" }}>{u.firstName}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>@{u.username}</div>
                  </div>
                </div>
              </button>
            ))}

            {!search && (
              <>
                <button onClick={() => setActiveChat("bot")} style={{
                  padding: "14px 16px", border: "none", textAlign: "left", cursor: "pointer", width: "100%",
                  background: activeChat === "bot" ? "rgba(99,102,241,0.12)" : "transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s",
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🤖</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#f0f9fa" }}>AI Assistant</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>Ask me anything…</div>
                    </div>
                    <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                  </div>
                </button>

                <button onClick={() => setActiveChat("community")} style={{
                  padding: "14px 16px", border: "none", textAlign: "left", cursor: "pointer", width: "100%",
                  background: activeChat === "community" ? "rgba(20,184,196,0.12)" : "transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s",
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ position: "relative" }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(20,184,196,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🌍</div>
                      <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#22c55e", border: "2px solid #0d1f24" }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#f0f9fa" }}>Global Channel</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Chat with everyone</div>
                    </div>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column" }}>
          {/* Chat header */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(20,184,196,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: activeChat === "bot" ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(20,184,196,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, overflow: "hidden" }}>
                {activeChat === "bot" ? "🤖" : activeUser ? (
                  activeUser.avatarUrl ? (
                    activeUser.avatarUrl.startsWith("http") || activeUser.avatarUrl.startsWith("data:") ? (
                      <img src={activeUser.avatarUrl} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                    ) : (
                      <span>{activeUser.avatarUrl}</span>
                    )
                  ) : "👤"
                ) : "🌍"}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#f0f9fa" }}>
                  {activeChat === "bot" ? "AI Assistant" : activeUser ? activeUser.firstName + " " + activeUser.lastName : "Global Community Channel"}
                </div>
                <div style={{ fontSize: 12, color: "#22c55e" }}>● Online</div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            {activeChat === "bot" && (
              botMessages.map((msg) => (
                <div key={msg.id} style={{ display: "flex", justifyContent: msg.from === "me" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "70%", padding: "10px 16px", borderRadius: 14,
                    borderBottomLeftRadius: msg.from !== "me" ? 4 : 14,
                    borderBottomRightRadius: msg.from === "me" ? 4 : 14,
                    background: msg.from === "me" ? "linear-gradient(135deg,#14b8c4,#0f6b71)" : "rgba(99,102,241,0.2)",
                    color: "#f0f9fa",
                  }}>
                    <pre style={{ fontSize: 14, lineHeight: 1.5, fontFamily: "inherit", whiteSpace: "pre-wrap" }}>{msg.text}</pre>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4, textAlign: "right" }}>{msg.time}</p>
                  </div>
                </div>
              ))
            )}
            {activeChat === "bot" && botLoading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ padding: "10px 16px", borderRadius: 14, borderBottomLeftRadius: 4, background: "rgba(99,102,241,0.2)", color: "#f0f9fa" }}>
                    <p style={{ fontSize: 14, fontStyle: "italic", animation: "pulse 1.5s infinite" }}>Thinking...</p>
                  </div>
                </div>
            )}
            {activeChat !== "bot" && (
              messages
                .filter(m => activeChat === "community" ? !m.content.startsWith("[@") : m.content.includes(`[@${activeUser?.username}]`) || (m.senderId === profile?.uid && m.content.includes(`[@${activeUser?.username}]`)))
                .map((msg) => {
                const isMe = msg.senderId === profile?.uid;
                let displayContent = msg.content;
                if (activeUser && displayContent.startsWith(`[@${activeUser.username}] `)) {
                  displayContent = displayContent.replace(`[@${activeUser.username}] `, "");
                }
                return (
                  <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "70%", padding: "10px 16px", borderRadius: 14,
                      borderBottomLeftRadius: !isMe ? 4 : 14,
                      borderBottomRightRadius: isMe ? 4 : 14,
                      background: isMe ? "linear-gradient(135deg,#14b8c4,#0f6b71)" : "rgba(255,255,255,0.07)",
                      color: "#f0f9fa",
                    }}>
                      {!isMe && <div style={{ fontSize: 11, color: "#14b8c4", fontWeight: 700, marginBottom: 4 }}>{msg.senderName}</div>}
                      <p style={{ fontSize: 14, lineHeight: 1.5 }}>{displayContent}</p>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4, textAlign: "right" }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Emergency Quick Actions */}
          {activeChat === "bot" && (
            <div style={{ padding: "8px 20px 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#64748b", alignSelf: "center", marginRight: 4 }}>Quick:</span>
              {[
                { label: "🚗 Accident", prompt: "Give step-by-step emergency instructions for a road accident situation. Include first aid, calling for help, and safety measures." },
                { label: "🔥 Fire", prompt: "Give step-by-step emergency instructions for a fire situation. Include evacuation, fire extinguisher use, and what NOT to do." },
                { label: "🌊 Flood", prompt: "Give step-by-step emergency instructions for a flood situation. Include evacuation priorities, what to take, and how to stay safe." },
                { label: "❤️ CPR", prompt: "Give clear step-by-step CPR instructions for an unresponsive adult. Format as numbered steps." },
              ].map(({ label, prompt }) => (
                <button
                  key={label}
                  disabled={botLoading}
                  onClick={async () => {
                    if (!profile || botLoading) return;
                    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                    setBotMessages(prev => [...prev, { id: Date.now(), from: "me" as const, text: label, time: nowStr }]);
                    setBotLoading(true);
                    try {
                      const res = await fetch("/api/gemini", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ systemPrompt: `You are the ResQAI Emergency Assistant helping volunteer ${profile.firstName}. Be concise, clear, and practical.`, message: prompt }),
                      });
                      const data = await res.json();
                      setBotMessages(prev => [...prev, { id: Date.now() + 1, from: "bot" as const, text: data.success ? data.text : `⚠️ ${data.error}`, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
                    } catch { 
                      setBotMessages(prev => [...prev, { id: Date.now() + 1, from: "bot" as const, text: "⚠️ Failed to connect to AI.", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
                    } finally { setBotLoading(false); }
                  }}
                  style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid rgba(20,184,196,0.3)", background: "rgba(20,184,196,0.08)", color: "#14b8c4", fontSize: 12, fontWeight: 600, cursor: botLoading ? "not-allowed" : "pointer", opacity: botLoading ? 0.5 : 1, transition: "all 0.2s" }}
                >{label}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(20,184,196,0.1)", display: "flex", gap: 10 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMsg()}
              placeholder={activeChat === "bot" ? "Ask for emergency help or guidance…" : "Type a message…"}
              style={{
                flex: 1, padding: "11px 16px", borderRadius: 10, border: "1px solid rgba(20,184,196,0.2)",
                background: "rgba(255,255,255,0.05)", color: "#f0f9fa", fontSize: 14, outline: "none",
              }}
            />
            <button onClick={sendMsg} disabled={botLoading && activeChat === "bot"} style={{
              padding: "11px 20px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg,#14b8c4,#0f6b71)",
              color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 16, opacity: botLoading && activeChat === "bot" ? 0.6 : 1
            }}>→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
