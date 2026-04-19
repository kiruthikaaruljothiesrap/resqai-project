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

const mobileNavItems = [
  { href: "/volunteer/dashboard", icon: "🏠", key: "dashboard" },
  { href: "/volunteer/feed", icon: "🌟", key: "feed" },
  { href: "/volunteer/map", icon: "🗺️", key: "map" },
  { href: "/volunteer/chat", icon: "💬", key: "chat" },
  { href: "/volunteer/profile", icon: "👤", key: "profile" },
];

export default function VolunteerLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Common");
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile: closed by default
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

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

  const statusColors = { online: "bg-green-500", busy: "bg-yellow-500", offline: "bg-gray-600" };
  const statusLabels = { online: t("online"), busy: t("busy"), offline: t("offline") };

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
        fixed inset-y-0 left-0 z-50 w-64 bg-[#0d1f24] border-r border-[#14b8c4]/10 
        transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? "translate-x-0 shadow-2xl shadow-[#14b8c4]/5" : "-translate-x-full"}
        flex flex-col
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-[#14b8c4]/10">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="ResQAI" className="w-10 h-10 rounded-xl object-contain" />
            <div>
              <div className="font-extrabold text-base tracking-tight text-[#f0f9fa]">ResQAI</div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-[#14b8c4]">Volunteer Portal</div>
            </div>
          </div>
        </div>

        {/* Status selector */}
        <div className="p-4 border-b border-[#14b8c4]/5">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as any)}
            className="w-full bg-white/5 border border-[#14b8c4]/20 rounded-lg text-sm px-3 py-2 outline-none focus:border-[#14b8c4]/50 cursor-pointer"
          >
            <option value="online">🟢 {t("online")}</option>
            <option value="busy">🟡 {t("busy")}</option>
            <option value="offline">⚫ {t("offline")}</option>
          </select>
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
                  ? "bg-[#14b8c4]/15 text-[#14b8c4] border border-[#14b8c4]/20" 
                  : "text-[#94a3b8] hover:bg-white/5 hover:text-[#f0f9fa]"}`}
            >
              <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="text-sm font-medium">{t(`sidebar.${item.key}`)}</span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 mt-auto border-t border-[#14b8c4]/5">
          <button
            onClick={async () => { await logOut(); router.push("/role-select"); }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[#f87171] hover:bg-red-500/10 transition-all font-medium text-sm"
          >
            <span className="text-xl">🚪</span>
            <span>{t("logout")}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 md:px-6 bg-[#0d1f24]/90 backdrop-blur-xl border-b border-[#14b8c4]/10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="lg:hidden p-2 -ml-2 text-[#94a3b8] hover:text-[#f0f9fa] transition-colors"
            >
              <span className="text-2xl">☰</span>
            </button>
            <h2 className="hidden md:block font-bold text-lg text-[#14b8c4] capitalize">
              {pathname.split("/").pop()?.replace("-", " ")}
            </h2>
          </div>

          <div className="flex items-center gap-2 md:gap-5">
            <LanguageSwitcher />

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setNotifsOpen(!notifsOpen)} 
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xl relative transition-all active:scale-90"
              >
                🔔
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#ef4444] text-[10px] font-black text-white px-1.5 py-0.5 rounded-full ring-4 ring-[#0d1f24]">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>
              
              {notifsOpen && (
                <>
                  <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setNotifsOpen(false)} />
                  <div className="absolute right-0 mt-3 w-[280px] md:w-[320px] bg-[#0d1f24] border border-[#14b8c4]/20 rounded-2xl shadow-2xl z-50 overflow-hidden glass-card">
                    <div className="p-4 border-b border-white/5 font-bold flex justify-between items-center bg-[#14b8c4]/5">
                      <span>Notifications</span>
                      <span className="text-[10px] bg-[#14b8c4]/20 text-[#14b8c4] px-2 py-1 rounded-full">{notifications.length} Total</span>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-[#64748b] text-sm">All caught up! ✨</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} 
                               onClick={() => { markNotificationRead(n.id); setNotifsOpen(false); if(n.link) router.push(n.link); }}
                               className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${!n.isRead ? "bg-[#14b8c4]/5" : ""}`}>
                            <div className={`text-sm font-bold mb-1 ${!n.isRead ? "text-[#14b8c4]" : "text-[#94a3b8]"}`}>{n.title}</div>
                            <p className="text-xs text-[#64748b] line-clamp-2">{n.body}</p>
                            <span className="text-[10px] text-[#475569] mt-2 block">{new Date(n.createdAt).toLocaleTimeString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Profile */}
            <div className="relative group">
              <div 
                onClick={() => setProfileOpen(!profileOpen)} 
                className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-[#14b8c4] to-[#f59e0b] p-[2px] cursor-pointer ring-0 hover:ring-2 ring-[#14b8c4]/50 transition-all active:scale-95"
              >
                <div className="w-full h-full rounded-[10px] bg-[#0d1f24] flex items-center justify-center overflow-hidden">
                   {profile?.avatarUrl ? (
                     profile.avatarUrl.length > 2 ? (
                       <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                     ) : <span className="text-xl">{profile.avatarUrl}</span>
                   ) : <span className="text-xl">👤</span>}
                </div>
              </div>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-3 w-56 bg-[#0d1f24] border border-[#14b8c4]/20 rounded-2xl shadow-2xl z-50 py-2 glass-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5 bg-white/5">
                      <div className="font-bold text-sm truncate">{profile?.firstName} {profile?.lastName}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
                        <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest">{statusLabels[status].replace("🟢", "").replace("🟡", "").replace("⚫", "")}</span>
                      </div>
                    </div>
                    <Link href="/volunteer/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-[#f0f9fa] hover:bg-[#14b8c4]/10 transition-colors">
                      👤 My Profile
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
        <nav className="fixed bottom-4 left-4 right-4 z-50 h-16 bg-[#0d1f24]/90 backdrop-blur-xl border border-[#14b8c4]/20 rounded-2xl lg:hidden flex items-center justify-around px-2 shadow-2xl shadow-black/50">
          {mobileNavItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 p-2 rounded-xl
                ${pathname === item.href 
                  ? "text-[#14b8c4] bg-[#14b8c4]/10 -translate-y-1" 
                  : "text-[#64748b] hover:text-[#94a3b8]"}`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-tight">{t(`sidebar.${item.key}`)}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
