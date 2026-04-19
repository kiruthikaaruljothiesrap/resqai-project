"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToMessages, sendMessage } from "@/lib/chat";
import { subscribeToUsers } from "@/lib/firestore";
import { subscribeToFriends, FriendRequest } from "@/lib/social";
import { UserProfile } from "@/lib/auth";
import { Message } from "@/types";

export default function ChatPage() {
  const { profile } = useAuth();
  const [activeChat, setActiveChat] = useState<"bot" | "community" | string>("bot");
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  
  const [botMessages, setBotMessages] = useState<{ id: number; from: "bot" | "me"; text: string; time: string }[]>([
    { id: 1, from: "bot", text: "👋 Hi! I'm your ResQAI assistant. How can I help you today?", time: "Now" },
  ]);

  useEffect(() => {
    const saved = localStorage.getItem("resqaiBotChat");
    if (saved) {
      try { setBotMessages(JSON.parse(saved)); } 
      catch (e) {}
    }
  }, []);

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
    const unsubUsers = subscribeToUsers("volunteer", setUsers);
    
    let unsubFriends = () => {};
    if (profile?.uid) {
      unsubFriends = subscribeToFriends(profile.uid, setFriends);
    }
    
    return () => { unsubMessages(); unsubUsers(); unsubFriends(); };
  }, [profile?.uid]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, botMessages, activeChat, botLoading]);

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
      await sendMessage({
        senderId: profile.uid,
        senderName: profile.firstName + ' ' + profile.lastName,
        content: activeChat === "community" ? cachedInput : `[@${activeUser?.username}] ${cachedInput}`,
        type: "text",
      });
    }
  };

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - var(--header-height) - 2 * var(--content-padding))", gap: "1.5rem" }}>
      <header>
        <h1>Chat</h1>
        <p>Real-time messaging with NGOs, volunteers, and AI assistant</p>
      </header>

      <div style={{ 
        flex: 1, 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", 
        gap: "1rem", 
        minHeight: 0 
      }}>
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", padding: 0, maxHeight: "100%", overflow: "hidden" }}>
          
          <div style={{ padding: "0.75rem", borderBottom: "1px solid var(--border)" }}>
            <input 
               value={search} 
               onChange={e => setSearch(e.target.value)} 
               placeholder="Search friends..." 
               style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", fontSize: "0.85rem", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {searchedUsers.map(u => (
               <button key={u.uid} onClick={() => { setActiveChat(u.uid); setSearch(""); }} style={{
                padding: "1rem", border: "none", textAlign: "left", cursor: "pointer", width: "100%",
                background: activeChat === u.uid ? "rgba(20,184,196,0.1)" : "transparent",
                borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.2s",
              }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "50%", background: "rgba(20,184,196,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", overflow: "hidden", flexShrink: 0 }}>
                     {u.avatarUrl ? (
                       u.avatarUrl.startsWith("http") || u.avatarUrl.startsWith("data:") ? (
                         <img src={u.avatarUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                       ) : (
                         <span>{u.avatarUrl}</span>
                       )
                     ) : "👤"}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.firstName}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>@{u.username}</div>
                  </div>
                </div>
              </button>
            ))}

            {!search && (
              <>
                <button onClick={() => setActiveChat("bot")} style={{
                  padding: "1rem", border: "none", textAlign: "left", cursor: "pointer", width: "100%",
                  background: activeChat === "bot" ? "rgba(99,102,241,0.1)" : "transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.2s",
                }}>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <div className="flex-center" style={{ width: "2.5rem", height: "2.5rem", borderRadius: "50%", background: "linear-gradient(135deg, var(--indigo-500), #8b5cf6)", fontSize: "1.25rem", flexShrink: 0 }}>🤖</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>AI Assistant</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Ask me for emergency help...</div>
                    </div>
                  </div>
                </button>

                <button onClick={() => setActiveChat("community")} style={{
                  padding: "1rem", border: "none", textAlign: "left", cursor: "pointer", width: "100%",
                  background: activeChat === "community" ? "rgba(20,184,196,0.1)" : "transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.2s",
                }}>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div className="flex-center" style={{ width: "2.5rem", height: "2.5rem", borderRadius: "50%", background: "rgba(20,184,196,0.15)", fontSize: "1.25rem" }}>🌍</div>
                      <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "var(--green-500)", border: "2px solid var(--bg-card)" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>Global Channel</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Chat with everyone</div>
                    </div>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="glass-card" style={{ display: "flex", flexDirection: "column", padding: 0, maxHeight: "100%", overflow: "hidden" }}>
          <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "2.25rem", height: "2.25rem", borderRadius: "50%", background: activeChat === "bot" ? "var(--indigo-500)" : "rgba(20,184,196,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", overflow: "hidden", flexShrink: 0 }}>
                {activeChat === "bot" ? "🤖" : activeUser ? (
                  activeUser.avatarUrl ? (
                    <img src={activeUser.avatarUrl} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                  ) : "👤"
                ) : "🌍"}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {activeChat === "bot" ? "AI Assistant" : activeUser ? activeUser.firstName + " " + activeUser.lastName : "Global Community Channel"}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--green-500)" }}>● Online</div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {activeChat === "bot" && (
              botMessages.map((msg) => (
                <div key={msg.id} style={{ display: "flex", justifyContent: msg.from === "me" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "min(350px, 85%)", padding: "0.75rem 1rem", borderRadius: "1rem",
                    borderBottomLeftRadius: msg.from !== "me" ? 4 : "1rem",
                    borderBottomRightRadius: msg.from === "me" ? 4 : "1rem",
                    background: msg.from === "me" ? "linear-gradient(135deg, var(--teal-500), var(--teal-700))" : "rgba(99,102,241,0.15)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}>
                    <pre style={{ fontSize: "0.9rem", lineHeight: 1.5, fontFamily: "inherit", whiteSpace: "pre-wrap", color: "var(--text-primary)" }}>{msg.text}</pre>
                    <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginTop: "0.25rem", textAlign: "right" }}>{msg.time}</p>
                  </div>
                </div>
              ))
            )}
            {activeChat === "bot" && botLoading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ padding: "0.75rem 1rem", borderRadius: "1rem", borderBottomLeftRadius: 4, background: "rgba(99,102,241,0.15)", color: "var(--text-secondary)" }}>
                    <p style={{ fontSize: "0.85rem", fontStyle: "italic" }}>AI is typing...</p>
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
                      maxWidth: "min(350px, 85%)", padding: "0.75rem 1rem", borderRadius: "1rem",
                      borderBottomLeftRadius: !isMe ? 4 : "1rem",
                      borderBottomRightRadius: isMe ? 4 : "1rem",
                      background: isMe ? "linear-gradient(135deg, var(--teal-500), var(--teal-700))" : "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}>
                      {!isMe && <div style={{ fontSize: "0.7rem", color: "var(--teal-300)", fontWeight: 700, marginBottom: 2 }}>{msg.senderName}</div>}
                      <p style={{ fontSize: "0.9rem", lineHeight: 1.5, color: "var(--text-primary)" }}>{displayContent}</p>
                      <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginTop: "0.25rem", textAlign: "right" }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {activeChat === "bot" && (
            <div style={{ padding: "0.5rem 1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", overflowX: "auto" }}>
              {[
                { label: "🚗 Accident", prompt: "Give step-by-step emergency instructions for a road accident situation." },
                { label: "🔥 Fire", prompt: "Give step-by-step emergency instructions for a fire situation." },
                { label: "🌊 Flood", prompt: "Emergency instructions for floods." },
                { label: "❤️ CPR", prompt: "Step-by-step CPR instructions." },
              ].map(({ label, prompt }) => (
                <button
                  key={label}
                  disabled={botLoading}
                  onClick={() => { setInput(prompt); sendMsg(); }}
                  style={{ 
                    padding: "0.35rem 0.75rem", borderRadius: "1rem", border: "1px solid var(--border)", 
                    background: "rgba(20,184,196,0.05)", color: "var(--teal-300)", fontSize: "0.75rem", 
                    fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap"
                  }}
                >{label}</button>
              ))}
            </div>
          )}

          <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.75rem" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMsg()}
              placeholder={activeChat === "bot" ? "Ask for emergency help…" : "Type a message…"}
              style={{ flex: 1, fontSize: "0.9rem", padding: "0.75rem", borderRadius: "0.75rem", background: "rgba(0,0,0,0.1)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
            <button onClick={sendMsg} disabled={botLoading && activeChat === "bot"} style={{
              width: "3rem", height: "auto", borderRadius: "0.75rem", border: "none",
              background: "linear-gradient(135deg, var(--teal-500), var(--teal-700))",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem",
              flexShrink: 0, cursor: "pointer", opacity: botLoading && activeChat === "bot" ? 0.6 : 1
            }}>→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
