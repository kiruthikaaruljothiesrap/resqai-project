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
  const [mobileShowList, setMobileShowList] = useState(true);
  
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
      setMobileShowList(false);
      return () => unsub();
    }
  }, [activeGroup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-220px)] pb-10">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-[#f0f9fa] tracking-tight">Community</h1>
          <p className="hidden md:block text-sm text-[#94a3b8] font-medium">Connect with volunteers and share vital real-time info.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)} 
          className="px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-[#14b8c4] to-[#0f6b71] text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest shadow-lg shadow-cyan-500/10 active:scale-95 transition-all"
        >
          + New Group
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black text-[#f0f9fa] mb-6 tracking-tight">Create Channel</h2>
            <div className="space-y-4 mb-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em]">Group Name</label>
                <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g. CSR Medical Unit" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium outline-none focus:border-[#14b8c4]/50 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em]">Purpose</label>
                <input value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="Description..." className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium outline-none focus:border-[#14b8c4]/50 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em]">Privacy Scale</label>
                <select value={newGroupType} onChange={e => setNewGroupType(e.target.value as any)} className="w-full px-4 py-3 bg-neutral-900 border border-white/10 rounded-xl text-sm font-medium outline-none focus:border-[#14b8c4]/50 transition-all">
                  <option value="public">🌐 Open Network (Public)</option>
                  <option value="private">🔒 Restricted (Private)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-[#475569] hover:text-[#94a3b8] transition-colors">Abort</button>
              <button onClick={handleCreateGroup} className="flex-1 py-3 bg-[#14b8c4] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-cyan-500/10 active:scale-95 transition-all">Initiate →</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0 lg:gap-6 overflow-hidden">
        {/* Group Sidebar */}
        <div className={`glass-card p-0 flex flex-col overflow-hidden border-white/5 ${!mobileShowList ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex p-2 gap-1 border-b border-white/5 bg-black/20">
            {(["public", "private"] as const).map((t) => (
              <button 
                key={t} 
                onClick={() => setTab(t)} 
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === t ? "bg-[#14b8c4]/20 text-[#14b8c4] border border-[#14b8c4]/30 shadow-inner" : "text-[#64748b] hover:text-[#94a3b8]"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {displayedGroups.length === 0 ? (
              <div className="p-10 text-center space-y-2 opacity-50 grayscale mt-10">
                <div className="text-4xl">🛰️</div>
                <div className="text-[10px] font-black uppercase tracking-widest">Scanning... 0 found</div>
              </div>
            ) : displayedGroups.map((g) => (
              <button 
                key={g.id} 
                onClick={() => setActiveGroup(g.id)} 
                className={`w-full p-4 flex items-center gap-4 transition-all border-b border-white/[0.03] ${activeGroup === g.id ? "bg-[#14b8c4]/10 border-l-4 border-l-[#14b8c4] shadow-inner" : "hover:bg-white/[0.03] border-l-4 border-l-transparent"}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${g.visibility === "private" ? "bg-amber-500/10 text-amber-500" : "bg-cyan-500/10 text-cyan-400"}`}>
                  {g.visibility === "private" ? "🔒" : "🌀"}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className={`font-black text-sm truncate tracking-tight ${activeGroup === g.id ? "text-cyan-400" : "text-[#f0f9fa]"}`}>{g.name}</div>
                  <div className="text-[10px] font-bold text-[#475569] uppercase tracking-widest mt-0.5">{g.members?.length || 1} online</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat window */}
        <div className={`glass-card p-0 flex flex-col overflow-hidden relative ${mobileShowList ? 'hidden lg:flex' : 'flex'}`}>
          {activeGroupData ? (
            <>
              {/* Header */}
              <div className="p-4 md:px-6 md:py-4 border-b border-white/10 bg-black/20 flex items-center gap-4">
                <button 
                  onClick={() => setMobileShowList(true)} 
                  className="lg:hidden p-2 -ml-2 text-[#14b8c4] hover:bg-[#14b8c4]/10 rounded-lg transition-colors"
                >
                  <span className="text-xl">←</span>
                </button>
                <div className={`w-10 h-10 rounded-xl hidden sm:flex items-center justify-center text-xl flex-shrink-0 ${activeGroupData.visibility === "private" ? "bg-amber-500/10 text-amber-500" : "bg-cyan-500/10 text-cyan-400"}`}>
                  {activeGroupData.visibility === "private" ? "🔒" : "🌍"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm md:text-base text-[#f0f9fa] tracking-tight truncate">{activeGroupData.name}</div>
                  <div className="text-[10px] md:text-xs font-bold text-[#64748b] truncate uppercase tracking-widest">{activeGroupData.description || "Mission Comms"}</div>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
                {messages.map((msg, idx) => {
                  const isMe = msg.senderId === profile?.uid;
                  const showHeader = idx === 0 || messages[idx-1].senderId !== msg.senderId;
                  
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      {!isMe && showHeader && (
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">{msg.senderName}</span>
                        </div>
                      )}
                      <div className={`
                         max-w-[85%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-[13px] md:text-sm font-medium leading-relaxed
                         ${isMe 
                           ? "bg-gradient-to-br from-[#14b8c4] to-[#0f6b71] text-white rounded-tr-none shadow-lg shadow-[#14b8c4]/10" 
                           : "bg-white/5 text-slate-200 border border-white/5 rounded-tl-none"}
                      `}>
                        {msg.content}
                      </div>
                      <div className="text-[9px] font-black text-[#475569] uppercase tracking-tighter mt-1 px-1">
                         {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="p-4 md:p-6 bg-black/20 border-t border-white/5 space-y-2">
                <div className="flex gap-3">
                  <input 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    onKeyDown={(e) => e.key === "Enter" && sendMsg()}
                    placeholder="Enter mission updates..."
                    className="flex-1 px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm font-medium outline-none focus:border-[#14b8c4]/50 focus:ring-1 focus:ring-[#14b8c4]/20 transition-all text-[#f0f9fa] placeholder:text-[#475569]"
                  />
                  <button 
                    onClick={sendMsg} 
                    disabled={!input.trim()}
                    className="w-12 md:w-16 flex items-center justify-center bg-[#14b8c4] text-white rounded-2xl shadow-xl shadow-cyan-500/10 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                  >
                    <span className="text-2xl">→</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
                <div className="text-7xl mb-6 grayscale animate-pulse">📡</div>
                <h3 className="text-lg font-black text-[#f0f9fa] uppercase tracking-widest">Awaiting Link</h3>
                <p className="text-sm font-medium text-[#94a3b8] max-w-xs mt-2">Activate a channel from the directory to establish a secure comms link.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
