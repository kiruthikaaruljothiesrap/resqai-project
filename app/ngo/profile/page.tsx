"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProfileImageModal from "@/app/components/ProfileImageModal";
import { auth } from "@/lib/firebase";
import { uploadFile } from "@/lib/storage";

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
  const [certUrl, setCertUrl] = useState("");
  const [uploadingCert, setUploadingCert] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (profile) {
      setNgoName(profile.firstName + " " + profile.lastName);
      setEmail(profile.email);
      setAvatarSrc(profile.avatarUrl || null);
      setProfileImageType(profile.profileImageType || "avatar");
      setLocation(profile.location?.address || "");
      setRegNo(profile.ngoRegistrationNo || "");
      setEstYear(profile.ngoEstablishedYear || "");
      setCertUrl(profile.ngoCertificateUrl || "");
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
            await setDoc(doc(db, "users", profile.uid), { location: { address: addr, lat, lng } }, { merge: true });
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
      await setDoc(doc(db, "users", profile.uid), {
        avatarUrl: avatarSrc,
        location: { address: location, lat: 0, lng: 0 },
        ngoRegistrationNo: regNo,
        ngoEstablishedYear: estYear,
        ngoCertificateUrl: certUrl,
        status: (certUrl !== profile.ngoCertificateUrl) ? "pending_verification" : profile.status
      }, { merge: true });
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
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12 }}>Registration Certificate</div>
            {certUrl ? (
               <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  {certUrl.toLowerCase().endsWith(".pdf") ? (
                    <div style={{ padding: "20px", textAlign: "center" }}>
                      <span style={{ fontSize: "2rem" }}>📄</span>
                      <p style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>PDF Document</p>
                    </div>
                  ) : (
                    <img src={certUrl} alt="Certificate" style={{ width: "100%", maxHeight: 150, objectFit: "contain" }} />
                  )}
                   <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 8 }}>
                     <a href={certUrl} download={true} style={{ padding: "6px 10px", background: "rgba(0,0,0,0.6)", borderRadius: 6, color: "#fff", textDecoration: "none", fontSize: "0.7rem", fontWeight: 600 }}>
                       📥 Download
                     </a>
                     <a href={certUrl} target="_blank" rel="noreferrer" style={{ padding: "6px 10px", background: "rgba(20,184,196,0.8)", borderRadius: 6, color: "#fff", textDecoration: "none", fontSize: "0.7rem", fontWeight: 600 }}>
                       🔍 View
                     </a>
                   </div>
               </div>
            ) : (
              <div style={{ padding: "20px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12 }}>
                <span style={{ fontSize: "1.5rem" }}>📋</span>
                <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.5rem" }}>No certificate uploaded</p>
              </div>
            )}
            
            <label style={{
              display: "block", width: "100%", padding: "10px 16px", marginTop: 12,
              background: "rgba(20,184,196,0.08)", border: "1px solid rgba(20,184,196,0.25)",
              borderRadius: 10, cursor: uploadingCert ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, color: "#14b8c4", textAlign: "center"
            }}>
              {uploadingCert ? `⏳ Uploading (${Math.round(uploadProgress)}%)...` : certUrl ? "🔄 Replace Certificate" : "📤 Upload Certificate"}
              <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} disabled={uploadingCert} onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                  return alert("File is too large. Please upload a file smaller than 5MB.");
                }

                setUploadingCert(true);
                setUploadProgress(0);

                try {
                  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
                  // For progress tracking, we'll manually call Firebase Storage instead of the helper if we want finer control
                  // or just keep using the helper and accept the 30s timeout I added there.
                  const url = await uploadFile(file, `certificates/${profile.uid}/${Date.now()}_${safeName}`, (p) => setUploadProgress(p));

                  setCertUrl(url);
                  // Record the upload in a dedicated 'ngoCertificates' collection
                  await addDoc(collection(db, "ngoCertificates"), {
                    ngoId: profile.uid,
                    ngoName: profile.firstName + " " + profile.lastName,
                    fileUrl: url,
                    fileName: safeName,
                    uploadedAt: new Date().toISOString(),
                    status: "pending"
                  });

                  // Auto-save this specific field if not in edit mode
                  if (!editMode) {
                    await setDoc(doc(db, "users", profile.uid), { 
                      ngoCertificateUrl: url,
                      status: "pending_verification" 
                    }, { merge: true });
                  }

                } catch (err: any) {
                  console.error(err);
                  alert("Upload Failed: " + err.message + "\n\nIf using Cloudinary, ensure your 'resqai_unsigned' preset is set to 'Unsigned' in settings.");
                } finally {
                  setUploadingCert(false);
                }
              }} />
            </label>
            {uploadingCert && (
              <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                 <div style={{ width: `${uploadProgress}%`, height: "100%", background: "#14b8c4", transition: "width 0.3s ease" }} />
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: profile.status === "verified" ? "#22c55e" : profile.status === "rejected" ? "#ef4444" : "#f59e0b" }} />
              <span style={{ fontWeight: 700, color: profile.status === "verified" ? "#22c55e" : profile.status === "rejected" ? "#ef4444" : "#f59e0b" }}>
                {profile.status === "verified" ? "VERIFIED ✅" : profile.status === "rejected" ? "REJECTED ❌" : "PENDING ⏳"}
              </span>
            </div>
            {profile.status === "rejected" && profile.adminNote && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 13, color: "#fca5a5" }}>
                <strong>Note from Admin:</strong><br/>
                {profile.adminNote}
              </div>
            )}
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
