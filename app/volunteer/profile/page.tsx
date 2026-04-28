"use client";
import { useState, useEffect } from "react";
import { VOLUNTEER_TYPES, BADGES } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { subscribeToTasks, subscribeToVolunteerHours } from "@/lib/firestore";
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
  const [totalHours, setTotalHours] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);


  // Subscribe to hours worked from completed tasks
  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeToVolunteerHours(profile.uid, setTotalHours);
    return () => unsub();
  }, [profile?.uid]);

  // Count of completed tasks
  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeToTasks(profile.uid, "volunteer", (tasks) => {
      const hasActiveTask = tasks.some(t => t.status === "accepted" || t.status === "in_progress");
      setSmartStatus(hasActiveTask ? "busy" : "online");
      setCompletedCount(tasks.filter(t => t.status === "completed").length);
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

  const statusMap = { online: { label: "Online", color: "#22c55e" }, busy: { label: "Busy", color: "#eab308" }, offline: { label: "Offline", color: "#374151" } };
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

  // Render avatar smartly
  const renderAvatar = (url: string | null, size: number, fontSize: number) => {
    if (!url) return <span style={{ fontSize }}>👤</span>;
    // If it's a URL (http/data)
    if (url.startsWith("http") || url.startsWith("data:")) {
      return <img src={url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
    }
    // Otherwise, it's an emoji avatar
    return <span style={{ fontSize }}>{url}</span>;
  };

  // Get Google photo from Firebase Auth user
  const googlePhotoUrl = auth?.currentUser?.photoURL || null;

  // Image type badge
  const imageTypeLabel: Record<string, { icon: string; label: string; color: string }> = {
    avatar: { icon: "🎭", label: "Avatar", color: "#f59e0b" },
    upload: { icon: "📷", label: "Uploaded", color: "#22c55e" },
    google: { icon: "G", label: "Google", color: "#4285f4" },
    drive: { icon: "☁️", label: "Drive", color: "#14b8c4" },
  };
  const imgTypeBadge = imageTypeLabel[profileImageType] || imageTypeLabel.avatar;

  if (!profile) return <div style={{ padding: 24, color: "#fff" }}>Loading Profile...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>My Profile</h1>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>Manage your volunteer information</p>
        </div>
        <button onClick={() => editMode ? saveChanges() : setEditMode(true)} disabled={saving} style={{
          padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(20,184,196,0.4)",
          background: editMode ? "linear-gradient(135deg,#14b8c4,#0f6b71)" : "transparent",
          color: "#f0f9fa", fontWeight: 600, cursor: "pointer",
        }}>
          {saving ? "Saving..." : editMode ? "💾 Save Changes" : "✏️ Edit Profile"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Avatar card */}
          <div className="glass-card" style={{ padding: 24, textAlign: "center" }}>
            <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
              <div style={{
                width: 110, height: 110, borderRadius: "50%",
                background: "linear-gradient(135deg,#14b8c4,#f59e0b)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
                border: "3px solid rgba(20,184,196,0.4)",
                boxShadow: "0 0 24px rgba(20,184,196,0.15)",
              }}>
                {renderAvatar(avatarSrc, 110, 50)}
              </div>
              {/* Status dot */}
              <div style={{
                position: "absolute", bottom: 4, right: 4,
                width: 18, height: 18, borderRadius: "50%",
                background: statusMap[userStatus].color,
                border: "2px solid #0d1f24",
              }} title={statusMap[userStatus].label} />
            </div>

            <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{name}</h2>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>@{username}</p>

            {/* Image type badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: `${imgTypeBadge.color}18`, border: `1px solid ${imgTypeBadge.color}33`, marginBottom: 16 }}>
              <span style={{ fontSize: 12 }}>{imgTypeBadge.icon}</span>
              <span style={{ fontSize: 11, color: imgTypeBadge.color, fontWeight: 600 }}>{imgTypeBadge.label} photo</span>
            </div>

            {/* Edit Profile Image Button — always visible */}
            <button onClick={() => setShowImageModal(true)} style={{
              display: "block", width: "100%", padding: "10px 16px",
              background: "rgba(20,184,196,0.08)", border: "1px solid rgba(20,184,196,0.25)",
              borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#14b8c4",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(20,184,196,0.14)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(20,184,196,0.08)"; }}
            >
              📷 Edit Profile Image
            </button>

            {editMode && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12, color: "#64748b" }}>Specialty and info fields are editable in the right panel →</p>
              </div>
            )}
          </div>

          {/* Score & Stats */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, gap: 8 }}>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#f59e0b" }}>{profile.score || 0}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>Score</div>
              </div>
              <div style={{ textAlign: "center", flex: 1, borderLeft: "1px solid rgba(255,255,255,0.07)", paddingLeft: 8 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#14b8c4" }}>{totalHours}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>Hours</div>
              </div>
              <div style={{ textAlign: "center", flex: 1, borderLeft: "1px solid rgba(255,255,255,0.07)", paddingLeft: 8 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#22c55e" }}>{completedCount}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>Tasks</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>Level: <span style={{ color: "#14b8c4", fontWeight: 700 }}>{profile.score > 1000 ? "⚡ Advanced" : "Beginner"}</span></div>
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 999, height: 6 }}>
              <div style={{ width: `${Math.min(100, (profile.score / 1500) * 100)}%`, height: "100%", background: "linear-gradient(90deg,#14b8c4,#f59e0b)", borderRadius: 999 }} />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Personal Info */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Personal Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>Email Address</label>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{email || <span style={{ color: "#94a3b8" }}>Not provided</span>}</div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>Location</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#f0f9fa" }}>
                    {location || <span style={{ color: "#94a3b8" }}>Not set</span>}
                  </div>
                  <button onClick={detectLocation} disabled={locDetecting} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid rgba(20,184,196,0.4)", background: "rgba(20,184,196,0.1)", color: "#14b8c4", fontSize: 11, fontWeight: 700, cursor: locDetecting ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                    {locDetecting ? "Detecting..." : "📍 Use Current"}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>Phone</label>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{profile.phoneNo || <span style={{ color: "#94a3b8" }}>Not set</span>}</div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>Status (Auto)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: statusMap[userStatus].color }} />
                  <span style={{ fontWeight: 600, color: statusMap[userStatus].color }}>{statusMap[userStatus].label}</span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>(auto-managed)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Volunteer Type */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Volunteer Specialty</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
              {VOLUNTEER_TYPES.map((t) => {
                const isActive = volunteerType === t.id;
                return (
                  <button key={t.id} onClick={() => editMode && setVolunteerType(t.id)} style={{
                    padding: "10px 14px", borderRadius: 10, border: `1px solid`,
                    borderColor: isActive ? "#14b8c4" : "rgba(255,255,255,0.08)",
                    background: isActive ? "rgba(20,184,196,0.12)" : "rgba(255,255,255,0.03)",
                    color: isActive ? "#14b8c4" : "#94a3b8",
                    cursor: editMode ? "pointer" : "default",
                    fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span>{t.icon}</span> <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Badges */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Badges & Achievements</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {profile.badges?.length === 0 ? (
                <div style={{ color: "#94a3b8", fontSize: 13 }}>No badges earned yet. Complete tasks to earn them!</div>
              ) : BADGES.map((b) => {
                const earned = profile.badges?.includes(b.id);
                return (
                  <div key={b.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 16px", borderRadius: 999,
                    background: earned ? `${b.color}18` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${earned ? b.color + "44" : "rgba(255,255,255,0.08)"}`,
                    color: earned ? b.color : "#334155",
                    filter: !earned ? "grayscale(1) opacity(0.4)" : "none",
                  }}>
                    <span>{b.icon}</span>
                    <span style={{ fontSize: 13 }}>{b.name}</span>
                    {!earned && <span style={{ fontSize: 12 }}>🔒</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Image Modal */}
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
