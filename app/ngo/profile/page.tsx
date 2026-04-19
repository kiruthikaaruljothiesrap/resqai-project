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

  const renderAvatar = (url: string | null, fontSize: string) => {
    if (!url) return <span className={fontSize}>🏢</span>;
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
    <div className="space-y-8 pb-32 tracking-tight">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-[#f0f9fa] tracking-tight">NGO Profile</h1>
          <p className="text-sm md:text-base text-[#94a3b8] font-medium tracking-wide">Update your organization credentials and profile</p>
        </div>
        <button 
          onClick={() => editMode ? saveChanges() : setEditMode(true)} 
          disabled={saving} 
          className={`
            w-full md:w-auto px-6 py-3 rounded-xl font-bold transition-all transform active:scale-95 shadow-xl
            ${editMode 
              ? "bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white shadow-amber-500/20" 
              : "border border-[#f59e0b]/40 text-[#f0f9fa] hover:bg-[#f59e0b]/10 shadow-black/20"}
          `}
        >
          {saving ? "Saving..." : editMode ? "💾 Save Profile" : "✏️ Edit Details"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 md:gap-8">
        {/* Left column */}
        <div className="space-y-6">
          <div className="glass-card p-8 text-center bg-[#0d1f24]/60 ring-1 ring-[#f59e0b]/5">
            <div className="relative inline-block mb-6">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full p-1 bg-gradient-to-br from-[#f59e0b] to-[#d97706] shadow-2xl flex items-center justify-center overflow-hidden">
                <div className="w-full h-full rounded-full bg-[#0d1f24] flex items-center justify-center overflow-hidden ring-4 ring-[#0d1f24]">
                  {renderAvatar(avatarSrc, "text-5xl md:text-6xl")}
                </div>
              </div>
            </div>

            <h2 className="text-xl md:text-2xl font-black text-[#f0f9fa] tracking-tight truncate px-2">{ngoName}</h2>
            <p className="text-xs font-black text-[#f59e0b] uppercase tracking-[0.2em] mt-2 mb-6">NGO Partner</p>

            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest mb-6 ${imgTypeBadge.color}`}>
              <span>{imgTypeBadge.icon}</span>
              <span>{imgTypeBadge.label} Logo</span>
            </div>

            <button 
              onClick={() => setShowImageModal(true)} 
              className="w-full py-3 px-4 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/25 text-[#f59e0b] text-sm font-black uppercase tracking-widest hover:bg-[#f59e0b]/20 transition-all active:scale-95 shadow-lg shadow-[#f59e0b]/5"
            >
              🏢 Update Logo
            </button>
          </div>

          <div className="glass-card p-6 border-[#f59e0b]/5 bg-[#0d1f24]/40">
            <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em] mb-3">Verification Badge</p>
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full shadow-lg ${profile.status === "verified" ? "bg-green-500 animate-pulse shadow-green-500/20" : "bg-amber-500 shadow-amber-500/20"}`} />
              <div className={`text-sm font-black tracking-[0.05em] ${profile.status === "verified" ? "text-green-500" : "text-amber-500"}`}>
                {profile.status === "verified" ? "TRUSTED PARTNER" : "VERIFICATION PENDING"}
              </div>
            </div>
            {profile.status !== "verified" && (
              <p className="text-[10px] text-[#475569] font-medium mt-3">Identity documents are currently in review.</p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="glass-card p-6 md:p-8 bg-[#0d1f24]/40 ring-1 ring-white/5">
          <h3 className="text-lg font-black mb-8 flex items-center gap-2">
            <span className="text-amber-500">Organization</span> Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#475569] uppercase tracking-widest">Contact Email</label>
              <div className="text-base font-bold text-[#f0f9fa] break-all border-b border-white/5 pb-2">{email}</div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#475569] uppercase tracking-widest">Office Location</label>
              <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                <div className="flex-1 text-sm font-bold text-[#f0f9fa] truncate break-all">
                  {location || "Enter organization address"}
                </div>
                {editMode && (
                   <button onClick={detectLocation} className="p-1 px-3 rounded-lg bg-[#f59e0b]/10 text-[#f59e0b] text-[10px] font-black border border-[#f59e0b]/20">📍 Detect</button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#475569] uppercase tracking-widest">NGO Registration No.</label>
              {editMode ? (
                <input 
                  value={regNo} 
                  onChange={e => setRegNo(e.target.value)} 
                  className="w-full p-3 bg-black/40 border-b-2 border-[#f59e0b]/30 focus:border-[#f59e0b] outline-none text-[#f0f9fa] font-bold text-base transition-all"
                  placeholder="e.g. NGO-IND-12345"
                />
              ) : (
                <div className="text-base font-bold text-[#f0f9fa] border-b border-white/5 pb-2">{regNo || "Not specified"}</div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#475569] uppercase tracking-widest">Foundation Year</label>
              {editMode ? (
                <input 
                  type="number" 
                  value={estYear} 
                  onChange={e => setEstYear(e.target.value)} 
                  className="w-full p-3 bg-black/40 border-b-2 border-[#f59e0b]/30 focus:border-[#f59e0b] outline-none text-[#f0f9fa] font-bold text-base transition-all"
                  placeholder="2024"
                />
              ) : (
                <div className="text-base font-bold text-[#f0f9fa] border-b border-white/5 pb-2">{estYear || "Not specified"}</div>
              )}
            </div>

            {/* Verification Helper (NGO-only info) */}
            {!editMode && (
               <div className="md:col-span-2 p-6 rounded-2xl bg-[#f59e0b]/5 border border-[#f59e0b]/10 flex items-start gap-4">
                  <span className="text-2xl">ℹ️</span>
                  <div>
                    <h4 className="text-sm font-black text-[#f0f9fa] uppercase tracking-wider mb-1">Verify your organization</h4>
                    <p className="text-xs text-[#94a3b8] font-medium leading-relaxed">
                      To access advanced broadcasting features and high-priority volunteer matching, please ensure your registration details match your official certificates.
                    </p>
                  </div>
               </div>
            )}
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
