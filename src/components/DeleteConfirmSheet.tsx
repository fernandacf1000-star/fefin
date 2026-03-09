import { cn } from "@/lib/utils";
import { Trash2, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  tipo: "parcelado" | "recorrente" | "simples";
  onDeleteSingle: () => void;
  onDeleteFuture: () => void;
  onDeleteAll: () => void;
  descricao?: string;
  isPending?: boolean;
}

const DeleteConfirmSheet = ({ open, onClose, tipo, onDeleteSingle, onDeleteFuture, onDeleteAll, descricao, isPending }: Props) => {
  const isGroup = tipo === "parcelado" || tipo === "recorrente";
  const label = tipo === "parcelado" ? "parcela" : "mês";

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[80] bg-background/80 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[90] rounded-t-[28px] transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
        style={{ background: "#1a1a2e" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pb-24 space-y-4">
          <div className="text-center">
            <p className="text-base font-bold text-foreground">🗑️ Excluir lançamento?</p>
            {descricao && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{descricao}</p>
            )}
          </div>

          {!isGroup ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">Tem certeza? Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-secondary/60 text-muted-foreground">
                  Cancelar
                </button>
                <button onClick={onDeleteSingle} disabled={isPending} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-destructive text-destructive-foreground disabled:opacity-50">
                  {isPending ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => { onClose(); setTimeout(onDeleteSingle, 200); }}
                disabled={isPending}
                className="w-full flex items-start gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 active:scale-[0.98] transition-transform text-left disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(239,68,68,0.15)" }}>
                  <Trash2 size={17} className="text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Excluir só este</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Remove apenas esta {label}</p>
                </div>
              </button>

              <button
                onClick={() => { onClose(); setTimeout(onDeleteFuture, 200); }}
                disabled={isPending}
                className="w-full flex items-start gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 active:scale-[0.98] transition-transform text-left disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(239,68,68,0.15)" }}>
                  <Trash2 size={17} className="text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Excluir este e os próximos</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Remove esta e todas as {label === "parcela" ? "parcelas" : "recorrências"} futuras</p>
                </div>
              </button>

              <button
                onClick={() => { onClose(); setTimeout(onDeleteAll, 200); }}
                disabled={isPending}
                className="w-full flex items-start gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 active:scale-[0.98] transition-transform text-left disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(239,68,68,0.15)" }}>
                  <Trash2 size={17} className="text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Excluir todos</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Remove todas as {label === "parcela" ? "parcelas" : "recorrências"} deste grupo</p>
                </div>
              </button>

              <button
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl text-sm text-muted-foreground active:scale-[0.98] transition-transform"
              >
                <X size={14} />
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DeleteConfirmSheet;
