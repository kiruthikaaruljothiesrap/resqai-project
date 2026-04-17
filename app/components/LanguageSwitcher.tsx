"use client";
import { useI18n } from "@/context/I18nContext";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as any)}
        style={{
          appearance: "none",
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "8px",
          color: "#f0f9fa",
          padding: "6px 28px 6px 12px",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          outline: "none",
        }}
      >
        <option value="en" style={{ color: "#000" }}>🇬🇧 ENG</option>
        <option value="ta" style={{ color: "#000" }}>🇮🇳 TAM</option>
        <option value="hi" style={{ color: "#000" }}>🇮🇳 HIN</option>
      </select>
      <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: "10px" }}>▼</span>
    </div>
  );
}
