"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { uploadFile } from "@/lib/storage";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";

// ─── Default Avatar Library ───────────────────────────────────────
const AVATAR_LIBRARY = [
  // Male
  { id: "m1", url: "", emoji: "👨", label: "Male 1", category: "male" },
  { id: "m2", url: "", emoji: "👨‍⚕️", label: "Doctor M", category: "male" },
  { id: "m3", url: "", emoji: "👨‍🔧", label: "Engineer M", category: "male" },
  { id: "m4", url: "", emoji: "👨‍🚒", label: "Firefighter", category: "male" },
  { id: "m5", url: "", emoji: "👨‍🏫", label: "Teacher M", category: "male" },
  { id: "m6", url: "", emoji: "🧑‍💼", label: "Prof M", category: "male" },
  // Female
  { id: "f1", url: "", emoji: "👩", label: "Female 1", category: "female" },
  { id: "f2", url: "", emoji: "👩‍⚕️", label: "Doctor F", category: "female" },
  { id: "f3", url: "", emoji: "👩‍🔬", label: "Scientist F", category: "female" },
  { id: "f4", url: "", emoji: "👩‍🏫", label: "Teacher F", category: "female" },
  { id: "f5", url: "", emoji: "👩‍💻", label: "Dev F", category: "female" },
  { id: "f6", url: "", emoji: "👩‍🎨", label: "Artist F", category: "female" },
  // Neutral / Cartoon
  { id: "n1", url: "", emoji: "🧑", label: "Neutral", category: "neutral" },
  { id: "n2", url: "", emoji: "🧑‍🚀", label: "Astronaut", category: "neutral" },
  { id: "n3", url: "", emoji: "🦸", label: "Hero", category: "neutral" },
  { id: "n4", url: "", emoji: "🧙", label: "Wizard", category: "neutral" },
  { id: "n5", url: "", emoji: "🥷", label: "Ninja", category: "neutral" },
  { id: "n6", url: "", emoji: "🧑‍🎤", label: "Rockstar", category: "neutral" },
];

type Tab = "avatars" | "upload" | "google" | "drive";

interface ProfileImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentAvatarUrl?: string;
  googlePhotoUrl?: string | null;
  onSaved: (url: string, type: string, avatarId?: string) => void;
}

export default function ProfileImageModal({ isOpen, onClose, userId, currentAvatarUrl, googlePhotoUrl, onSaved }: ProfileImageModalProps) {
  const [tab, setTab] = useState<Tab>("avatars");
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadFile_, setUploadFile_] = useState<File | null>(null);
  const [driveLink, setDriveLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [avatarFilter, setAvatarFilter] = useState<"all" | "male" | "female" | "neutral">("all");

  // Crop state
  const [showCropper, setShowCropper] = useState(false);
  const [cropImg, setCropImg] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropScale, setCropScale] = useState(1);

  if (!isOpen) return null;

  const filteredAvatars = avatarFilter === "all" ? AVATAR_LIBRARY : AVATAR_LIBRARY.filter(a => a.category === avatarFilter);

  // ─── File validation & preview ──────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPG, PNG, or WebP images are allowed.");
      return;
    }
    // Validate size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB. Please resize or pick a smaller file.");
      return;
    }

    setUploadFile_(file);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCropImg(dataUrl);
      setShowCropper(true);
      setPreviewUrl(null);
    };
    reader.readAsDataURL(file);
  };

  // Simple crop: renders the selected image into a 200x200 canvas
  const applyCrop = () => {
    if (!cropImg) return;
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Center-crop: take the smallest dimension and crop to square from center
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);
      const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setPreviewUrl(croppedDataUrl);
      setShowCropper(false);
    };
    img.src = cropImg;
  };

  // ─── Google Drive link converter ────────────────────────────────
  const convertDriveLink = (link: string): string | null => {
    // Format: https://drive.google.com/file/d/FILE_ID/view
    const match = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    // Or already a direct link
    if (link.startsWith("http") && (link.includes(".jpg") || link.includes(".png") || link.includes("googleusercontent"))) {
      return link;
    }
    return null;
  };

  // ─── Save handler ───────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      let finalUrl = "";
      let imageType: string = tab;
      let avatarId: string | undefined;

      if (tab === "avatars") {
        if (!selectedAvatarId) throw new Error("Please select an avatar.");
        const av = AVATAR_LIBRARY.find(a => a.id === selectedAvatarId);
        finalUrl = av?.emoji || "👤";
        imageType = "avatar";
        avatarId = selectedAvatarId;

      } else if (tab === "upload") {
        if (!previewUrl && !uploadFile_) throw new Error("Please upload an image first.");
        // If we have a cropped preview, convert back to blob and upload
        if (previewUrl) {
          const resp = await fetch(previewUrl);
          const blob = await resp.blob();
          const file = new File([blob], `profile_${userId}.jpg`, { type: "image/jpeg" });
          const path = `avatars/${userId}/${Date.now()}.jpg`;
          finalUrl = await uploadFile(file, path);
        }
        imageType = "upload";

      } else if (tab === "google") {
        if (!googlePhotoUrl) throw new Error("No Google profile photo available.");
        finalUrl = googlePhotoUrl;
        imageType = "google";

      } else if (tab === "drive") {
        const converted = convertDriveLink(driveLink);
        if (!converted) throw new Error("Invalid Google Drive link. Use the share link format.");
        finalUrl = converted;
        imageType = "drive";
      }

      // Save to Firestore
      await updateDoc(doc(db, "users", userId), {
        avatarUrl: finalUrl,
        profileImageType: imageType,
        ...(avatarId ? { avatarId } : {}),
      });

      onSaved(finalUrl, imageType, avatarId);
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to save profile image.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Tab styles ─────────────────────────────────────────────────
  const tabStyle = (t: Tab) => ({
    padding: "10px 16px",
    borderRadius: 10,
    border: "none",
    background: tab === t ? "rgba(20,184,196,0.15)" : "rgba(255,255,255,0.04)",
    color: tab === t ? "#14b8c4" : "#94a3b8",
    fontWeight: 600 as const,
    fontSize: 13,
    cursor: "pointer" as const,
    transition: "all 0.2s",
    flex: 1,
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "min(560px, 95vw)", maxHeight: "90vh", overflowY: "auto",
        background: "#0d1f24", borderRadius: 20,
        border: "1px solid rgba(20,184,196,0.2)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#f0f9fa" }}>Edit Profile Image</h2>
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Choose how you'd like to appear</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 24, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        {/* Current Preview */}
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{
            width: 96, height: 96, borderRadius: "50%", margin: "0 auto",
            background: "linear-gradient(135deg,#14b8c4,#f59e0b)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 44, overflow: "hidden",
            border: "3px solid rgba(20,184,196,0.4)",
            boxShadow: "0 0 24px rgba(20,184,196,0.2)",
          }}>
            {previewUrl && previewUrl.startsWith("http") || previewUrl && previewUrl.startsWith("data:")
              ? <img src={previewUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : previewUrl
                ? <span style={{ fontSize: 44 }}>{previewUrl}</span>
                : currentAvatarUrl && currentAvatarUrl.startsWith("http")
                  ? <img src={currentAvatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : currentAvatarUrl && currentAvatarUrl.length > 2
                    ? <img src={currentAvatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span>{currentAvatarUrl || "👤"}</span>
            }
          </div>
          <p style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>Live preview</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, padding: "0 20px 16px" }}>
          <button style={tabStyle("avatars")} onClick={() => setTab("avatars")}>🎭 Avatars</button>
          <button style={tabStyle("upload")} onClick={() => setTab("upload")}>📷 Upload</button>
          <button style={tabStyle("google")} onClick={() => setTab("google")}>G Google</button>
          <button style={tabStyle("drive")} onClick={() => setTab("drive")}>☁️ Drive</button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: "0 20px 20px", minHeight: 200 }}>

          {/* ── AVATARS TAB ──────────────────────────────────────── */}
          {tab === "avatars" && (
            <div>
              {/* Category filter */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {(["all", "male", "female", "neutral"] as const).map(f => (
                  <button key={f} onClick={() => setAvatarFilter(f)} style={{
                    padding: "6px 12px", borderRadius: 20, border: "none",
                    background: avatarFilter === f ? "rgba(20,184,196,0.2)" : "rgba(255,255,255,0.04)",
                    color: avatarFilter === f ? "#14b8c4" : "#94a3b8",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
                  }}>{f}</button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
                {filteredAvatars.map(av => (
                  <button key={av.id} onClick={() => { setSelectedAvatarId(av.id); setPreviewUrl(av.emoji); }}
                    style={{
                      width: "100%", aspectRatio: "1", borderRadius: 14,
                      border: selectedAvatarId === av.id ? "2px solid #14b8c4" : "1px solid rgba(255,255,255,0.08)",
                      background: selectedAvatarId === av.id ? "rgba(20,184,196,0.15)" : "rgba(255,255,255,0.03)",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", transition: "all 0.15s", gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 32 }}>{av.emoji}</span>
                    <span style={{ fontSize: 9, color: "#64748b" }}>{av.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── UPLOAD TAB ───────────────────────────────────────── */}
          {tab === "upload" && (
            <div>
              {showCropper ? (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "#14b8c4", marginBottom: 12, fontWeight: 600 }}>Auto-crop preview (center square)</p>
                  {cropImg && (
                    <div style={{ position: "relative", display: "inline-block", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(20,184,196,0.3)", marginBottom: 16 }}>
                      <img src={cropImg} style={{ maxWidth: 300, maxHeight: 300, display: "block" }} />
                      <div style={{ position: "absolute", inset: 0, border: "3px dashed rgba(20,184,196,0.5)", borderRadius: 12, pointerEvents: "none" }} />
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    <button onClick={applyCrop} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#14b8c4,#0f6b71)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                      ✂️ Crop & Apply
                    </button>
                    <button onClick={() => { setShowCropper(false); setCropImg(null); }} style={{ padding: "8px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "none", color: "#94a3b8", cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    padding: 30, borderRadius: 14, cursor: "pointer",
                    border: "2px dashed rgba(20,184,196,0.3)",
                    background: "rgba(20,184,196,0.05)",
                    transition: "background 0.2s",
                  }}>
                    <span style={{ fontSize: 40, marginBottom: 8 }}>📷</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#14b8c4" }}>Click to upload image</span>
                    <span style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>JPG, PNG, WebP — max 2MB</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} style={{ display: "none" }} />
                  </label>
                  {previewUrl && previewUrl.startsWith("data:") && (
                    <div style={{ textAlign: "center", marginTop: 16 }}>
                      <p style={{ fontSize: 12, color: "#22c55e", marginBottom: 8 }}>✓ Cropped & ready to save</p>
                      <img src={previewUrl} style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(20,184,196,0.4)" }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── GOOGLE TAB ───────────────────────────────────────── */}
          {tab === "google" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              {googlePhotoUrl ? (
                <>
                  <img src={googlePhotoUrl} style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(20,184,196,0.4)", marginBottom: 16 }} />
                  <p style={{ fontSize: 14, color: "#f0f9fa", marginBottom: 8 }}>Your Google account photo</p>
                  <button onClick={() => setPreviewUrl(googlePhotoUrl)} style={{
                    padding: "8px 20px", borderRadius: 10, border: "none",
                    background: previewUrl === googlePhotoUrl ? "rgba(34,197,94,0.15)" : "rgba(20,184,196,0.1)",
                    color: previewUrl === googlePhotoUrl ? "#22c55e" : "#14b8c4",
                    fontWeight: 600, cursor: "pointer",
                  }}>
                    {previewUrl === googlePhotoUrl ? "✓ Selected" : "Use this photo"}
                  </button>
                </>
              ) : (
                <div>
                  <span style={{ fontSize: 48, display: "block", marginBottom: 12 }}>🔗</span>
                  <p style={{ color: "#94a3b8", fontSize: 14 }}>No Google photo found.</p>
                  <p style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>Sign in with Google to use your Google profile picture.</p>
                </div>
              )}
            </div>
          )}

          {/* ── DRIVE TAB ────────────────────────────────────────── */}
          {tab === "drive" && (
            <div>
              <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12 }}>Paste a public Google Drive image link:</p>
              <input
                value={driveLink}
                onChange={e => {
                  setDriveLink(e.target.value);
                  const converted = convertDriveLink(e.target.value);
                  if (converted) setPreviewUrl(converted);
                }}
                placeholder="https://drive.google.com/file/d/..."
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.2)",
                  color: "#f0f9fa", fontSize: 14, outline: "none",
                }}
              />
              {driveLink && !convertDriveLink(driveLink) && (
                <p style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>Invalid link format. Use a Google Drive share URL.</p>
              )}
              {driveLink && convertDriveLink(driveLink) && (
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <img src={convertDriveLink(driveLink)!} style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(20,184,196,0.4)" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; setError("Image failed to load. Make sure the Drive file is public."); }} />
                  <p style={{ fontSize: 12, color: "#22c55e", marginTop: 8 }}>✓ Preview loaded</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ margin: "0 20px 16px", padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, fontSize: 13, color: "#fca5a5" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "none", color: "#94a3b8", fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg,#14b8c4,#0f6b71)",
            color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}>
            {saving ? "Saving..." : "💾 Save Image"}
          </button>
        </div>
      </div>
    </div>
  );
}
