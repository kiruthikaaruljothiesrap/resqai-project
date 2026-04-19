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

  if (loading) return <div style={{ color: "var(--text-primary)", padding: "var(--content-padding)" }}>{commonT("loading")}</div>;
  if (!profile) return <div style={{ color: "var(--text-primary)", padding: "var(--content-padding)" }}>{commonT("pleaseLogin")}</div>;

  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const hoursVolunteered = tasks.filter(t => t.status === "completed").reduce((acc, t) => acc + (t.actualHours || t.estimatedHours || 0), 0);
  const activeRequests = tasks.filter(t => t.status !== "completed" && t.status !== "rejected").length;

  const stats = [
    { label: t("tasksCompleted"), value: completedTasks.toString(), icon: "✅", color: "var(--green-500)", change: "Lifetime" },
    { label: t("hoursVolunteered"), value: hoursVolunteered.toString(), icon: "⏱️", color: "var(--teal-500)", change: "Lifetime" },
    { label: t("volunteerScore"), value: (profile.score || 0).toString(), icon: "⭐", color: "var(--amber-500)", change: "Total points" },
    { label: t("activeTasks"), value: activeRequests.toString(), icon: "🚨", color: "#f97316", change: "Currently ongoing" },
  ];

  const recentActivities = tasks.slice().sort((a,b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()).slice(0, 5);

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      {/* Welcome */}
      <section>
        <h1 style={{ marginBottom: "0.5rem" }}>
          {t("welcome", { name: profile.firstName || "Volunteer" })} 
        </h1>
        <p>Here's what's happening in your area today.</p>
      </section>

      {/* Stat Cards - Fluid Grid */}
      <section className="auto-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="flex-between">
              <span style={{ fontSize: "2rem" }}>{stat.icon}</span>
              <span style={{ fontSize: "0.7rem", color: stat.color, background: `${stat.color}18`, padding: "4px 10px", borderRadius: "999px" }}>
                {stat.change}
              </span>
            </div>
            <div>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, color: stat.color, marginBottom: "0.25rem" }}>{stat.value}</div>
              <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Quick Actions - Fluid Grid */}
      <section>
        <h3 style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "1.25rem" }}>Quick Actions</h3>
        <div className="auto-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
          {quickActions.map((a) => (
            <Link key={a.label} href={a.href} style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: "0.75rem", padding: "1.5rem 1rem", textDecoration: "none",
              background: "rgba(20,184,196,0.06)", border: "1px solid var(--border)",
              borderRadius: "1rem", transition: "all 0.3s ease", color: "var(--text-primary)",
            }}>
              <span style={{ fontSize: "2rem" }}>{a.icon}</span>
              <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Bottom Row - Fluid Grid */}
      <section className="auto-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(clamp(300px, 100%, 600px), 1fr))", alignItems: "start" }}>
        {/* Recent Activity */}
        <div className="glass-card">
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>Recent Tasks</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {recentActivities.length === 0 ? (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "center", padding: "2rem" }}>No recent tasks found. Find one in recommendations!</div>
            ) : recentActivities.map((act) => (
              <div key={act.id} style={{
                display: "flex", alignItems: "center", gap: "1rem",
                padding: "1rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div className="flex-center" style={{
                  width: "2.75rem", height: "2.75rem", borderRadius: "12px", background: "rgba(20,184,196,0.1)",
                  fontSize: "1.5rem", flexShrink: 0
                }}>📝</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{act.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{act.status} · {new Date(act.assignedAt).toLocaleDateString()}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--amber-500)" }}>+{act.points} pts</div>
                  <span style={{
                    fontSize: "0.7rem", padding: "2px 8px", borderRadius: "999px",
                    background: `${statusColors[act.status] || "#ffffff"}18`,
                    color: statusColors[act.status] || "#ffffff",
                    whiteSpace: "nowrap"
                  }}>{act.status.replace("_", " ")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Badges & Progress */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem" }}>My My Progress</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {(profile.badges && profile.badges.length > 0) ? profile.badges.map((badge) => (
              <div key={badge} style={{
                padding: "0.5rem 1rem", borderRadius: "999px",
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.3)",
                fontSize: "0.85rem", color: "var(--amber-500)",
              }}>{badge}</div>
            )) : (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>No badges yet. Keep completing tasks!</div>
            )}
            <div style={{
              padding: "0.5rem 1rem", borderRadius: "999px",
              background: "rgba(255,255,255,0.04)",
              border: "1px dashed rgba(255,255,255,0.12)",
              fontSize: "0.85rem", color: "#475569",
            }}>🔒 Explore Tasks to Unlock</div>
          </div>

          <div style={{ marginTop: "0.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Performance Level</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--teal-500)" }}>⚡ {(profile.score || 0) > 1000 ? "Advanced" : "Beginner"}</div>
            
            <div style={{ marginTop: "1rem" }}>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "999px", height: "8px", overflow: "hidden" }}>
                <div style={{ 
                  width: `${Math.min(((profile.score || 0) / 2000) * 100, 100)}%`, 
                  height: "100%", 
                  background: "linear-gradient(90deg, var(--teal-500), var(--amber-500))", 
                  borderRadius: "999px",
                  transition: "width 0.5s ease-out" 
                }} />
              </div>
              <div className="flex-between" style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                <span>{profile.score || 0} pts</span><span>2,000 pts needed for Expert</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
