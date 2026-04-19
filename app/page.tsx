"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SplashPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + 2));
    }, 60);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      router.push("/role-select");
    }
  }, [progress, router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at 50% 40%, var(--teal-900) 0%, var(--bg-dark) 80%)",
        position: "relative",
        overflow: "hidden",
        padding: "var(--content-padding)",
      }}
    >
      {/* Decorative rings - Fluid */}
      <div style={{
        position: "absolute",
        width: "min(600px, 120vw)",
        height: "min(600px, 120vw)",
        borderRadius: "50%",
        border: "1px solid rgba(20,184,196,0.05)",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        width: "min(400px, 80vw)",
        height: "min(400px, 80vw)",
        borderRadius: "50%",
        border: "1px solid rgba(20,184,196,0.08)",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
      }} />

      {/* Logo area */}
      <div className="fade-up" style={{ textAlign: "center", zIndex: 1, width: "100%", maxWidth: "400px" }}>
        {/* Logo Icon - Fluid */}
        <div className="pulse-glow" style={{
          width: "clamp(80px, 15vw, 120px)",
          height: "clamp(80px, 15vw, 120px)",
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--teal-500), var(--amber-500))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 2rem",
          boxShadow: "0 0 40px rgba(20,184,196,0.3)",
        }}>
          <img src="/logo.png" alt="ResQAI" style={{ width: "60%", height: "60%", objectFit: "contain" }} />
        </div>

        <h1 style={{
          fontSize: "clamp(2.5rem, 8vw, 4rem)",
          fontWeight: 900,
          letterSpacing: "-0.04em",
          marginBottom: "0.5rem",
          lineHeight: 1,
        }}>
          <span className="gradient-text" style={{ background: "linear-gradient(135deg, var(--teal-400), var(--amber-400))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ResQAI</span>
        </h1>
        <p style={{ color: "var(--text-primary)", fontSize: "clamp(1rem, 3vw, 1.25rem)", marginBottom: "0.5rem", fontWeight: 500 }}>
          Smart Response & NGO Coordination
        </p>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "3rem", maxWidth: "80%", marginInline: "auto" }}>
          Empowering real-time disaster response through intelligent matching.
        </p>

        {/* Progress bar - Fluid */}
        <div style={{
          width: "min(280px, 100%)",
          height: "6px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "99px",
          overflow: "hidden",
          margin: "0 auto",
          border: "1px solid rgba(255,255,255,0.03)",
        }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, var(--teal-500), var(--amber-500))",
            borderRadius: "99px",
            transition: "width 0.08s linear",
            boxShadow: "0 0 10px var(--teal-500)",
          }} />
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "1rem", letterSpacing: "0.05em", opacity: 0.8 }}>
          INITIALIZING SECURE SESSION
        </p>
      </div>

      {/* Bottom tagline - Responsive */}
      <div style={{
        position: "absolute",
        bottom: "min(5vh, 2rem)",
        color: "var(--text-secondary)",
        fontSize: "0.75rem",
        opacity: 0.5,
        fontWeight: 600,
        letterSpacing: "0.1em",
        textAlign: "center",
        width: "100%",
      }}>
        TOGETHER WE RESTORE • 🌍 • TOGETHER WE REBUILD
      </div>
    </div>
  );
}
