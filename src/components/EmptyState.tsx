interface EmptyStateProps {
  title: string;
  subtitle?: string;
  onAddClick?: () => void;
}

const decodeUnicodeEscapes = (value: string) =>
  value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

const EmptyState = ({ title, subtitle = "Adicione seu primeiro lançamento do mês tocando no ＋ abaixo.", onAddClick }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 animate-fade-up">
      <div className="mascot-empty">
        <img
          src="/fina-mascot.png"
          alt="Fina"
          width={96}
          height={96}
          loading="lazy"
          decoding="async"
          className="drop-shadow"
          style={{ width: 96, height: "auto" }}
        />
      </div>
      <h2 className="text-base font-bold text-foreground mt-6 text-center">{decodeUnicodeEscapes(title)}</h2>
      <p className="text-xs mt-2 text-center max-w-[240px] text-muted-foreground">
        {subtitle ? decodeUnicodeEscapes(subtitle) : null}
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
