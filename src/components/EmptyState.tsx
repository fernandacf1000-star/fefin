import { useState } from "react";

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  onAddClick?: () => void;
}

const MascotSvg = () => (
  <svg width="100" height="120" viewBox="0 0 100 120" fill="none">
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
    <ellipse cx="62.5" cy="47.5" rx="3.5" ry="4" fill="#3D2314"/>
    <circle cx="40" cy="46" r="1.2" fill="white"/>
    <circle cx="64" cy="46" r="1.2" fill="white"/>
    <path d="M38 63 Q50 72 62 63" stroke="#C68642" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <ellipse cx="30" cy="60" rx="7" ry="4" fill="#FFB3A7" opacity="0.5"/>
    <ellipse cx="70" cy="60" rx="7" ry="4" fill="#FFB3A7" opacity="0.5"/>
    <circle cx="21" cy="55" r="5.5" fill="#F7D070" stroke="#E8B800" strokeWidth="1.2"/>
    <text x="21" y="58.5" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#B8860B">$</text>
    <circle cx="79" cy="55" r="5.5" fill="#F7D070" stroke="#E8B800" strokeWidth="1.2"/>
    <text x="79" y="58.5" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#B8860B">$</text>
    <path d="M22 92 Q20 112 22 118 L78 118 Q80 112 78 92 Q70 82 50 82 Q30 82 22 92Z" fill="#6366F1"/>
    <ellipse cx="16" cy="104" rx="7" ry="5" fill="#FDDBB4"/>
    <ellipse cx="84" cy="104" rx="7" ry="5" fill="#FDDBB4"/>
  </svg>
);

const EmptyState = ({ title, subtitle = "Adicione seu primeiro lançamento do mês tocando no ＋ abaixo.", onAddClick }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 animate-fade-up">
      <div className="mascot-empty">
        <MascotSvg />
      </div>
      <h2 className="text-base font-bold text-foreground mt-6 text-center">{title}</h2>
      <p className="text-xs mt-2 text-center max-w-[240px] text-muted-foreground">
        {subtitle}
      </p>
      {onAddClick && (
        <button
          onClick={onAddClick}
          className="mt-5 px-6 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.97] gradient-emerald text-white"
        >
          ＋ Adicionar lançamento
        </button>
      )}
      <style>{`
        .mascot-empty {
          animation: mascotFloat 3s ease-in-out infinite;
        }
        @keyframes mascotFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
};

export default EmptyState;
