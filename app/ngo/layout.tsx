"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logOut } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/ngo/dashboard", icon: "📊", label: "Dashboard" },
  { href: "/ngo/map", icon: "🗺️", label: "Live Map" },
  { href: "/ngo/needs", icon: "🆘", label: "Needs" },
  { href: "/ngo/tasks", icon: "📋", label: "Task Board" },
  { href: "/ngo/proofs", icon: "✅", label: "Proof Validation" },
  { href: "/ngo/broadcast", icon: "📢", label: "Broadcast" },
  { href: "/ngo/reports", icon: "📈", label: "Reports" },
  { href: "/ngo/matching", icon: "🤖", label: "Smart Match" },
];

export default function NGOLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#060d10" }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 240 : 0,
        minWidth: sidebarOpen ? 240 : 0,
        overflow: "hidden",
        background: "#0d1f24",
        borderRight: "1px solid rgba(245,158,11,0.15)",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s ease",
        position: "sticky",
        top: 0,
        height: "100vh",
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid rgba(245,158,11,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="ResQAI Logo" style={{ width: 38, height: 38, borderRadius: 10, objectFit: "contain" }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#f0f9fa" }}>ResQAI</div>
              <div style={{ fontSize: 11, color: "#f59e0b" }}>NGO Portal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className={`sidebar-item${pathname === item.href ? " active" : ""}`}
              style={{ borderColor: pathname === item.href ? "rgba(245,158,11,0.3)" : "transparent" }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(245,158,11,0.1)" }}>
          <button
            onClick={async () => { await logOut(); router.push("/role-select"); }}
            className="sidebar-item"
            style={{ width: "100%", background: "none", border: "none", color: "#f87171", cursor: "pointer" }}
          >
            <span>🚪</span><span>Logout</span>
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
        {/* Topbar */}
        <header style={{
          height: 60, display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px", background: "#0d1f24",
          borderBottom: "1px solid rgba(245,158,11,0.12)",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 20 }}>☰</button>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ position: "relative" }}>
              <div onClick={() => setProfileOpen(!profileOpen)} style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer", overflow: "hidden" }}>
                {profile?.avatarUrl ? (
                  profile.avatarUrl.startsWith("http") || profile.avatarUrl.startsWith("data:") ? (
                    <img src={profile.avatarUrl} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span>{profile.avatarUrl}</span>
                  )
                ) : "🏢"}
              </div>
              {profileOpen && (
                <div className="glass-card" style={{ position: "absolute", right: 0, top: 40, width: 240, zIndex: 200, padding: "12px 0" }}>
                  <div style={{ padding: "0 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontWeight: 700, color: "#f0f9fa" }}>{profile?.firstName}</div>
                    <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>{profile?.role === "ngo" ? "Registered NGO" : "Unknown Type"}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, color: "#22c55e", fontWeight: 600 }}>
                      ✅ Verified Status
                    </div>
                  </div>
                  <Link href="/ngo/profile" style={{ display: 'block', textDecoration: 'none' }}>
                    <button onClick={() => setProfileOpen(false)} style={{ width: "100%", textAlign: "left", padding: "10px 16px", background: "none", border: "none", color: "#f0f9fa", cursor: "pointer", fontSize: 13 }}>
                      ✏️ Edit Profile
                    </button>
                  </Link>
                  <button onClick={async () => { await logOut(); router.push("/role-select"); }} style={{ width: "100%", textAlign: "left", padding: "10px 16px", background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 13 }}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: 24 }}>{children}</main>
      </div>
    </div>
  );
}
