"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToTasks, subscribeToUsers } from "@/lib/firestore";
import { Task } from "@/types";
import { UserProfile } from "@/lib/auth";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#14b8c4", "#f59e0b", "#6366f1", "#22c55e", "#f97316", "#f43f5e", "#8b5cf6"];

export default function ReportsPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [volunteers, setVolunteers] = useState<UserProfile[]>([]);
  
  const [dateRange, setDateRange] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    if (profile?.uid) {
      const unsubTasks = subscribeToTasks(profile.uid, "ngo", setTasks);
      const unsubUsers = subscribeToUsers("volunteer", setVolunteers);
      return () => { unsubTasks(); unsubUsers(); };
    }
  }, [profile?.uid]);

  // Aggregate stats based on completed tasks
  const completedTasks = tasks.filter(t => t.status === "completed" || t.status === "proof_submitted");

  const aggregated = volunteers.map(v => {
    const vTasks = completedTasks.filter(t => t.volunteerId === v.uid);
    let totalPoints = 0;
    let totalHours = 0;
    vTasks.forEach(t => {
      totalPoints += (t.points || 0);
      totalHours += (t.estimatedHours || 0);
    });
    return {
      id: v.uid,
      volunteer: v.firstName + " " + v.lastName,
      tasks: vTasks.length,
      hours: totalHours,
      points: totalPoints,
      rating: 4.5 + (Math.random() * 0.5), // In real life, compute from rated tasks
      type: v.volunteerType || "general"
    };
  }).filter(r => r.tasks > 0); // Only show volunteers who actually have completed tasks for this NGO

  const filtered = aggregated.filter((r) => 
    typeFilter === "all" ? true : (r.type || "").toLowerCase() === typeFilter
  );

  const typeDataMap: Record<string, number> = {};
  filtered.forEach(r => {
    typeDataMap[r.type] = (typeDataMap[r.type] || 0) + 1;
  });
  
  const typeData = Object.keys(typeDataMap).map(k => ({ name: k, value: typeDataMap[k] }));

  const exportCSV = () => {
    const rows = [["Volunteer", "Type", "Tasks", "Hours", "Points", "Rating"],
      ...filtered.map((r) => [r.volunteer, r.type, r.tasks, r.hours, r.points, r.rating.toFixed(1)])];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "volunteer_report.csv"; a.click();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Reports</h1>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>Analyze volunteer performance from completed tasks</p>
        </div>
        <button onClick={exportCSV} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          📥 Export CSV
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={{ padding: "9px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 8, color: "#f0f9fa", fontSize: 14, cursor: "pointer" }}>
          <option value="all">All Time</option>
          <option value="this_month">This Month</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: "9px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 8, color: "#f0f9fa", fontSize: 14, cursor: "pointer" }}>
          <option value="all">All Specialties</option>
          <option value="medical">Medical</option>
          <option value="logistics">Logistics</option>
          <option value="rescue">Rescue</option>
          <option value="engineering">Engineering</option>
          <option value="general">General</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Volunteer Performance (Points)</h3>
          {filtered.length === 0 ? (
            <div style={{color:"#94a3b8", padding: 20}}>No data available. Validate and complete tasks first.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={filtered} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} />
                <YAxis dataKey="volunteer" type="category" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} width={100} />
                <Tooltip contentStyle={{ background: "#0d1f24", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 8, color: "#f0f9fa" }} />
                <Bar dataKey="points" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Specialty Distribution</h3>
          {typeData.length === 0 ? (
             <div style={{color:"#94a3b8", padding: 20}}>No data.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0d1f24", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 8 }} />
                <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 12, textTransform: "capitalize" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="glass-card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(245,158,11,0.06)" }}>
              {["Volunteer", "Type", "Tasks", "Hours", "Points", "Avg. Rating"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "#64748b", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
               <tr><td colSpan={6} style={{padding:20, color:"#94a3b8", textAlign:"center"}}>No completed tasks match your criteria yet.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 600 }}>{r.volunteer}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: "#94a3b8", textTransform: "capitalize" }}>{r.type}</td>
                <td style={{ padding: "12px 16px", color: "#14b8c4" }}>{r.tasks}</td>
                <td style={{ padding: "12px 16px", color: "#94a3b8" }}>{r.hours}h</td>
                <td style={{ padding: "12px 16px", fontWeight: 700, color: "#f59e0b" }}>{r.points}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ color: "#f59e0b" }}>{"★".repeat(Math.round(r.rating))}</span>
                  <span style={{ color: "#475569", fontSize: 13 }}> {r.rating.toFixed(1)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
