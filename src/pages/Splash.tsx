import { useState, useEffect } from "react";

const Splash = ({ onFinish }: { onFinish: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 600);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
      style={{ background: "#F4F7FB" }}
    >
      {/* Glow */}
      <div
        className="absolute rounded-full blur-3xl opacity-15"
        style={{
          width: 220,
          height: 220,
          background: "radial-gradient(circle, #6366F1 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -65%)",
        }}
      />

      {/* Mascot */}
      <div className="relative z-10 splash-float">
        <svg width="110" height="138" viewBox="0 0 100 130" fill="none">
          <ellipse cx="50" cy="42" rx="34" ry="36" fill="#2C1810"/>
          <path d="M74 45 Q88 55 85 80 Q82 95 75 100 Q80 80 76 65 Q74 55 74 45Z" fill="#2C1810"/>
          <path d="M26 45 Q12 58 15 82 Q18 96 24 100 Q20 80 24 65 Q26 55 26 45Z" fill="#2C1810"/>
          <ellipse cx="50" cy="50" rx="28" ry="30" fill="#FDDBB4"/>
          <ellipse cx="50" cy="18" rx="16" ry="10" fill="#2C1810"/>
          <path d="M32 40 Q39 36 44 39" stroke="#2C1810" strokeWidth="3" strokeLinecap="round" fill="none"/>
          <path d="M56 39 Q61 36 68 40" stroke="#2C1810" strokeWidth="3" strokeLinecap="round" fill="none"/>
          <ellipse cx="38" cy="47" rx="5" ry="5.5" fill="white"/>
          <ellipse cx="62" cy="47" rx="5" ry="5.5" fill="white"/>
          <ellipse cx="38.5" cy="47.5" rx="3.5" ry="4" fill="#3D2314"/>
          <ellipse className="splash-eye-blink" cx="62.5" cy="47.5" rx="3.5" ry="4" fill="#3D2314"/>
          <circle cx="40" cy="46" r="1.2" fill="white"/>
          <circle cx="64" cy="46" r="1.2" fill="white"/>
          <path d="M38 63 Q50 72 62 63" stroke="#C68642" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <ellipse cx="30" cy="60" rx="7" ry="4" fill="#FFB3A7" opacity="0.5"/>
          <ellipse cx="70" cy="60" rx="7" ry="4" fill="#FFB3A7" opacity="0.5"/>
          <circle cx="22" cy="56" r="4" fill="#F7D070"/>
          <circle cx="78" cy="56" r="4" fill="#F7D070"/>
          <path d="M22 92 Q20 115 22 130 L78 130 Q80 115 78 92 Q70 82 50 82 Q30 82 22 92Z" fill="#6366F1"/>
          <g className="splash-coin-bounce">
            <circle cx="76" cy="95" r="10" fill="#F7D070" stroke="#E8B800" strokeWidth="1.5"/>
            <text x="76" y="99" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#B8860B">$</text>
          </g>
          <ellipse cx="24" cy="100" rx="7" ry="5" fill="#FDDBB4"/>
        </svg>
      </div>

      {/* Logo */}
      <h1 className="relative z-10 mt-6" style={{ fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 900 }}>
        <span style={{ color: "#1E293B" }}>Fe</span>
        <span style={{ color: "#6366F1" }}>Fin</span>
      </h1>

      {/* Tagline */}
      <p
        className="relative z-10 mt-2 uppercase"
        style={{ color: "#94A3B8", fontSize: 10, letterSpacing: "2.5px", whiteSpace: "nowrap", fontFamily: "'Nunito', sans-serif" }}
      >
        Minhas finanças, minhas regras
      </p>

      {/* Progress bar */}
      <div className="relative z-10 mt-6 w-48 h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: "rgba(99,102,241,0.15)" }}>
        <div
          className="h-full rounded-full splash-progress"
          style={{ background: "linear-gradient(90deg, #6366F1, #818CF8)" }}
        />
      </div>

      <style>{`
        .splash-float { animation: splashFloat 3s ease-in-out infinite; }
        @keyframes splashFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .splash-coin-bounce { animation: splashCoinBounce 1.8s ease-in-out infinite; transform-origin: 76px 95px; }
        @keyframes splashCoinBounce {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          40% { transform: translateY(-10px) rotate(12deg); }
          60% { transform: translateY(-6px) rotate(-6deg); }
        }
        .splash-eye-blink { animation: splashWink 4.5s ease-in-out infinite; transform-origin: 62.5px 47.5px; }
        @keyframes splashWink {
          0%, 88%, 100% { transform: scaleY(1); }
          93% { transform: scaleY(0.08); }
        }
        .splash-progress { animation: splashLoadProgress 2.5s ease-out forwards; }
        @keyframes splashLoadProgress {
          0% { width: 0%; }
          70% { width: 85%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default Splash;
