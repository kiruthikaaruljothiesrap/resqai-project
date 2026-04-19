"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToNeeds, createNeed } from "@/lib/firestore";
import { Need } from "@/types";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const priorityColors: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#22c55e" };
const statusColors: Record<string, string> = { open: "#6366f1", assigned: "#f59e0b", completed: "#22c55e" };

const VOLUNTEER_TYPES = ["medical", "engineering", "rescue", "logistics", "food", "education", "it", "construction"];

export default function NeedsPage() {
  const { profile } = useAuth();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const [form, setForm] = useState({ title: "", description: "", locationText: "", lat: 0, lng: 0, priority: "medium" as any, skills: [] as string[] });

  const update = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const unsub = subscribeToNeeds(setNeeds);
    return () => unsub();
  }, []);

  const openCreate = () => { setForm({ title: "", description: "", locationText: "", lat: 0, lng: 0, priority: "medium", skills: [] }); setEditId(null); setShowForm(true); };
  const openEdit = (n: Need) => { setForm({ title: n.title, description: n.description, locationText: n.location.address, lat: n.location.lat, lng: n.location.lng, priority: n.priority, skills: n.requiredSkills }); setEditId(n.id); setShowForm(true); };
  
  const deleteNeed = async (id: string) => {
    if (confirm("Are you sure you want to delete this need?")) {
      await deleteDoc(doc(db, "needs", id));
    }
  };

  const saveNeed = async () => {
    if (!profile) return;
    
    try {
      if (editId) {
        await updateDoc(doc(db, "needs", editId), {
          title: form.title,
          description: form.description,
          location: { address: form.locationText, lat: form.lat, lng: form.lng },
          priority: form.priority,
          requiredSkills: form.skills,
        });
      } else {
        await createNeed({
          title: form.title,
          description: form.description,
          location: { address: form.locationText, lat: form.lat, lng: form.lng },
          priority: form.priority,
          requiredSkills: form.skills,
          ngoId: profile.uid,
          ngoName: profile.firstName + ' ' + profile.lastName,
          ngoContact: profile.email,
          status: "open",
        });
      }
      setShowForm(false);
    } catch (e) {
      console.error(e);
      alert("Error saving need.");
    }
  };

  const myNeeds = needs.filter(n => n.ngoId === profile?.uid);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Need Management</h1>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>Create and manage help requests for your NGO</p>
        </div>
        <button onClick={openCreate} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          + Create Need
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-card" style={{ width: 540, padding: 32, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{editId ? "✏️ Edit Need" : "🆕 Create New Need"}</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Title</label>
              <input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder={"e.g. Emergency Medical Aid"}
                style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 8, color: "#f0f9fa", fontSize: 14 }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Location Address</label>
              <input value={form.locationText} onChange={(e) => update("locationText", e.target.value)} placeholder={"e.g. Sector 7, Chennai"}
                style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 8, color: "#f0f9fa", fontSize: 14 }} />
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Latitude (optional)</label>
                <input type="number" value={form.lat} onChange={(e) => update("lat", parseFloat(e.target.value))}
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 8, color: "#f0f9fa", fontSize: 14 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Longitude (optional)</label>
                <input type="number" value={form.lng} onChange={(e) => update("lng", parseFloat(e.target.value))}
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 8, color: "#f0f9fa", fontSize: 14 }} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Description</label>
              <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3}
                style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 8, color: "#f0f9fa", fontSize: 14, resize: "none" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Priority</label>
              <select value={form.priority} onChange={(e) => update("priority", e.target.value)}
                style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 8, color: priorityColors[form.priority], fontSize: 14 }}>
                {["critical", "high", "medium", "low"].map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>Required Skills</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {VOLUNTEER_TYPES.map((s) => (
                  <button key={s} type="button" onClick={() => update("skills", form.skills.includes(s) ? form.skills.filter((x) => x !== s) : [...form.skills, s])}
                    style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid", fontSize: 12, cursor: "pointer",
                      borderColor: form.skills.includes(s) ? "#14b8c4" : "rgba(255,255,255,0.12)",
                      background: form.skills.includes(s) ? "rgba(20,184,196,0.12)" : "transparent",
                      color: form.skills.includes(s) ? "#14b8c4" : "#64748b" }}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#94a3b8", cursor: "pointer" }}>Cancel</button>
              <button onClick={saveNeed} style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                {editId ? "Save Changes" : "Create Need"} →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Need cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {myNeeds.length === 0 ? (
          <div style={{ color: "#94a3b8", padding: 24, textAlign: "center" }}>No needs created yet. Create one to get started!</div>
        ) : myNeeds.map((n) => (
          <div key={n.id} className="glass-card" style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 16 }}>{n.title}</h3>
                  <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: priorityColors[n.priority] || "#fff", background: `${priorityColors[n.priority] || "#fff"}18` }}>{n.priority.toUpperCase()}</span>
                  <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: statusColors[n.status], background: `${statusColors[n.status]}18` }}>{n.status.toUpperCase()}</span>
                </div>
                <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 10 }}>{n.description}</p>
                <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#64748b" }}>
                  <span>📍 {n.location.address}</span>
                  <span>🕒 {new Date(n.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {(n.requiredSkills || []).map((s) => (
                    <span key={s} style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, background: "rgba(20,184,196,0.1)", color: "#14b8c4", border: "1px solid rgba(20,184,196,0.2)" }}>#{s}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 16 }}>
                <button onClick={() => openEdit(n)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(245,158,11,0.3)", background: "transparent", color: "#f59e0b", cursor: "pointer", fontSize: 13 }}>✏️ Edit</button>
                <button onClick={() => deleteNeed(n.id)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#f87171", cursor: "pointer", fontSize: 13 }}>🗑️ Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
