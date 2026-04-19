"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const roles = [
  {
    id: "volunteer",
    title: "Volunteer",
    subtitle: "Join the frontline of community service",
    icon: "🙋",
    features: ["Find nearby help requests", "Track your impact", "Earn badges & rewards", "Connect with NGOs"],
    gradient: "from-cyan-500 to-cyan-700",
    glow: "shadow-cyan-500/20",
    accent: "text-cyan-400",
  },
  {
    id: "ngo",
    title: "NGO Partner",
    subtitle: "Coordinate and manage volunteer efforts",
    icon: "🏢",
    features: ["Post help requests", "Assign & track tasks", "Manage volunteers", "Generate reports"],
    gradient: "from-amber-500 to-amber-700",
    glow: "shadow-amber-500/20",
    accent: "text-amber-500",
  },
  {
    id: "admin",
    title: "Platform Admin",
    subtitle: "Verify NGOs and manage the system",
    icon: "🛡️",
    features: ["Approve/Reject NGOs", "View Master Database", "AI OCR Verifications", "System Analytics"],
    gradient: "from-rose-500 to-rose-700",
    glow: "shadow-rose-500/20",
    accent: "text-rose-500",
  },
];

export default function RoleSelectPage() {
  const router = useRouter();
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  const handleSelect = (roleId: string) => {
    localStorage.setItem("selectedRole", roleId);
    router.push(`/auth/login?role=${roleId}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_30%_20%,_#0f3a3e_0%,_#060d10_60%)] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="text-center mb-16 relative z-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="inline-block p-4 bg-white/5 rounded-[24px] mb-8 shadow-2xl backdrop-blur-md ring-1 ring-white/10 scale-110">
          <img src="/logo.png" alt="ResQAI" className="w-14 h-14 object-contain" />
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-[#f0f9fa] tracking-tighter mb-4">
          Select <span className="text-cyan-400 font-black">Identity</span>
        </h1>
        <p className="text-sm md:text-lg text-[#94a3b8] font-medium tracking-wide max-w-md mx-auto leading-relaxed">
          The mission protocol requires identity calibration before base entry.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl w-full relative z-10">
        {roles.map((role, i) => (
          <div
            key={role.id}
            className={`
              glass-card p-8 md:p-10 cursor-pointer group transition-all duration-500 border-white/5 relative overflow-hidden
              ${hoveredRole === role.id ? `translate-y-[-8px] scale-[1.02] shadow-[0_20px_40px_-5px_rgba(0,0,0,0.5)] border-white/10` : 'hover:border-white/10'}
            `}
            onMouseEnter={() => setHoveredRole(role.id)}
            onMouseLeave={() => setHoveredRole(null)}
            onClick={() => handleSelect(role.id)}
            style={{ animationDelay: `${i * 150}ms` }}
          >
            {/* Hover Background Accent */}
            <div className={`absolute inset-0 bg-gradient-to-br ${role.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />
            
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${role.gradient} flex items-center justify-center text-3xl md:text-4xl shadow-xl ${role.glow} mb-8 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
              {role.icon}
            </div>
            
            <h2 className="text-2xl font-black text-[#f0f9fa] mb-3 tracking-tight group-hover:text-white transition-colors uppercase">{role.title}</h2>
            <p className="text-xs md:text-sm text-[#64748b] font-bold mb-8 uppercase tracking-[0.15em] leading-relaxed group-hover:text-slate-400">{role.subtitle}</p>
            
            <ul className="space-y-4 mb-10">
              {role.features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-xs md:text-sm font-medium text-[#cbd5e1] group-hover:text-white transition-colors leading-snug">
                  <span className={`${role.accent} font-black`}>✓</span> 
                  {f}
                </li>
              ))}
            </ul>
            
            <button className={`w-full py-4 rounded-xl bg-gradient-to-r ${role.gradient} text-white font-black uppercase tracking-widest text-xs shadow-lg ${role.glow} transform active:scale-95 transition-all opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 duration-300`}>
              Deploy As {role.id} →
            </button>
            <div className="absolute bottom-6 left-10 right-10 h-px bg-white/5 group-hover:hidden transition-all" />
          </div>
        ))}
      </div>

      <div className="mt-20 text-center opacity-40 hover:opacity-100 transition-opacity">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Secure Uplink protocol v4.2.0</p>
        <div className="flex gap-6 justify-center text-[10px] font-black uppercase tracking-widest text-slate-600">
          <span className="hover:text-cyan-400 cursor-pointer transition-colors">Safety Code</span>
          <span className="hover:text-cyan-400 cursor-pointer transition-colors">Infrastructure</span>
          <span className="hover:text-cyan-400 cursor-pointer transition-colors">Protocol</span>
        </div>
      </div>
    </div>
  );
}
