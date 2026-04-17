"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToTasks } from "@/lib/firestore";
import { Task } from "@/types";
import Link from "next/link";
import { useTranslations } from "next-intl";

const quickActions = [
  { label: "Find Tasks", icon: "🔍", href: "/volunteer/recommendations" },
  { label: "View Map", icon: "🗺️", href: "/volunteer/map" },
  { label: "My Tasks", icon: "✅", href: "/volunteer/tasks" },
  { label: "Community", icon: "👥", href: "/volunteer/community" },
];

const statusColors: Record<string, string> = {
  completed: "#22c55e",
  in_progress: "#f59e0b",
  pending: "#6366f1",
  accepted: "#14b8c4",
};

export default function VolunteerDashboard() {
  const { profile, loading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const t = useTranslations("Dashboard");
  
  useEffect(() => {
    if (profile?.uid) {
      const unsub = subscribeToTasks(profile.uid, "volunteer", setTasks);
      return () => unsub();
    }
  }, [profile?.uid]);

  const commonT = useTranslations("Common");

  if (loading) return <div style={{ color: "#fff", padding: 24 }}>{commonT("loading")}</div>;
  if (!profile) return <div style={{ color: "#fff", padding: 24 }}>{commonT("pleaseLogin")}</div>;

  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const hoursVolunteered = tasks.filter(t => t.status === "completed").reduce((acc, t) => acc + (t.actualHours || t.estimatedHours || 0), 0);
  const activeRequests = tasks.filter(t => t.status !== "completed" && t.status !== "rejected").length;

  const stats = [
    { label: t("tasksCompleted"), value: completedTasks.toString(), icon: "✅", color: "#22c55e", change: "Lifetime" },
    { label: t("hoursVolunteered"), value: hoursVolunteered.toString(), icon: "⏱️", color: "#14b8c4", change: "Lifetime" },
    { label: t("volunteerScore"), value: (profile.score || 0).toString(), icon: "⭐", color: "#f59e0b", change: "Total points" },
    { label: t("activeTasks"), value: activeRequests.toString(), icon: "🚨", color: "#f97316", change: "Currently ongoing" },
  ];

  const recentActivities = tasks.slice().sort((a,b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()).slice(0, 5);

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
          {t("welcome", { name: profile.firstName || "Volunteer" })} 
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Here's what's happening in your area today.</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>{stat.icon}</span>
              <span style={{ fontSize: 11, color: stat.color, background: `${stat.color}18`, padding: "3px 8px", borderRadius: 999 }}>
                {stat.change}
              </span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: stat.color, marginBottom: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: "#94a3b8" }}>QUICK ACTIONS</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          {quickActions.map((a) => (
            <Link key={a.label} href={a.href} style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 10, padding: "20px 12px", textDecoration: "none",
              background: "rgba(20,184,196,0.06)", border: "1px solid rgba(20,184,196,0.15)",
              borderRadius: 12, cursor: "pointer", transition: "all 0.2s",
              color: "#f0f9fa",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(20,184,196,0.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(20,184,196,0.06)")}
            >
              <span style={{ fontSize: 28 }}>{a.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity + Badges row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        {/* Recent Activity */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Tasks</h2>
          {recentActivities.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", padding: 20 }}>No recent tasks found. Find one in recommendations!</div>
          ) : recentActivities.map((act) => (
            <div key={act.id} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10, background: "rgba(20,184,196,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>📝</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{act.title}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{act.status} · {new Date(act.assignedAt).toLocaleDateString()}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>+{act.points} pts</div>
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 999,
                  background: `${statusColors[act.status] || "#ffffff"}18`,
                  color: statusColors[act.status] || "#ffffff",
                }}>{act.status.replace("_", " ")}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>My Badges</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {(profile.badges && profile.badges.length > 0) ? profile.badges.map((badge) => (
              <div key={badge} style={{
                padding: "8px 14px", borderRadius: 999,
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.3)",
                fontSize: 13, color: "#f59e0b",
              }}>{badge}</div>
            )) : (
              <div style={{ color: "#94a3b8", fontSize: 13 }}>No badges yet. Keep completing tasks!</div>
            )}
            <div style={{
              padding: "8px 14px", borderRadius: 999,
              background: "rgba(255,255,255,0.04)",
              border: "1px dashed rgba(255,255,255,0.12)",
              fontSize: 13, color: "#475569",
            }}>🔒 Explore Tasks to Unlock</div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>Performance Level</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#14b8c4" }}>⚡ {(profile.score || 0) > 1000 ? "Advanced" : "Beginner"}</div>
            <div style={{ marginTop: 10, background: "rgba(255,255,255,0.06)", borderRadius: 999, height: 6, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(((profile.score || 0) / 2000) * 100, 100)}%`, height: "100%", background: "linear-gradient(90deg,#14b8c4,#f59e0b)", borderRadius: 999 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#475569", marginTop: 4 }}>
              <span>{profile.score || 0} pts</span><span>2,000 pts needed for Expert</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
