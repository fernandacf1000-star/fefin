import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Receipt, RotateCcw, Wallet } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import LancamentoActions from "@/components/LancamentoActions";
import DeleteConfirmSheet from "@/components/DeleteConfirmSheet";
import EditLancamentoModal from "@/components/EditLancamentoModal";
import { useCartoes } from "@/hooks/useCartoes";
import { useLancamentos, useUpdateLancamento, useDeleteLancamento, isLuisaLancamento, type Lancamento } from "@/hooks/useLancamentos";
import { useAllReembolsos, getTotalReembolsado } from "@/hooks/useReembolsos";
import { ALL_SUBCATEGORIAS, detectSubcategoria, getSubcategoriaEmoji, normalizeSub } from "@/lib/subcategorias";
import { cn } from "@/lib/utils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const absValue = (v: unknown) => Math.abs(Number(v) || 0);
const VALID_SUBCATEGORIAS = new Set(ALL_SUBCATEGORIAS);

function getMesRef(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getMesLabel(year: number, month: number) {
  const label = new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDate(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

function norm(value?: string | null) {
  return (value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type LancamentoLike = {
  descricao?: string | null;
  categoria_macro?: string | null;
  subcategoria?: string | null;
  categoria?: string | null;
};

function getSubcategoriaValida(l: LancamentoLike): string | null {
  const normalizada = normalizeSub(l.categoria_macro, l.subcategoria);
  if (normalizada && VALID_SUBCATEGORIAS.has(normalizada)) return normalizada;
  const detectada = detectSubcategoria(l.descricao || "");
  if (detectada && VALID_SUBCATEGORIAS.has(detectada)) return detectada;
  return null;
}

function getEmoji(label?: string | null) {
  const sub = getSubcategoriaValida({ descricao: label, subcategoria: label });
  if (sub) return getSubcategoriaEmoji(sub);
  const s = norm(label);
  if (s.includes("adriano")) return "👨";
  if (s.includes("luisa")) return "👩‍🦳";
  if (s.includes("vicente")) return "👦";
  if (s.includes("pais")) return "🧓";
  return "💸";
}

function compareLancamentosByAmountAsc(a: Lancamento, b: Lancamento) {
  const valorDiff = absValue(a.valor) - absValue(b.valor);
  if (valorDiff !== 0) return valorDiff;
  const dateDiff = a.data.localeCompare(b.data);
  if (dateDiff !== 0) return dateDiff;
  return (a.descricao || "").localeCompare(b.descricao || "", "pt-BR");
}

function SummaryRow({ icon, label, value, valueClassName }: { icon: React.ReactNode; label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#E8ECF5] last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">{icon}</div>
        <span className="text-sm text-slate-600 font-medium truncate">{label}</span>
      </div>
      <span className={cn("text-sm font-bold text-slate-900", valueClassName)}>{value}</span>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm p-4", className)}>{children}</div>;
}

export default function PaisV2() {
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [aba, setAba] = useState<"pais" | "adriano">("pais");
  const [actionsLanc, setActionsLanc] = useState<Lancamento | null>(null);
  const [editTarget, setEditTarget] = useState<Lancamento | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lancamento | null>(null);

  const mesRef = getMesRef(mesAtual.year, mesAtual.month);
  const mesLabel = getMesLabel(mesAtual.year, mesAtual.month);
  const { data: todos = [], isLoading } = useLancamentos(mesRef);
  const { data: todosReembolsos = [] } = useAllReembolsos();
  const { data: cartoes = [] } = useCartoes();
  const updateLancamento = useUpdateLancamento();
  const deleteLancamento = useDeleteLancamento();

  const prevMes = () => setMesAtual(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  const nextMes = () => setMesAtual(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });

  const despesas = useMemo(() => todos.filter((l) => l.tipo === "despesa"), [todos]);
  const receitas = useMemo(() => todos.filter((l) => l.tipo === "receita"), [todos]);

  const despesasPais = useMemo(() => despesas.filter((l) => {
    const sub = norm(l.subcategoria_pais);
    return !!sub && !l.adriano && sub !== "adriano" && sub !== "luisa";
  }), [despesas]);

  const despesasAdriano = useMemo(() => despesas.filter((l) => l.adriano === true && norm(l.subcategoria_pais) === "adriano"), [despesas]);
  const despesasLuisa = useMemo(() => despesas.filter((l) => isLuisaLancamento(l)), [despesas]);
  const reembolsosPaisReceita = useMemo(() => receitas.filter((l) => l.categoria === "reembolso_pais"), [receitas]);
  const reembolsosLuisaReceita = useMemo(() => receitas.filter((l) => l.categoria === "reembolso_luisa"), [receitas]);

  const totalPagoPais = despesasPais.reduce((s, l) => s + absValue(l.valor), 0);
  const totalReembolsadoPais = despesasPais.reduce((s, l) => s + getTotalReembolsado(todosReembolsos, l.id), 0) + reembolsosPaisReceita.reduce((s, l) => s + absValue(l.valor), 0);
  const totalLiquidoPais = totalPagoPais - totalReembolsadoPais;

  const principalPorSharedGroup = useMemo(() => {
    const map = new Map<string, Lancamento>();
    despesas.forEach((l) => {
      if (!l.adriano && l.shared_group_id) map.set(l.shared_group_id, l);
    });
    return map;
  }, [despesas]);

  const getPagoPorEfetivoAdriano = (l: Lancamento) => {
    const principal = l.shared_group_id ? principalPorSharedGroup.get(l.shared_group_id) : null;
    return norm(principal?.pago_por || l.pago_por);
  };

  const euPagueiAdriano = despesasAdriano
    .filter((l) => {
      const pagoPor = getPagoPorEfetivoAdriano(l);
      return pagoPor === "voce" || pagoPor === "fernanda" || !pagoPor;
    })
    .reduce((sum, l) => sum + absValue(l.valor), 0);

  const elePagouAdriano = despesasAdriano
    .filter((l) => {
      const pagoPor = getPagoPorEfetivoAdriano(l);
      return pagoPor === "adriano" || pagoPor === "ele";
    })
    .reduce((sum, l) => sum + absValue(l.valor), 0);

  const saldoAdriano = euPagueiAdriano - elePagouAdriano;

  const despesasLuisaTotal = despesasLuisa.reduce((sum, l) => sum + absValue(l.valor), 0);
  const reembolsosLuisa = reembolsosLuisaReceita.reduce((sum, l) => sum + absValue(l.valor), 0);
  const luisaDeve = despesasLuisaTotal - reembolsosLuisa;

  const listaAtual = useMemo(() => {
    const base = aba === "pais" ? despesasPais : [...despesasAdriano, ...despesasLuisa];
    return [...base].sort(compareLancamentosByAmountAsc);
  }, [aba, despesasPais, despesasAdriano, despesasLuisa]);

  const categorias = useMemo(() => {
    const map = new Map<string, number>();
    despesasPais.forEach((l) => {
      const subcategoria = getSubcategoriaValida(l) || l.subcategoria || l.categoria_macro || l.categoria || "Sem categoria";
      map.set(subcategoria, (map.get(subcategoria) || 0) + absValue(l.valor));
    });
    return [...map.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], "pt-BR"));
  }, [despesasPais]);

  const totalCategorias = categorias.reduce((s, [, valor]) => s + valor, 0);

  const handleSaveEdit = async (updates: Partial<Lancamento>) => {
    if (!editTarget) return;
    await updateLancamento.mutateAsync({ id: editTarget.id, ...updates });
    setEditTarget(null);
  };

  const handleDeleteSingle = async () => {
    if (!deleteTarget) return;
    await deleteLancamento.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="gradient-bg min-h-screen pb-28 overflow-x-hidden">
      <BottomNav />
      <div className="max-w-lg mx-auto px-4 pt-14 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Pais e Adriano</h1>
            <p className="text-xl font-bold text-white/90">{mesLabel}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={prevMes} className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white"><ChevronLeft size={15} /></button>
            <button onClick={nextMes} className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white"><ChevronRight size={15} /></button>
          </div>
        </div>

        <div className="flex gap-1 p-1 rounded-2xl bg-white/20 border border-white/25 backdrop-blur">
          <button onClick={() => setAba("pais")} className={cn("flex-1 py-2 rounded-xl text-sm font-semibold transition-all", aba === "pais" ? "bg-white shadow-sm text-slate-900" : "text-white")}>🧓 Pais</button>
          <button onClick={() => setAba("adriano")} className={cn("flex-1 py-2 rounded-xl text-sm font-semibold transition-all", aba === "adriano" ? "bg-white shadow-sm text-slate-900" : "text-white")}>👨 Adriano</button>
        </div>

        {aba === "pais" ? (
          <Card className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Resumo do mês</p>
            <SummaryRow icon={<Receipt size={15} className="text-indigo-600" />} label="Total pago" value={fmt(totalPagoPais)} />
            <SummaryRow icon={<RotateCcw size={15} className="text-teal-600" />} label="Reembolsado" value={`- ${fmt(totalReembolsadoPais)}`} valueClassName="text-teal-700" />
            <SummaryRow icon={<Wallet size={15} className="text-orange-600" />} label="Meu custo líquido" value={fmt(totalLiquidoPais)} valueClassName={totalLiquidoPais > 0 ? "text-orange-700" : "text-teal-700"} />
          </Card>
        ) : (
          <Card className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Resumo Adriano</p>
            <SummaryRow icon={<span className="text-base">💰</span>} label="Eu paguei" value={fmt(euPagueiAdriano)} />
            <SummaryRow icon={<span className="text-base">👨</span>} label="Ele pagou" value={fmt(elePagouAdriano)} />
            <SummaryRow icon={<span className="text-base">💵</span>} label="Saldo a reembolsar" value={fmt(Math.abs(saldoAdriano))} valueClassName={saldoAdriano >= 0 ? "text-rose-600" : "text-teal-700"} />
            <SummaryRow icon={<span className="text-base">👩‍🦳</span>} label="Luísa deve" value={fmt(luisaDeve)} valueClassName="text-pink-700" />
          </Card>
        )}

        {aba === "pais" && categorias.length > 0 && (
          <Card className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Despesas por categoria</p>
            {categorias.map(([cat, valor]) => {
              const pct = totalCategorias > 0 ? (valor / totalCategorias) * 100 : 0;
              return <div key={cat} className="space-y-1"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 min-w-0"><span>{getEmoji(cat)}</span><span className="text-sm font-semibold text-slate-800 truncate">{cat}</span></div><span className="text-sm font-bold text-slate-900">{fmt(valor)}</span></div><div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} /></div></div>;
            })}
          </Card>
        )}

        <Card className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Lançamentos</p>
          {isLoading ? <p className="text-sm text-slate-500">Carregando...</p> : listaAtual.length === 0 ? <EmptyState title="Nenhum lançamento" description="Não há lançamentos neste mês." /> : [...listaAtual].sort(compareLancamentosByAmountAsc).map((l) => {
            const isLuisa = isLuisaLancamento(l);
            const pagoPor = aba === "adriano" && !isLuisa ? getPagoPorEfetivoAdriano(l) : norm(l.pago_por);
            const vocePagou = pagoPor === "voce" || pagoPor === "fernanda" || !pagoPor;
            const valor = absValue(l.valor);
            const subcategoria = getSubcategoriaValida(l);
            const labelCategoria = subcategoria || l.categoria_macro || l.categoria || "Sem categoria";
            return <button key={l.id} onClick={() => setActionsLanc(l)} className="w-full flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 text-left"><div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0"><span>{isLuisa ? "👩‍🦳" : getEmoji(labelCategoria)}</span></div><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{l.descricao}</p><p className="text-[11px] text-slate-500">{formatDate(l.data)} · {labelCategoria}{aba === "adriano" ? isLuisa ? " · Luísa" : ` · ${vocePagou ? "eu paguei" : "ele pagou"}` : ""}</p></div><div className="text-right shrink-0"><p className="text-sm font-bold text-slate-900">{fmt(valor)}</p></div></button>;
          })}
        </Card>
      </div>

      <LancamentoActions open={!!actionsLanc} onClose={() => setActionsLanc(null)} descricao={actionsLanc?.descricao} onEdit={() => { setEditTarget(actionsLanc); setActionsLanc(null); }} onDelete={() => { setDeleteTarget(actionsLanc); setActionsLanc(null); }} />

      {deleteTarget && <DeleteConfirmSheet open={!!deleteTarget} onClose={() => setDeleteTarget(null)} tipo="simples" descricao={deleteTarget.descricao} onDeleteSingle={handleDeleteSingle} onDeleteFuture={handleDeleteSingle} onDeleteAll={handleDeleteSingle} />}

      {editTarget && <EditLancamentoModal open={!!editTarget} lancamento={editTarget} onClose={() => setEditTarget(null)} onSave={handleSaveEdit} cartoes={cartoes} />}
    </div>
  );
}
