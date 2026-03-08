import { useState, useEffect } from "react";

const Splash = ({ onFinish }: { onFinish: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 4, 100));
    }, 80);
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 600);
    }, 2500);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
      style={{ background: "linear-gradient(180deg, #0d1117 0%, #0a1628 100%)" }}
    >
      {/* Green glow behind mascot */}
      <div
        className="absolute rounded-full blur-3xl opacity-20"
        style={{
          width: 220,
          height: 220,
          background: "radial-gradient(circle, #10B981 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -65%)",
        }}
      />

      {/* Mascot */}
      <div className="relative z-10 mascot-float">
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
          <ellipse className="eye-blink" cx="62.5" cy="47.5" rx="3.5" ry="4" fill="#3D2314"/>
          <circle cx="40" cy="46" r="1.2" fill="white"/>
          <circle cx="64" cy="46" r="1.2" fill="white"/>
          <path d="M38 63 Q50 72 62 63" stroke="#C68642" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <ellipse cx="30" cy="60" rx="7" ry="4" fill="#FFB3A7" opacity="0.5"/>
          <ellipse cx="70" cy="60" rx="7" ry="4" fill="#FFB3A7" opacity="0.5"/>
          <circle cx="22" cy="56" r="4" fill="#F7D070"/>
          <circle cx="78" cy="56" r="4" fill="#F7D070"/>
          <path d="M22 92 Q20 115 22 130 L78 130 Q80 115 78 92 Q70 82 50 82 Q30 82 22 92Z" fill="#10B981"/>
          <g className="coin-bounce">
            <circle cx="76" cy="95" r="10" fill="#F7D070" stroke="#E8B800" strokeWidth="1.5"/>
            <text x="76" y="99" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#B8860B">$</text>
          </g>
          <ellipse cx="24" cy="100" rx="7" ry="5" fill="#FDDBB4"/>
        </svg>
      </div>

      {/* Logo */}
      <h1 className="relative z-10 mt-6 text-4xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
        <span className="text-white">Fe</span>
        <span style={{ color: "#10B981" }}>Fin</span>
      </h1>

      {/* Tagline */}
      <p className="relative z-10 mt-2 text-xs tracking-[0.25em] uppercase" style={{ color: "#475569" }}>
        Suas finanças, seu controle
      </p>

      {/* Progress bar */}
      <div className="relative z-10 mt-6 w-48 h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: "rgba(16,185,129,0.15)" }}>
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{ width: `${progress}%`, background: "linear-gradient(90deg, #10B981, #34D399)" }}
        />
      </div>

      <style>{`
        .mascot-float {
          animation: mascotFloat 3s ease-in-out infinite;
        }
        @keyframes mascotFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .coin-bounce {
          animation: coinBounce 1.8s ease-in-out infinite;
          transform-origin: 76px 95px;
        }
        @keyframes coinBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          30% { transform: translateY(-6px) rotate(8deg); }
          60% { transform: translateY(2px) rotate(-3deg); }
        }
        .eye-blink {
          animation: eyeBlink 4.5s ease-in-out infinite;
        }
        @keyframes eyeBlink {
          0%, 90%, 100% { ry: 4; }
          95% { ry: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default Splash;
