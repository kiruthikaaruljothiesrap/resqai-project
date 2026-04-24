"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logOut } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "next-intl";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import { subscribeToNotifications, markNotificationRead, AppNotification, requestFirebaseNotificationPermission, onForegroundMessage } from "@/lib/notifications";

const navItems = [
  { href: "/volunteer/dashboard", icon: "🏠", key: "dashboard" },
  { href: "/volunteer/feed", icon: "🌟", key: "feed" },
  { href: "/volunteer/social", icon: "🤝", key: "network" },
  { href: "/volunteer/profile", icon: "👤", key: "profile" },
  { href: "/volunteer/activities", icon: "📋", key: "activities" },
  { href: "/volunteer/recommendations", icon: "💡", key: "recommendations" },
  { href: "/volunteer/map", icon: "🗺️", key: "map" },
  { href: "/volunteer/tasks", icon: "✅", key: "tasks" },
  { href: "/volunteer/chat", icon: "💬", key: "chat" },
  { href: "/volunteer/community", icon: "👥", key: "community" },
];

export default function VolunteerLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Common");
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default false on mobile, we can auto-open using CSS or a useEffect
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    handleResize(); // Init
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [status, setStatus] = useState<"online" | "busy" | "offline">(
    (profile?.status as any) || "online"
  );

  useEffect(() => {
    if (profile?.status && profile.status !== status) {
      setStatus(profile.status as any);
    }
  }, [profile?.status]);

  useEffect(() => {
    if (profile?.uid) {
      const unsub = subscribeToNotifications(profile.uid, setNotifications);
      requestFirebaseNotificationPermission(profile.uid);
      const unsubFCM = onForegroundMessage((payload) => {
         console.log("FCM foreground msg:", payload);
      });
      return () => { unsub(); unsubFCM(); };
    }
  }, [profile?.uid]);

  const handleStatusChange = async (newStatus: "online" | "busy" | "offline") => {
    setStatus(newStatus);
    if (profile?.uid) {
      try {
        await updateDoc(doc(db, "users", profile.uid), { status: newStatus });
      } catch (err) {
        console.error("Failed to update status in DB", err);
      }
    }
  };

  const statusColors = { online: "#22c55e", busy: "#eab308", offline: "#374151" };
  const statusLabels = { online: t("online"), busy: t("busy"), offline: t("offline") };

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
        <div style={{ padding: "1.5rem 1.25rem", borderBottom: "1px solid rgba(20,184,196,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <img src="/logo.png" alt="ResQAI" style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem", objectFit: "contain" }} />
            <div style={{ opacity: sidebarOpen ? 1 : 0, transition: "opacity 0.2s" }}>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)" }}>ResQAI</div>
              <div style={{ fontSize: "0.7rem", color: "var(--teal-500)", whiteSpace: "nowrap" }}>Volunteer Portal</div>
            </div>
          </div>
          {isMobile && (
             <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.5rem" }}>✕</button>
          )}
        </div>

        {/* Status selector */}
        <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(20,184,196,0.08)" }}>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as any)}
            style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
          >
            <option value="online">🟢 {t("online")}</option>
            <option value="busy">🟡 {t("busy")}</option>
            <option value="offline">⚫ {t("offline")}</option>
          </select>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0.75rem 0.6rem", overflowY: "auto", overflowX: "hidden" }}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => { if(isMobile) setSidebarOpen(false); }} className={`sidebar-item${pathname === item.href ? " active" : ""}`} title={t(`sidebar.${item.key}`)}>
              <span style={{ fontSize: "1.25rem" }}>{item.icon}</span>
              <span style={{ opacity: sidebarOpen ? 1 : 0, transition: "opacity 0.2s", whiteSpace: "nowrap" }}>{t(`sidebar.${item.key}`)}</span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: "0.75rem 0.6rem", borderTop: "1px solid rgba(20,184,196,0.08)" }}>
          <button
            onClick={async () => { await logOut(); router.push("/role-select"); }}
            className="sidebar-item"
            style={{ width: "100%", background: "none", border: "none", color: "#f87171", cursor: "pointer" }}
          >
            <span style={{ fontSize: "1.25rem" }}>🚪</span> 
            <span style={{ opacity: sidebarOpen ? 1 : 0, transition: "opacity 0.2s" }}>{t("logout")}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
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
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.5rem" }}>
            ☰
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "clamp(0.5rem, 2vw, 1.5rem)" }}>
            <div className="flex-center" style={{ scale: "0.9" }}>
              <LanguageSwitcher />
            </div>

            {/* Notifications Bell */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setNotifsOpen(!notifsOpen)} style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: "1.25rem", cursor: "pointer", position: "relative" }}>
                🔔
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, background: "var(--rose-500)", color: "#fff", fontSize: "0.6rem", borderRadius: "10px", padding: "2px 5px", fontWeight: 800 }}>
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>
              {notifsOpen && (
                <div className="glass-card fade-up" style={{ position: "absolute", right: 0, top: "2.5rem", width: "min(300px, 80vw)", zIndex: 200, padding: 0 }}>
                  <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700 }}>Notifications</div>
                  <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
                    {notifications.length === 0 && <div style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.8rem", textAlign: "center" }}>No notifications</div>}
                    {notifications.map(n => (
                      <div key={n.id} 
                           onClick={() => { markNotificationRead(n.id); setNotifsOpen(false); if(n.link) router.push(n.link); }}
                           style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.03)", background: n.isRead ? "transparent" : "rgba(20,184,196,0.1)", cursor: "pointer", transition: "background 0.2s" }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: n.isRead ? "var(--text-secondary)" : "var(--text-primary)", marginBottom: 2 }}>{n.title}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{n.body}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar Dropdown - Fluid */}
            <div style={{ position: "relative" }}>
              <div onClick={() => setProfileOpen(!profileOpen)} style={{
                width: "2.25rem", height: "2.25rem", borderRadius: "50%",
                background: "linear-gradient(135deg, var(--teal-500), var(--amber-500))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1rem", cursor: "pointer", overflow: "hidden", border: "2px solid var(--border)"
              }}>
                 {profile?.avatarUrl ? (
                   profile.avatarUrl.startsWith("http") || profile.avatarUrl.startsWith("data:") ? (
                     <img src={profile.avatarUrl} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                   ) : (
                     <span>{profile.avatarUrl}</span>
                   )
                 ) : "👤"}
              </div>

              {profileOpen && (
                <div className="glass-card fade-up" style={{ position: "absolute", right: 0, top: "2.5rem", width: "12rem", zIndex: 200, padding: "0.5rem 0" }}>
                  <div style={{ padding: "0.5rem 1rem 0.75rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.9rem" }}>{profile?.firstName}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>Volunteer</div>
                  </div>
                  <Link href="/volunteer/profile" onClick={() => setProfileOpen(false)} style={{ display: 'block', width: "100%", textAlign: "left", padding: "0.6rem 1rem", textDecoration: "none", color: "var(--text-primary)", cursor: "pointer", fontSize: "0.85rem" }}>
                    👤 View Profile
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
