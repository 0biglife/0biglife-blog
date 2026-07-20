"use client";

import { useLanguage } from "@/i18n/LanguageProvider";

export default function TopologySection() {
  const { lang, t } = useLanguage();

  return (
    <section
      style={{
        background: "#05060d",
        padding: "72px 20px 88px",
        borderTop: "1px solid rgba(140,180,200,0.08)",
        borderBottom: "1px solid rgba(140,180,200,0.08)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <p
          style={{
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: "0.24em",
            color: "#3df0c8",
            margin: "0 0 14px",
          }}
        >
          {t("topology.eyebrow")}
        </p>
        <h2
          style={{
            fontSize: "clamp(24px, 4vw, 38px)",
            fontWeight: 700,
            color: "#e2ecf3",
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            margin: "0 0 12px",
            maxWidth: 780,
          }}
        >
          {t("topology.title")}
        </h2>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: "#91a6ba",
            maxWidth: 640,
            margin: "0 0 28px",
          }}
        >
          {t("topology.desc")}
        </p>
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "82vh",
            minHeight: 520,
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(96,200,190,0.16)",
            boxShadow: "0 40px 120px rgba(0,0,0,0.5)",
          }}
        >
          <iframe
            key={lang}
            src={`/pulse/index.html?showcase&lang=${lang}`}
            title="claude-pulse · project topology"
            loading="lazy"
            style={{ width: "100%", height: "100%", border: 0, display: "block" }}
          />
        </div>
      </div>
    </section>
  );
}
