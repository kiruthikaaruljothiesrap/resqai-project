"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logOut } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/ngo/dashboard", icon: "📊", label: "Dashboard", key: "dashboard" },
  { href: "/ngo/map", icon: "🗺️", label: "Live Map", key: "map" },
  { href: "/ngo/needs", icon: "🆘", label: "Needs", key: "needs" },
  { href: "/ngo/tasks", icon: "📋", label: "Task Board", key: "tasks" },
  { href: "/ngo/proofs", icon: "✅", label: "Proof Validation", key: "proofs" },
  { href: "/ngo/broadcast", icon: "📢", label: "Broadcast", key: "broadcast" },
  { href: "/ngo/reports", icon: "📈", label: "Reports", key: "reports" },
  { href: "/ngo/matching", icon: "🤖", label: "Smart Match", key: "matching" },
];

const mobileNavItems = [
  { href: "/ngo/dashboard", icon: "📊", label: "Home" },
  { href: "/ngo/map", icon: "🗺️", label: "Map" },
  { href: "/ngo/needs", icon: "🆘", label: "Needs" },
  { href: "/ngo/matching", icon: "🤖", label: "A.I." },
  { href: "/ngo/profile", icon: "🏢", label: "Profile" },
];

export default function NGOLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#060d10] text-[#f0f9fa] overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#0d1f24] border-r border-[#f59e0b]/10 
        transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? "translate-x-0 shadow-2xl shadow-[#f59e0b]/5" : "-translate-x-full"}
        flex flex-col
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-[#f59e0b]/10">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="ResQAI" className="w-10 h-10 rounded-xl object-contain" />
            <div>
              <div className="font-extrabold text-base tracking-tight text-[#f0f9fa]">ResQAI</div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-[#f59e0b]">NGO Portal</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href} 
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                ${pathname === item.href 
                  ? "bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/20" 
                  : "text-[#94a3b8] hover:bg-white/5 hover:text-[#f0f9fa]"}`}
            >
              <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 mt-auto border-t border-[#f59e0b]/5">
          <button
            onClick={async () => { await logOut(); router.push("/role-select"); }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[#f87171] hover:bg-red-500/10 transition-all font-medium text-sm"
          >
            <span className="text-xl">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 md:px-6 bg-[#0d1f24]/90 backdrop-blur-xl border-b border-[#f59e0b]/10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="lg:hidden p-2 -ml-2 text-[#94a3b8] hover:text-[#f0f9fa] transition-colors"
            >
              <span className="text-2xl">☰</span>
            </button>
            <h2 className="hidden md:block font-bold text-lg text-[#f59e0b] capitalize">
              {pathname.split("/").pop()?.replace("-", " ")}
            </h2>
          </div>

          <div className="flex items-center gap-2 md:gap-5">
            {/* User Profile */}
            <div className="relative group">
              <div 
                onClick={() => setProfileOpen(!profileOpen)} 
                className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] p-[2px] cursor-pointer ring-0 hover:ring-2 ring-[#f59e0b]/50 transition-all active:scale-95"
              >
                <div className="w-full h-full rounded-[10px] bg-[#0d1f24] flex items-center justify-center overflow-hidden">
                   {profile?.avatarUrl ? (
                     profile.avatarUrl.length > 2 ? (
                       <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                     ) : <span className="text-xl">{profile.avatarUrl}</span>
                   ) : <span className="text-xl">🏢</span>}
                </div>
              </div>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-3 w-56 bg-[#0d1f24] border border-[#f59e0b]/20 rounded-2xl shadow-2xl z-50 py-2 glass-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5 bg-white/5">
                      <div className="font-bold text-sm truncate">{profile?.firstName}</div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[#22c55e] font-black uppercase tracking-widest">
                        Verified NGO ✓
                      </div>
                    </div>
                    <Link href="/ngo/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-[#f0f9fa] hover:bg-[#f59e0b]/10 transition-colors">
                      ✏️ Edit Profile
                    </Link>
                    <button onClick={async () => { await logOut(); router.push("/role-select"); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-[#f87171] hover:bg-red-500/10 transition-colors">
                      🚪 Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-32 lg:pb-8 max-w-[1600px] mx-auto w-full">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-4 left-4 right-4 z-50 h-16 bg-[#0d1f24]/90 backdrop-blur-xl border border-[#f59e0b]/20 rounded-2xl lg:hidden flex items-center justify-around px-2 shadow-2xl shadow-black/50">
          {mobileNavItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 p-2 rounded-xl
                ${pathname === item.href 
                  ? "text-[#f59e0b] bg-[#f59e0b]/10 -translate-y-1" 
                  : "text-[#64748b] hover:text-[#94a3b8]"}`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
