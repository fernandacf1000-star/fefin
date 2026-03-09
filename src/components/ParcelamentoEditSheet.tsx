import { cn } from "@/lib/utils";
import { Edit, Edit2, Edit3, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectSingle: () => void;
  onSelectFuture: () => void;
  onSelectAll: () => void;
  descricao?: string;
}

const ParcelamentoEditSheet = ({ open, onClose, onSelectSingle, onSelectFuture, onSelectAll, descricao }: Props) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[70] rounded-t-[28px] transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
        style={{ background: "#1a1a2e" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pb-24 space-y-4">
          <div className="text-center">
            <p className="text-base font-bold text-white">✏️ O que deseja editar?</p>
            {descricao && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{descricao}</p>
            )}
          </div>

          <div className="space-y-2">
            {/* Option A */}
            <button
              onClick={() => { onClose(); setTimeout(onSelectSingle, 200); }}
              className="w-full flex items-start gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 active:scale-[0.98] transition-transform text-left"
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(99,102,241,0.15)" }}>
                <Edit size={17} style={{ color: "#818CF8" }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Editar só este lançamento</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Altera apenas esta parcela, sem afetar as demais</p>
              </div>
            </button>

            {/* Option B */}
            <button
              onClick={() => { onClose(); setTimeout(onSelectFuture, 200); }}
              className="w-full flex items-start gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 active:scale-[0.98] transition-transform text-left"
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(16,185,129,0.12)" }}>
                <Edit2 size={17} style={{ color: "#10B981" }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Editar este e os próximos</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Atualiza esta e todas as parcelas futuras (data ≥ hoje)</p>
              </div>
            </button>

            {/* Option C */}
            <button
              onClick={() => { onClose(); setTimeout(onSelectAll, 200); }}
              className="w-full flex items-start gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 active:scale-[0.98] transition-transform text-left"
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(251,191,36,0.12)" }}>
                <Edit3 size={17} style={{ color: "#FBBF24" }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Editar todos os lançamentos</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Atualiza todas as parcelas deste parcelamento</p>
              </div>
            </button>

            {/* Option D */}
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl text-sm text-muted-foreground active:scale-[0.98] transition-transform"
            >
              <X size={14} />
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ParcelamentoEditSheet;
