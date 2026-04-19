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
        body: JSON.stringify({ action: "send", phone: form.phoneNo }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        if (data.demo_otp) setDemoOtp(data.demo_otp);
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", phone: form.phoneNo, otp: otpValue }),
      });
      const data = await res.json();
      if (!data.success) { setOtpError(data.error || "Invalid OTP."); return; }

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
      <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_40%_30%,_#0f3a3e_0%,_#060d10_60%)]">
        <div className="glass-card w-full max-w-md p-10 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="text-6xl mb-8 drop-shadow-2xl">📱</div>
          <h2 className="text-2xl font-black text-[#f0f9fa] mb-2 tracking-tight">Identity Verification</h2>
          <p className="text-sm text-[#94a3b8] font-medium mb-10 leading-relaxed uppercase tracking-widest text-[10px]">
            Transmission sent to <strong className="text-cyan-400">{form.phoneNo}</strong>
          </p>

          {demoOtp && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-8 text-xs font-bold text-amber-500 uppercase tracking-widest">
              🧪 DEV_MODE_OTP: <strong>{demoOtp}</strong>
            </div>
          )}

          <div className="flex justify-center mb-8">
            <input
              value={otpValue}
              onChange={e => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-48 bg-white/5 border border-white/10 rounded-2xl text-center text-3xl font-black tracking-[0.4em] py-4 text-cyan-400 focus:border-cyan-400/50 outline-none transition-all"
            />
          </div>

          {otpError && <p className="text-xs font-bold text-red-500 mb-6 uppercase tracking-tight">⚠️ {otpError}</p>}

          <button onClick={verifyOtpAndSignup} disabled={otpLoading || otpValue.length < 6 || loading} className="w-full py-4 bg-cyan-500 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-cyan-500/20 active:scale-[0.98] transition-all">
            {otpLoading || loading ? "Verifying..." : "Confirm Identity →"}
          </button>

          <button onClick={sendOtp} disabled={otpLoading} className="w-full text-xs font-black text-cyan-400 uppercase tracking-widest mt-8 hover:text-white transition-colors">
            {otpLoading ? "Retransmitting..." : "🔄 Resend Transmission"}
          </button>
          <button onClick={() => { setStep("form"); setOtpValue(""); setOtpError(""); }} className="w-full text-xs font-black text-slate-600 uppercase tracking-widest mt-4">
            ← Abort To Form
          </button>
        </div>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_40%_30%,_#0f3a3e_0%,_#060d10_60%)]">
        <div className="glass-card w-full max-w-md p-10 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="text-7xl mb-8">📨</div>
          <h2 className="text-2xl font-black text-[#f0f9fa] mb-4 tracking-tight uppercase">Confirm Link</h2>
          <p className="text-sm text-[#94a3b8] font-medium leading-relaxed mb-8">
            A secure verification sequence has been dispatched to <br/><strong className="text-cyan-400 break-all">{form.email}</strong>.
            Visit your inbox to complete the uplink.
          </p>
          <Link href={`/auth/login?role=${role}`} className="w-full py-4 bg-cyan-500 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-cyan-500/20 inline-block text-center transition-all active:scale-[0.98]">
            Proceed to Login →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_40%_30%,_#0f3a3e_0%,_#060d10_60%)] py-12 md:py-20">
      <div className="glass-card w-full max-w-lg p-8 md:p-12 animate-in fade-in slide-in-from-bottom-6 duration-500">
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-white/5 rounded-2xl mb-6 shadow-2xl ring-1 ring-white/10">
            <img src="/logo.png" alt="ResQAI" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-3xl font-black text-[#f0f9fa] tracking-tight">
            Create <span className="text-cyan-400">Identity</span>
          </h1>
          <p className="text-[10px] text-[#94a3b8] font-black uppercase tracking-[0.2em] mt-3">
            Deploying as <span className="text-cyan-400">{role}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="First Name" value={form.firstName} onChange={(v) => update("firstName", v)} placeholder="Jane" />
            <Field label="Last Name" value={form.lastName} onChange={(v) => update("lastName", v)} placeholder="Doe" />
          </div>

          <Field label="Access Alias (Username)" value={form.username} onChange={(v) => update("username", v)} placeholder="@janedoe" />
          <Field label="Comms Address (Email)" type="email" value={form.email} onChange={(v) => update("email", v)} placeholder="jane@network.com" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Passkey" type="password" value={form.password} onChange={(v) => update("password", v)} placeholder="Min. 8 keys" />
            <Field label="Verify Passkey" type="password" value={form.confirm} onChange={(v) => update("confirm", v)} placeholder="Re-enter keys" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] px-1">Primary Phone *</label>
              <input
                type="tel"
                value={form.phoneNo}
                onChange={e => { update("phoneNo", e.target.value); if (!form.whatsappNo) update("whatsappNo", e.target.value); }}
                placeholder="+91 00000 00000"
                required
                className="w-full px-5 py-3.5 bg-white/[0.03] border border-white/10 rounded-xl text-[#f0f9fa] text-sm font-medium outline-none focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20 transition-all placeholder:text-slate-700"
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] px-1">WhatsApp Uplink</label>
              <input
                type="tel"
                value={form.whatsappNo}
                onChange={e => update("whatsappNo", e.target.value)}
                placeholder="Optional"
                className="w-full px-5 py-3.5 bg-white/[0.03] border border-white/10 rounded-xl text-[#f0f9fa] text-sm font-medium outline-none focus:border-green-400/40 focus:ring-1 focus:ring-green-400/20 transition-all placeholder:text-slate-700"
              />
            </div>
          </div>

          {role === "volunteer" && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] px-1">Specialization</label>
              <select
                value={form.volunteerType}
                onChange={(e) => update("volunteerType", e.target.value)}
                className="w-full px-5 py-4 bg-neutral-900 border border-white/10 rounded-xl text-[#f0f9fa] text-sm font-bold appearance-none cursor-pointer outline-none focus:ring-1 focus:ring-cyan-400/20 transition-all"
              >
                <option value="" className="bg-neutral-900">Select Specialty...</option>
                {VOLUNTEER_TYPES.map((t) => (
                  <option key={t.id} value={t.id} className="bg-neutral-900">{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
          )}

          {role === "ngo" && (
            <div className="p-6 bg-amber-500/5 ring-1 ring-amber-500/20 rounded-2xl space-y-6">
              <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] text-center border-b border-amber-500/10 pb-4">NGO Credentials Required</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest px-1">Reg Index *</label>
                  <input type="text" value={form.ngoRegistrationNo} onChange={(e) => update("ngoRegistrationNo", e.target.value)} placeholder="NGO/XX/000" className="w-full px-4 py-3 bg-black/40 border border-amber-500/20 rounded-xl text-white text-sm font-bold outline-none focus:border-amber-500 transition-all" required={role === "ngo"} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest px-1">Epoch (Year) *</label>
                  <input type="number" min="1900" max="2026" value={form.ngoEstablishedYear} onChange={(e) => update("ngoEstablishedYear", e.target.value)} placeholder="2015" className="w-full px-4 py-3 bg-black/40 border border-amber-500/20 rounded-xl text-white text-sm font-bold outline-none focus:border-amber-500 transition-all" required={role === "ngo"} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest px-1">Certificate Matrix *</label>
                <div className="relative">
                  <input type="file" accept="image/*,application/pdf" required={role === "ngo"} disabled={uploadingCert} className="w-full px-4 py-10 bg-black/60 border-2 border-dashed border-amber-500/20 rounded-2xl text-xs font-black text-slate-500 file:hidden cursor-pointer" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadingCert(true);
                      try {
                        const { uploadFile } = await import("@/lib/storage");
                        const url = await uploadFile(file, `certificates/${Date.now()}_${file.name}`);
                        update("ngoCertificateUrl", url);
                      } catch (err) {
                        alert("Upload protocols failed.");
                      } finally {
                        setUploadingCert(false);
                      }
                    }
                  }} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40">
                    <span className="text-3xl mb-2">📜</span>
                    <span className="text-[9px] font-black uppercase tracking-widest italic">Upload PDF/Image</span>
                  </div>
                </div>
                {uploadingCert ? (
                  <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest animate-pulse">Establishing data link...</p>
                ) : form.ngoCertificateUrl ? (
                  <p className="text-[9px] font-black text-green-500 uppercase tracking-widest">Uplink verified ✓</p>
                ) : (
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-center italic">Details verified by Guardian AI</p>
                )}
              </div>
            </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 group cursor-pointer transition-all hover:bg-white/[0.08]">
            <input
              type="checkbox"
              id="captcha"
              checked={captchaDone}
              onChange={(e) => setCaptchaDone(e.target.checked)}
              className="w-5 h-5 rounded border-cyan-400/30 bg-black/40 text-cyan-500 focus:ring-cyan-500/20 cursor-pointer"
            />
            <label htmlFor="captcha" className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] cursor-pointer group-hover:text-slate-200">
              Identity Authenticated 🤖
            </label>
            <div className="ml-auto text-center opacity-30 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all">
              <div className="text-2xl">🛡️</div>
            </div>
          </div>

          {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-black text-red-500 flex items-center gap-2 uppercase tracking-tighter transition-all animate-bounce"><span>⚠️</span> {error}</div>}

          <button type="submit" disabled={loading} className="w-full py-4.5 bg-gradient-to-r from-cyan-500 to-cyan-700 text-white rounded-xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-cyan-500/20 active:scale-[0.98] transition-all disabled:grayscale disabled:opacity-50">
            {loading ? "Synthesizing Identity..." : "Finalize Infrastructure →"}
          </button>

          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Social Auth Proxy</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                const user = await logInWithGoogle(role as "volunteer" | "ngo");
                router.push(`/${role}/dashboard`);
              } catch (err: any) {
                setError(err.message || "Uplink protocols failed.");
              }
            }}
            className="w-full py-4 px-6 bg-white/5 border border-white/10 rounded-xl text-[#f0f9fa] text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5" />
            Establish Google Link
          </button>

          <p className="text-center pt-8 text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em]">
            Identity exists?{" "}
            <Link href={`/auth/login?role=${role}`} className="text-cyan-400 font-black hover:text-cyan-300 transition-all ml-1">Initiate Link</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-cyan-400 font-black animate-pulse uppercase tracking-[0.2em]">Deploying interface...</div>}>
      <SignupPageContent />
    </Suspense>
  );
}

function Field({
  label, type = "text", value, onChange, placeholder
}: { label: string; type?: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="space-y-1.5 flex-1">
      <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] px-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full px-5 py-3.5 bg-white/[0.03] border border-white/10 rounded-xl text-[#f0f9fa] text-sm font-medium outline-none focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20 transition-all placeholder:text-slate-700"
      />
    </div>
  );
}
