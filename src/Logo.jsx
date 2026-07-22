import React from "react";

// Insignia "JR App" — misma marca que en Comandero, adaptada aquí a colores
// explícitos (props) en vez de variables CSS, porque esta app usa tokens JS (T).
export default function Logo({ size = 32, showWordmark = false, textColor = "#2A2420", dimColor = "#6B5F4F" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="jrGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e8734a" />
            <stop offset="100%" stopColor="#b85a37" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#jrGradient)" />
        <rect x="2" y="2" width="60" height="60" rx="16" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        <text
          x="32"
          y="40"
          textAnchor="middle"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="800"
          fontSize="26"
          fill="#ffffff"
          letterSpacing="-1"
        >
          JR
        </text>
        <circle cx="49" cy="17" r="3" fill="#ffffff" fillOpacity="0.85" />
      </svg>
      {showWordmark && (
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontWeight: 800, fontSize: size * 0.34, color: textColor, letterSpacing: -0.3 }}>
            JR <span style={{ color: "#e8734a" }}>App</span>
          </div>
          <div style={{ fontSize: size * 0.16, color: dimColor, letterSpacing: 0.5, textTransform: "uppercase" }}>
            Studio
          </div>
        </div>
      )}
    </div>
  );
}
