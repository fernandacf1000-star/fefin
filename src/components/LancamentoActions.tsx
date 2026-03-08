import { Pencil, Trash2, RotateCcw, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReembolso?: () => void;
  descricao?: string;
}

const LancamentoActions = ({ open, onClose, onEdit, onDelete, onReembolso, descricao }: Props) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 glass-card rounded-t-2xl p-6 space-y-3 animate-fade-up">
        {descricao && (
          <p className="text-xs text-muted-foreground text-center mb-2 truncate">{descricao}</p>
        )}

        <button
          onClick={() => { onEdit(); onClose(); }}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors"
        >
          <Pencil size={16} className="text-foreground" />
          <span className="text-sm font-medium text-foreground">✏️ Editar lançamento</span>
        </button>

        {onReembolso && (
          <button
            onClick={() => { onReembolso(); onClose(); }}
            className="w-full flex items-center gap-3 p-4 rounded-xl transition-colors"
            style={{ backgroundColor: "rgba(16,185,129,0.1)" }}
          >
            <RotateCcw size={16} style={{ color: "#10B981" }} />
            <span className="text-sm font-medium" style={{ color: "#10B981" }}>↩️ Registrar reembolso</span>
          </button>
        )}

        <button
          onClick={onDelete}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-destructive/10 hover:bg-destructive/20 transition-colors"
        >
          <Trash2 size={16} className="text-destructive" />
          <span className="text-sm font-medium text-destructive">🗑️ Excluir lançamento</span>
        </button>

        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border/50 text-xs font-medium text-muted-foreground hover:bg-secondary/30 transition-colors mt-2"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default LancamentoActions;
