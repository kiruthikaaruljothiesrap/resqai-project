"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToUsers, subscribeToTaskCounts } from "@/lib/firestore";
import { UserProfile } from "@/lib/auth";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const statusColors: Record<string, string> = { online: "#22c55e", busy: "#eab308", offline: "#374151" };

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

  if (loading) return <div style={{ padding: 24, color: "#fff" }}>Loading Dashboard...</div>;
  if (!profile || profile.role !== "ngo") return <div style={{ padding: 24, color: "#f87171" }}>Unauthorized.</div>;

  const activeVols = volunteers.filter(v => v.status === "online").length;

  const stats = [
    { label: "Total Volunteers", value: volunteers.length, icon: "👥", color: "#14b8c4", change: "" },
    { label: "Active Now", value: activeVols, icon: "🟢", color: "#22c55e", change: "" },
    { label: "Open Tasks", value: taskStats.open, icon: "🚨", color: "#f59e0b", change: "" },
    { label: "Completed Tasks", value: taskStats.completed, icon: "✅", color: "#6366f1", change: "" },
  ];

  const filtered = volunteers.filter((v) =>
    (v.firstName + " " + v.lastName).toLowerCase().includes(search.toLowerCase()) || 
    (v.volunteerType || "").toLowerCase().includes(search.toLowerCase())
  );

  // Mock activity Data because we need a timeline of tasks and volunteers over time. 
  // In a real production app we'd aggregate firestore logs. For now we will keep visual.
  const activityData = [
    { day: "Mon", tasks: Math.floor(Math.random()*10), volunteers: Math.floor(Math.random()*20) },
    { day: "Tue", tasks: Math.floor(Math.random()*10), volunteers: Math.floor(Math.random()*20) },
    { day: "Wed", tasks: Math.floor(Math.random()*10), volunteers: Math.floor(Math.random()*20) },
    { day: "Thu", tasks: Math.floor(Math.random()*10), volunteers: Math.floor(Math.random()*20) },
    { day: "Fri", tasks: Math.floor(Math.random()*10), volunteers: Math.floor(Math.random()*20) },
    { day: "Sat", tasks: Math.floor(Math.random()*10), volunteers: Math.floor(Math.random()*20) },
    { day: "Sun", tasks: Math.floor(Math.random()*10), volunteers: Math.floor(Math.random()*20) },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>
          NGO Dashboard <span className="gradient-text" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Overview</span>
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Real-time volunteer network overview for {profile.firstName}</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        {stats.map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 28 }}>{s.icon}</span>
              {s.change && <span style={{ fontSize: 11, color: s.color, background: `${s.color}18`, padding: "3px 8px", borderRadius: 999 }}>{s.change}</span>}
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Weekly Task Activity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} />
              <Tooltip contentStyle={{ background: "#0d1f24", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 8, color: "#f0f9fa" }} />
              <Bar dataKey="tasks" fill="#14b8c4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Volunteer Activity Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} />
              <Tooltip contentStyle={{ background: "#0d1f24", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, color: "#f0f9fa" }} />
              <Line type="monotone" dataKey="volunteers" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Volunteer list */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Volunteer Directory</h3>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search volunteers…"
            style={{ padding: "9px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 8, color: "#f0f9fa", fontSize: 13, outline: "none", width: 220 }}
          />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(245,158,11,0.06)" }}>
              {["Volunteer", "Type", "Status", "Score", "Action"].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, color: "#64748b", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 20, textAlign:"center", color:"#94a3b8" }}>No volunteers found.</td></tr>
            ) : filtered.map((v) => (
              <tr key={v.uid} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ position: "relative" }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(20,184,196,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{v.avatarUrl ? <img src={v.avatarUrl} alt="avatar" style={{width: '100%', height: '100%', borderRadius: '50%'}} /> : "👤"}</div>
                      <div style={{ position: "absolute", bottom: 0, right: 0, width: 9, height: 9, borderRadius: "50%", background: statusColors[v.status] || "#374151", border: "2px solid #0d1f24" }} />
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{v.firstName} {v.lastName}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 14px", fontSize: 13, color: "#94a3b8" }}>{v.volunteerType || "General"}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: `${statusColors[v.status] || "#374151"}18`, color: statusColors[v.status] || "#94a3b8", fontWeight: 600, textTransform: "capitalize" }}>{v.status}</span>
                </td>
                <td style={{ padding: "12px 14px", color: "#f59e0b", fontWeight: 700 }}>{v.score || 0}</td>
                <td style={{ padding: "12px 14px" }}>
                  <button style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(245,158,11,0.3)", background: "transparent", color: "#f59e0b", fontSize: 12, cursor: "pointer" }}>Assign Task</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
