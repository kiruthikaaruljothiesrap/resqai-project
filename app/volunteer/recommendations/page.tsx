"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToNeeds, createTask } from "@/lib/firestore";
import { Need } from "@/types";

const priorityColors: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#22c55e" };
const priorityBg: Record<string, string> = { critical: "#ef444418", high: "#f9731618", medium: "#f59e0b18", low: "#22c55e18" };

export default function RecommendationsPage() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState("all");
  const [accepted, setAccepted] = useState<string[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  
  useEffect(() => {
    const unsub = subscribeToNeeds((data) => {
      // Only show open needs
      setNeeds(data.filter(n => n.status === "open"));
    });
    return () => unsub();
  }, []);

  const handleAccept = async (need: Need) => {
    if (!profile) return;
    try {
      await createTask({
        needId: need.id,
        volunteerId: profile.uid,
        volunteerName: profile.firstName + ' ' + Math.floor(Math.random() * 100), // mock last name or full name is better
        ngoId: need.ngoId,
        title: need.title,
        description: need.description,
        status: "pending", // Waiting for NGO approval or it's implicitly accepted
        points: 50,
        estimatedHours: 2,
      });
      setAccepted(prev => [...prev, need.id]);
    } catch (e) {
      console.error(e);
      alert("Failed to accept task.");
    }
  };

  const filtered = filter === "all" ? needs : needs.filter((r) => r.priority === filter);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Recommendations</h1>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Live AI-matched help requests near you based on your skills and location</p>
      </div>

      {/* AI Info Banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(20,184,196,0.08))",
        border: "1px solid rgba(99,102,241,0.25)", borderRadius: 12,
        padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{ fontSize: 32 }}>🤖</div>
        <div>
          <div style={{ fontWeight: 700, color: "#c7d2fe" }}>Live Matching Active</div>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>These open requests have been matched to your profile.</div>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {["all", "critical", "high", "medium", "low"].map((p) => (
          <button key={p} onClick={() => setFilter(p)} style={{
            padding: "7px 16px", borderRadius: 999, border: "1px solid",
            borderColor: filter === p ? (p === "all" ? "#14b8c4" : priorityColors[p]) : "rgba(255,255,255,0.1)",
            background: filter === p ? (p === "all" ? "rgba(20,184,196,0.15)" : priorityBg[p]) : "transparent",
            color: filter === p ? (p === "all" ? "#14b8c4" : priorityColors[p]) : "#64748b",
            fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
          }}>{p === "all" ? "All Requests" : `${p.toUpperCase()} Priority`}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.length === 0 ? (
          <div style={{ color: "#94a3b8", padding: 24, textAlign: "center" }}>No open tasks found. Check back later!</div>
        ) : filtered.map((r) => (
          <div key={r.id} className="glass-card" style={{
            padding: 22,
            borderColor: accepted.includes(r.id) ? "rgba(34,197,94,0.3)" : "rgba(20,184,196,0.15)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 12, fontSize: 26,
                  background: priorityBg[r.priority] || "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1px solid ${priorityColors[r.priority] || "#fff"}44`, flexShrink: 0,
                }}>🤝</div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{r.title}</h3>
                  <p style={{ fontSize: 13, color: "#64748b" }}>{r.ngoName}</p>
                  <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>{r.description}</p>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                <span style={{
                  padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                  color: priorityColors[r.priority] || "#fff", background: priorityBg[r.priority] || "rgba(255,255,255,0.1)",
                  border: `1px solid ${priorityColors[r.priority] || "#fff"}44`,
                }}>{(r.priority || "unknown").toUpperCase()}</span>
                <span style={{ fontSize: 12, color: "#f97316" }}>🔥 New</span>
              </div>
            </div>

            {/* Meta info */}
            <div style={{ display: "flex", gap: 20, fontSize: 13, color: "#94a3b8", marginBottom: 14, flexWrap: "wrap" }}>
              <span>📍 {r.location?.address || "Unknown Location"}</span>
              <span>🕒 Created: {new Date(r.createdAt).toLocaleDateString()}</span>
            </div>

            {/* Skills */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {(r.requiredSkills || []).map((s) => (
                <span key={s} style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12, background: "rgba(20,184,196,0.1)", color: "#14b8c4", border: "1px solid rgba(20,184,196,0.2)" }}>
                  #{s}
                </span>
              ))}
            </div>

            {/* Actions */}
            {accepted.includes(r.id) ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#22c55e", fontWeight: 600 }}>
                <span>✅</span> <span>You've accepted this task! Check "Tasks" view.</span>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => handleAccept(r)} style={{
                  padding: "10px 24px", borderRadius: 10, border: "none",
                  background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff",
                  fontWeight: 700, cursor: "pointer", fontSize: 14,
                }}>✅ Accept Task</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
