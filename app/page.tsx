"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SplashPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
        background: "radial-gradient(ellipse at 50% 40%, #0f6b71 0%, #060d10 70%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative rings */}
      <div style={{
        position: "absolute",
        width: 600,
        height: 600,
        borderRadius: "50%",
        border: "1px solid rgba(20,184,196,0.08)",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }} />
      <div style={{
        position: "absolute",
        width: 400,
        height: 400,
        borderRadius: "50%",
        border: "1px solid rgba(20,184,196,0.12)",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }} />

      {/* Logo area */}
      <div className="fade-up" style={{ textAlign: "center", zIndex: 1 }}>
        {/* Logo Icon */}
        <div className="pulse-glow" style={{
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #14b8c4, #f59e0b)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
        }}>
          <img src="/logo.png" alt="ResQAI" style={{ width: 64, height: 64, objectFit: "contain" }} />
        </div>

        <h1 style={{
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          marginBottom: 8,
        }}>
          <span className="gradient-text">ResQAI</span>
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 18, marginBottom: 8 }}>
          Smart Volunteer & NGO Coordination
        </p>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 48 }}>
          Together we respond. Together we rebuild.
        </p>

        {/* Progress bar */}
        <div style={{
          width: 240,
          height: 4,
          background: "rgba(255,255,255,0.1)",
          borderRadius: 999,
          overflow: "hidden",
          margin: "0 auto",
        }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #14b8c4, #f59e0b)",
            borderRadius: 999,
            transition: "width 0.06s linear",
          }} />
        </div>
        <p style={{ color: "#475569", fontSize: 12, marginTop: 16 }}>
          Loading platform…
        </p>
      </div>

      {/* Bottom tagline */}
      <div style={{
        position: "absolute",
        bottom: 32,
        color: "#334155",
        fontSize: 12,
      }}>
        Empowering communities. Saving lives. 🌍
      </div>
    </div>
  );
}
