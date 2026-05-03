import { useState, useEffect } from 'react';

const Splash = ({ onFinish }: { onFinish: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 600);
    }, 3200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'linear-gradient(160deg, #7C5BBF 0%, #EDE8FF 100%)' }}
    >
      {/* Glow */}
      <div
        className="absolute rounded-full blur-3xl opacity-30"
        style={{
          width: 280, height: 280,
          background: 'radial-gradient(circle, #C4B5FD 0%, transparent 70%)',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -70%)',
        }}
      />

      {/* Mascote */}
      <div className="relative z-10 splash-float">
        <img
          src="/fina-mascot.png"
          alt="Fina"
          style={{ width: 180, height: 'auto', filter: 'drop-shadow(0 8px 24px rgba(107,78,168,0.35))' }}
        />
      </div>

      {/* Logo */}
      <div className="relative z-10 mt-4 splash-logo-in">
        <img
          src="/fina-logo.png"
          alt="Fina"
          style={{ width: 200, height: 'auto', filter: 'drop-shadow(0 4px 12px rgba(107,78,168,0.25))' }}
        />
      </div>

      {/* Tagline */}
      <p
        className="relative z-10 mt-4 uppercase splash-logo-in"
        style={{
          color: 'rgba(107,78,168,0.7)',
          fontSize: 10,
          letterSpacing: '2.5px',
          whiteSpace: 'nowrap',
          fontFamily: "'Nunito', sans-serif",
          animationDelay: '0.2s',
        }}
      >
        Minhas finanças, minhas regras
      </p>

      {/* Barra de progresso */}
      <div
        className="relative z-10 mt-6 w-40 h-[3px] rounded-full overflow-hidden"
        style={{ backgroundColor: 'rgba(107,78,168,0.15)' }}
      >
        <div
          className="h-full rounded-full splash-progress"
          style={{ background: 'linear-gradient(90deg, #7C5BBF, #A78BFA)' }}
        />
      </div>

      <style>{`
        .splash-float { animation: splashFloat 3s ease-in-out infinite; }
        @keyframes splashFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .splash-logo-in { animation: splashFadeUp 0.7s ease-out both; }
        @keyframes splashFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
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
