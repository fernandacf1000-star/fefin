import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import { useLancamentos } from "@/hooks/useLancamentos";
import { useAllReembolsos } from "@/hooks/useReembolsos";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import {
  SUBCATEGORIA_GROUPS,
  getGroupEmoji,
  CAT_COLORS,
  normalizeMacro,
  getSubcategoriaColor,
} from "@/lib/subcategorias";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtK = (v: number) => {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(v);
};

const currentYear = new Date().getFullYear();
const currentMonthIdx = new Date().getMonth();

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 12,
};

const Graficos = () => {
  const [mesAtual, setMesAtual] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [subcatCatFilter, setSubcatCatFilter] = useState<string | null>(null);
  const [activePieIndex, setActivePieIndex] = useState<number | undefined>(undefined);
  const mesRef = `${mesAtual.year}-${String(mesAtual.month + 1).padStart(2, "0")}`;
  const mesLabel = new Date(mesAtual.year, mesAtual.month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const mesLabelFmt = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);
  const { data: lancamentos = [], isLoading } = useLancamentos(mesRef);
  const { data: todosReembolsos = [] } = useAllReembolsos();

  // Fetch ALL lancamentos for the year (no month filter)
  const { data: allYearLancamentos = [] } = useLancamentos();

  // Annual data by month — past vs future split for dashed future lines
  const annualData = useMemo(() => {
    return MONTH_LABELS.map((label, i) => {
      const mesKey = `${currentYear}-${String(i + 1).padStart(2, "0")}`;
      const mesLancs = allYearLancamentos.filter((l) => l.mes_referencia === mesKey);
      // Receitas excluem resgates de investimento
      const receitas = mesLancs
        .filter((l) => l.tipo === "receita" && l.categoria !== "resgate_investimento")
        .reduce((s, l) => s + Number(l.valor), 0);
      const despesas = mesLancs.filter((l) => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0);
      const resgates = mesLancs
        .filter((l) => l.tipo === "receita" && l.categoria === "resgate_investimento")
        .reduce((s, l) => s + Number(l.valor), 0);
      const isFuture = i > currentMonthIdx;
      const isTransition = i === currentMonthIdx;
      return {
        name: label,
        receitasPast: !isFuture ? receitas : undefined,
        despesasPast: !isFuture ? despesas : undefined,
        resgatesPast: !isFuture ? resgates : undefined,
        receitasFuture: isFuture || isTransition ? receitas : undefined,
        despesasFuture: isFuture || isTransition ? despesas : undefined,
        resgatesFuture: isFuture || isTransition ? resgates : undefined,
        resgates,
        saldo: receitas - despesas,
        isFuture,
      };
    });
  }, [allYearLancamentos]);

  const annualTotals = useMemo(() => {
    const receitas = annualData.reduce((s, dd) =>
      s + (!dd.isFuture ? (dd.receitasPast || 0) : (dd.receitasFuture || 0)), 0);
    const despesasTotal = annualData.reduce((s, dd) =>
      s + (!dd.isFuture ? (dd.despesasPast || 0) : (dd.despesasFuture || 0)), 0);
    const resg = annualData.reduce((s, dd) => s + (dd.resgates || 0), 0);
    return { receitas, despesas: despesasTotal, saldo: receitas - despesasTotal, resgates: resg };
  }, [annualData]);

  const reembolsosMes = useMemo(() => {
    const ids = new Set(lancamentos.filter((l) => l.tipo === "despesa").map((l) => l.id));
    return todosReembolsos.filter((r) => ids.has(r.lancamento_id));
  }, [lancamentos, todosReembolsos]);

  const totalReembolsadoMesTabela = useMemo(
    () => reembolsosMes.reduce((s, r) => s + Number(r.valor_reembolsado), 0),
    [reembolsosMes],
  );

  // Receitas "Reembolso pais" também deduzem dos totais de despesas dos pais
  const totalReembolsadoMesReceitas = useMemo(
    () => lancamentos
      .filter((l) => l.tipo === "receita" && l.categoria === "reembolso_pais")
      .reduce((s, l) => s + Number(l.valor), 0),
    [lancamentos],
  );

  const totalReembolsadoMes = totalReembolsadoMesTabela + totalReembolsadoMesReceitas;

  // Resgates de investimento — separados da receita
  const totalResgatesMes = useMemo(
    () => lancamentos
      .filter((l) => l.tipo === "receita" && l.categoria === "resgate_investimento")
      .reduce((s, l) => s + Number(l.valor), 0),
    [lancamentos],
  );

  // Receitas excluem resgate_investimento
  const totalReceitas = useMemo(
    () => lancamentos
      .filter((l) => l.tipo === "receita" && l.categoria !== "resgate_investimento")
      .reduce((s, l) => s + Number(l.valor), 0),
    [lancamentos],
  );
  const totalDespesas = useMemo(
    () =>
      lancamentos.filter((l) => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0) - totalReembolsadoMes,
    [lancamentos, totalReembolsadoMes],
  );

  const emojiMapGraf: Record<string, string> = {
    Moradia: "🏘️",
    Alimentação: "🥗",
    Transporte: "🚗",
    Saúde: "💊",
    Pessoal: "💅",
    Lazer: "🎮",
    Investimentos: "📈",
    Pais: "🧓",
    Vicente: "👦",
    Luísa: "👧",
    "Sem categoria": "🔴",
  };
  const colorMapGraf: Record<string, string> = {
    ...CAT_COLORS,
    Pais: "#F59E0B",
    Vicente: "#3B82F6",
    Luísa: "#EC4899",
    "Sem categoria": "#94A3B8",
  };

  const composicao = useMemo(() => {
    const despesas = lancamentos.filter((l) => l.tipo === "despesa");
    const map: Record<string, number> = {};
    despesas.forEach((d) => {
      const isVicente = d.subcategoria_pais === "Vicente";
      const isLuisa = d.subcategoria_pais === "Luísa";
      const isPais = !!(d.subcategoria_pais && d.subcategoria_pais !== "") && !isVicente && !isLuisa;
      const key = isVicente ? "Vicente" : isLuisa ? "Luísa" : isPais ? "Pais" : normalizeMacro(d.categoria_macro, d.subcategoria);
      map[key] = (map[key] || 0) + Number(d.valor);
    });
    // Deduzir reembolsos (tabela) de Pais e Vicente
    reembolsosMes.forEach((r) => {
      const lanc = despesas.find((d) => d.id === r.lancamento_id);
      if (!lanc) return;
      const isVicente = lanc.subcategoria_pais === "Vicente";
      const isLuisa = lanc.subcategoria_pais === "Luísa";
      const isPais = !!(lanc.subcategoria_pais && lanc.subcategoria_pais !== "") && !isVicente && !isLuisa;
      const key = isVicente ? "Vicente" : isLuisa ? "Luísa" : isPais ? "Pais" : null;
      if (key && map[key] !== undefined) {
        map[key] = Math.max(0, map[key] - Number(r.valor_reembolsado));
      }
    });
    // Deduzir receitas "Reembolso pais" do slice Pais
    if (map["Pais"] !== undefined && totalReembolsadoMesReceitas > 0) {
      map["Pais"] = Math.max(0, map["Pais"] - totalReembolsadoMesReceitas);
    }
    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value,
        color: colorMapGraf[name] || "#475569",
        emoji: emojiMapGraf[name] || getGroupEmoji(name),
      }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [lancamentos, reembolsosMes, totalReembolsadoMesReceitas]);

  const totalMes = composicao.reduce((s, c) => s + c.value, 0);

  const subcatData = useMemo(() => {
    // Exclui lançamentos dos pais e Vicente — eles aparecem na composicao como categorias próprias
    let despesas = lancamentos.filter(
      (l) => l.tipo === "despesa" && l.subcategoria && !(l.subcategoria_pais && l.subcategoria_pais !== ""),
    );
    if (subcatCatFilter) {
      despesas = despesas.filter((l) => normalizeMacro(l.categoria_macro, l.subcategoria) === subcatCatFilter);
    }
    const map: Record<string, { value: number; macro: string }> = {};
    despesas.forEach((d) => {
      const key = d.subcategoria!;
      const macro = normalizeMacro(d.categoria_macro, d.subcategoria);
      if (!map[key]) map[key] = { value: 0, macro };
      map[key].value += Number(d.valor);
    });
    return Object.entries(map)
      .map(([name, { value, macro }]) => ({
        name,
        value,
        macro,
        color: getSubcategoriaColor(name, macro),
        emoji: getGroupEmoji(macro),
      }))
      .sort((a, b) => b.value - a.value);
  }, [lancamentos, subcatCatFilter]);

  const subcatTotal = subcatData.reduce((s, c) => s + c.value, 0);
  const subcatMax = subcatData.length > 0 ? subcatData[0].value : 1;

  const catFilterOptions = [
    { key: null, label: "Todas" },
    ...SUBCATEGORIA_GROUPS.map((g) => ({ key: g.group, label: `${g.emoji} ${g.group}` })),
  ];

  const hasData = lancamentos.length > 0;
  const hasAnyData = allYearLancamentos.length > 0;

  const activeEntry = activePieIndex !== undefined ? composicao[activePieIndex] : null;

  const handlePieEnter = useCallback((_: any, index: number) => {
    setActivePieIndex(index);
  }, []);

  const handlePieLeave = useCallback(() => {
    setActivePieIndex(undefined);
  }, []);

  const CustomAnnualTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const r =
      payload.find((p: any) => p.dataKey === "receitasPast")?.value ??
      payload.find((p: any) => p.dataKey === "receitasFuture")?.value ??
      0;
    const d =
      payload.find((p: any) => p.dataKey === "despesasPast")?.value ??
      payload.find((p: any) => p.dataKey === "despesasFuture")?.value ??
      0;
    const resg =
      payload.find((p: any) => p.dataKey === "resgatesPast")?.value ??
      payload.find((p: any) => p.dataKey === "resgatesFuture")?.value ??
      0;
    const saldo = r - d;
    return (
      <div style={tooltipStyle} className="px-3 py-2.5 min-w-[140px]">
        <p className="text-xs font-bold text-foreground mb-1.5">{label}</p>
        <p className="text-[11px]" style={{ color: "#0D9488" }}>
          ↑ Receitas: {fmt(r)}
        </p>
        <p className="text-[11px]" style={{ color: "#6366F1" }}>
          ↓ Despesas: {fmt(d)}
        </p>
        {resg > 0 && (
          <p className="text-[11px]" style={{ color: "#EC4899" }}>
            ↕ Resgates: {fmt(resg)}
          </p>
        )}
        <div className="border-t border-border/30 mt-1.5 pt-1.5">
          <p className={`text-[11px] font-bold ${saldo >= 0 ? "text-primary" : "text-destructive"}`}>
            Saldo: {fmt(saldo)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen gradient-bg overflow-x-hidden pb-[90px] md:pb-6">
      <div className="px-4 pt-16 space-y-6 w-full max-w-4xl md:mx-auto">
        <h1 className="text-xl font-semibold text-foreground animate-fade-up">Gráficos</h1>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: "0.03s" }}>
          <button
            onClick={() =>
              setMesAtual((p) => {
                const d = new Date(p.year, p.month - 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })
            }
            className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[160px] text-center">{mesLabelFmt}</span>
          <button
            onClick={() =>
              setMesAtual((p) => {
                const d = new Date(p.year, p.month + 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })
            }
            className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {!hasData && !hasAnyData && !isLoading ? (
          <EmptyState title="Adicione lançamentos para ver seus gráficos 📊" />
        ) : (
          <>
            {/* ══ Annual Receitas vs Despesas — linha dupla com área ══ */}
            {hasAnyData && (
              <section className="glass-card p-4 animate-fade-up" style={{ animationDelay: "0.04s" }}>
                <h2 className="text-sm font-semibold text-foreground">Receitas vs Despesas vs Resgates — {currentYear}</h2>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Evolução mensal · linha tracejada = meses futuros
                </p>

                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={annualData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradRec" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0D9488" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#0D9488" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gradDesp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366F1" stopOpacity={0.22} />
                          <stop offset="100%" stopColor="#6366F1" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.25} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={fmtK}
                      />
                      <Tooltip content={<CustomAnnualTooltip />} />

                      {/* Área preenchida — passado */}
                      <Area
                        type="monotone"
                        dataKey="receitasPast"
                        stroke="#0D9488"
                        strokeWidth={2}
                        fill="url(#gradRec)"
                        dot={false}
                        connectNulls={false}
                        legendType="none"
                      />
                      <Area
                        type="monotone"
                        dataKey="despesasPast"
                        stroke="#6366F1"
                        strokeWidth={2}
                        fill="url(#gradDesp)"
                        dot={false}
                        connectNulls={false}
                        legendType="none"
                      />

                      {/* Linhas tracejadas — futuro */}
                      <Line
                        type="monotone"
                        dataKey="receitasFuture"
                        stroke="#0D9488"
                        strokeWidth={1.5}
                        strokeDasharray="5 4"
                        dot={false}
                        connectNulls={false}
                        legendType="none"
                        opacity={0.5}
                      />
                      <Line
                        type="monotone"
                        dataKey="despesasFuture"
                        stroke="#6366F1"
                        strokeWidth={1.5}
                        strokeDasharray="5 4"
                        dot={false}
                        connectNulls={false}
                        legendType="none"
                        opacity={0.5}
                      />

                      {/* Resgates — linha roxa */}
                      <Line
                        type="monotone"
                        dataKey="resgatesPast"
                        stroke="#EC4899"
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                        legendType="none"
                      />
                      <Line
                        type="monotone"
                        dataKey="resgatesFuture"
                        stroke="#EC4899"
                        strokeWidth={1.5}
                        strokeDasharray="5 4"
                        dot={false}
                        connectNulls={false}
                        legendType="none"
                        opacity={0.5}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Legenda */}
                <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: "#0D9488" }} />
                    <span className="text-[11px] text-muted-foreground font-medium">Receitas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: "#6366F1" }} />
                    <span className="text-[11px] text-muted-foreground font-medium">Despesas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: "#EC4899" }} />
                    <span className="text-[11px] text-muted-foreground font-medium">Resgates</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      <div className="w-2 h-0.5 mt-1.5 rounded-full bg-muted-foreground/50" />
                      <div className="w-1 h-0.5 mt-1.5 rounded-full bg-muted-foreground/50" />
                    </div>
                    <span className="text-[11px] text-muted-foreground">Futuro</span>
                  </div>
                </div>

                {/* Cards resumo */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div
                    className="rounded-xl p-2.5 text-center"
                    style={{ background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.2)" }}
                  >
                    <span className="text-[9px] uppercase tracking-wider block mb-1" style={{ color: "#0D9488" }}>
                      Receitas
                    </span>
                    <span className="text-xs font-bold" style={{ color: "#0D9488" }}>
                      {fmt(annualTotals.receitas)}
                    </span>
                  </div>
                  <div
                    className="rounded-xl p-2.5 text-center"
                    style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}
                  >
                    <span className="text-[9px] uppercase tracking-wider block mb-1" style={{ color: "#6366F1" }}>
                      Despesas
                    </span>
                    <span className="text-xs font-bold" style={{ color: "#6366F1" }}>
                      {fmt(annualTotals.despesas)}
                    </span>
                  </div>
                  <div
                    className="rounded-xl p-2.5 text-center"
                    style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
                  >
                    <span className="text-[9px] uppercase tracking-wider block mb-1" style={{ color: "#EC4899" }}>
                      Resgates
                    </span>
                    <span className="text-xs font-bold" style={{ color: "#EC4899" }}>
                      {fmt(annualTotals.resgates)}
                    </span>
                  </div>
                  <div
                    className="rounded-xl p-2.5 text-center"
                    style={{
                      background: annualTotals.saldo >= 0 ? "rgba(13,148,136,0.08)" : "rgba(217,112,82,0.08)",
                      border: `1px solid ${annualTotals.saldo >= 0 ? "rgba(13,148,136,0.2)" : "rgba(217,112,82,0.2)"}`,
                    }}
                  >
                    <span className="text-[9px] uppercase tracking-wider block mb-1 text-muted-foreground">
                      Saldo Acum.
                    </span>
                    <span
                      className="text-xs font-bold"
                      style={{ color: annualTotals.saldo >= 0 ? "#0D9488" : "#D97052" }}
                    >
                      {fmt(annualTotals.saldo)}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* Receitas vs Despesas mensal + Composição donut — lado a lado no iPad */}
            <div className="md:grid md:grid-cols-2 md:gap-4 space-y-6 md:space-y-0">
              {/* Monthly bars */}
              <section className="glass-card p-4 animate-fade-up" style={{ animationDelay: "0.05s" }}>
                <h2 className="text-sm font-semibold text-foreground mb-1">Receitas vs Despesas vs Resgates</h2>
                <p className="text-[11px] text-muted-foreground mb-4">{mesLabelFmt}</p>
                {(() => {
                  const maxVal = Math.max(totalReceitas, totalDespesas, totalResgatesMes, 1);
                  const BAR_MAX_H = 110;
                  const hRec = totalReceitas > 0 ? Math.max(10, Math.round((totalReceitas / maxVal) * BAR_MAX_H)) : 0;
                  const hDesp = totalDespesas > 0 ? Math.max(10, Math.round((totalDespesas / maxVal) * BAR_MAX_H)) : 0;
                  const hResg = totalResgatesMes > 0 ? Math.max(10, Math.round((totalResgatesMes / maxVal) * BAR_MAX_H)) : 0;
                  return (
                    <div className="flex justify-around px-4">
                      {/* Receitas column */}
                      <div className="flex flex-col items-center gap-2">
                        <div style={{ height: `${BAR_MAX_H}px`, display: "flex", alignItems: "flex-end" }}>
                          <div
                            className="w-14 rounded-t-xl transition-all duration-500"
                            style={{ height: `${hRec}px`, background: "#0D9488" }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">Receitas</span>
                        <span className="text-xs font-bold" style={{ color: "#0D9488" }}>
                          {fmt(totalReceitas)}
                        </span>
                      </div>

                      {/* Despesas column */}
                      <div className="flex flex-col items-center gap-2">
                        <div style={{ height: `${BAR_MAX_H}px`, display: "flex", alignItems: "flex-end" }}>
                          <div
                            className="w-14 rounded-t-xl transition-all duration-500"
                            style={{ height: `${hDesp}px`, background: "#6366F1" }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">Despesas</span>
                        <span className="text-xs font-bold" style={{ color: "#6366F1" }}>
                          {fmt(totalDespesas)}
                        </span>
                      </div>

                      {/* Resgates column */}
                      <div className="flex flex-col items-center gap-2">
                        <div style={{ height: `${BAR_MAX_H}px`, display: "flex", alignItems: "flex-end" }}>
                          <div
                            className="w-14 rounded-t-xl transition-all duration-500"
                            style={{ height: `${hResg}px`, background: "#EC4899" }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">Resgates</span>
                        <span className="text-xs font-bold" style={{ color: "#EC4899" }}>
                          {fmt(totalResgatesMes)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </section>

              {/* Composição por Categoria — Donut */}
              {composicao.length > 0 && (
                <section className="glass-card p-4 animate-fade-up" style={{ animationDelay: "0.1s" }}>
                  <h2 className="text-sm font-semibold text-foreground">Composição por Categoria</h2>
                  <p className="text-[11px] text-muted-foreground mb-4">{mesLabelFmt}</p>
                  <div className="relative h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={composicao}
                          dataKey="value"
                          innerRadius="55%"
                          outerRadius="72%"
                          paddingAngle={4}
                          stroke="none"
                          onMouseEnter={handlePieEnter}
                          onMouseLeave={handlePieLeave}
                          onClick={handlePieEnter}
                        >
                          {composicao.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.color}
                              opacity={activePieIndex === undefined || activePieIndex === i ? 1 : 0.4}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      {activeEntry ? (
                        <>
                          <span className="text-[11px] text-muted-foreground">
                            {(activeEntry as any).emoji || getGroupEmoji(activeEntry.name)} {activeEntry.name}
                          </span>
                          <span className="text-lg font-bold text-foreground tabular-nums">
                            {fmt(activeEntry.value)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {Math.round((activeEntry.value / totalMes) * 100)}%
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[11px] text-muted-foreground">Total</span>
                          <span className="text-lg font-bold text-foreground tabular-nums">{fmt(totalMes)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5 mt-3">
                    {composicao.map((c) => (
                      <div key={c.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
                          <span className="text-[11px] text-foreground">
                            {(c as any).emoji || getGroupEmoji(c.name)} {c.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-foreground tabular-nums">{fmt(c.value)}</span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {totalMes > 0 ? `${Math.round((c.value / totalMes) * 100)}%` : "0%"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Gastos por Subcategoria — Barras horizontais */}
              <section className="glass-card p-4 animate-fade-up" style={{ animationDelay: "0.15s" }}>
                <h2 className="text-sm font-semibold text-foreground mb-2">Gastos por Subcategoria</h2>

                <div className="grid grid-cols-4 md:grid-cols-3 gap-1.5 pb-3">
                  {catFilterOptions.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setSubcatCatFilter(opt.key)}
                      className={`px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all text-center ${subcatCatFilter === opt.key ? "bg-foreground/10 text-foreground" : "bg-secondary/40 text-muted-foreground hover:text-foreground"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {subcatData.length > 0 ? (
                  <div className="space-y-2">
                    {subcatData.map((item) => {
                      const pct = subcatMax > 0 ? Math.max(6, (item.value / subcatMax) * 100) : 6;
                      const pctTotal = subcatTotal > 0 ? Math.round((item.value / subcatTotal) * 100) : 0;
                      return (
                        <div key={item.name} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-foreground truncate flex-1 min-w-0">
                              {item.emoji} {item.name}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <span className="text-[11px] font-semibold text-foreground tabular-nums">
                                {fmt(item.value)}
                              </span>
                              <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                                {pctTotal}%
                              </span>
                            </div>
                          </div>
                          <div className="relative w-full h-[8px] rounded-full overflow-hidden bg-secondary">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${pct}%`, background: item.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Nenhum lançamento com subcategoria neste mês
                  </p>
                )}
              </section>
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Graficos;
