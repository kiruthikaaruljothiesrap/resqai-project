"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToNeeds, createTask } from "@/lib/firestore";
import { Need } from "@/types";

const priorityColors: Record<string, string> = { critical: "var(--rose-500)", high: "#f97316", medium: "var(--amber-500)", low: "var(--green-500)" };
const priorityBg: Record<string, string> = { critical: "rgba(239, 68, 68, 0.1)", high: "rgba(249, 115, 22, 0.1)", medium: "rgba(245, 158, 11, 0.1)", low: "rgba(34, 197, 94, 0.1)" };

export default function RecommendationsPage() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState("all");
  const [accepted, setAccepted] = useState<string[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  
  useEffect(() => {
    const unsub = subscribeToNeeds((data) => {
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
        volunteerName: profile.firstName + ' ' + (profile.lastName || ""),
        ngoId: need.ngoId,
        title: need.title,
        description: need.description,
        status: "pending",
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
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: "var(--fluid-gap)" }}>
      <header>
        <h1>Recommendations</h1>
        <p>Live AI-matched help requests near you based on your skills and location.</p>
      </header>

      {/* AI Info Banner - Fluid */}
      <div style={{
        background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(20,184,196,0.05))",
        border: "1px solid rgba(99,102,241,0.2)", borderRadius: "1rem",
        padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap"
      }}>
        <div style={{ fontSize: "2.5rem" }}>🤖</div>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <div style={{ fontWeight: 700, color: "var(--indigo-500)", fontSize: "1rem" }}>AI-Matching Enabled</div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>ResQAI has prioritized these requests based on your profile.</div>
        </div>
      </div>

      {/* Filter pills - Responsive Wrap */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {["all", "critical", "high", "medium", "low"].map((p) => (
          <button key={p} onClick={() => setFilter(p)} style={{
            padding: "0.5rem 1.25rem", borderRadius: "999px", border: "1px solid",
            borderColor: filter === p ? (p === "all" ? "var(--teal-500)" : priorityColors[p]) : "var(--border)",
            background: filter === p ? (filter === "all" ? "rgba(20,184,196,0.1)" : priorityBg[p]) : "transparent",
            color: filter === p ? (filter === "all" ? "var(--teal-300)" : priorityColors[p]) : "var(--text-secondary)",
            fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
          }}>{p === "all" ? "All Requests" : `${p.toUpperCase()} Priority`}</button>
        ))}
      </div>

      {/* Need Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {filtered.length === 0 ? (
          <div style={{ color: "var(--text-secondary)", padding: "3rem 1rem", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "1rem" }}>
            No matches found for this priority level.
          </div>
        ) : filtered.map((r) => (
          <div key={r.id} className="glass-card" style={{
            borderColor: accepted.includes(r.id) ? "var(--green-500)" : "var(--border)",
          }}>
            <div className="flex-between" style={{ alignItems: "flex-start", marginBottom: "1rem" }}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                <div className="flex-center" style={{
                  width: "3.5rem", height: "3.5rem", borderRadius: "1rem", fontSize: "1.75rem",
                  background: priorityBg[r.priority] || "rgba(255,255,255,0.05)", 
                  border: `1px solid ${priorityColors[r.priority] || "var(--border)"}44`, flexShrink: 0,
                }}>🤝</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "0.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</h3>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--teal-500)", marginBottom: "0.5rem" }}>{r.ngoName}</div>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", display: "-webkit-box", WebkitLineClamp: "2", WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.description}</p>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem", flexShrink: 0 }}>
                <span style={{
                  padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 800,
                  color: priorityColors[r.priority] || "var(--text-primary)", background: priorityBg[r.priority] || "var(--border)",
                  border: `1px solid ${priorityColors[r.priority] || "var(--border)"}44`,
                }}>{(r.priority || "NORMAL").toUpperCase()}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--amber-500)", fontWeight: 700 }}>🔥 RECOMMENDATION</span>
              </div>
            </div>

            {/* Meta info - Fluid Row */}
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", margin: "1rem 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <span>📍 {r.location?.address || "Nearby"}</span>
              <span>🕒 Posted: {new Date(r.createdAt).toLocaleDateString()}</span>
            </div>

            {/* Skills - Responsive Chips */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
              {(r.requiredSkills || []).map((s) => (
                <span key={s} style={{ padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", background: "rgba(20,184,196,0.1)", color: "var(--teal-500)", border: "1px solid var(--border)" }}>
                  #{s}
                </span>
              ))}
            </div>

            {/* Actions */}
            {accepted.includes(r.id) ? (
              <div className="flex-center" style={{ gap: "0.5rem", color: "var(--green-500)", fontWeight: 600, padding: "0.5rem", background: "rgba(34, 197, 94, 0.05)", borderRadius: "0.75rem" }}>
                <span>✅</span> <span>Request accepted! Check your Task Board.</span>
              </div>
            ) : (
              <button onClick={() => handleAccept(r)} style={{
                width: "100%", padding: "0.75rem", borderRadius: "0.75rem", border: "none",
                background: "linear-gradient(135deg, var(--green-500), #16a34a)", color: "#fff",
                fontWeight: 700, cursor: "pointer", fontSize: "0.95rem", transition: "transform 0.2s"
              }}>Accept Task</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
