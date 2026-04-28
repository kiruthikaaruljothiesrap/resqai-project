"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToNeeds, subscribeToUsers, createTask, updateNeedStatus } from "@/lib/firestore";
import { createNotification } from "@/lib/notifications";
import { Need, Task } from "@/types";
import { UserProfile } from "@/lib/auth";

const priorityColors: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#22c55e" };
const statusColors: Record<string, string> = { online: "#22c55e", busy: "#eab308", offline: "#374151" };

// Haversine formula to calculate mock distance (in km) since we didn't rigorously set up bounds
function getDistance(lat1?: number, lon1?: number, lat2?: number, lon2?: number) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 15; // default 15km if location unknown
  const R = 6371; // Radius of the earth in km
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
  // Availability
  if (volunteer.status === "online") score += 40;
  else if (volunteer.status === "busy") score += 10;
  
  // Skills Match
  const skills = need.requiredSkills || [];
  const vSkills = [volunteer.volunteerType].filter(Boolean); // Only a single specialty exists for now. In prod, update to an array
  if (skills.some(s => vSkills.includes(s))) score += 40;

  // Proximity (Closer is better)
  const dist = getDistance(volunteer.location?.lat, volunteer.location?.lng, need.location.lat, need.location.lng);
  score += Math.max(0, 20 - dist); // ~max 20 points
  
  // Score bonus
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
        status: "accepted", // the NGO directly assigns them
        points: 50,
        estimatedHours: 2,
      });
      // Updating need status keeps it off the matching screen permanently
      await updateNeedStatus(n.id, "accepted" as any);
      
      // Notify the volunteer
      await createNotification({
        userId: v.uid,
        title: "New Task Assigned",
        body: `You have been assigned to: ${n.title}`,
        type: "task",
        link: "/volunteer/tasks"
      });

      setAssigned((prev) => ({ ...prev, [n.id]: v.uid }));
      setTimeout(() => setSelectedNeed(null), 1500);
    } catch(e) {
      alert("Failed to assign volunteer.");
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Smart Matching</h1>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>AI-powered volunteer matching based on skills, location, and availability</p>
      </div>

      <div style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(245,158,11,0.08))", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 12, padding: 16, marginBottom: 24, display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ fontSize: 36 }}>🤖</div>
        <div>
          <div style={{ fontWeight: 700, color: "#c7d2fe" }}>Smart Match Engine Active</div>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>Ranking volunteers by skill match (40%), proximity (30%), status (20%), and performance score (10%).</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20 }}>
        {/* Open Needs */}
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Open Needs</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {openNeeds.length === 0 ? <p style={{color:"#94a3b8"}}>No open needs to map.</p> : openNeeds.map((n) => (
              <button key={n.id} onClick={() => setSelectedNeed(n.id)} style={{
                padding: 18, borderRadius: 12, border: "1px solid",
                borderColor: selectedNeed === n.id ? priorityColors[n.priority] : "rgba(255,255,255,0.08)",
                background: selectedNeed === n.id ? `${priorityColors[n.priority]}12` : "rgba(13,31,36,0.8)",
                cursor: "pointer", textAlign: "left",
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 24 }}>🆘</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#f0f9fa" }}>{n.title}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, color: priorityColors[n.priority], background: `${priorityColors[n.priority]}18` }}>{n.priority.toUpperCase()}</span>
                      <span style={{ fontSize: 11, color: "#64748b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"150px" }}>📍 {n.location.address}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Ranked Volunteers */}
        {need && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Best Matches for: <span style={{ color: "#f59e0b" }}>{need.title}</span></h3>
              <button 
                onClick={() => handleAiAnalysis(need, ranked)} 
                disabled={isAiAnalyzing || ranked.length === 0}
                style={{ 
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", 
                  border: "none", padding: "6px 14px", borderRadius: 8, fontSize: 12, 
                  fontWeight: 700, cursor: isAiAnalyzing || ranked.length === 0 ? "not-allowed" : "pointer", 
                  opacity: isAiAnalyzing ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 
                }}
              >
                {isAiAnalyzing ? <span style={{ animation: "pulse 1.5s infinite" }}>🤖 Analyzing...</span> : "🤖 Ask ResQAI"}
              </button>
            </div>

            {aiAnalysisText && (
              <div style={{ background: "rgba(99,102,241,0.1)", borderLeft: "3px solid #8b5cf6", padding: 14, borderRadius: "0 8px 8px 0", marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "#c7d2fe", lineHeight: 1.5 }}>
                   <strong style={{ color: "#fff" }}>ResQAI Recommendation:</strong> {aiAnalysisText}
                </p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ranked.map(({ v, score, distance }, idx) => (
                <div key={v.uid} className="glass-card" style={{ padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {/* Rank */}
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: idx === 0 ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: idx === 0 ? "#fff" : "#64748b", flexShrink: 0 }}>
                      {idx + 1}
                    </div>

                    {/* Avatar & status */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(20,184,196,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                        {v.avatarUrl ? <img src={v.avatarUrl} alt="avatar" style={{width:"100%", height:"100%", borderRadius:"50%", objectFit:"cover"}}/> : "👤"}
                      </div>
                      <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: statusColors[v.status] || statusColors.offline, border: "2px solid #0d1f24" }} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{v.firstName} {v.lastName} {idx === 0 && <span style={{ fontSize: 12, color: "#f59e0b" }}>⭐ Best Match</span>}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{v.volunteerType || "General"} · {distance}km away · 🏆 {v.score || 0} pts</div>
                    </div>

                    {/* Match score */}
                    <div style={{ textAlign: "center", flexShrink: 0 }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: score > 75 ? "#22c55e" : score > 50 ? "#f59e0b" : "#f97316" }}>{score}%</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>match</div>
                    </div>
                  </div>

                  {/* Match bar */}
                  <div style={{ marginTop: 12, background: "rgba(255,255,255,0.06)", borderRadius: 999, height: 5 }}>
                    <div style={{ width: `${score}%`, height: "100%", background: score > 75 ? "linear-gradient(90deg,#22c55e,#14b8c4)" : "linear-gradient(90deg,#f59e0b,#f97316)", borderRadius: 999 }} />
                  </div>

                  {assigned[need.id] === v.uid ? (
                    <div style={{ marginTop: 10, color: "#22c55e", fontWeight: 600, fontSize: 13 }}>✅ Assigned!</div>
                  ) : (
                    <button onClick={() => handleAssign(v, need)} style={{
                      marginTop: 12, padding: "8px 20px", borderRadius: 9, border: "none",
                      background: idx === 0 ? "linear-gradient(135deg,#22c55e,#16a34a)" : "rgba(20,184,196,0.12)",
                      color: idx === 0 ? "#fff" : "#14b8c4", fontWeight: 600, cursor: "pointer", fontSize: 13,
                    }}>
                      {idx === 0 ? "⚡ Auto-Assign" : "Assign"} →
                    </button>
                  )}
                </div>
              ))}
              {ranked.length === 0 && <p style={{color: "#94a3b8"}}>No volunteers found.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
