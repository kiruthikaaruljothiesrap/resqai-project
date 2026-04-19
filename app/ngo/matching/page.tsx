"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToNeeds, subscribeToUsers, createTask, updateNeedStatus } from "@/lib/firestore";
import { Need, Task } from "@/types";
import { UserProfile } from "@/lib/auth";

const priorityColors: Record<string, string> = { critical: "text-red-500", high: "text-orange-500", medium: "text-amber-500", low: "text-green-500" };
const priorityBgs: Record<string, string> = { critical: "bg-red-500/10 ring-red-500/20", high: "bg-orange-500/10 ring-orange-500/20", medium: "bg-amber-500/10 ring-amber-500/20", low: "bg-green-500/10 ring-green-500/20" };
const statusColors: Record<string, string> = { online: "bg-green-500", busy: "bg-amber-500", offline: "bg-slate-700" };

function getDistance(lat1?: number, lon1?: number, lat2?: number, lon2?: number) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 15;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;  
  const dLon = (lon2 - lon1) * Math.PI / 180; 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

function matchScore(volunteer: UserProfile, need: Need) {
  let score = 0;
  if (volunteer.status === "online") score += 40;
  else if (volunteer.status === "busy") score += 10;
  
  const skills = need.requiredSkills || [];
  const vSkills = [volunteer.volunteerType].filter(Boolean);
  if (skills.some(s => vSkills.includes(s))) score += 40;

  const dist = getDistance(volunteer.location?.lat, volunteer.location?.lng, need.location.lat, need.location.lng);
  score += Math.max(0, 20 - dist);
  score += Math.min(20, (volunteer.score || 0) / 100);
  
  return { score: Math.round(Math.min(100, score)), distance: dist.toFixed(1) };
}

export default function SmartMatchingPage() {
  const { profile } = useAuth();
  const [openNeeds, setOpenNeeds] = useState<Need[]>([]);
  const [volunteers, setVolunteers] = useState<UserProfile[]>([]);
  const [selectedNeed, setSelectedNeed] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<Record<string, string | null>>({});
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysisText, setAiAnalysisText] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.uid) {
      const unsubNeeds = subscribeToNeeds((data) => setOpenNeeds(data.filter(n => n.ngoId === profile.uid && n.status === "open")));
      const unsubUsers = subscribeToUsers("volunteer", setVolunteers);
      return () => { unsubNeeds(); unsubUsers(); };
    }
  }, [profile?.uid]);

  const need = openNeeds.find((n) => n.id === selectedNeed);

  const ranked = need ? [...volunteers]
    .map((v) => ({ v, ...matchScore(v, need) }))
    .sort((a, b) => b.score - a.score) : [];

  const handleAiAnalysis = async (currentNeed: Need, rankedList: Array<any>) => {
    setIsAiAnalyzing(true);
    setAiAnalysisText(null);
    try {
      const topFive = rankedList.slice(0, 5).map(r => ({
        name: r.v.firstName + " " + r.v.lastName,
        skills: r.v.volunteerType,
        distanceKm: r.distance,
        algScore: r.score,
        availability: r.v.status
      }));

      const systemPrompt = "You are the ResQAI Smart Match Engine. You evaluate raw heuristic scores and volunteer logistical data to recommend the absolute best candidate for an emergency Need.";
      const message = `Incident: ${currentNeed.title} \nPriority: ${currentNeed.priority} \nRequired Skills: ${(currentNeed.requiredSkills||[]).join(', ')} \n\nTop 5 Automated Candidates: ${JSON.stringify(topFive)} \n\nReview the automated candidates. Write a single short paragraph telling the NGO exactly who to assign to this incident and why (balance proximity and skill perfectly). Refuse to hallucinate extra details.`;

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, message }),
      });
      const data = await res.json();
      
      if (data.success) {
        setAiAnalysisText(data.text);
      } else {
        setAiAnalysisText("⚠️ AI Analysis failed: " + data.error);
      }
    } catch (e) {
      setAiAnalysisText("⚠️ AI Analysis failed to connect.");
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleAssign = async (v: UserProfile, n: Need) => {
    try {
      await createTask({
        needId: n.id,
        volunteerId: v.uid,
        volunteerName: v.firstName + " " + v.lastName,
        ngoId: n.ngoId,
        title: n.title,
        description: n.description,
        status: "accepted",
        points: 50,
        estimatedHours: 2,
      });
      await updateNeedStatus(n.id, "accepted" as any);
      setAssigned((prev) => ({ ...prev, [n.id]: v.uid }));
      setTimeout(() => setSelectedNeed(null), 1500);
    } catch(e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#f0f9fa] tracking-tight">Smart <span className="text-indigo-400">Matching</span></h1>
          <p className="text-sm text-[#94a3b8] font-medium mt-1 uppercase tracking-widest text-[10px]">AI-powered candidate prioritization</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-500/10 to-amber-500/10 border border-indigo-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 group hover:border-indigo-500/40 transition-all">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-4xl shadow-2xl group-hover:scale-110 transition-transform">🤖</div>
        <div className="text-center sm:text-left">
          <h3 className="text-lg font-black text-indigo-400 tracking-tight uppercase">Cognitive Heuristics Active</h3>
          <p className="text-sm text-[#94a3b8] font-medium leading-relaxed">Ranking volunteers by <span className="text-cyan-400 font-bold uppercase text-[10px]">Skill match (40%)</span>, <span className="text-amber-500 font-bold uppercase text-[10px]">Proximity (30%)</span>, and <span className="text-green-500 font-bold uppercase text-[10px]">Live status (20%)</span>.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Open Needs */}
        <div className="xl:col-span-4 space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Pending Incidents</h3>
          <div className="grid grid-cols-1 gap-3">
            {openNeeds.length === 0 ? (
              <p className="text-[#94a3b8] italic text-xs uppercase tracking-widest bg-white/5 p-8 rounded-2xl text-center border border-white/5 opacity-40">No incidents requiring deployment.</p>
            ) : openNeeds.map((n) => (
              <button 
                key={n.id} 
                onClick={() => setSelectedNeed(n.id)} 
                className={`
                  p-6 rounded-2xl border transition-all text-left group relative overflow-hidden
                  ${selectedNeed === n.id 
                    ? `bg-indigo-500/20 border-indigo-400/50 ring-1 ring-indigo-400/20` 
                    : `bg-white/5 border-white/5 hover:border-white/10`}
                `}
              >
                <div className="flex gap-4 items-center relative z-10">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform ${selectedNeed === n.id ? 'bg-indigo-500/20' : 'bg-white/5'}`}>
                    🆘
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="font-black text-white text-sm uppercase tracking-tight truncate">{n.title}</div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${priorityColors[n.priority]}`}>{n.priority}</span>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate">📍 {n.location.address}</span>
                    </div>
                  </div>
                </div>
                {selectedNeed === n.id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Ranked Volunteers */}
        <div className="xl:col-span-8">
          {need ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Deployment Recommendations: <span className="text-amber-500">{need.title}</span></h3>
                <button 
                  onClick={() => handleAiAnalysis(need, ranked)} 
                  disabled={isAiAnalyzing || ranked.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                >
                  {isAiAnalyzing ? <span className="animate-pulse">🔄 Neural Processing...</span> : "🤖 Ask ResQAI Intelligence"}
                </button>
              </div>

              {aiAnalysisText && (
                <div className="bg-indigo-500/5 border border-indigo-500/20 p-6 rounded-2xl animate-in slide-in-from-top-2 duration-500">
                  <div className="flex gap-4 items-start">
                    <span className="text-2xl mt-1">🧠</span>
                    <div>
                      <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Tactical Assessment Report</h4>
                      <p className="text-sm text-[#c7d2fe] font-medium leading-relaxed italic">
                        "{aiAnalysisText}"
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {ranked.map(({ v, score, distance }, idx) => (
                  <div key={v.uid} className={`glass-card p-6 md:p-8 group hover:border-indigo-500/30 transition-all ${idx === 0 ? 'ring-1 ring-amber-500/30' : ''}`}>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      {/* Rank/Score Circle */}
                      <div className="relative shrink-0">
                        <svg className="w-20 h-20 transform -rotate-90">
                          <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                          <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="4" fill="transparent" 
                            strokeDasharray={226} strokeDashoffset={226 - (226 * score) / 100}
                            className={`${score > 75 ? 'text-green-500' : score > 50 ? 'text-amber-500' : 'text-orange-500'} transition-all duration-1000 ease-out`} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-lg font-black text-white">{score}%</span>
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest -mt-1">Match</span>
                        </div>
                      </div>

                      {/* Profile */}
                      <div className="flex-1 min-w-0 text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                          <h4 className="text-lg font-black text-white uppercase tracking-tight truncate">{v.firstName} {v.lastName}</h4>
                          {idx === 0 && <span className="bg-amber-500/10 text-amber-500 text-[8px] font-black px-3 py-1 rounded-lg border border-amber-500/20 uppercase tracking-widest inline-block mx-auto sm:mx-0">⭐ Primary Target</span>}
                        </div>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><span className={statusColors[v.status] + " w-2 h-2 rounded-full"} /> {v.status}</span>
                          <span className="flex items-center gap-1.5"><span className="text-indigo-400">🛡️</span> {v.volunteerType}</span>
                          <span className="flex items-center gap-1.5"><span className="text-cyan-400">📍</span> {distance}KM Away</span>
                          <span className="flex items-center gap-1.5"><span className="text-amber-500">🏆</span> {v.score || 0} PX</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="shrink-0 w-full sm:w-auto">
                        {assigned[need.id] === v.uid ? (
                          <div className="bg-green-500/10 border border-green-500/20 text-green-500 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-center">
                            Deployment Active ✓
                          </div>
                        ) : (
                          <button onClick={() => handleAssign(v, need)} className={`
                            w-full sm:w-auto px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                            ${idx === 0 ? 'bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg shadow-green-500/20 active:scale-95' : 'bg-white/5 border border-white/10 text-cyan-400 hover:bg-cyan-500/10'}
                          `}>
                            {idx === 0 ? "⚡ Auto-Deploy" : "Assign Mission"} →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {ranked.length === 0 && (
                  <div className="glass-card p-12 text-center text-[#94a3b8] font-bold uppercase tracking-widest text-xs italic opacity-40">
                    No compatible volunteers detected in local radius. Expansion required.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card p-20 flex flex-col items-center justify-center text-center space-y-6 opacity-60">
              <div className="text-6xl animate-pulse">📡</div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Waiting for Command</h3>
                <p className="text-sm text-[#94a3b8] font-medium max-w-sm mx-auto">Select a pending requirement from the left sector to initialize neural matching algorithms.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
