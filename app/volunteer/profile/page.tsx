"use client";
import { useState, useEffect } from "react";
import { VOLUNTEER_TYPES, BADGES } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { subscribeToTasks } from "@/lib/firestore";
import ProfileImageModal from "@/app/components/ProfileImageModal";
import { auth } from "@/lib/firebase";

export default function ProfilePage() {
  const { profile } = useAuth();
  
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [profileImageType, setProfileImageType] = useState<string>("avatar");
  const [volunteerType, setVolunteerType] = useState("general");
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [locDetecting, setLocDetecting] = useState(false);
  const [smartStatus, setSmartStatus] = useState<"online" | "busy" | "offline">("offline");
  const [saving, setSaving] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // Auto-detect status from task context
  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeToTasks(profile.uid, "volunteer", (tasks) => {
      const hasActiveTask = tasks.some(t => t.status === "accepted" || t.status === "in_progress");
      setSmartStatus(hasActiveTask ? "busy" : "online");
    });
    return () => unsub();
  }, [profile?.uid]);

  // Sync smart status to Firestore whenever it changes
  useEffect(() => {
    if (!profile?.uid) return;
    updateDoc(doc(db, "users", profile.uid), { status: smartStatus }).catch(() => {});
  }, [smartStatus, profile?.uid]);

  useEffect(() => {
    if (profile) {
      setName(profile.firstName + " " + profile.lastName);
      setUsername(profile.username);
      setEmail(profile.email);
      setAvatarSrc(profile.avatarUrl || null);
      setProfileImageType(profile.profileImageType || "avatar");
      setVolunteerType(profile.volunteerType || "general");
      setLocation(profile.location?.address || "");
    }
  }, [profile]);

  const detectLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported in this browser.");
    setLocDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          const addr = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setLocation(addr);
          if (profile?.uid) {
            await updateDoc(doc(db, "users", profile.uid), { location: { address: addr, lat, lng } });
          }
        } catch {
          setLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } finally { setLocDetecting(false); }
      },
      () => { alert("Could not get location. Please allow location access."); setLocDetecting(false); }
    );
  };

  const statusMap = { 
    online: { label: "Online", color: "bg-green-500", text: "text-green-500" }, 
    busy: { label: "Busy", color: "bg-amber-500", text: "text-amber-500" }, 
    offline: { label: "Offline", color: "bg-gray-600", text: "text-gray-500" } 
  };
  const userStatus = smartStatus;

  const saveChanges = async () => {
    if (!profile?.uid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        avatarUrl: avatarSrc,
        volunteerType,
        location: { address: location, lat: 0, lng: 0 }
      });
      setEditMode(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const renderAvatar = (url: string | null, fontSize: string) => {
    if (!url) return <span className={fontSize}>👤</span>;
    if (url.startsWith("http") || url.startsWith("data:")) {
      return <img src={url} alt="avatar" className="w-full h-full object-cover" />;
    }
    return <span className={fontSize}>{url}</span>;
  };

  const googlePhotoUrl = auth?.currentUser?.photoURL || null;

  const imageTypeLabel: Record<string, { icon: string; label: string; color: string }> = {
    avatar: { icon: "🎭", label: "Avatar", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
    upload: { icon: "📷", label: "Uploaded", color: "text-green-500 bg-green-500/10 border-green-500/20" },
    google: { icon: "G", label: "Google", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    drive: { icon: "☁️", label: "Drive", color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
  };
  const imgTypeBadge = imageTypeLabel[profileImageType] || imageTypeLabel.avatar;

  if (!profile) return <div className="p-8 text-center text-[#f0f9fa]">Loading Profile...</div>;

  return (
    <div className="space-y-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-[#f0f9fa] tracking-tight">My Profile</h1>
          <p className="text-sm md:text-base text-[#94a3b8] font-medium tracking-wide">Manage your volunteer identity and settings</p>
        </div>
        <button 
          onClick={() => editMode ? saveChanges() : setEditMode(true)} 
          disabled={saving} 
          className={`
            w-full md:w-auto px-6 py-3 rounded-xl font-bold transition-all transform active:scale-95 shadow-xl 
            ${editMode 
              ? "bg-gradient-to-r from-[#14b8c4] to-[#0f6b71] text-white shadow-[#14b8c4]/20" 
              : "border border-[#14b8c4]/40 text-[#f0f9fa] hover:bg-[#14b8c4]/10 shadow-black/20"}
          `}
        >
          {saving ? "Saving..." : editMode ? "💾 Save Changes" : "✏️ Edit Profile"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 md:gap-8">
        {/* Left column */}
        <div className="space-y-6">
          {/* Avatar card */}
          <div className="glass-card p-8 text-center bg-[#0d1f24]/60 ring-1 ring-[#14b8c4]/5">
            <div className="relative inline-block mb-6">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full p-1 bg-gradient-to-br from-[#14b8c4] to-[#f59e0b] shadow-2xl flex items-center justify-center overflow-hidden">
                <div className="w-full h-full rounded-full bg-[#0d1f24] flex items-center justify-center overflow-hidden ring-4 ring-[#0d1f24]">
                  {renderAvatar(avatarSrc, "text-5xl md:text-6xl")}
                </div>
              </div>
              <div 
                className={`absolute bottom-2 right-2 w-5 h-5 md:w-6 md:h-6 rounded-full border-4 border-[#0d1f24] shadow-lg ${statusMap[userStatus].color}`} 
                title={statusMap[userStatus].label} 
              />
            </div>

            <h2 className="text-xl md:text-2xl font-black text-[#f0f9fa] tracking-tight">{name}</h2>
            <p className="text-sm text-[#94a3b8] font-bold tracking-widest uppercase mt-1 mb-4 opacity-80">@{username}</p>

            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest mb-6 ${imgTypeBadge.color}`}>
              <span>{imgTypeBadge.icon}</span>
              <span>{imgTypeBadge.label} Profile</span>
            </div>

            <button 
              onClick={() => setShowImageModal(true)} 
              className="w-full py-3 px-4 rounded-xl bg-[#14b8c4]/10 border border-[#14b8c4]/25 text-[#14b8c4] text-sm font-black uppercase tracking-widest hover:bg-[#14b8c4]/20 transition-all active:scale-95 shadow-lg shadow-[#14b8c4]/5"
            >
              📷 Change Picture
            </button>
          </div>

          {/* Progress Card */}
          <div className="glass-card p-6 border-[#f59e0b]/5">
            <div className="flex justify-between items-center mb-6 px-1">
              <div>
                <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em] mb-1">Current Points</p>
                <div className="text-4xl font-black text-amber-500 tracking-tighter">{profile.score || 0}</div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em] mb-1">Rank</p>
                <div className="text-lg font-black text-[#14b8c4] flex items-center gap-1 justify-end">
                  {profile.score > 1000 ? "⚡ Advanced" : "Beginner"}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="bg-white/5 rounded-full h-3 overflow-hidden ring-1 ring-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-[#14b8c4] to-[#f59e0b] shadow-[0_0_15px_rgba(20,184,196,0.3)]" 
                  style={{ width: `${Math.min(100, (profile.score / 1500) * 100)}%` }} 
                />
              </div>
              <p className="text-[10px] text-center font-bold text-[#475569] uppercase tracking-widest">
                {profile.score > 1000 ? "Keep soaring! 🚀" : `${1500 - (profile.score || 0)} pts to Expert level`}
              </p>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Personal Info Grid */}
          <div className="glass-card p-6 md:p-8">
            <h3 className="text-lg font-black mb-8 flex items-center gap-2">
              <span className="text-[#14b8c4]">Personal</span> Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#475569] uppercase tracking-widest">Email Address</label>
                <div className="text-base font-bold text-[#f0f9fa] truncate break-all">{email || "Not provided"}</div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#475569] uppercase tracking-widest">Phone Number</label>
                <div className="text-base font-bold text-[#f0f9fa]">{profile.phoneNo || "Not connected"}</div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#475569] uppercase tracking-widest">Residing Location</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 text-sm font-bold text-[#f0f9fa] bg-white/5 p-3 rounded-xl border border-white/5 truncate">
                    {location || "Location not set"}
                  </div>
                  <button 
                    onClick={detectLocation} 
                    disabled={locDetecting} 
                    className="px-4 py-3 rounded-xl bg-[#14b8c4]/15 text-[#14b8c4] border border-[#14b8c4]/30 text-xs font-black uppercase tracking-widest hover:bg-[#14b8c4]/25 transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    {locDetecting ? "..." : "📍 Detect"}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#475569] uppercase tracking-widest">Auto-Managed Status</label>
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 w-fit pr-6">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${statusMap[userStatus].color}`} />
                  <span className={`font-black text-sm uppercase tracking-widest ${statusMap[userStatus].text}`}>
                    {statusMap[userStatus].label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Volunteer Type Selection */}
          <div className="glass-card p-6 md:p-8">
            <h3 className="text-lg font-black mb-6">Volunteer Specialty</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {VOLUNTEER_TYPES.map((t) => {
                const isActive = volunteerType === t.id;
                return (
                  <button 
                    key={t.id} 
                    onClick={() => editMode && setVolunteerType(t.id)} 
                    className={`
                      flex items-center gap-3 p-4 rounded-xl border transition-all
                      ${isActive 
                        ? "bg-[#14b8c4]/15 border-[#14b8c4] text-[#14b8c4] shadow-lg shadow-[#14b8c4]/5" 
                        : "bg-white/5 border-white/10 text-[#64748b] hover:border-white/20"}
                      ${editMode ? "cursor-pointer" : "cursor-default opacity-80"}
                    `}
                  >
                    <span className="text-2xl">{t.icon}</span> 
                    <span className="text-sm font-bold tracking-tight">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Badges Section */}
          <div className="glass-card p-6 md:p-8">
            <h3 className="text-lg font-black mb-6">Accomplishments</h3>
            <div className="flex flex-wrap gap-3">
              {profile.badges?.length === 0 ? (
                <div className="w-full text-center py-10 bg-white/5 rounded-2xl border border-dashed border-white/10">
                   <p className="text-[#94a3b8] font-medium text-sm">You haven't earned any badges yet. Start helping out to unlock them!</p>
                </div>
              ) : BADGES.map((b) => {
                const earned = profile.badges?.includes(b.id);
                return (
                  <div 
                    key={b.id} 
                    className={`
                      flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all
                      ${earned 
                        ? `bg-white/5 border-white/10 text-white shadow-xl` 
                        : "bg-black/20 border-white/5 text-[#334155] grayscale opacity-40"}
                    `}
                  >
                    <span className="text-2xl drop-shadow-md">{b.icon}</span>
                    <span className="text-xs font-black uppercase tracking-widest">{b.name}</span>
                    {!earned && <span>🔒</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <ProfileImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        userId={profile.uid}
        currentAvatarUrl={avatarSrc || undefined}
        googlePhotoUrl={googlePhotoUrl}
        onSaved={(url, type, avatarId) => {
          setAvatarSrc(url);
          setProfileImageType(type);
        }}
      />
    </div>
  );
}
