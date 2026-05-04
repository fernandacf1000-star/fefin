interface FinaHeaderProps {
  title?: string;
  showLogo?: boolean;
  showBack?: boolean;
  onBack?: () => void;
}

const FinaHeader = ({ title, showLogo = true, showBack = false, onBack }: FinaHeaderProps) => {
  return (
    <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-purple-200/30">
      <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full hover:bg-purple-100 flex items-center justify-center text-[#7C5BBF]"
            >
              ←
            </button>
          )}
          {showLogo && (
            <img 
              src="/fina-logo.png" 
              alt="Fina" 
              style={{ height: 28, width: "auto" }}
            />
          )}
          {title && !showLogo && (
            <h1 className="text-lg font-bold text-foreground">{title}</h1>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinaHeader;
