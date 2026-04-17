"use client";
import { useState } from "react";

export default function BroadcastPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState<string[]>(["app"]);
  const [sent, setSent] = useState(false);
  const [aiSituation, setAiSituation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const generateBroadcast = async () => {
    if (!aiSituation.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: "You are an NGO emergency communications specialist. Write urgent, clear, action-oriented broadcast messages for volunteers. Keep it under 100 words. Include what is happening, where help is needed, and what volunteers should do immediately.",
          message: `Write an emergency broadcast message for this situation: ${aiSituation}`,
        }),
      });
      const data = await res.json();
      if (data.success) setMessage(data.text.replace(/^```.*\n?|\n?```$/gm, "").trim());
      else alert("AI Error: " + data.error);
    } catch {
      alert("Failed to connect to AI.");
    } finally {
      setAiLoading(false);
    }
  };

  const history = [
    { id: 1, title: "Flood Alert – Zone B", message: "All volunteers please report to Zone B immediately. Heavy flooding reported.", channels: ["app", "sms", "whatsapp"], sentAt: "Today 9:00 AM", recipients: 156 },
    { id: 2, title: "Medical Camp – Sector 4", message: "Medical volunteers needed at Sector 4 Community Center from 2–6pm.", channels: ["app"], sentAt: "Yesterday", recipients: 34 },
  ];

  const toggleChannel = (c: string) => setChannels((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const send = () => { if (!title || !message || !channels.length) return; setSent(true); setTimeout(() => setSent(false), 3000); setTitle(""); setMessage(""); };

  const channelIcons: Record<string, string> = { app: "📱 App", sms: "💬 SMS", whatsapp: "📲 WhatsApp" };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Broadcast System</h1>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Send alerts to all volunteers across multiple channels</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Compose */}
        <div className="glass-card" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>✍️ Compose Broadcast</h3>

          {/* AI Message Generator */}
          <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#c7d2fe", marginBottom: 10 }}>🤖 AI Message Generator</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={aiSituation}
                onChange={e => setAiSituation(e.target.value)}
                onKeyDown={e => e.key === "Enter" && generateBroadcast()}
                placeholder="Describe the emergency situation…"
                style={{ flex: 1, padding: "9px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, color: "#f0f9fa", fontSize: 13, outline: "none" }}
              />
              <button
                onClick={generateBroadcast}
                disabled={aiLoading || !aiSituation.trim()}
                style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: aiLoading ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: aiLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
              >
                {aiLoading ? "Generating..." : "✨ Generate"}
              </button>
            </div>
            <p style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>AI will write the message — you can edit it below before sending.</p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Alert Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. URGENT: Volunteers needed at Sector 7"
              style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 10, color: "#f0f9fa", fontSize: 14, outline: "none" }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Type your broadcast message here…"
              style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 10, color: "#f0f9fa", fontSize: 14, resize: "none", outline: "none" }} />
            <div style={{ textAlign: "right", fontSize: 12, color: "#475569", marginTop: 4 }}>{message.length}/500 characters</div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 10 }}>Send via:</label>
            <div style={{ display: "flex", gap: 10 }}>
              {Object.entries(channelIcons).map(([c, label]) => (
                <button key={c} onClick={() => toggleChannel(c)} style={{
                  padding: "10px 16px", borderRadius: 10, border: "1px solid", cursor: "pointer",
                  borderColor: channels.includes(c) ? "#f59e0b" : "rgba(255,255,255,0.1)",
                  background: channels.includes(c) ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
                  color: channels.includes(c) ? "#f59e0b" : "#64748b", fontWeight: 600, fontSize: 13, transition: "all 0.2s",
                }}>{label}</button>
              ))}
            </div>
          </div>

          {sent && (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontWeight: 600, marginBottom: 14, fontSize: 14 }}>
              ✅ Broadcast sent to 156 volunteers via {channels.join(", ")}!
            </div>
          )}

          <button onClick={send} style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
            📢 Send Broadcast →
          </button>
        </div>

        {/* History */}
        <div className="glass-card" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>📋 Broadcast History</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {history.map((h) => (
              <div key={h.id} style={{ padding: 16, background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{h.title}</div>
                <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 10 }}>{h.message}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {h.channels.map((c) => (
                      <span key={c} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>{channelIcons[c]}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    👥 {h.recipients} · {h.sentAt}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
