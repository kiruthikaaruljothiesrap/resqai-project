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
  completed: "text-green-500 bg-green-500/10",
  in_progress: "text-amber-500 bg-amber-500/10",
  pending: "text-indigo-400 bg-indigo-400/10",
  accepted: "text-cyan-400 bg-cyan-400/10",
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

  if (loading) return <div className="p-8 text-center text-[#f0f9fa]">{commonT("loading")}</div>;
  if (!profile) return <div className="p-8 text-center text-[#f0f9fa]">{commonT("pleaseLogin")}</div>;

  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const hoursVolunteered = tasks.filter(t => t.status === "completed").reduce((acc, t) => acc + (t.actualHours || t.estimatedHours || 0), 0);
  const activeRequests = tasks.filter(t => t.status !== "completed" && t.status !== "rejected").length;

  const stats = [
    { label: t("tasksCompleted"), value: completedTasks.toString(), icon: "✅", color: "text-green-500", badge: "Lifetime" },
    { label: t("hoursVolunteered"), value: hoursVolunteered.toString(), icon: "⏱️", color: "text-cyan-400", badge: "Lifetime" },
    { label: t("volunteerScore"), value: (profile.score || 0).toString(), icon: "⭐", color: "text-amber-500", badge: "Total points" },
    { label: t("activeTasks"), value: activeRequests.toString(), icon: "🚨", color: "text-orange-500", badge: "Currently ongoing" },
  ];

  const recentActivities = tasks.slice().sort((a,b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()).slice(0, 5);

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-[#f0f9fa] tracking-tight">
          {t("welcome", { name: profile.firstName || "Volunteer" })} 
        </h1>
        <p className="text-sm md:text-base text-[#94a3b8] font-medium">Here's what's happening in your area today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card p-5 md:p-6 group hover:translate-y-[-4px] transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <span className="text-3xl md:text-4xl filter drop-shadow-lg group-hover:scale-110 transition-transform tracking-tight">{stat.icon}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white/5 ${stat.color}`}>
                {stat.badge}
              </span>
            </div>
            <div className={`text-3xl md:text-4xl font-black mb-1 ${stat.color} tracking-tight`}>{stat.value}</div>
            <div className="text-xs md:text-sm font-bold text-[#94a3b8] uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xs font-black text-[#94a3b8] uppercase tracking-[0.2em]">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {quickActions.map((a) => (
            <Link 
              key={a.label} 
              href={a.href} 
              className="flex flex-col items-center justify-center gap-3 p-6 bg-[#14b8c4]/5 border border-[#14b8c4]/15 rounded-2xl md:rounded-3xl hover:bg-[#14b8c4]/10 hover:shadow-xl hover:shadow-[#14b8c4]/5 hover:scale-[1.02] active:scale-95 transition-all text-[#f0f9fa]"
            >
              <span className="text-3xl md:text-4xl drop-shadow-md">{a.icon}</span>
              <span className="text-xs md:text-sm font-bold tracking-wide">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity + Badges row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 glass-card p-6 md:p-8">
          <h2 className="text-lg md:text-xl font-black mb-6 flex items-center gap-2">
            <span className="text-cyan-400">Recent</span> Tasks
          </h2>
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl bg-white/5 border border-dashed border-white/10">
                <p className="text-[#94a3b8] text-sm md:text-base mb-4 font-medium">No recent tasks found. Find one in recommendations!</p>
                <Link href="/volunteer/recommendations" className="text-[#14b8c4] font-bold text-sm underline underline-offset-4">Browse Recommendations →</Link>
              </div>
            ) : recentActivities.map((act) => (
              <div key={act.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-[#14b8c4]/10 flex items-center justify-center text-2xl shadow-inner">📝</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm md:text-base truncate tracking-tight">{act.title}</div>
                  <div className="text-xs text-[#64748b] font-medium mt-0.5">{act.status} · {new Date(act.assignedAt).toLocaleDateString()}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm md:text-base font-black text-amber-500 tracking-tight">+{act.points} pts</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${statusColors[act.status] || "bg-white/10"}`}>
                    {act.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="glass-card p-6 md:p-8 flex flex-col h-full">
          <h2 className="text-lg md:text-xl font-black mb-6 flex items-center gap-2">
            <span className="text-amber-500">My</span> Badges
          </h2>
          <div className="flex flex-wrap gap-2 mb-8">
            {(profile.badges && profile.badges.length > 0) ? profile.badges.map((badge) => (
              <div key={badge} className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-black text-amber-500 uppercase tracking-widest">
                {badge}
              </div>
            )) : (
              <div className="w-full text-center py-6 px-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[#94a3b8] text-xs font-medium">No badges yet. Keep completing tasks!</p>
              </div>
            )}
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-dashed border-white/20 text-[11px] font-bold text-[#475569] uppercase tracking-widest">
              🔒 5 needed
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
            <div>
              <div className="text-xs font-bold text-[#94a3b8] mb-2 uppercase tracking-widest">Performance Level</div>
              <div className="text-2xl font-black text-[#14b8c4] tracking-tight flex items-center gap-2">
                <span className="animate-pulse">⚡</span>
                {(profile.score || 0) > 1000 ? "Advanced" : "Beginner"}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="bg-white/5 rounded-full h-2.5 overflow-hidden ring-1 ring-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-[#14b8c4] to-[#f59e0b] rounded-full shadow-[0_0_12px_rgba(20,184,196,0.5)] transition-all duration-1000"
                  style={{ width: `${Math.min(((profile.score || 0) / 2000) * 100, 100)}%` }} 
                />
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-[#475569]">
                <span>{profile.score || 0} pts accumulated</span>
                <span>Expert at 2,000 pts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
