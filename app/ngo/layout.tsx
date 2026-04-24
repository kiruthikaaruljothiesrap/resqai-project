"use client";
import { useState, useEffect } from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-dark)" }}>
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - Fluid & Adaptive */}
      <aside className={isMobile ? "mobile-sidebar" : ""} style={{
        width: sidebarOpen ? "var(--sidebar-width)" : "0",
        minWidth: sidebarOpen ? "var(--sidebar-width)" : "0",
        left: isMobile ? (sidebarOpen ? "0" : "-100%") : "auto",
        position: isMobile ? "fixed" : "sticky",
        overflow: "hidden",
        background: "var(--bg-card)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        top: 0,
        height: "100vh",
        zIndex: 1000,
      }}>
        {/* Logo */}
        <div style={{ padding: "1.5rem 1.25rem", borderBottom: "1px solid rgba(245,158,11,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <img src="/logo.png" alt="ResQAI" style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem", objectFit: "contain" }} />
            <div style={{ opacity: sidebarOpen ? 1 : 0, transition: "opacity 0.2s" }}>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)" }}>ResQAI</div>
              <div style={{ fontSize: "0.7rem", color: "var(--amber-500)", whiteSpace: "nowrap" }}>NGO Portal</div>
            </div>
          </div>
          {isMobile && (
             <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.5rem" }}>✕</button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0.75rem 0.6rem", overflowY: "auto", overflowX: "hidden" }}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => { if(isMobile) setSidebarOpen(false); }}
              className={`sidebar-item${pathname === item.href ? " active" : ""}`}
              style={{ borderColor: pathname === item.href ? "rgba(245,158,11,0.3)" : "transparent" }}
              title={item.label}
            >
              <span style={{ fontSize: "1.25rem" }}>{item.icon}</span>
              <span style={{ opacity: sidebarOpen ? 1 : 0, transition: "opacity 0.2s", whiteSpace: "nowrap" }}>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: "0.75rem 0.6rem", borderTop: "1px solid rgba(245,158,11,0.1)" }}>
          <button
            onClick={async () => { await logOut(); router.push("/role-select"); }}
            className="sidebar-item"
            style={{ width: "100%", background: "none", border: "none", color: "#f87171", cursor: "pointer" }}
          >
            <span style={{ fontSize: "1.25rem" }}>🚪</span>
            <span style={{ opacity: sidebarOpen ? 1 : 0, transition: "opacity 0.2s" }}>Logout</span>
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Topbar - Fluid */}
        <header style={{
          height: "var(--header-height)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 var(--content-padding)",
          background: "rgba(13, 31, 36, 0.8)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.5rem" }}>☰</button>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ position: "relative" }}>
              <div onClick={() => setProfileOpen(!profileOpen)} style={{
                width: "2.25rem", height: "2.25rem", borderRadius: "50%",
                background: "linear-gradient(135deg, var(--amber-500), #d97706)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1rem", cursor: "pointer", overflow: "hidden", border: "2px solid var(--border)"
              }}>
                {profile?.avatarUrl ? (
                  profile.avatarUrl.startsWith("http") || profile.avatarUrl.startsWith("data:") ? (
                    <img src={profile.avatarUrl} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span>{profile.avatarUrl}</span>
                  )
                ) : "🏢"}
              </div>

              {profileOpen && (
                <div className="glass-card fade-up" style={{ position: "absolute", right: 0, top: "2.5rem", width: "13rem", zIndex: 200, padding: "0.5rem 0" }}>
                  <div style={{ padding: "0.5rem 1rem 0.75rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.9rem" }}>{profile?.firstName}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>{profile?.role === "ngo" ? "Registered NGO" : "NGO Partner"}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: "0.7rem", color: "var(--green-500)", fontWeight: 600 }}>
                      ✅ Verified
                    </div>
                  </div>
                  <Link href="/ngo/profile" style={{ display: 'block', textDecoration: 'none' }}>
                    <button onClick={() => setProfileOpen(false)} style={{ width: "100%", textAlign: "left", padding: "0.6rem 1rem", background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer", fontSize: "0.85rem" }}>
                      ✏️ Edit Profile
                    </button>
                  </Link>
                  <button onClick={async () => { await logOut(); router.push("/role-select"); }} style={{ width: "100%", textAlign: "left", padding: "0.6rem 1rem", background: "none", border: "none", color: "var(--rose-500)", cursor: "pointer", fontSize: "0.85rem" }}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: "var(--content-padding)", width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
          <div className="container-fluid" style={{ padding: 0 }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
