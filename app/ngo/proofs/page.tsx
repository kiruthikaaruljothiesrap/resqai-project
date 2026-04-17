"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToTasks, updateTaskStatus } from "@/lib/firestore";
import { Task } from "@/types";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ProofsPage() {
  const { profile } = useAuth();
  const [proofList, setProofList] = useState<Task[]>([]);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (profile?.uid) {
      const unsub = subscribeToTasks(profile.uid, "ngo", setProofList);
      return () => unsub();
    }
  }, [profile?.uid]);

  const approve = async (id: string) => {
    try {
      await updateTaskStatus(id, "completed");
    } catch(e) {
      console.error(e);
      alert("Failed to approve");
    }
  };

  const reject = async (id: string) => {
    try {
      await updateDoc(doc(db, "tasks", id), { status: "rejected", ngoNotes: note });
      setNoteId(null);
    } catch(e) {
      console.error(e);
      alert("Failed to reject");
    }
  };

  const pendingProofs = proofList.filter(p => p.status === "proof_submitted");
  const approvedProofs = proofList.filter(p => p.status === "completed");
  const rejectedProofs = proofList.filter(p => p.status === "rejected");

  const displayList = [...pendingProofs, ...approvedProofs, ...rejectedProofs];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Proof Validation</h1>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Review and approve submitted task completion proofs</p>
      </div>

      {/* Reject note modal */}
      {noteId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-card" style={{ width: 420, padding: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Reject with Notes</h2>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Explain why this proof is rejected…"
              style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#f0f9fa", fontSize: 14, resize: "none", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setNoteId(null)} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#94a3b8", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => reject(noteId)} style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>✕ Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Pending Review", value: pendingProofs.length, color: "#f59e0b" },
          { label: "Approved (Completed)", value: approvedProofs.length, color: "#22c55e" },
          { label: "Rejected", value: rejectedProofs.length, color: "#f87171" },
        ].map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: 18, textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {displayList.length === 0 ? (
           <div style={{ color: "#94a3b8", padding: 24, textAlign: "center" }}>No proofs to review right now.</div>
        ) : displayList.map((p) => (
          <div key={p.id} className="glass-card" style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(20,184,196,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👤</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.title}</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>By {p.volunteerName}</div>
                </div>
              </div>
              <span style={{
                padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                color: p.status === "completed" ? "#22c55e" : p.status === "rejected" ? "#f87171" : "#f59e0b",
                background: p.status === "completed" ? "#22c55e18" : p.status === "rejected" ? "#ef444418" : "#f59e0b18",
              }}>{(p.status === "proof_submitted" ? "pending" : p.status).toUpperCase()}</span>
            </div>

            {/* Files */}
            {p.proofUrls && p.proofUrls.length > 0 && (
              <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                {p.proofUrls.map((url) => (
                  <div key={url} style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>📄</span>
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>{url}</span>
                  </div>
                ))}
              </div>
            )}

            {p.status === "proof_submitted" && (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => approve(p.id)} style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>✅ Approve</button>
                <button onClick={() => setNoteId(p.id)} style={{ padding: "9px 22px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#f87171", fontWeight: 700, cursor: "pointer" }}>✕ Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
