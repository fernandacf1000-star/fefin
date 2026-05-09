import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Home, Receipt, RotateCcw, Wallet, Users, Heart, HandCoins } from "lucide-react";
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

function valorTotalAdriano(l: { valor: number }) {
  return absValue(l.valor) * 2;
}

function valor50Adriano(l: { valor: number }) {
  return absValue(l.valor);
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

  const despesasAdriano = useMemo(() => despesas.filter((l) => l.adriano === true && !isLuisaLancamento(l)), [despesas]);
  const despesasLuisa = useMemo(() => despesas.filter((l) => isLuisaLancamento(l)), [despesas]);
  const reembolsosPaisReceita = useMemo(() => receitas.filter((l) => l.categoria === "reembolso_pais"), [receitas]);
  const reembolsosAdrianoReceita = useMemo(() => receitas.filter((l) => l.categoria === "reembolso_adriano"), [receitas]);

  const totalPagoPais = despesasPais.reduce((s, l) => s + absValue(l.valor), 0);
  const totalReembolsadoPais = despesasPais.reduce((s, l) => s + getTotalReembolsado(todosReembolsos, l.id), 0) + reembolsosPaisReceita.reduce((s, l) => s + absValue(l.valor), 0);
  const totalLiquidoPais = totalPagoPais - totalReembolsadoPais;

  const totalPagoAdriano = despesasAdriano.reduce((s, l) => s + valorTotalAdriano(l), 0);
  const totalPagoLuisa = despesasLuisa.reduce((s, l) => s + absValue(l.valor), 0);
  const totalReembolsadoAdriano = despesasAdriano.reduce((s, l) => s + getTotalReembolsado(todosReembolsos, l.id), 0) + reembolsosAdrianoReceita.reduce((s, l) => s + absValue(l.valor), 0);

  const despesasPagasPorVoceAdriano = despesasAdriano.filter((l) => norm(l.pago_por) === "voce" || norm(l.pago_por) === "fernanda" || !norm(l.pago_por));
  const despesasPagasPorEleAdriano = despesasAdriano.filter((l) => { const p = norm(l.pago_por); return p && p !== "voce" && p !== "fernanda"; });
  const totalPagoPorVoceAdriano = despesasPagasPorVoceAdriano.reduce((s, l) => s + valorTotalAdriano(l), 0);
  const totalPagoPorEleAdriano = despesasPagasPorEleAdriano.reduce((s, l) => s + valorTotalAdriano(l), 0);
  const adrianoDeve = despesasPagasPorVoceAdriano.reduce((s, l) => s + valor50Adriano(l), 0);
  const voceDeve = despesasPagasPorEleAdriano.reduce((s, l) => s + valor50Adriano(l), 0);
  const saldoAdriano = adrianoDeve - voceDeve - totalReembolsadoAdriano;
  const meuCustoLiquidoAdriano = despesasAdriano.reduce((s, l) => s + valor50Adriano(l), 0);

  const listaAtual = aba === "pais" ? despesasPais : [...despesasAdriano, ...despesasLuisa];

  const categorias = useMemo(() => {
    const map = new Map<string, number>();
    listaAtual.forEach((l) => {
      const subcategoria = getSubcategoriaValida(l) || l.subcategoria || l.categoria_macro || l.categoria || "Sem categoria";
      const valorCategoria = aba === "adriano" && l.adriano ? valorTotalAdriano(l) : absValue(l.valor);
      map.set(subcategoria, (map.get(subcategoria) || 0) + valorCategoria);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [listaAtual, aba]);

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
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Resumo 50/50 com Adriano</p>
            <SummaryRow icon={<Receipt size={15} className="text-indigo-600" />} label="Valor total compartilhado" value={fmt(totalPagoAdriano)} />
            <SummaryRow icon={<Users size={15} className="text-blue-600" />} label="Eu paguei 100%" value={fmt(totalPagoPorVoceAdriano)} />
            <SummaryRow icon={<HandCoins size={15} className="text-blue-600" />} label="Adriano deve 50%" value={fmt(adrianoDeve)} valueClassName="text-blue-700" />
            <SummaryRow icon={<Users size={15} className="text-rose-600" />} label="Adriano pagou 100%" value={fmt(totalPagoPorEleAdriano)} />
            <SummaryRow icon={<HandCoins size={15} className="text-rose-600" />} label="Eu devo 50%" value={fmt(voceDeve)} valueClassName="text-rose-700" />
            <SummaryRow icon={<RotateCcw size={15} className="text-teal-600" />} label="Reembolsos recebidos" value={`- ${fmt(totalReembolsadoAdriano)}`} valueClassName="text-teal-700" />
            <SummaryRow icon={<Wallet size={15} className="text-orange-600" />} label={saldoAdriano >= 0 ? "Saldo: Adriano me deve" : "Saldo: eu devo ao Adriano"} value={fmt(Math.abs(saldoAdriano))} valueClassName={saldoAdriano >= 0 ? "text-blue-700" : "text-rose-700"} />
            <SummaryRow icon={<Home size={15} className="text-slate-600" />} label="Meu custo líquido 50%" value={fmt(meuCustoLiquidoAdriano)} />
            {totalPagoLuisa > 0 && <SummaryRow icon={<Heart size={15} className="text-pink-600" />} label="Luísa" value={fmt(totalPagoLuisa)} valueClassName="text-pink-700" />}
          </Card>
        )}

        {categorias.length > 0 && (
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
          {isLoading ? <p className="text-sm text-slate-500">Carregando...</p> : listaAtual.length === 0 ? <EmptyState title="Nenhum lançamento" description="Não há lançamentos neste mês." /> : listaAtual.slice().sort((a, b) => a.data.localeCompare(b.data)).map((l) => {
            const pagoPor = norm(l.pago_por);
            const vocePagou = pagoPor === "voce" || pagoPor === "fernanda" || !pagoPor;
            const valor = aba === "adriano" && l.adriano ? valorTotalAdriano(l) : absValue(l.valor);
            const valor50 = aba === "adriano" && l.adriano ? valor50Adriano(l) : valor / 2;
            const subcategoria = getSubcategoriaValida(l);
            const labelCategoria = subcategoria || l.categoria_macro || l.categoria || "Sem categoria";
            return <button key={l.id} onClick={() => setActionsLanc(l)} className="w-full flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 text-left"><div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0"><span>{getEmoji(labelCategoria)}</span></div><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{l.descricao}</p><p className="text-[11px] text-slate-500">{formatDate(l.data)} · {labelCategoria}{aba === "adriano" && !isLuisaLancamento(l) ? ` · ${vocePagou ? "eu paguei" : "ele pagou"}` : ""}</p></div><div className="text-right shrink-0"><p className="text-sm font-bold text-slate-900">{fmt(valor)}</p>{aba === "adriano" && !isLuisaLancamento(l) && <p className="text-[10px] text-slate-500">50% {fmt(valor50)}</p>}</div></button>;
          })}
        </Card>
      </div>

      <LancamentoActions open={!!actionsLanc} onClose={() => setActionsLanc(null)} descricao={actionsLanc?.descricao} onEdit={() => { setEditTarget(actionsLanc); setActionsLanc(null); }} onDelete={() => { setDeleteTarget(actionsLanc); setActionsLanc(null); }} />

      {deleteTarget && <DeleteConfirmSheet open={!!deleteTarget} onClose={() => setDeleteTarget(null)} tipo="simples" descricao={deleteTarget.descricao} onDeleteSingle={handleDeleteSingle} onDeleteFuture={handleDeleteSingle} onDeleteAll={handleDeleteSingle} />}

      {editTarget && <EditLancamentoModal open={!!editTarget} lancamento={editTarget} onClose={() => setEditTarget(null)} onSave={handleSaveEdit} cartoes={cartoes} />}
    </div>
  );
}
