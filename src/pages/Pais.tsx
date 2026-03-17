import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, TrendingDown } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import { useLancamentos } from "@/hooks/useLancamentos";
import { getGroupEmoji, getSubcategoriaGroup } from "@/lib/subcategorias";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getMesRef(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}
function getMesLabel(year: number, month: number) {
  const label = new Date(year, month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function Pais() {
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const mesRef = getMesRef(mesAtual.year, mesAtual.month);
  const mesLabel = getMesLabel(mesAtual.year, mesAtual.month);

  // Pais lancamentos are stored with subcategoria_pais set (categoria = "extra", pais flag)
  // We fetch all lancamentos and filter those with subcategoria_pais not null
  const { data: todos = [], isLoading } = useLancamentos(mesRef);

  const prevMes = () =>
    setMesAtual(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );
  const nextMes = () =>
    setMesAtual(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );

  // Filter: lancamentos dos pais = subcategoria_pais is not null
  const lancamentos = useMemo(
    () => todos.filter((l) => l.subcategoria_pais !== null && l.subcategoria_pais !== ""),
    [todos]
  );

  const total = useMemo(
    () => lancamentos.filter((l) => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0),
    [lancamentos]
  );

  // Por categoria (subcategoria_pais)
  const porCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    lancamentos
      .filter((l) => l.tipo === "despesa")
      .forEach((l) => {
        const cat = l.subcategoria_pais || l.categoria_macro || "Outros";
        map[cat] = (map[cat] || 0) + Number(l.valor);
      });
    return Object.entries(map)
      .map(([cat, valor]) => {
        const group = getSubcategoriaGroup(cat) || cat;
        return { cat, valor, emoji: getGroupEmoji(group) };
      })
      .sort((a, b) => b.valor - a.valor);
  }, [lancamentos]);

  return (
    <div className="gradient-bg min-h-screen pb-28">
      <BottomNav />

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Despesas dos Pais</h1>
            <p className="text-[11px] text-muted-foreground">{mesLabel}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMes}
              className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={nextMes}
              className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Total */}
        {lancamentos.length > 0 && (
          <div className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown size={15} className="text-destructive" />
              <span className="text-sm text-muted-foreground font-medium">Total do mês</span>
            </div>
            <span className="text-xl font-bold text-foreground">{fmt(total)}</span>
          </div>
        )}

        {/* Por categoria */}
        {porCategoria.length > 0 && (
          <div className="glass-card p-4 space-y-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Por categoria
            </p>
            <div className="grid grid-cols-2 gap-2">
              {porCategoria.map(({ cat, valor, emoji }) => (
                <div
                  key={cat}
                  className="flex items-center gap-2 p-2.5 rounded-xl"
                  style={{ background: "#E8ECF5" }}
                >
                  <span className="text-sm shrink-0">{emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground truncate">{cat}</p>
                    <p className="text-[11px] font-bold text-foreground">{fmt(valor)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista */}
        {isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Carregando...</div>
        ) : lancamentos.length === 0 ? (
          <EmptyState
            title="Sem lançamentos dos pais"
            subtitle="Nenhuma despesa dos pais registrada neste mês"
          />
        ) : (
          <div className="glass-card p-4 space-y-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Lançamentos
            </p>
            <div className="space-y-2">
              {lancamentos.map((l) => {
                const group = getSubcategoriaGroup(l.subcategoria_pais || "") || l.categoria_macro || "Outros";
                const emoji = getGroupEmoji(group);
                const isReceita = l.tipo === "receita";
                return (
                  <div key={l.id} className="flex items-center gap-3 py-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm"
                      style={{ background: "#E8ECF5" }}
                    >
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{l.descricao}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(l.data)}{l.subcategoria_pais ? ` · ${l.subcategoria_pais}` : ""}
                      </p>
                    </div>
                    <p
                      className="text-sm font-bold shrink-0"
                      style={{ color: isReceita ? "#0D9488" : "#1E2A45" }}
                    >
                      {isReceita ? "+" : "-"}{fmt(Number(l.valor))}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
