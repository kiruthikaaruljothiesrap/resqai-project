"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToTasks, updateTaskStatus } from "@/lib/firestore";
import { Task } from "@/types";

const priorityColors: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#22c55e" };
const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "#6366f1" },
  accepted: { label: "Accepted", color: "#8b5cf6" },
  in_progress: { label: "In Progress", color: "#f59e0b" },
  proof_submitted: { label: "Proof Submitted", color: "#14b8c4" },
  completed: { label: "Completed", color: "#22c55e" },
  rejected: { label: "Rejected", color: "#ef4444" }
};

const columns = ["pending", "accepted", "in_progress", "proof_submitted", "completed"] as const;

export default function NGOTasksPage() {
  const { profile } = useAuth();
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reportText, setReportText] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const generateReport = async (task: Task) => {
    setReportLoading(true);
    setReportText(null);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: "You are an NGO reporting assistant. Generate professional, concise humanitarian task completion reports.",
          message: `Generate a task completion report for the following:\n\nTask: ${task.title}\nDescription: ${task.description}\nVolunteer: ${task.volunteerName}\nStatus: ${task.status}\nPoints Awarded: ${task.points}\nProofs Submitted: ${task.proofUrls?.length || 0}\n\nWrite three short sections:\n1. Summary (2 sentences)\n2. Impact Assessment (2 sentences)\n3. Volunteer Contribution (1 sentence)`,
        }),
      });
      const data = await res.json();
      setReportText(data.success ? data.text : `⚠️ ${data.error}`);
    } catch {
      setReportText("⚠️ Failed to generate report.");
    } finally {
      setReportLoading(false);
    }
  };
  
  useEffect(() => {
    if (profile?.uid) {
      const unsub = subscribeToTasks(profile.uid, "ngo", setTaskList);
      return () => unsub();
    }
  }, [profile?.uid]);

  const detail = taskList.find((t) => t.id === detailId);

  const moveTask = async (id: string, status: any) => {
    try {
      await updateTaskStatus(id, status);
      setDetailId(null);
    } catch (e) {
      console.error(e);
      alert("Failed to update status");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Task Board</h1>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>Live Kanban-style task management for your NGO</p>
        </div>
      </div>

      {/* Task Detail Sheet */}
      {detail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-card" style={{ width: 460, padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Task Details</h2>
              <button onClick={() => setDetailId(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>
            <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 60, height: 60, borderRadius: 12, background: "rgba(20,184,196,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>📝</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{detail.title}</div>
                <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>{detail.description}</div>
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              {[
                { label: "Volunteer", value: detail.volunteerName },
                { label: "Points", value: `⭐ ${detail.points} pts` },
                { label: "Proof Uploaded", value: detail.proofUrls?.length ? `${detail.proofUrls.length} file(s)` : "None" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{value}</div>
                </div>
              ))}
            </div>

            {detail.proofUrls && detail.proofUrls.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>Proofs Attached:</div>
                {detail.proofUrls.map((url, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#14b8c4", marginBottom: 4 }}>📄 {url}</div>
                ))}
              </div>
            )}
            
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>Change status (or verify proof):</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {columns.map((col) => (
                  <button key={col} onClick={() => moveTask(detail.id, col)}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid", fontSize: 12, cursor: "pointer",
                      borderColor: detail.status === col ? statusConfig[col].color : "rgba(255,255,255,0.1)",
                      background: detail.status === col ? `${statusConfig[col].color}18` : "transparent",
                      color: detail.status === col ? statusConfig[col].color : "#64748b" }}>
                    {statusConfig[col].label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Report Generator */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16 }}>
              <button
                onClick={() => generateReport(detail)}
                disabled={reportLoading}
                style={{ width: "100%", padding: "10px", borderRadius: 9, border: "1px solid rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.1)", color: "#c7d2fe", fontWeight: 700, fontSize: 13, cursor: reportLoading ? "not-allowed" : "pointer", opacity: reportLoading ? 0.7 : 1 }}
              >
                {reportLoading ? "🤖 Generating Report..." : "🤖 Generate AI Report"}
              </button>
              {reportText && (
                <div style={{ marginTop: 14, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 12, color: "#8b5cf6", fontWeight: 700, marginBottom: 8 }}>📄 AI-Generated Report</div>
                  <pre style={{ fontSize: 13, color: "#c7d2fe", lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{reportText}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, overflowX: 'auto', paddingBottom: 20 }}>
        {columns.map((col) => {
          const colTasks = taskList.filter((t) => t.status === col);
          return (
            <div key={col} style={{ minWidth: 240 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: statusConfig[col].color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: statusConfig[col].color }}>{statusConfig[col].label}</span>
                </div>
                <span style={{ fontSize: 12, color: "#64748b", background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: "2px 8px" }}>{colTasks.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {colTasks.map((t) => (
                  <div key={t.id} onClick={() => setDetailId(t.id)} className="glass-card" style={{ padding: 16, cursor: "pointer", transition: "transform 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 22 }}>📝</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 16 }}>👤</span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{t.volunteerName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
