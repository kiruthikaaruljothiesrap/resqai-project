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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Initialize status from profile if available
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
         // Show elegant foreground toast or alert here
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
    <div style={{ display: "flex", minHeight: "100vh", background: "#060d10" }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 240 : 0,
        minWidth: sidebarOpen ? 240 : 0,
        overflow: "hidden",
        background: "#0d1f24",
        borderRight: "1px solid rgba(20,184,196,0.12)",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s ease",
        position: "sticky",
        top: 0,
        height: "100vh",
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid rgba(20,184,196,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="ResQAI Logo" style={{ width: 38, height: 38, borderRadius: 10, objectFit: "contain" }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#f0f9fa" }}>ResQAI</div>
              <div style={{ fontSize: 11, color: "#14b8c4" }}>Volunteer Portal</div>
            </div>
          </div>
        </div>

        {/* Status selector directly saves to Firebase */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(20,184,196,0.08)" }}>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as any)}
            style={{
              width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,196,0.2)",
              borderRadius: 8, color: "#f0f9fa", fontSize: 13, padding: "8px 10px", cursor: "pointer",
            }}
          >
            <option value="online">🟢 {t("online")}</option>
            <option value="busy">🟡 {t("busy")}</option>
            <option value="offline">⚫ {t("offline")}</option>
          </select>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`sidebar-item${pathname === item.href ? " active" : ""}`}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{t(`sidebar.${item.key}`)}</span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(20,184,196,0.08)" }}>
          <button
            onClick={async () => { await logOut(); router.push("/role-select"); }}
            className="sidebar-item"
            style={{ width: "100%", background: "none", border: "none", color: "#f87171", cursor: "pointer" }}
          >
            <span>🚪</span> <span>{t("logout")}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
        {/* Topbar */}
        <header style={{
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          background: "#0d1f24",
          borderBottom: "1px solid rgba(20,184,196,0.12)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 20 }}>
            ☰
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <LanguageSwitcher />

            {/* Notifications Bell */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setNotifsOpen(!notifsOpen)} style={{ background: "none", border: "none", color: "#f0f9fa", fontSize: 20, cursor: "pointer", position: "relative" }}>
                🔔
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "#fff", fontSize: 10, borderRadius: 10, padding: "2px 6px", fontWeight: 800 }}>
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>
              {notifsOpen && (
                <div className="glass-card" style={{ position: "absolute", right: 0, top: 40, width: 300, zIndex: 200, padding: 0 }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700 }}>Notifications</div>
                  <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                    {notifications.length === 0 && <div style={{ padding: 16, color: "#64748b", fontSize: 13, textAlign: "center" }}>No notifications</div>}
                    {notifications.map(n => (
                      <div key={n.id} 
                           onClick={() => { markNotificationRead(n.id); setNotifsOpen(false); if(n.link) router.push(n.link); }}
                           style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)", background: n.isRead ? "transparent" : "rgba(20,184,196,0.1)", cursor: "pointer", transition: "background 0.2s" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: n.isRead ? "#94a3b8" : "#f0f9fa", marginBottom: 4 }}>{n.title}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{n.body}</div>
                        <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>{new Date(n.createdAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Status dot */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColors[status] }} />
              <span style={{ fontSize: 13, color: "#94a3b8" }}>{statusLabels[status]}</span>
            </div>

            {/* Avatar Dropdown */}
            <div style={{ position: "relative" }}>
              <div onClick={() => setProfileOpen(!profileOpen)} style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "linear-gradient(135deg,#14b8c4,#f59e0b)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, cursor: "pointer", overflow: "hidden"
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
                <div className="glass-card" style={{ position: "absolute", right: 0, top: 40, width: 240, zIndex: 200, padding: "12px 0" }}>
                  <div style={{ padding: "0 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontWeight: 700, color: "#f0f9fa" }}>{profile?.firstName}</div>
                    <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>Volunteer</div>
                  </div>
                  <Link href="/volunteer/profile" onClick={() => setProfileOpen(false)} style={{ display: 'block', width: "100%", textAlign: "left", padding: "10px 16px", textDecoration: "none", color: "#f0f9fa", cursor: "pointer", fontSize: 13 }}>
                    👤 View Profile
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
