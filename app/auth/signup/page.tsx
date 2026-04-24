"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUp, logInWithGoogle } from "@/lib/auth";
import { VOLUNTEER_TYPES } from "@/types";

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = (searchParams.get("role") || "volunteer") as "volunteer" | "ngo";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
    volunteerType: "",
    phoneNo: "",
    whatsappNo: "",
    ngoRegistrationNo: "",
    ngoEstablishedYear: "",
    ngoCertificateUrl: "",
  });
  const [error, setError] = useState("");
  const [uploadingCert, setUploadingCert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "otp" | "verify">("form");
  const [captchaDone, setCaptchaDone] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"sms" | "whatsapp">("sms");
  const [otpValue, setOtpValue] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [demoOtp, setDemoOtp] = useState("");

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!captchaDone) { setError("Please complete the CAPTCHA verification."); return; }
    if (!form.phoneNo || form.phoneNo.length < 10) { setError("Please enter a valid phone number."); return; }
    // Move to OTP verification
    setStep("otp");
    sendOtp();
  };

  const sendOtp = async () => {
    setOtpLoading(true);
    setOtpError("");
    try {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phoneNo, deliveryMethod }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        if (data.demo_otp) setDemoOtp(data.demo_otp); // show in dev
      } else {
        setOtpError(data.error || "Failed to send OTP.");
      }
    } catch { setOtpError("Network error sending OTP."); }
    finally { setOtpLoading(false); }
  };

  const verifyOtpAndSignup = async () => {
    setOtpLoading(true);
    setOtpError("");
    try {
      const res = await fetch("/api/otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phoneNo, otp: otpValue }),
      });
      const data = await res.json();
      if (!data.success) { setOtpError(data.error || "Invalid OTP."); return; }

      // OTP verified! Now create the account
      setLoading(true);
      await signUp(
        form.email, 
        form.password, 
        form.firstName, 
        form.lastName, 
        form.username, 
        role, 
        form.phoneNo, 
        form.whatsappNo || form.phoneNo,
        form.volunteerType,
        form.ngoRegistrationNo,
        form.ngoEstablishedYear,
        form.ngoCertificateUrl
      );
      setStep("verify");
    } catch (err: any) {
      setOtpError(err.message || "Signup failed.");
    } finally {
      setOtpLoading(false);
      setLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <div style={pageStyle}>
        <div className="glass-card fade-up" style={{ maxWidth: 420, width: "100%", padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>{deliveryMethod === "whatsapp" ? "💬" : "📱"}</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Verify Phone Number</h2>
          <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 24 }}>
            An OTP has been sent via {deliveryMethod === "whatsapp" ? "WhatsApp" : "SMS"} to <strong style={{ color: "#14b8c4" }}>{form.phoneNo}</strong>
          </p>

          {demoOtp && (
            <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#f59e0b" }}>
              🧪 Dev Mode OTP: <strong>{demoOtp}</strong>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
            <input
              value={otpValue}
              onChange={e => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              style={{ ...inputStyle, textAlign: "center", fontSize: 20, letterSpacing: 8, fontWeight: 700, width: 200 }}
            />
          </div>

          {otpError && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>⚠️ {otpError}</p>}

          <button onClick={verifyOtpAndSignup} disabled={otpLoading || otpValue.length < 6 || loading} style={btnStyle}>
            {otpLoading || loading ? "Verifying..." : "✅ Verify & Create Account"}
          </button>

          <button onClick={sendOtp} disabled={otpLoading} style={{ background: "none", border: "none", color: "#14b8c4", cursor: "pointer", fontSize: 13, marginTop: 12, display: "block", width: "100%" }}>
            {otpLoading ? "Sending..." : "🔄 Resend OTP"}
          </button>
          <button onClick={() => { setStep("form"); setOtpValue(""); setOtpError(""); }} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, marginTop: 8, display: "block", width: "100%" }}>
            ← Back to form
          </button>
        </div>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div style={pageStyle}>
        <div className="glass-card fade-up" style={{ maxWidth: 420, width: "100%", padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📬</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Verify your email</h2>
          <p style={{ color: "#94a3b8", marginBottom: 24 }}>
            A verification link has been sent to <strong style={{ color: "#14b8c4" }}>{form.email}</strong>.
            Please check your inbox and click the link to activate your account.
          </p>
          <Link href={`/auth/login?role=${role}`} style={{ ...btnStyle, display: "inline-block", textDecoration: "none", textAlign: "center", padding: "12px 32px" }}>
            Go to Login →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div className="glass-card fade-up" style={{ width: "100%", maxWidth: 520, padding: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src="/logo.png" alt="ResQAI" style={{ width: 60, height: 60, borderRadius: 14, objectFit: "contain", marginBottom: 10 }} />
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>
            <span className="gradient-text">Create Account</span>
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>
            Joining as <span style={{ color: "#14b8c4", textTransform: "capitalize" }}>{role}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 0 }}>
            <Field label="First Name" value={form.firstName} onChange={(v) => update("firstName", v)} placeholder="Jane" />
            <Field label="Last Name" value={form.lastName} onChange={(v) => update("lastName", v)} placeholder="Doe" />
          </div>

          <Field label="Username" value={form.username} onChange={(v) => update("username", v)} placeholder="@janedoe" />
          <Field label="Email Address" type="email" value={form.email} onChange={(v) => update("email", v)} placeholder="jane@example.com" />
          <Field label="Password" type="password" value={form.password} onChange={(v) => update("password", v)} placeholder="Min. 8 characters" />
          <Field label="Confirm Password" type="password" value={form.confirm} onChange={(v) => update("confirm", v)} placeholder="Re-enter password" />

          {/* Phone fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Phone Number *</label>
              <input
                type="tel"
                value={form.phoneNo}
                onChange={e => { update("phoneNo", e.target.value); if (!form.whatsappNo) update("whatsappNo", e.target.value); }}
                placeholder="+91 98765 43210"
                required
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#14b8c4")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(20,184,196,0.2)")}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>WhatsApp No (optional)</label>
              <input
                type="tel"
                value={form.whatsappNo}
                onChange={e => update("whatsappNo", e.target.value)}
                placeholder="Same as phone if same"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#25D366")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(20,184,196,0.2)")}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>How should we send your verification code? *</label>
            <div style={{ display: "flex", gap: 10 }}>
              <div 
                onClick={() => setDeliveryMethod("sms")}
                style={{ flex: 1, padding: "10px", textAlign: "center", borderRadius: 10, cursor: "pointer", border: `1px solid ${deliveryMethod === "sms" ? "#14b8c4" : "rgba(255,255,255,0.1)"}`, background: deliveryMethod === "sms" ? "rgba(20,184,196,0.1)" : "rgba(255,255,255,0.05)" }}
              >
                📱 SMS
              </div>
              <div 
                onClick={() => setDeliveryMethod("whatsapp")}
                style={{ flex: 1, padding: "10px", textAlign: "center", borderRadius: 10, cursor: "pointer", border: `1px solid ${deliveryMethod === "whatsapp" ? "#25D366" : "rgba(255,255,255,0.1)"}`, background: deliveryMethod === "whatsapp" ? "rgba(37,211,102,0.1)" : "rgba(255,255,255,0.05)" }}
              >
                💬 WhatsApp
              </div>
            </div>
          </div>

          {role === "volunteer" && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Volunteer Type</label>
              <select
                value={form.volunteerType}
                onChange={(e) => update("volunteerType", e.target.value)}
                style={selectStyle}
              >
                <option value="">Select your specialty...</option>
                {VOLUNTEER_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
          )}

          {role === "ngo" && (
            <div style={{ padding: "16px", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, color: "#f59e0b", marginBottom: 12, fontWeight: 700 }}>NGO Registration Details (Required)</h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Registration No. *</label>
                  <input type="text" value={form.ngoRegistrationNo} onChange={(e) => update("ngoRegistrationNo", e.target.value)} placeholder="e.g. NGO/1234/2020" style={inputStyle} required={role === "ngo"} />
                </div>
                <div>
                  <label style={labelStyle}>Year Est. *</label>
                  <input type="number" min="1900" max="2026" value={form.ngoEstablishedYear} onChange={(e) => update("ngoEstablishedYear", e.target.value)} placeholder="e.g. 2015" style={inputStyle} required={role === "ngo"} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Official Certificate Upload *</label>
                <input type="file" accept="image/*,application/pdf" required={role === "ngo"} disabled={uploadingCert} style={{ ...inputStyle, padding: "8px 12px" }} onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadingCert(true);
                    try {
                      const { uploadFile } = await import("@/lib/storage");
                      const url = await uploadFile(file, `certificates/${Date.now()}_${file.name}`);
                      update("ngoCertificateUrl", url);
                    } catch (err) {
                      alert("Certificate upload failed. Check rules & connection.");
                    } finally {
                      setUploadingCert(false);
                    }
                  }
                }} />
                {uploadingCert ? (
                  <p style={{ fontSize: 11, color: "#14b8c4", marginTop: 4 }}>Uploading certificate...</p>
                ) : form.ngoCertificateUrl ? (
                  <p style={{ fontSize: 11, color: "#22c55e", marginTop: 4 }}>Certificate uploaded successfully ✓</p>
                ) : (
                  <p style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Must match Registration No. Will be verified by AI.</p>
                )}
              </div>
            </div>
          )}

          {/* Fake CAPTCHA */}
          <div style={{
            border: "1px solid rgba(20,184,196,0.2)",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(255,255,255,0.03)",
          }}>
            <input
              type="checkbox"
              id="captcha"
              checked={captchaDone}
              onChange={(e) => setCaptchaDone(e.target.checked)}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <label htmlFor="captcha" style={{ color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>
              I'm not a robot 🤖
            </label>
            <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 24 }}>🔒</div>
              <span style={{ fontSize: 9, color: "#475569" }}>reCAPTCHA</span>
            </div>
          </div>

          {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>⚠️ {error}</p>}

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? "Creating account…" : `Create Account (${deliveryMethod === "sms" ? "SMS" : "WhatsApp"} Auth) →`}
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
                router.push(`/${role}/dashboard`);
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
            Sign up with Google
          </button>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#94a3b8" }}>
            Already have an account?{" "}
            <Link href={`/auth/login?role=${role}`} style={{ color: "#14b8c4" }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ color: "#fff", padding: 24 }}>Loading...</div>}>
      <SignupPageContent />
    </Suspense>
  );
}

function Field({
  label, type = "text", value, onChange, placeholder
}: { label: string; type?: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        style={inputStyle}
        onFocus={(e) => (e.target.style.borderColor = "#14b8c4")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(20,184,196,0.2)")}
      />
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "radial-gradient(ellipse at 40% 30%, #0f3a3e 0%, #060d10 60%)",
};

const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 };

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(20,184,196,0.2)",
  borderRadius: 10,
  color: "#f0f9fa",
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.2s",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

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
  transition: "opacity 0.2s",
};

