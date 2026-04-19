"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { logIn, resetPassword, logInWithGoogle, logOut } from "@/lib/auth";
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

      if (profile.role !== role && role !== "admin") {
         throw new Error(`This account belongs to a ${profile.role}, not ${role}. Please go back and select the correct role.`);
      }

      if (profile.role === "ngo" && profile.status === "pending_verification") {
        await logOut();
        throw new Error("Your NGO account is still pending verification by the admin team.");
      }
      if (profile.role === "ngo" && profile.status === "rejected") {
        await logOut();
        throw new Error("Your NGO account was rejected due to invalid certificate details.");
      }

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

  const roleColor = role === "admin" ? "text-rose-500" : (role === "ngo" ? "text-amber-500" : "text-cyan-400");
  const roleBg = role === "admin" ? "from-rose-500 to-rose-700" : (role === "ngo" ? "from-amber-500 to-amber-700" : "from-cyan-500 to-cyan-700");

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_60%_60%,_#0f3a3e_0%,_#060d10_60%)]">
      <div className="glass-card w-full max-w-md p-8 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-white/5 rounded-[20px] mb-6 shadow-2xl ring-1 ring-white/10">
            <img src="/logo.png" alt="ResQAI" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-3xl font-black text-[#f0f9fa] tracking-tight">
            Welcome <span className="text-cyan-400">Back</span>
          </h1>
          <p className="text-sm text-[#94a3b8] font-bold mt-3 uppercase tracking-widest">
            Identity: <span className={`${roleColor}`}>{role}</span>
          </p>
        </div>

        {!forgotMode ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <InputField label="Identity (Email/Username)" type="text" value={email} onChange={setEmail} placeholder="you@example.com" />
            <div className="relative">
              <InputField label="Access Key (Password)" type={showPass ? "text" : "password"} value={password} onChange={setPassword} placeholder="••••••••" />
              <button 
                type="button" 
                onClick={() => setShowPass(!showPass)} 
                className="absolute right-4 top-10 text-slate-500 hover:text-cyan-400 transition-colors"
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-500 flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className={`w-full py-4 rounded-xl text-white font-black uppercase tracking-widest transition-all transform active:scale-[0.98] shadow-xl bg-gradient-to-r ${roleBg} shadow-black/40`}>
              {loading ? "Decrypting..." : "Establish Link →"}
            </button>

            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Auth Proxy</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button
              type="button"
              onClick={async () => {
                try {
                  const googleUser = await logInWithGoogle(role as "volunteer" | "ngo");
                  router.push(`/${role}/dashboard`);
                } catch (err: any) {
                  setError(err.message || "Google link failed.");
                }
              }}
              className="w-full py-4 px-6 bg-white/5 border border-white/10 rounded-xl text-[#f0f9fa] text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5" />
              Sign in with Google
            </button>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 text-[11px] font-black uppercase tracking-widest">
              <button type="button" onClick={() => setForgotMode(true)} className="text-[#14b8c4] hover:text-cyan-300 transition-colors">
                Lost Key?
              </button>
              <Link href={`/auth/signup?role=${role}`} className="text-[#14b8c4] hover:text-cyan-300 transition-colors">
                Create Identity
              </Link>
            </div>

            <div className="text-center pt-8 border-t border-white/5">
              <Link href="/role-select" className="text-slate-600 hover:text-slate-400 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                ← Return to Base
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-6">
            {resetSent ? (
              <div className="text-center py-8 space-y-4">
                <div className="text-5xl">📨</div>
                <p className="text-sm font-bold text-green-500 bg-green-500/10 p-4 rounded-xl border border-green-500/20 leading-relaxed uppercase tracking-tighter">
                  Reset frequency sent to <br/><span className="text-[#f0f9fa]">{email}</span>
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-[#94a3b8] font-medium text-center mb-6 leading-relaxed">
                  Enter your registered comms address to receive a recovery link.
                </p>
                <InputField label="Comms Address (Email)" type="email" value={email} onChange={setEmail} placeholder="you@network.com" />
                {error && <p className="text-xs font-bold text-red-500">⚠️ {error}</p>}
                <button type="submit" className="w-full py-4 bg-cyan-500 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-cyan-500/10 active:scale-95 transition-all">Recover Account</button>
              </>
            )}
            <button type="button" onClick={() => { setForgotMode(false); setResetSent(false); setError(""); }}
              className="w-full text-center text-[#14b8c4] text-xs font-black uppercase tracking-widest pt-4">
              ← Back to Decryption
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-cyan-400 font-black animate-pulse uppercase tracking-[0.2em]">Establishing link...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}

function InputField({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full px-5 py-3.5 bg-[#060d10] border border-white/10 rounded-xl text-white text-sm font-medium outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-slate-800"
      />
    </div>
  );
}
