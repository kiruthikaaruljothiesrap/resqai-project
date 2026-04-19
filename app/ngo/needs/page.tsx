"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToNeeds, createNeed } from "@/lib/firestore";
import { Need } from "@/types";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const priorityColors: Record<string, string> = { critical: "text-red-500", high: "text-orange-500", medium: "text-amber-500", low: "text-green-500" };
const priorityBgs: Record<string, string> = { critical: "bg-red-500/10 ring-red-500/20", high: "bg-orange-500/10 ring-orange-500/20", medium: "bg-amber-500/10 ring-amber-500/20", low: "bg-green-500/10 ring-green-500/20" };
const statusColors: Record<string, string> = { open: "bg-indigo-500/10 text-indigo-400 ring-indigo-500/20", assigned: "bg-amber-500/10 text-amber-500 ring-amber-500/20", completed: "bg-green-500/10 text-green-500 ring-green-500/20" };

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
    if (confirm("Decommission this requirement permanently? This action is logged.")) {
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
          ngoName: `${profile.firstName} ${profile.lastName}`,
          ngoContact: profile.email,
          status: "open",
        });
      }
      setShowForm(false);
    } catch (e) {
      console.error(e);
    }
  };

  const myNeeds = needs.filter(n => n.ngoId === profile?.uid);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#f0f9fa] tracking-tight">Need <span className="text-amber-500">Inventory</span></h1>
          <p className="text-sm text-[#94a3b8] font-medium mt-1 uppercase tracking-widest text-[10px]">Manage and broadcast help requirements</p>
        </div>
        <button onClick={openCreate} className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all">
          + New Requirement
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-xl p-8 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight uppercase">{editId ? "✏️ Calibrate Need" : "🆕 Initialize Need"}</h2>
                <p className="text-xs text-[#94a3b8] font-bold mt-1 uppercase tracking-widest">Protocol Entry v2.4</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white transition-colors text-2xl">×</button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Requirement Designation</label>
                <input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="MISSION TITLE"
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-3.5 text-sm text-white placeholder-slate-600 focus:border-amber-500/50 outline-none transition-all" />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Deployment Sector (Address)</label>
                <input value={form.locationText} onChange={(e) => update("locationText", e.target.value)} placeholder="COORDINATES"
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-3.5 text-sm text-white placeholder-slate-600 focus:border-amber-500/50 outline-none transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Latitude</label>
                  <input type="number" value={form.lat} onChange={(e) => update("lat", parseFloat(e.target.value))}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-3.5 text-sm text-white outline-none focus:border-amber-500/50 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Longitude</label>
                  <input type="number" value={form.lng} onChange={(e) => update("lng", parseFloat(e.target.value))}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-3.5 text-sm text-white outline-none focus:border-amber-500/50 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tactical Intelligence (Description)</label>
                <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-3.5 text-sm text-white placeholder-slate-600 focus:border-amber-500/50 outline-none transition-all resize-none" />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Risk/Priority Assessment</label>
                <select value={form.priority} onChange={(e) => update("priority", e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-3.5 text-sm text-white outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer">
                  {["critical", "high", "medium", "low"].map((p) => <option key={p} value={p} className="bg-slate-900">{p.toUpperCase()}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Required Technical Directives (Skills)</label>
                <div className="flex flex-wrap gap-2">
                  {VOLUNTEER_TYPES.map((s) => (
                    <button 
                      key={s} 
                      type="button" 
                      onClick={() => update("skills", form.skills.includes(s) ? form.skills.filter((x) => x !== s) : [...form.skills, s])}
                      className={`
                        px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border
                        ${form.skills.includes(s) 
                          ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/20' 
                          : 'bg-white/5 border-white/10 text-slate-500 hover:text-white hover:bg-white/10'}
                      `}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowForm(false)} className="flex-1 py-4 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Cancel</button>
                <button onClick={saveNeed} className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all">
                  {editId ? "Update Baseline" : "Deploy Protocol"} →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Need cards */}
      <div className="grid grid-cols-1 gap-4">
        {myNeeds.length === 0 ? (
          <div className="glass-card p-12 text-center text-[#94a3b8] font-bold uppercase tracking-widest text-xs italic opacity-60">
            No requirements detected in current NGO sector.
          </div>
        ) : myNeeds.map((n) => (
          <div key={n.id} className="glass-card p-6 md:p-8 group hover:border-amber-500/30 transition-all">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
              <div className="flex-1 space-y-4 w-full">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-black text-white tracking-tight uppercase group-hover:text-amber-500 transition-colors">{n.title}</h3>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ring-1 ${priorityBgs[n.priority]}`}>
                      <span className={priorityColors[n.priority]}>{n.priority}</span>
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ring-1 ${statusColors[n.status]}`}>
                      {n.status}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-[#94a3b8] font-medium leading-relaxed max-w-3xl line-clamp-2 md:line-clamp-none">
                  {n.description}
                </p>

                <div className="flex flex-wrap gap-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <span className="flex items-center gap-2"><span className="text-lg">📍</span> {n.location.address}</span>
                  <span className="flex items-center gap-2"><span className="text-lg">🕒</span> Published {new Date(n.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {(n.requiredSkills || []).map((s) => (
                    <span key={s} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-amber-500 uppercase tracking-widest group-hover:bg-amber-500/10 transition-all">
                      #{s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex lg:flex-col gap-3 shrink-0 w-full lg:w-auto">
                <button onClick={() => openEdit(n)} className="flex-1 lg:w-32 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#f59e0b] hover:bg-amber-500/10 transition-all">
                  ✏️ Calibrate
                </button>
                <button onClick={() => deleteNeed(n.id)} className="flex-1 lg:w-32 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all">
                  🗑️ Purge
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
