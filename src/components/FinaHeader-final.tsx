interface FinaHeaderProps {
  title?: string;
  showLogo?: boolean;
}

const FinaHeader = ({ showLogo = true }: FinaHeaderProps) => {
  return (
    <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-purple-200/30">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
        {showLogo && (
          <img 
            src="/fina-logo.png" 
            alt="Fina" 
            style={{ height: 24, width: "auto" }}
          />
        )}
      </div>
    </div>
  );
};

export default FinaHeader;
