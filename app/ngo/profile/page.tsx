"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProfileImageModal from "@/app/components/ProfileImageModal";
import { auth } from "@/lib/firebase";

export default function NGOProfilePage() {
  const { profile } = useAuth();
  
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [profileImageType, setProfileImageType] = useState<string>("avatar");
  const [editMode, setEditMode] = useState(false);
  const [ngoName, setNgoName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [locDetecting, setLocDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [regNo, setRegNo] = useState("");
  const [estYear, setEstYear] = useState("");

  useEffect(() => {
    if (profile) {
      setNgoName(profile.firstName + " " + profile.lastName);
      setEmail(profile.email);
      setAvatarSrc(profile.avatarUrl || null);
      setProfileImageType(profile.profileImageType || "avatar");
      setLocation(profile.location?.address || "");
      setRegNo(profile.ngoRegistrationNo || "");
      setEstYear(profile.ngoEstablishedYear || "");
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

  const saveChanges = async () => {
    if (!profile?.uid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        avatarUrl: avatarSrc,
        location: { address: location, lat: 0, lng: 0 },
        ngoRegistrationNo: regNo,
        ngoEstablishedYear: estYear
      });
      setEditMode(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const renderAvatar = (url: string | null, size: number, fontSize: number) => {
    if (!url) return <span style={{ fontSize }}>🏢</span>;
    if (url.startsWith("http") || url.startsWith("data:")) {
      return <img src={url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
    }
    return <span style={{ fontSize }}>{url}</span>;
  };

  const googlePhotoUrl = auth?.currentUser?.photoURL || null;

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
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>NGO Profile</h1>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>Manage your NGO details and identity</p>
        </div>
        <button onClick={() => editMode ? saveChanges() : setEditMode(true)} disabled={saving} style={{
          padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(245,158,11,0.4)",
          background: editMode ? "linear-gradient(135deg,#f59e0b,#cc7700)" : "transparent",
          color: "#f0f9fa", fontWeight: 600, cursor: "pointer",
        }}>
          {saving ? "Saving..." : editMode ? "💾 Save Changes" : "✏️ Edit Profile"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="glass-card" style={{ padding: 24, textAlign: "center" }}>
            <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
              <div style={{
                width: 110, height: 110, borderRadius: "50%",
                background: "linear-gradient(135deg,#f59e0b,#d97706)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
                border: "3px solid rgba(245,158,11,0.4)",
                boxShadow: "0 0 24px rgba(245,158,11,0.15)",
              }}>
                {renderAvatar(avatarSrc, 110, 50)}
              </div>
            </div>

            <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{ngoName}</h2>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12 }}>NGO Partner</p>

            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: `${imgTypeBadge.color}18`, border: `1px solid ${imgTypeBadge.color}33`, marginBottom: 16 }}>
              <span style={{ fontSize: 12 }}>{imgTypeBadge.icon}</span>
              <span style={{ fontSize: 11, color: imgTypeBadge.color, fontWeight: 600 }}>{imgTypeBadge.label} image</span>
            </div>

            <button onClick={() => setShowImageModal(true)} style={{
              display: "block", width: "100%", padding: "10px 16px",
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#f59e0b",
            }}>
              🏢 Edit Logo / Avatar
            </button>
          </div>

          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>Verification Status</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: profile.status === "verified" ? "#22c55e" : "#f59e0b" }} />
              <span style={{ fontWeight: 700, color: profile.status === "verified" ? "#22c55e" : "#f59e0b" }}>
                {profile.status === "verified" ? "VERIFIED" : "PENDING"}
              </span>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Organization Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>Contact Email</label>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{email}</div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>Location</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {location || "Not set"}
                </div>
                <button onClick={detectLocation} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #f59e0b44", background: "#f59e0b11", color: "#f59e0b", fontSize: 11, cursor: "pointer" }}>📍 Map</button>
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>Registration No.</label>
              {editMode ? (
                <input value={regNo} onChange={e => setRegNo(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: 8, background: "#000", border: "1px solid #333", color: "#fff" }} />
              ) : (
                <div style={{ fontSize: 15, fontWeight: 600 }}>{regNo || "N/A"}</div>
              )}
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>Established Year</label>
              {editMode ? (
                <input type="number" value={estYear} onChange={e => setEstYear(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: 8, background: "#000", border: "1px solid #333", color: "#fff" }} />
              ) : (
                <div style={{ fontSize: 15, fontWeight: 600 }}>{estYear || "N/A"}</div>
              )}
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
        onSaved={(url, type) => {
          setAvatarSrc(url);
          setProfileImageType(type);
        }}
      />
    </div>
  );
}
