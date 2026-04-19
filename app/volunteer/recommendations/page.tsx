"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToNeeds, createTask } from "@/lib/firestore";
import { Need } from "@/types";

const priorityColors: Record<string, string> = { critical: "text-red-500", high: "text-orange-500", medium: "text-amber-500", low: "text-green-500" };
const priorityBgs: Record<string, string> = { critical: "bg-red-500/10 ring-red-500/20", high: "bg-orange-500/10 ring-orange-500/20", medium: "bg-amber-500/10 ring-amber-500/20", low: "bg-green-500/10 ring-green-500/20" };

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
        volunteerName: `${profile.firstName} V${Math.floor(Math.random() * 900) + 100}`,
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
    }
  };

  const filtered = filter === "all" ? needs : needs.filter((r) => r.priority === filter);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#f0f9fa] tracking-tight">AI <span className="text-cyan-400">Matches</span></h1>
          <p className="text-sm text-[#94a3b8] font-medium mt-1 uppercase tracking-widest text-[10px]">Neural-matched help requests near you</p>
        </div>
      </div>

      {/* AI Status Banner */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-cyan-400/10 border border-indigo-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 group hover:border-indigo-500/40 transition-all">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-4xl shadow-2xl group-hover:scale-110 transition-transform">🤖</div>
        <div className="text-center sm:text-left">
          <h3 className="text-lg font-black text-indigo-400 tracking-tight uppercase">Cognitive Matching Active</h3>
          <p className="text-sm text-[#94a3b8] font-medium leading-relaxed">Requests are dynamically filtered based on your <span className="text-cyan-400 font-bold uppercase text-[10px]">Primary Directives</span> (Skills & Location).</p>
        </div>
      </div>

      {/* Category Selection */}
      <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
        {["all", "critical", "high", "medium", "low"].map((p) => (
          <button 
            key={p} 
            onClick={() => setFilter(p)} 
            className={`
              px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border
              ${filter === p 
                ? 'bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-500/20 active:scale-95' 
                : 'bg-white/5 border-white/10 text-slate-500 hover:text-white hover:bg-white/10'}
            `}
          >
            {p === "all" ? "All Targets" : `${p} Priority`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filtered.length === 0 ? (
          <div className="glass-card p-20 text-center text-[#94a3b8] font-bold uppercase tracking-widest text-xs italic opacity-60">
            No targets detected in current sector. Scan again later.
          </div>
        ) : filtered.map((r) => (
          <div 
            key={r.id} 
            className={`
              glass-card p-6 md:p-10 group transition-all duration-300 relative overflow-hidden
              ${accepted.includes(r.id) ? 'border-green-500/40 bg-green-500/5' : 'hover:border-cyan-500/30'}
            `}
          >
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br transition-opacity opacity-0 group-hover:opacity-10 pointer-events-none ${prioBgGradient(r.priority)}`} />
            
            <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
              <div className="flex flex-col sm:flex-row gap-6 w-full">
                <div className={`
                  w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center text-4xl shadow-xl ring-1
                  ${priorityBgs[r.priority] || 'bg-white/5 ring-white/10'}
                `}>
                  {r.priority === 'critical' ? '🚨' : '🤝'}
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight uppercase group-hover:text-cyan-400 transition-colors">{r.title}</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Entity: <span className="text-slate-400">{r.ngoName}</span></p>
                  </div>
                  <p className="text-sm text-[#94a3b8] font-medium leading-relaxed max-w-2xl">{r.description}</p>
                  
                  <div className="flex flex-wrap gap-6 pt-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <span className="text-lg">📍</span> {r.location?.address || "Mobile Base"}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <span className="text-lg">🕒</span> Published {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {(r.requiredSkills || []).map((s) => (
                      <span key={s} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-cyan-400 uppercase tracking-widest group-hover:bg-cyan-500/10 transition-all">
                        #{s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-3 shrink-0 w-full md:w-auto">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ring-1 ${priorityBgs[r.priority]}`}>
                  <span className={priorityColors[r.priority]}>{r.priority.toUpperCase()}</span> PRIORITY
                </span>
                <span className="animate-pulse bg-orange-500/10 text-orange-500 text-[9px] font-black px-3 py-1 rounded-full border border-orange-500/20 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Live Feed
                </span>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
              {accepted.includes(r.id) ? (
                <div className="flex items-center gap-3 text-green-500 text-xs font-black uppercase tracking-widest bg-green-500/10 px-6 py-3 rounded-xl border border-green-500/20">
                  <span className="text-lg font-bold">✓</span> Deployment Sequence Initialized. Check My Tasks.
                </div>
              ) : (
                <button onClick={() => handleAccept(r)} className="px-10 py-4.5 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-green-500/20 active:scale-95 transition-all w-full md:w-auto text-center">
                  Initialize Deployment →
                </button>
              )}
              <div className="flex items-center gap-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] whitespace-nowrap">
                <span className="hover:text-cyan-400 cursor-help transition-colors">Safety Code 4A</span>
                <span className="opacity-20">|</span>
                <span className="hover:text-cyan-400 cursor-help transition-colors">Skill Match 98%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function prioBgGradient(p: string) {
  switch(p) {
    case 'critical': return 'from-red-500 to-transparent';
    case 'high': return 'from-orange-500 to-transparent';
    case 'medium': return 'from-amber-500 to-transparent';
    default: return 'from-green-500 to-transparent';
  }
}
