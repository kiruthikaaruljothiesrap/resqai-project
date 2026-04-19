"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SplashPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + 2.5));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      router.push("/role-select");
    }
  }, [progress, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_50%_40%,_#0f6b71_0%,_#060d10_70%)] relative overflow-hidden">
      {/* Decorative rings - Animated */}
      <div className="absolute w-[300px] h-[300px] md:w-[600px] md:h-[600px] rounded-full border border-cyan-500/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping duration-[3000ms]" />
      <div className="absolute w-[200px] h-[200px] md:w-[400px] md:h-[400px] rounded-full border border-cyan-400/20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute w-[150px] h-[150px] md:w-[300px] md:h-[300px] rounded-full border border-cyan-300/30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      {/* Main Content */}
      <div className="relative z-10 text-center animate-in fade-in zoom-in-95 duration-1000">
        {/* Logo Container */}
        <div className="pulse-glow w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br from-cyan-400 to-amber-500 flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-cyan-500/20 ring-4 ring-white/10 overflow-hidden transform hover:scale-110 transition-transform">
          <img src="/logo.png" alt="ResQAI" className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-lg" />
        </div>

        <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-[#f0f9fa] mb-4">
          ResQ<span className="text-cyan-400">AI</span>
        </h1>
        
        <p className="text-xs md:text-lg text-[#94a3b8] font-bold uppercase tracking-[0.3em] mb-2 px-6">
          Intelligence for Social Good
        </p>
        
        <div className="h-px w-12 bg-white/10 mx-auto my-6" />

        <p className="text-sm text-slate-500 font-medium mb-16 italic opacity-80">
          Syncing with humanitarian nodes...
        </p>

        {/* Dynamic Progress Bar */}
        <div className="w-48 md:w-72 h-1.5 bg-white/5 rounded-full overflow-hidden mx-auto shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-amber-500 transition-all duration-100 ease-linear shadow-[0_0_15px_rgba(20,184,196,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-black text-cyan-400/60 uppercase tracking-widest leading-none">
            {progress < 100 ? `Synchronizing: ${Math.round(progress)}%` : 'Uplink Established'}
          </span>
        </div>
      </div>

      {/* Bottom Legal/Version - Mobile Optimized */}
      <div className="absolute bottom-10 left-0 right-0 px-6 text-center">
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-2">
          ResQAI Deployment Protocol 2026
        </p>
        <div className="flex justify-center gap-4 text-[9px] font-bold text-slate-700 uppercase tracking-widest">
          <span>v4.2.0-STABLE</span>
          <span className="opacity-30">|</span>
          <span>GLOBAL DIST</span>
        </div>
      </div>

      {/* Floating Particles/Glow - Desktop Only */}
      <div className="hidden md:block absolute top-[20%] left-[20%] w-2 h-2 bg-cyan-400 rounded-full blur-sm opacity-20 animate-bounce" />
      <div className="hidden md:block absolute top-[70%] right-[30%] w-3 h-3 bg-amber-500 rounded-full blur-sm opacity-10 animate-pulse" />
    </div>
  );
}
