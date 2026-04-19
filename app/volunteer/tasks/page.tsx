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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#f0f9fa] tracking-tight">Active <span className="text-cyan-400">Missions</span></h1>
          <p className="text-sm text-[#94a3b8] font-medium mt-1 uppercase tracking-widest text-[10px]">Track and execute assigned tasks</p>
        </div>
      </div>

      {/* Proof Upload Modal */}
      {uploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg p-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight uppercase">Upload Mission Proof</h2>
                <p className="text-xs text-[#94a3b8] font-bold mt-1 uppercase tracking-widest">Protocol validation required</p>
              </div>
              <button onClick={() => setUploadModal(null)} className="text-slate-500 hover:text-white transition-colors text-2xl">×</button>
            </div>
            
            <div className="border-2 border-dashed border-cyan-500/20 bg-cyan-500/5 rounded-2xl p-10 text-center mb-6 group hover:border-cyan-500/40 transition-all cursor-pointer">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📤</div>
              <p className="text-sm text-[#94a3b8] font-bold mb-4 uppercase tracking-widest">Uplink media files</p>
              <label className="bg-cyan-500 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-cyan-400 active:scale-95 transition-all">
                Select Files
                <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx" className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).map((f) => f.name);
                    setUploadedFiles((prev) => ({ ...prev, [uploadModal]: files }));
                  }}
                />
              </label>
              {uploadedFiles[uploadModal]?.length > 0 && (
                <div className="mt-6 space-y-2">
                  {uploadedFiles[uploadModal].map((f) => (
                    <div key={f} className="text-[10px] font-black text-green-400 bg-green-400/10 px-3 py-1.5 rounded-lg border border-green-400/20 flex items-center justify-center gap-2 uppercase tracking-widest">
                      ✓ {f}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setUploadModal(null)} className="py-3.5 rounded-xl border border-white/10 text-[#94a3b8] text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all">
                Abort
              </button>
              <button onClick={() => submitProof(uploadModal)} className="py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-green-700 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-green-500/20 active:scale-95 transition-all">
                Transmit Proof ✓
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {tasks
          .filter(t => t.status !== "completed" && t.status !== "rejected")
          .filter((t, idx, arr) => arr.findIndex(x => x.id === t.id) === idx)
          .length === 0 ? (
          <div className="glass-card p-12 text-center text-[#94a3b8] font-bold uppercase tracking-widest text-xs italic opacity-60">
            No active mission deployments detected. Check deployment map.
          </div>
        ) : tasks
          .filter(t => t.status !== "completed" && t.status !== "rejected")
          .filter((t, idx, arr) => arr.findIndex(x => x.id === t.id) === idx)
          .map((task) => {
          const st = task.status;
          return (
            <div key={task.id} className="glass-card p-6 md:p-8 hover:border-cyan-500/30 transition-all group">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
                <div className="flex gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-3xl shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                    {st === "proof_submitted" ? "💾" : "📝"}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight uppercase group-hover:text-cyan-400 transition-colors">{task.title}</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 mt-1">Source: <span className="text-slate-400">{task.ngoId}</span></p>
                    <p className="text-sm text-[#94a3b8] font-medium leading-relaxed line-clamp-2 md:line-clamp-none max-w-2xl">{task.description}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 shrink-0 w-full md:w-auto">
                  <span className={`
                    px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ring-1
                    ${st === "pending" ? 'bg-amber-500/10 text-amber-500 ring-amber-500/20' : 
                      st === "accepted" ? 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20' : 
                      'bg-green-500/10 text-green-500 ring-green-500/20'}
                  `}>
                    {st.replace("_", " ")}
                  </span>
                  <div className="flex gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><span className="text-amber-500">⭐</span> {task.points} PX</span>
                    <span className="flex items-center gap-1.5"><span className="text-cyan-400">⏱️</span> {task.estimatedHours}H</span>
                  </div>
                </div>
              </div>

              {(st === "accepted" || st === "proof_submitted") && (
                <div className="bg-green-500/5 ring-1 ring-green-500/20 rounded-2xl p-6 mb-6">
                  <div className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Secure Comms Uplink Established
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a href={`mailto:ngo-${task.ngoId}@resqai.org`} className="flex items-center justify-center gap-3 px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-xs font-black text-[#14b8c4] uppercase tracking-widest hover:bg-white/5 transition-all">
                      ✉️ Comms Address
                    </a>
                    <a href={`tel:+911234567890`} className="flex items-center justify-center gap-3 px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-xs font-black text-[#22c55e] uppercase tracking-widest hover:bg-white/5 transition-all">
                      📱 Voice Proxy
                    </a>
                    <a href={`https://wa.me/911234567890`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-xs font-black text-[#25D366] uppercase tracking-widest hover:bg-white/5 transition-all">
                      💬 Neutral Net
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                {st === "pending" && (
                  <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                    <button onClick={() => accept(task.id)} className="px-8 py-3.5 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-500/20 active:scale-95 transition-all">
                      Accept
                    </button>
                    <button onClick={() => reject(task.id)} className="px-8 py-3.5 border border-red-500/20 text-red-500 flex items-center justify-center rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500/5 active:scale-95 transition-all">
                      Decline
                    </button>
                  </div>
                )}
                {st === "accepted" && (
                  <button onClick={() => setUploadModal(task.id)} className="w-full md:w-auto px-10 py-3.5 bg-gradient-to-r from-cyan-500 to-cyan-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 active:scale-95 transition-all">
                    Establish Completion Proof
                  </button>
                )}
                {st === "proof_submitted" && (
                  <div className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-3 bg-green-500/5 px-4 py-3 rounded-xl border border-green-500/10">
                    <span className="text-lg">✓</span> Proof Transmitted. Awaiting NGO Neutralization.
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
