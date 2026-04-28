"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToUsers, subscribeToTaskCounts } from "@/lib/firestore";
import { UserProfile } from "@/lib/auth";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const statusColors: Record<string, string> = { online: "var(--green-500)", busy: "var(--amber-500)", offline: "var(--text-secondary)" };

export default function NGODashboard() {
  const { profile, loading } = useAuth();
  const [volunteers, setVolunteers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [taskStats, setTaskStats] = useState({ completed: 0, assigned: 0, open: 0 });

  useEffect(() => {
    if (profile?.uid && profile.role === "ngo") {
      const unsubUsers = subscribeToUsers("volunteer", setVolunteers);
      const unsubStats = subscribeToTaskCounts(setTaskStats);
      return () => { unsubUsers(); unsubStats(); };
    }
  }, [profile?.uid, profile?.role]);

  if (loading) return <div style={{ padding: "var(--content-padding)", color: "var(--text-primary)" }}>Loading Dashboard...</div>;
  if (!profile || profile.role !== "ngo") return <div style={{ padding: "var(--content-padding)", color: "var(--rose-500)" }}>Unauthorized access.</div>;

  const activeVols = volunteers.filter(v => v.status === "online").length;

  const stats = [
    { label: "Total Volunteers", value: volunteers.length, icon: "👥", color: "var(--teal-500)" },
    { label: "Active Now", value: activeVols, icon: "🟢", color: "var(--green-500)" },
    { label: "Open Tasks", value: taskStats.open, icon: "🚨", color: "var(--amber-500)" },
    { label: "Completed Tasks", value: taskStats.completed, icon: "✅", color: "var(--indigo-500)" },
  ];

  const filtered = volunteers.filter((v) =>
    (v.firstName + " " + v.lastName).toLowerCase().includes(search.toLowerCase()) || 
    (v.volunteerType || "").toLowerCase().includes(search.toLowerCase())
  );

  const activityData = [
    { day: "Mon", tasks: 4, volunteers: 12 },
    { day: "Tue", tasks: 7, volunteers: 18 },
    { day: "Wed", tasks: 5, volunteers: 15 },
    { day: "Thu", tasks: 9, volunteers: 22 },
    { day: "Fri", tasks: 12, volunteers: 25 },
    { day: "Sat", tasks: 6, volunteers: 14 },
    { day: "Sun", tasks: 3, volunteers: 10 },
  ];

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: "var(--fluid-gap)" }}>
      <header>
        <h1 className="gradient-text" style={{ background: "linear-gradient(135deg, var(--teal-500), var(--indigo-500))" }}>
          NGO Command Center
        </h1>
        <p>Real-time volunteer network and task management.</p>
      </header>

      {profile.status !== "verified" && (
        <div className="glass-card" style={{ border: `1px solid ${profile.status === "rejected" ? "var(--rose-500)" : "var(--amber-500)"}`, background: `${profile.status === "rejected" ? "rgba(244,63,94,0.05)" : "rgba(245,158,11,0.05)"}`, padding: "1.5rem", borderRadius: "1rem", display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div style={{ fontSize: "2.5rem" }}>{profile.status === "rejected" ? "❌" : "⏳"}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.25rem", color: profile.status === "rejected" ? "var(--rose-400)" : "var(--amber-400)" }}>
              {profile.status === "rejected" ? "Acount Verification Rejected" : "Account Verification Pending"}
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              {profile.status === "rejected" 
                ? "Your NGO certificate was rejected by the administration. Please update your details in your profile."
                : "Your NGO details are being reviewed by our team. You have limited access until verified."}
            </p>
          </div>
          <button 
            onClick={() => window.location.href = "/ngo/profile"}
            style={{ padding: "0.6rem 1.25rem", borderRadius: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", fontWeight: 600, cursor: "pointer" }}
          >
            Go to Profile →
          </button>
        </div>
      )}

      {/* Stats - Fully Responsive Grid */}
      <div className="auto-grid" style={{ "--min-width": "200px" } as any}>
        {stats.map((s) => (
          <div key={s.label} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div className="flex-between">
              <span style={{ fontSize: "2rem" }}>{s.icon}</span>
              <span style={{ fontSize: "0.75rem", color: s.color, background: "rgba(255,255,255,0.05)", padding: "0.25rem 0.6rem", borderRadius: "99px" }}>LIVE</span>
            </div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts - Responsive Grid */}
      <div className="auto-grid" style={{ "--min-width": "min(400px, 100%)" } as any}>
        <div className="glass-card">
          <h3 style={{ fontSize: "1rem", marginBottom: "1.5rem" }}>Weekly Task Distribution</h3>
          <div style={{ height: "250px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} />
                <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--bg-dark)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                <Bar dataKey="tasks" fill="var(--teal-500)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ fontSize: "1rem", marginBottom: "1.5rem" }}>Volunteer Engagement Trend</h3>
          <div style={{ height: "250px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} />
                <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--bg-dark)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="volunteers" stroke="var(--amber-500)" strokeWidth={3} dot={{ fill: "var(--amber-500)", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Volunteer Directory - Responsive Table */}
      <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: "1rem" }}>Volunteer Directory</h3>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filters..."
            style={{ width: "min(250px, 100%)", padding: "0.6rem 1rem", fontSize: "0.85rem" }}
          />
        </div>
        
        <div className="overflow-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                {["Volunteer", "Expertise", "Status", "Score", "Action"].map((h) => (
                  <th key={h} style={{ padding: "1rem 1.5rem", textAlign: "left", fontSize: "0.75rem", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "3rem", textAlign:"center", color:"var(--text-secondary)" }}>No active volunteers matching search.</td></tr>
              ) : filtered.map((v) => (
                <tr key={v.uid} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.2s" }}>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <div className="flex-center" style={{ width: "2.25rem", height: "2.25rem", borderRadius: "50%", background: "rgba(20,184,196,0.1)", fontSize: "1.25rem", overflow: "hidden" }}>
                          {v.avatarUrl ? <img src={v.avatarUrl} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : "👤"}
                        </div>
                        <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: statusColors[v.status] || "var(--text-secondary)", border: "2px solid var(--bg-card)" }} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>{v.firstName} {v.lastName}</span>
                    </div>
                  </td>
                  <td style={{ padding: "1rem 1.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{v.volunteerType || "Generalist"}</td>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <span style={{ fontSize: "0.7rem", padding: "0.25rem 0.75rem", borderRadius: "99px", background: "rgba(255,255,255,0.05)", color: statusColors[v.status], fontWeight: 700, textTransform: "uppercase" }}>{v.status}</span>
                  </td>
                  <td style={{ padding: "1rem 1.5rem", color: "var(--amber-500)", fontWeight: 800, fontSize: "0.95rem" }}>{v.score || 0}</td>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <button style={{ padding: "0.4rem 1rem", borderRadius: "0.5rem", border: "1px solid var(--amber-500)", background: "transparent", color: "var(--amber-500)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>Assign Task</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
