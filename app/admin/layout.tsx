"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logOut } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/admin/dashboard", icon: "🛡️", label: "Dashboard" },
  { href: "/admin/ngos", icon: "🏢", label: "Manage NGOs" },
  { href: "/admin/users", icon: "👥", label: "Manage Users" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
        borderRight: "1px solid rgba(225,29,72,0.15)",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s ease",
        position: "sticky",
        top: 0,
        height: "100vh",
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid rgba(225,29,72,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="ResQAI Logo" style={{ width: 38, height: 38, borderRadius: 10, objectFit: "contain" }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#f0f9fa" }}>ResQAI</div>
              <div style={{ fontSize: 11, color: "#e11d48" }}>Admin Portal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className={`sidebar-item${pathname === item.href ? " active" : ""}`}
              style={{ borderColor: pathname === item.href ? "rgba(225,29,72,0.3)" : "transparent" }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={{ color: pathname === item.href ? "#fca5a5" : "inherit" }}>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(225,29,72,0.1)" }}>
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
          borderBottom: "1px solid rgba(225,29,72,0.12)",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 20 }}>☰</button>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ position: "relative" }}>
              <div onClick={() => setProfileOpen(!profileOpen)} style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#e11d48,#9f1239)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer", overflow: "hidden" }}>
                {profile?.avatarUrl && profile.avatarUrl.length > 10 ? <img src={profile.avatarUrl} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🛡️"}
              </div>
              {profileOpen && (
                <div className="glass-card" style={{ position: "absolute", right: 0, top: 40, width: 240, zIndex: 200, padding: "12px 0" }}>
                  <div style={{ padding: "0 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontWeight: 700, color: "#f0f9fa" }}>{profile?.firstName}</div>
                    <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>Platform Admin</div>
                  </div>
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
