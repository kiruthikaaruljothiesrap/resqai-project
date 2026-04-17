"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToTasks } from "@/lib/firestore";
import { Task } from "@/types";
import Link from "next/link";

const priorityColors: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#22c55e"
};

function Stars({ n }: { n: number }) {
  return <span>{Array.from({ length: 5 }).map((_, i) => <span key={i} style={{ color: i < n ? "#f59e0b" : "#374151" }}>★</span>)}</span>;
}

export default function ActivitiesPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<"completed" | "ongoing">("ongoing");

  useEffect(() => {
    if (profile?.uid) {
      const unsub = subscribeToTasks(profile.uid, "volunteer", setTasks);
      return () => unsub();
    }
  }, [profile?.uid]);

  const completed = tasks.filter(t => t.status === "completed");
  const ongoing = tasks.filter(t => t.status === "accepted" || t.status === "in_progress" || t.status === "proof_submitted");

  const totalPoints = completed.reduce((acc, t) => acc + (t.points || 0), 0);
  const totalHours = completed.reduce((acc, t) => acc + (t.actualHours || t.estimatedHours || 0), 0);
  const avgRating = completed.length > 0 ? (completed.reduce((acc, t) => acc + (t.ngoRating || 5), 0) / completed.length).toFixed(1) : "0.0";

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>My Activities</h1>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Track your volunteer tasks and performance</p>
      </div>

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Completed", value: completed.length, color: "#22c55e" },
          { label: "Total Hours", value: `${totalHours}h`, color: "#14b8c4" },
          { label: "Total Points", value: totalPoints, color: "#f59e0b" },
          { label: "Avg. Rating", value: `${avgRating} ★`, color: "#f97316" },
        ].map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["ongoing", "completed"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "9px 20px", borderRadius: 10, border: "none", cursor: "pointer",
            background: tab === t ? "linear-gradient(135deg,#14b8c4,#0f6b71)" : "rgba(255,255,255,0.05)",
            color: tab === t ? "#fff" : "#94a3b8", fontWeight: 600, fontSize: 14, textTransform: "capitalize",
          }}>{t} {t === "ongoing" ? `(${ongoing.length})` : `(${completed.length})`}</button>
        ))}
      </div>

      {tab === "ongoing" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {ongoing.length === 0 ? <div style={{ color: "#94a3b8", textAlign: "center", padding: 20 }}>No ongoing activities.</div> : ongoing.map((task) => {
            const progress = task.status === "proof_submitted" ? 100 : task.status === "in_progress" ? 50 : 20;

            return (
              <div key={task.id} className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: "rgba(20,184,196,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
                    }}>🏃</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{task.title}</div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>Assigned At: {new Date(task.assignedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <span style={{
                    padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    color: "#f59e0b",
                    background: `#f59e0b18`,
                    border: `1px solid #f59e0b44`,
                  }}>
                    {task.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 999, height: 8, overflow: "hidden" }}>
                    <div style={{
                      width: `${progress}%`, height: "100%",
                      background: progress > 70 ? "linear-gradient(90deg,#22c55e,#14b8c4)" : "linear-gradient(90deg,#14b8c4,#6366f1)",
                      borderRadius: 999, transition: "width 1s ease",
                    }} />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748b" }}>
                  <span>⭐ {task.points} Points</span>
                  {task.status !== "proof_submitted" && (
                    <Link href="/volunteer/tasks" style={{
                      padding: "6px 16px", borderRadius: 8, border: "none",
                      background: "rgba(20,184,196,0.15)", color: "#14b8c4",
                      fontSize: 13, cursor: "pointer", textDecoration: "none"
                    }}>Upload Proof →</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(20,184,196,0.06)" }}>
                {["Task", "Date", "Hours", "Points", "Rating", "Proof"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "#64748b", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {completed.length === 0 ? <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>No completed tasks yet.</td></tr> : completed.map((t) => (
                <tr key={t.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>✅</span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: "#94a3b8" }}>{t.completedAt ? new Date(t.completedAt).toLocaleDateString() : new Date(t.assignedAt).toLocaleDateString()}</td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: "#14b8c4" }}>{t.actualHours || t.estimatedHours || 0}h</td>
                  <td style={{ padding: "14px 16px", fontWeight: 700, color: "#f59e0b" }}>+{t.points}</td>
                  <td style={{ padding: "14px 16px" }}><Stars n={t.ngoRating || 5} /></td>
                  <td style={{ padding: "14px 16px" }}>
                    {t.proofUrls && t.proofUrls.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {t.proofUrls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#14b8c4", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                            📎 Proof {i + 1}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "#475569" }}>No proof</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
