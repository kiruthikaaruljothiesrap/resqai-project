"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToTasks } from "@/lib/firestore";
import { Task } from "@/types";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function TasksPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [uploadModal, setUploadModal] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (profile?.uid) {
      const unsub = subscribeToTasks(profile.uid, "volunteer", setTasks);
      return () => unsub();
    }
  }, [profile?.uid]);

  const accept = async (id: string) => {
    await updateDoc(doc(db, "tasks", id), { status: "accepted" });
  };
  
  const reject = async (id: string) => {
    await updateDoc(doc(db, "tasks", id), { status: "rejected" });
  };
  
  const submitProof = async (id: string) => {
    await updateDoc(doc(db, "tasks", id), { 
      status: "proof_submitted", 
      proofUrls: uploadedFiles[id] || ["mock_proof.jpg"]
    });
    setUploadModal(null);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>My Tasks</h1>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Accept or reject assignments and submit proof of completion</p>
      </div>

      {/* Proof Upload Modal */}
      {uploadModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div className="glass-card" style={{ width: 480, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Upload Task Proof</h2>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 20 }}>
              Upload images, videos, or documents as proof of task completion. (Mocked file upload)
            </p>
            <div style={{
              border: "2px dashed rgba(20,184,196,0.3)", borderRadius: 12, padding: 32,
              textAlign: "center", marginBottom: 16, cursor: "pointer",
              background: "rgba(20,184,196,0.04)",
            }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
              <p style={{ color: "#94a3b8", fontSize: 14 }}>Drag & drop files here or</p>
              <label style={{ color: "#14b8c4", cursor: "pointer", fontSize: 14 }}>
                browse files
                <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx" style={{ display: "none" }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).map((f) => f.name);
                    setUploadedFiles((prev) => ({ ...prev, [uploadModal]: files }));
                  }}
                />
              </label>
              {uploadedFiles[uploadModal]?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {uploadedFiles[uploadModal].map((f) => (
                    <div key={f} style={{ fontSize: 13, color: "#22c55e" }}>✓ {f}</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setUploadModal(null)} style={{
                flex: 1, padding: "11px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent", color: "#94a3b8", cursor: "pointer", fontWeight: 600,
              }}>Cancel</button>
              <button onClick={() => submitProof(uploadModal)} style={{
                flex: 1, padding: "11px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff",
                cursor: "pointer", fontWeight: 700,
              }}>Submit Proof ✓</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {tasks
          .filter(t => t.status !== "completed" && t.status !== "rejected")
          .filter((t, idx, arr) => arr.findIndex(x => x.id === t.id) === idx)
          .length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No active tasks. Check the Map to find nearby needs!</div>
        ) : tasks
          .filter(t => t.status !== "completed" && t.status !== "rejected")
          .filter((t, idx, arr) => arr.findIndex(x => x.id === t.id) === idx)
          .map((task) => {
          const st = task.status;
          return (
            <div key={task.id} className="glass-card" style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 14 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 12, fontSize: 26,
                    background: `rgba(20,184,196,0.18)`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>📝</div>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{task.title}</h3>
                    <p style={{ fontSize: 13, color: "#64748b" }}>NGO Reference: {task.ngoId}</p>
                    <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>{task.description}</p>
                  </div>
                </div>
                <span style={{
                  padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                  color: "#14b8c4", background: `rgba(20,184,196,0.18)`,
                }}>{st.replace("_", " ").toUpperCase()}</span>
              </div>

              <div style={{ display: "flex", gap: 20, fontSize: 13, color: "#94a3b8", marginBottom: 14 }}>
                <span>⭐ {task.points} pts</span>
                <span>⏱️ ~{task.estimatedHours}h</span>
              </div>

              {/* NGO Contact – show real contact info when accepted */}
              {(st === "accepted" || st === "proof_submitted") && (
                <div style={{
                  background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)",
                  borderRadius: 10, padding: "12px 16px", marginBottom: 14,
                }}>
                  <div style={{ fontWeight: 700, color: "#22c55e", fontSize: 14, marginBottom: 8 }}>📞 Communication Channel Open</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    <a href={`mailto:ngo-${task.ngoId}@resqai.org`} style={{ fontSize: 13, color: "#14b8c4", display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                      ✉️ Email NGO
                    </a>
                    <a href={`tel:+911234567890`} style={{ fontSize: 13, color: "#22c55e", display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                      📱 Call: +91-1234567890
                    </a>
                    <a href={`https://wa.me/911234567890?text=Hi! I am working on task: ${task.title}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#25D366", display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                      💬 WhatsApp
                    </a>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {st === "pending" && (
                  <>
                    <button onClick={() => accept(task.id)} style={acceptBtnStyle}>✅ Accept Task</button>
                    <button onClick={() => reject(task.id)} style={rejectBtnStyle}>✕ Reject</button>
                  </>
                )}
                {st === "accepted" && (
                  <button onClick={() => setUploadModal(task.id)} style={primaryBtnStyle}>📤 Upload Proof</button>
                )}
                {st === "proof_submitted" && (
                  <div style={{ color: "#22c55e", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                    ✅ Proof submitted! Awaiting NGO validation.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const acceptBtnStyle: React.CSSProperties = {
  padding: "10px 24px", borderRadius: 10, border: "none",
  background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff",
  fontWeight: 700, cursor: "pointer", fontSize: 14,
};
const rejectBtnStyle: React.CSSProperties = {
  padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)",
  background: "transparent", color: "#f87171", fontWeight: 700, cursor: "pointer", fontSize: 14,
};
const primaryBtnStyle: React.CSSProperties = {
  padding: "10px 24px", borderRadius: 10, border: "none",
  background: "linear-gradient(135deg,#14b8c4,#0f6b71)", color: "#fff",
  fontWeight: 700, cursor: "pointer", fontSize: 14,
};
