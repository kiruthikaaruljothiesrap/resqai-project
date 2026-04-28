"use client";
import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { logIn, resetPassword, logInWithGoogle, getUserProfile, logOut } from "@/lib/auth";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Suspense } from "react";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "volunteer";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await logIn(email, password);
      const profileSnap = await getDoc(doc(db, "users", user.uid));
      const profile = profileSnap.data();
      
      if (!profile) throw new Error("Profile data not found.");

      // Check role constraints
      if (profile.role !== role && role !== "admin") {
         throw new Error(`This account belongs to a ${profile.role}, not ${role}. Please go back and select the correct role.`);
      }

      // Proceed to allow login even if pending/rejected, the NGO dashboard/profile will handle the restriction UI
      if (profile.role === "ngo" && (profile.status === "pending_verification" || profile.status === "rejected")) {
        console.warn("NGO login allowed but status is restricted:", profile.status);
      }


      // Redirect depending on role
      if (profile.role === "ngo") router.push("/ngo/dashboard");
      else if (profile.role === "admin") router.push("/admin/dashboard");
      else router.push("/volunteer/dashboard");

    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: "radial-gradient(ellipse at 60% 60%, #0f3a3e 0%, #060d10 60%)",
    }}>
      <div className="glass-card fade-up" style={{ width: "100%", maxWidth: 440, padding: 40 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="ResQAI" style={{ width: 64, height: 64, borderRadius: 14, objectFit: "contain", marginBottom: 10 }} />
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>
            <span className="gradient-text">Welcome Back</span>
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 8 }}>
            Signing in as <span style={{ color: role === "admin" ? "#e11d48" : (role === "ngo" ? "#f59e0b" : "#14b8c4"), textTransform: "capitalize", fontWeight: 600 }}>{role}</span>
          </p>
        </div>

        {!forgotMode ? (
          <form onSubmit={handleLogin}>
            <InputField label="Email / Username / Phone No" type="text" value={email} onChange={setEmail} placeholder="email, @username, or +91 phone" />
            <div style={{ position: "relative" }}>
              <InputField label="Password" type={showPass ? "text" : "password"} value={password} onChange={setPassword} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{
                position: "absolute", right: 14, top: 38, background: "none", border: "none",
                color: "#64748b", cursor: "pointer", fontSize: 14,
              }}>{showPass ? "🙈" : "👁️"}</button>
            </div>

            {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>⚠️ {error}</p>}

            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>

            <div style={{ display: "flex", alignItems: "center", margin: "20px 0", gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              <span style={{ fontSize: 12, color: "#64748b" }}>OR</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>

            <button
              type="button"
              onClick={async () => {
                try {
                  const user = await logInWithGoogle(role as "volunteer" | "ngo");
                  const profile = await getUserProfile(user.uid);
                  router.push(`/${profile?.role || role}/dashboard`);
                } catch (err: any) {
                  setError(err.message || "Google sign-in failed.");
                }
              }}
              style={{
                width: "100%", padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)", color: "#f0f9fa", fontWeight: 600, fontSize: 14,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10
              }}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 18 }} />
              Sign in with Google
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, fontSize: 13 }}>
              <button type="button" onClick={() => setForgotMode(true)} style={{ background: "none", border: "none", color: "#14b8c4", cursor: "pointer" }}>
                Forgot password?
              </button>
              <Link href={`/auth/signup?role=${role}`} style={{ color: "#14b8c4" }}>
                Create account
              </Link>
            </div>

            <div style={{ textAlign: "center", marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <Link href="/role-select" style={{ color: "#475569", fontSize: 13 }}>← Switch role</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            {resetSent ? (
              <div style={{ textAlign: "center", color: "#22c55e", padding: "20px 0" }}>
                ✅ Reset email sent to <strong>{email}</strong>. Check your inbox.
              </div>
            ) : (
              <>
                <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>
                  Enter your email and we'll send a password reset link.
                </p>
                <InputField label="Email Address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                {error && <p style={{ color: "#f87171", fontSize: 13 }}>⚠️ {error}</p>}
                <button type="submit" style={btnStyle}>Send Reset Link</button>
              </>
            )}
            <button type="button" onClick={() => { setForgotMode(false); setResetSent(false); setError(""); }}
              style={{ background: "none", border: "none", color: "#14b8c4", cursor: "pointer", marginTop: 12, fontSize: 13 }}>
              ← Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ color: "#fff", padding: 24 }}>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}

function InputField({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        style={{
          width: "100%",
          padding: "11px 14px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(20,184,196,0.2)",
          borderRadius: 10,
          color: "#f0f9fa",
          fontSize: 15,
          outline: "none",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#14b8c4")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(20,184,196,0.2)")}
      />
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg, #14b8c4, #0f6b71)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 16,
  cursor: "pointer",
  marginTop: 8,
  transition: "opacity 0.2s",
};
