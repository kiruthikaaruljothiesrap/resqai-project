"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToUsers, subscribeToTaskCounts } from "@/lib/firestore";
import { UserProfile } from "@/lib/auth";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const statusColors: Record<string, string> = { 
  online: "text-green-500 bg-green-500/10 border-green-500/20", 
  busy: "text-amber-500 bg-amber-500/10 border-amber-500/20", 
  offline: "text-gray-500 bg-gray-500/10 border-gray-500/20" 
};

const statusDotColors: Record<string, string> = { 
  online: "bg-green-500", 
  busy: "bg-amber-500", 
  offline: "bg-gray-600" 
};

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

  if (loading) return <div className="p-8 text-center text-[#f0f9fa]">Loading Dashboard...</div>;
  if (!profile || profile.role !== "ngo") return <div className="p-8 text-center text-[#f87171]">Unauthorized.</div>;

  const activeVols = volunteers.filter(v => v.status === "online").length;

  const stats = [
    { label: "Total Volunteers", value: volunteers.length, icon: "👥", color: "text-cyan-400", badge: "" },
    { label: "Active Now", value: activeVols, icon: "🟢", color: "text-green-500", badge: "" },
    { label: "Open Tasks", value: taskStats.open, icon: "🚨", color: "text-amber-500", badge: "" },
    { label: "Completed Tasks", value: taskStats.completed, icon: "✅", color: "text-indigo-400", badge: "" },
  ];

  const filtered = volunteers.filter((v) =>
    (v.firstName + " " + v.lastName).toLowerCase().includes(search.toLowerCase()) || 
    (v.volunteerType || "").toLowerCase().includes(search.toLowerCase())
  );

  const activityData = [
    { day: "Mon", tasks: 4, volunteers: 12 },
    { day: "Tue", tasks: 7, volunteers: 15 },
    { day: "Wed", tasks: 3, volunteers: 18 },
    { day: "Thu", tasks: 9, volunteers: 14 },
    { day: "Fri", tasks: 5, volunteers: 16 },
    { day: "Sat", tasks: 8, volunteers: 22 },
    { day: "Sun", tasks: 6, volunteers: 19 },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-[#f0f9fa] tracking-tight">
          NGO Dashboard <span className="bg-gradient-to-r from-[#f59e0b] to-[#d97706] bg-clip-text text-transparent">Overview</span>
        </h1>
        <p className="text-sm md:text-base text-[#94a3b8] font-medium tracking-wide">Real-time volunteer network monitoring for {profile.firstName}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-5 md:p-6 group hover:translate-y-[-4px] transition-all duration-300 border-[#f59e0b]/5">
            <div className="flex justify-between mb-4 items-start">
              <span className="text-3xl md:text-4xl filter drop-shadow-lg group-hover:scale-110 transition-transform tracking-tight">{s.icon}</span>
              {s.badge && <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-white/5 ${s.color}`}>{s.badge}</span>}
            </div>
            <div className={`text-4xl md:text-5xl font-black mb-1 ${s.color} tracking-tight`}>{s.value}</div>
            <div className="text-xs md:text-sm font-bold text-[#94a3b8] uppercase tracking-[0.15em]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="glass-card p-6 md:p-8 border-[#f59e0b]/5 ring-1 ring-white/5">
          <h3 className="text-base md:text-lg font-black mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#14b8c4]" />
            Weekly Task Activity
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(20,184,196,0.05)' }}
                  contentStyle={{ background: "#0d1f24", border: "1px solid rgba(20,184,196,0.2)", borderRadius: 12, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)" }} 
                />
                <Bar dataKey="tasks" fill="#14b8c4" radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 md:p-8 border-[#f59e0b]/5 ring-1 ring-white/5">
          <h3 className="text-base md:text-lg font-black mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
            Volunteer Activity Trend
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0d1f24", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)" }} />
                <Line type="monotone" dataKey="volunteers" stroke="#f59e0b" strokeWidth={4} dot={{ fill: "#f59e0b", r: 5, strokeWidth: 2, stroke: "#0d1f24" }} activeDot={{ r: 8, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Volunteer list */}
      <div className="glass-card p-6 md:p-8 border-[#f59e0b]/5 overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h3 className="text-lg md:text-xl font-black">Volunteer Directory</h3>
          <div className="relative w-full md:w-64">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search volunteers…"
              className="w-full pl-4 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium outline-none focus:border-[#f59e0b]/50 transition-all placeholder:text-[#475569]"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto -mx-6 md:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead className="bg-[#f59e0b]/5">
                <tr>
                  {["Volunteer", "Type", "Status", "Score", "Action"].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#64748b]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-16 text-center text-[#94a3b8] font-medium italic">No volunteers found matching your query.</td></tr>
                ) : filtered.map((v) => (
                  <tr key={v.uid} className="group hover:bg-white/5 transition-all">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-[#14b8c4]/20 to-[#f59e0b]/20 flex items-center justify-center text-xl overflow-hidden ring-1 ring-white/10">
                            {v.avatarUrl ? <img src={v.avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : "👤"}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ${statusDotColors[v.status] || "bg-gray-600"} border-2 border-[#0d1f24] shadow-sm`} />
                        </div>
                        <span className="font-bold text-sm md:text-base tracking-tight">{v.firstName} {v.lastName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs md:text-sm font-bold text-[#64748b] uppercase tracking-wide">
                      {v.volunteerType || "General"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${statusColors[v.status] || "text-gray-400 bg-gray-400/10 border-gray-400/20"}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-black text-[#f59e0b]">
                        <span className="text-xs">⭐</span>
                        {v.score || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button className="px-4 py-2 rounded-lg border border-[#f59e0b]/30 bg-transparent text-[#f59e0b] text-[10px] font-black uppercase tracking-widest hover:bg-[#f59e0b] hover:text-[#060d10] transition-all transform active:scale-95 shadow-lg shadow-[#f59e0b]/5 ring-1 ring-[#f59e0b]/10">
                        Assign Task
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
