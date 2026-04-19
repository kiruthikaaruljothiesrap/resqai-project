"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const roles = [
  {
    id: "volunteer",
    title: "Volunteer",
    subtitle: "Join the frontline of community service",
    icon: "🙋",
    features: ["Find nearby help requests", "Track your impact", "Earn badges & rewards", "Connect with NGOs"],
    gradient: "linear-gradient(135deg, #14b8c4 0%, #0f6b71 100%)",
    glow: "rgba(20,184,196,0.3)",
  },
  {
    id: "ngo",
    title: "NGO / Admin",
    subtitle: "Coordinate and manage volunteer efforts",
    icon: "🏢",
    features: ["Post help requests", "Assign & track tasks", "Manage volunteers", "Generate reports"],
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    glow: "rgba(245,158,11,0.3)",
  },
  {
    id: "admin",
    title: "Platform Admin",
    subtitle: "Verify NGOs and manage the system",
    icon: "🛡️",
    features: ["Approve/Reject NGOs", "View Master Database", "AI OCR Verifications", "System Analytics"],
    gradient: "linear-gradient(135deg, #e11d48 0%, #9f1239 100%)",
    glow: "rgba(225,29,72,0.3)",
  },
];

export default function RoleSelectPage() {
  const router = useRouter();
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  const handleSelect = (roleId: string) => {
    localStorage.setItem("selectedRole", roleId);
    router.push(`/auth/login?role=${roleId}`);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background: "radial-gradient(ellipse at 30% 20%, #0f3a3e 0%, #060d10 60%)",
    }}>
      <div className="fade-up" style={{ textAlign: "center", marginBottom: 48 }}>
        <img src="/logo.png" alt="ResQAI" style={{ width: 64, height: 64, borderRadius: 14, objectFit: "contain", marginBottom: 12 }} />
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, marginBottom: 12 }}>
          <span className="gradient-text">Who are you?</span>
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 16 }}>
          Select your role to get started with ResQAI
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 24,
        maxWidth: 700,
        width: "100%",
      }}>
        {roles.map((role, i) => (
          <div
            key={role.id}
            className="fade-up glass-card"
            style={{
              padding: 32,
              cursor: "pointer",
              animationDelay: `${i * 0.15}s`,
              opacity: 0,
              transform: hoveredRole === role.id ? "translateY(-6px) scale(1.02)" : "translateY(0)",
              transition: "all 0.3s ease",
              boxShadow: hoveredRole === role.id
                ? `0 20px 60px ${role.glow}`
                : "0 4px 20px rgba(0,0,0,0.3)",
            }}
            onMouseEnter={() => setHoveredRole(role.id)}
            onMouseLeave={() => setHoveredRole(null)}
            onClick={() => handleSelect(role.id)}
          >
            <div style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: role.gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              marginBottom: 20,
            }}>
              {role.icon}
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{role.title}</h2>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>{role.subtitle}</p>
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              {role.features.map((f) => (
                <li key={f} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#cbd5e1",
                  fontSize: 14,
                  marginBottom: 8,
                }}>
                  <span style={{ color: "#14b8c4" }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button style={{
              marginTop: 24,
              width: "100%",
              padding: "12px 0",
              borderRadius: 10,
              border: "none",
              background: role.gradient,
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
              transition: "opacity 0.2s",
            }}>
              Continue as {role.title} →
            </button>
          </div>
        ))}
      </div>

      <p style={{ color: "#334155", fontSize: 13, marginTop: 40 }}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
}
