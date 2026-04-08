import React, { useState } from "react";
import { X, CalendarIcon, Users } from "lucide-react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAddLancamento, useAddMultipleLancamentos } from "@/hooks/useLancamentos";
import { useCartoes } from "@/hooks/useCartoes";
import type { Cartao } from "@/hooks/useCartoes";
import { SUBCATEGORIA_GROUPS, detectSubcategoria, detectCategoriaMacro } from "@/lib/subcategorias";
import { toast } from "sonner";

function getMesReferenciaFatura(dataCompra: Date, cartaoSelecionado: Cartao | null): string {
  if (!cartaoSelecionado) {
    return `${dataCompra.getFullYear()}-${String(dataCompra.getMonth() + 1).padStart(2, "0")}`;
  }
  const diaCompra = dataCompra.getDate();
  const diaFecha = cartaoSelecionado.dia_fechamento;
  const diaVence = cartaoSelecionado.dia_vencimento ?? diaFecha + 5;
  const mesFechamento = diaCompra <= diaFecha ? dataCompra : addMonths(dataCompra, 1);
  const mesVencimento = diaVence > diaFecha ? mesFechamento : addMonths(mesFechamento, 1);
  return `${mesVencimento.getFullYear()}-${String(mesVencimento.getMonth() + 1).padStart(2, "0")}`;
}

const RECEITA_CATS = ["Salário", "Reembolso Pais", "Resgate"] as const;
type ReceitaCat = (typeof RECEITA_CATS)[number];
const receitaCatMap: Record<ReceitaCat, string> = {
  "Salário": "salario", "Reembolso Pais": "reembolso_pais", "Resgate": "resgate_investimento",
};

interface Props {
  open: boolean;
  onClose: () => void;
  initialTipo?: "despesa" | "receita";
}

const NewExpenseSheet = ({ open, onClose, initialTipo = "despesa" }: Props) => {
  const { data: cartoes = [] } = useCartoes();
  const addLancamento = useAddLancamento();
  const addMultiple = useAddMultipleLancamentos();

  const [tipo, setTipo] = useState<"despesa" | "receita">(initialTipo);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState<Date>(new Date());
  const [subcategoria, setSubcategoria] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isPais, setIsPais] = useState(false);
  const [isVicente, setIsVicente] = useState(false);
  const [isLuisa, setIsLuisa] = useState(false);
  const [isAdriano, setIsAdriano] = useState(false);
  const [pagoPor, setPagoPor] = useState<'voce' | 'adriano'>('voce');
  const [formaPagamento, setFormaPagamento] = useState<"Dinheiro" | "Crédito">("Dinheiro");
  const [cartaoId, setCartaoId] = useState<string>("");
  const [isParcelado, setIsParcelado] = useState(false);
  const [parcelas, setParcelas] = useState("2");
  const [recorrente, setRecorrente] = useState(false);
  const [diaRecorrencia, setDiaRecorrencia] = useState("1");
  const [receitaCat, setReceitaCat] = useState<ReceitaCat>("Salário");

  const isPending = addLancamento.isPending || addMultiple.isPending;

  // Block split for dependents: only "voce" or "adriano" can split
  const canSplit = !isPais;
  React.useEffect(() => {
    if (isPais) { setIsAdriano(false); setPagoPor('voce'); }
  }, [isPais]);

  const reset = () => {
    setTipo(initialTipo); setDescricao(""); setValor(""); setData(new Date());
    setSubcategoria(null); setSelectedGroup(null); setIsPais(false); setIsVicente(false); setIsLuisa(false);
    setIsAdriano(false); setPagoPor('voce');
    setFormaPagamento("Dinheiro"); setCartaoId("");
    setIsParcelado(false); setParcelas("2");
    setRecorrente(false); setDiaRecorrencia("1");
    setReceitaCat("Salário");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleValorChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) { setValor(""); return; }
    const num = parseInt(digits, 10) / 100;
    setValor(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const getNumValor = () => parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0;

  const handleSave = async () => {
    if (!descricao.trim()) { toast.error("Preencha a descrição"); return; }
    if (getNumValor() <= 0) { toast.error("Preencha o valor"); return; }

    const numValor = getNumValor();
    const mesRef = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

    try {
      if (tipo === "receita") {
        if (recorrente) {
          const dia = parseInt(diaRecorrencia, 10) || 1;
          const paiId = crypto.randomUUID?.() ?? `${Date.now()}`;
          const rows: any[] = [];
          for (let i = 0; i < 24; i++) {
            const m = addMonths(data, i);
            const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
            rows.push({
              descricao, valor: numValor, tipo: "receita",
              categoria: receitaCatMap[receitaCat],
              subcategoria_pais: null, subcategoria: null, categoria_macro: null,
              data: `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}-${String(Math.min(dia,daysInMonth)).padStart(2,"0")}`,
              mes_referencia: `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}`,
              parcela_atual: null, parcela_total: null, is_parcelado: false, parcelamento_id: null,
              pago: false, forma_pagamento: null, cartao_id: null,
              recorrente: true, dia_recorrencia: dia, recorrencia_ate: null, recorrencia_pai_id: paiId,
              adriano: false, shared_group_id: null, shared_role: null, pago_por: 'voce',
            });
          }
          await addMultiple.mutateAsync(rows);
        } else {
          await addLancamento.mutateAsync({
            descricao, valor: numValor, tipo: "receita",
            categoria: receitaCatMap[receitaCat],
            subcategoria_pais: null, subcategoria: null, categoria_macro: null,
            data: format(data, "yyyy-MM-dd"), mes_referencia: mesRef,
            parcela_atual: null, parcela_total: null, is_parcelado: false,
            parcelamento_id: null, pago: false, forma_pagamento: null, cartao_id: null,
            recorrente: false, dia_recorrencia: null, recorrencia_ate: null, recorrencia_pai_id: null,
            adriano: false, shared_group_id: null, shared_role: null, pago_por: 'voce',
          });
        }
        handleClose(); return;
      }

      const macro = detectCategoriaMacro(subcategoria || "") || null;
      const forma = formaPagamento === "Dinheiro" ? "dinheiro" : "credito";
      const cartao = formaPagamento === "Crédito" ? (cartaoId || cartoes[0]?.id || null) : null;
      const subPais = isPais ? (isVicente ? "Vicente" : isLuisa ? "Luísa" : (subcategoria || macro || "Geral")) : null;
      const cartaoObj = cartao ? cartoes.find((c) => c.id === cartao) || null : null;

      // Se marcou Adriano, o valor principal é metade
      const valorPrincipal = isAdriano ? numValor / 2 : numValor;

      const baseRow = {
        descricao, valor: valorPrincipal, tipo: "despesa" as const, categoria: "despesa",
        subcategoria_pais: subPais, subcategoria: subcategoria || null, categoria_macro: macro,
        pago: false, forma_pagamento: forma, cartao_id: cartao,
        adriano: false, shared_group_id: null, shared_role: null, pago_por: pagoPor,
      };

      // Linha do Adriano (segunda metade)
      const adrianoRow = isAdriano ? {
        descricao, valor: numValor / 2, tipo: "despesa" as const, categoria: baseRow.categoria,
        subcategoria_pais: "Adriano", subcategoria: subcategoria || null, categoria_macro: macro,
        pago: false, forma_pagamento: forma, cartao_id: cartao,
        adriano: true, shared_group_id: null, shared_role: null, pago_por: pagoPor,
      } : null;

      if (isParcelado) {
        const nParcelas = parseInt(parcelas, 10) || 2;
        const parcelamentoId = crypto.randomUUID?.() ?? `${Date.now()}`;
        const parcelamentoIdAdriano = isAdriano ? (crypto.randomUUID?.() ?? `${Date.now()}-a`) : null;
        const rows: any[] = [];
        for (let i = 0; i < nParcelas; i++) {
          const d = addMonths(data, i);
          const dataStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(data.getDate()).padStart(2,"0")}`;
          rows.push({
            ...baseRow,
            data: dataStr,
            mes_referencia: getMesReferenciaFatura(d, cartaoObj),
            parcela_atual: i + 1, parcela_total: nParcelas,
            is_parcelado: true, parcelamento_id: parcelamentoId,
            recorrente: false, dia_recorrencia: null, recorrencia_ate: null, recorrencia_pai_id: null,
          });
          if (adrianoRow) {
            rows.push({
              ...adrianoRow,
              data: dataStr,
              mes_referencia: getMesReferenciaFatura(d, cartaoObj),
              parcela_atual: i + 1, parcela_total: nParcelas,
              is_parcelado: true, parcelamento_id: parcelamentoIdAdriano,
              recorrente: false, dia_recorrencia: null, recorrencia_ate: null, recorrencia_pai_id: null,
            });
          }
        }
        await addMultiple.mutateAsync(rows as any);
      } else if (recorrente) {
        const dia = parseInt(diaRecorrencia, 10) || 1;
        const paiId = crypto.randomUUID?.() ?? `${Date.now()}`;
        const paiIdAdriano = isAdriano ? (crypto.randomUUID?.() ?? `${Date.now()}-a`) : null;
        const rows: any[] = [];
        for (let i = 0; i < 24; i++) {
          const m = addMonths(data, i);
          const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
          const dataRecorrente = new Date(m.getFullYear(), m.getMonth(), Math.min(dia, daysInMonth));
          const dataStr = `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}-${String(Math.min(dia,daysInMonth)).padStart(2,"0")}`;
          rows.push({
            ...baseRow,
            data: dataStr,
            mes_referencia: getMesReferenciaFatura(dataRecorrente, cartaoObj),
            parcela_atual: null, parcela_total: null, is_parcelado: false, parcelamento_id: null,
            recorrente: true, dia_recorrencia: dia, recorrencia_ate: null, recorrencia_pai_id: paiId,
          });
          if (adrianoRow) {
            rows.push({
              ...adrianoRow,
              data: dataStr,
              mes_referencia: getMesReferenciaFatura(dataRecorrente, cartaoObj),
              parcela_atual: null, parcela_total: null, is_parcelado: false, parcelamento_id: null,
              recorrente: true, dia_recorrencia: dia, recorrencia_ate: null, recorrencia_pai_id: paiIdAdriano,
            });
          }
        }
        await addMultiple.mutateAsync(rows);
      } else {
        const mesRefFatura = forma === "credito" ? getMesReferenciaFatura(data, cartaoObj) : mesRef;
        const mainRow = {
          ...baseRow,
          data: format(data, "yyyy-MM-dd"),
          mes_referencia: mesRefFatura,
          parcela_atual: null, parcela_total: null, is_parcelado: false, parcelamento_id: null,
          recorrente: false, dia_recorrencia: null, recorrencia_ate: null, recorrencia_pai_id: null,
        };
        if (adrianoRow) {
          const adrianoFull = {
            ...adrianoRow,
            data: format(data, "yyyy-MM-dd"),
            mes_referencia: mesRefFatura,
            parcela_atual: null, parcela_total: null, is_parcelado: false, parcelamento_id: null,
            recorrente: false, dia_recorrencia: null, recorrencia_ate: null, recorrencia_pai_id: null,
          };
          await addMultiple.mutateAsync([mainRow, adrianoFull] as any);
        } else {
          await addLancamento.mutateAsync(mainRow as any);
        }
      }
      handleClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  return (
    <>
      <div
        className={cn("fixed inset-0 z-[60] bg-black/25 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none")}
        onClick={handleClose}
      />
      <div
        className={cn("fixed inset-x-0 bottom-0 z-[70] rounded-t-[28px] bg-white border-t border-border transition-transform duration-300 ease-out max-h-[92vh] overflow-y-auto",
          open ? "translate-y-0" : "translate-y-full")}
      >
        <div className="flex justify-center pt-3 sticky top-0 bg-white z-10">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pt-3 pb-10 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Nova transação</h2>
            <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-secondary">
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>

          {/* Tipo */}
          <div className="flex gap-1 p-1 rounded-2xl bg-[#E8ECF5]">
            {(["despesa", "receita"] as const).map((t) => (
              <button key={t} onClick={() => setTipo(t)}
                className={cn("flex-1 py-2 rounded-xl text-sm font-semibold transition-all",
                  tipo === t ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>
                {t === "despesa" ? "💸 Despesa" : "💰 Receita"}
              </button>
            ))}
          </div>

          {/* Valor */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground font-medium">R$</span>
            <Input placeholder="0,00" value={valor} onChange={(e) => handleValorChange(e.target.value)}
              className="bg-[#E8ECF5] border-0 pl-12 text-2xl font-bold h-14 rounded-2xl"
              inputMode="numeric" />
          </div>

          {/* Descrição */}
          <Input
            placeholder={tipo === "despesa" ? "Descrição (ex: Supermercado)" : "Descrição (ex: Salário março)"}
            value={descricao}
            onChange={(e) => {
              setDescricao(e.target.value);
              if (tipo === "despesa" && !subcategoria) {
                const det = detectSubcategoria(e.target.value);
                if (det) setSubcategoria(det);
              }
            }}
            className="bg-[#E8ECF5] border-0 rounded-2xl"
          />

          {/* Data */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#E8ECF5] text-sm text-foreground">
                <CalendarIcon size={14} className="text-muted-foreground" />
                {format(data, "dd 'de' MMMM, yyyy", { locale: ptBR })}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[80]" align="start">
              <Calendar mode="single" selected={data} onSelect={(d) => d && setData(d)} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          {/* ── DESPESA ── */}
          {tipo === "despesa" && (
            <>
              {/* Pagamento */}
              <div className="flex gap-1 p-1 rounded-2xl bg-[#E8ECF5]">
                {(["Dinheiro", "Crédito"] as const).map((f) => (
                  <button key={f} onClick={() => setFormaPagamento(f)}
                    className={cn("flex-1 py-2 rounded-xl text-sm font-semibold transition-all",
                      formaPagamento === f ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>
                    {f === "Dinheiro" ? "💵 Dinheiro" : "💳 Crédito"}
                  </button>
                ))}
              </div>

              {formaPagamento === "Crédito" && cartoes.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {cartoes.map((c) => (
                    <button key={c.id} onClick={() => setCartaoId(c.id)}
                      className={cn("px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors",
                        cartaoId === c.id || (!cartaoId && cartoes[0]?.id === c.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white border-border text-muted-foreground")}>
                      {c.nome}
                    </button>
                  ))}
                </div>
              )}

              {/* Parcelado / Recorrente */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setIsParcelado(v => !v); if (!isParcelado) setRecorrente(false); }}
                  className={cn("flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium border transition-all",
                    isParcelado ? "border-primary/40 bg-primary/5 text-primary" : "border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground")}>
                  <span>📆 Parcelado</span>
                  {isParcelado && (
                    <input type="number" min={2} max={48} value={parcelas}
                      onChange={(e) => setParcelas(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-10 text-center bg-white rounded-lg border border-border text-xs font-bold text-foreground"
                      inputMode="numeric" />
                  )}
                </button>
                <button
                  onClick={() => { setRecorrente(v => !v); if (!recorrente) setIsParcelado(false); }}
                  className={cn("flex-1 flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-medium border transition-all",
                    recorrente ? "border-primary/40 bg-primary/5 text-primary" : "border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground")}>
                  🔁 Recorrente
                </button>
              </div>

              {recorrente && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-muted-foreground">Repetir no dia</span>
                  <Input type="number" min={1} max={31} value={diaRecorrencia}
                    onChange={(e) => setDiaRecorrencia(e.target.value)}
                    className="bg-[#E8ECF5] border-0 w-16 text-center rounded-xl" inputMode="numeric" />
                  <span className="text-xs text-muted-foreground">de cada mês</span>
                </div>
              )}

              {/* Categoria — Grid de ícones + expand */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Categoria <span className="opacity-50">(opcional)</span></p>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {SUBCATEGORIA_GROUPS.map((group) => {
                    const isActive = selectedGroup === group.group;
                    const hasSelection = group.items.some((i) => i.name === subcategoria);
                    return (
                      <button key={group.group}
                        onClick={() => setSelectedGroup(isActive ? null : group.group)}
                        className={cn(
                          "flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all",
                          isActive
                            ? "bg-primary/10 ring-2 ring-primary"
                            : hasSelection
                              ? "bg-primary/5 ring-1 ring-primary/30"
                              : "bg-[#E8ECF5]",
                        )}>
                        <span className="text-xl">{group.emoji}</span>
                        <span className={cn("text-[9px] font-medium",
                          isActive ? "text-primary" : hasSelection ? "text-primary/70" : "text-muted-foreground")}>
                          {group.group}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedGroup && (() => {
                  const group = SUBCATEGORIA_GROUPS.find((g) => g.group === selectedGroup);
                  if (!group) return null;
                  return (
                    <div className="rounded-xl p-2.5 space-y-1.5" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)" }}>
                      <p className="text-[9px] font-semibold text-primary uppercase tracking-wider">{group.group}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.items.map((item) => (
                          <button key={item.name}
                            onClick={() => setSubcategoria(subcategoria === item.name ? null : item.name)}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                              subcategoria === item.name
                                ? "bg-primary text-primary-foreground"
                                : "bg-white border border-border text-muted-foreground",
                            )}>
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Toggle Pais */}
              <button
                onClick={() => { setIsPais(v => { if (v) { setIsVicente(false); setIsLuisa(false); } return !v; }); }}
                className={cn("w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all",
                  isPais ? "border-amber-400 bg-amber-50" : "border-[#E8ECF5] bg-[#E8ECF5]")}>
                <div className="flex items-center gap-2">
                  <Users size={15} className={isPais ? "text-amber-600" : "text-muted-foreground"} />
                  <span className={cn("text-sm font-medium", isPais ? "text-amber-700" : "text-muted-foreground")}>
                    Despesa dos Pais
                  </span>
                </div>
                <div className={cn("w-9 h-5 rounded-full flex items-center px-0.5 transition-all",
                  isPais ? "bg-amber-400 justify-end" : "bg-muted justify-start")}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </button>

              {/* Toggle Vicente (sub-option under Pais) */}
              {isPais && (
                <button
                  onClick={() => { setIsVicente(v => { if (!v) setIsLuisa(false); return !v; }); }}
                  className={cn("w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all",
                    isVicente ? "border-green-400 bg-green-50" : "border-[#E8ECF5] bg-[#E8ECF5]")}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">👦</span>
                    <span className={cn("text-sm font-medium", isVicente ? "text-green-700" : "text-muted-foreground")}>
                      Despesa do Vicente
                    </span>
                  </div>
                  <div className={cn("w-9 h-5 rounded-full flex items-center px-0.5 transition-all",
                    isVicente ? "bg-green-400 justify-end" : "bg-muted justify-start")}>
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </div>
                </button>
              )}

              {/* Toggle Luísa (sub-option under Pais) */}
              {isPais && (
                <button
                  onClick={() => { setIsLuisa(v => { if (!v) setIsVicente(false); return !v; }); }}
                  className={cn("w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all",
                    isLuisa ? "border-pink-400 bg-pink-50" : "border-[#E8ECF5] bg-[#E8ECF5]")}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">👩‍🦳</span>
                    <span className={cn("text-sm font-medium", isLuisa ? "text-pink-700" : "text-muted-foreground")}>
                      Despesa da Luísa
                    </span>
                  </div>
                  <div className={cn("w-9 h-5 rounded-full flex items-center px-0.5 transition-all",
                    isLuisa ? "bg-pink-400 justify-end" : "bg-muted justify-start")}>
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </div>
                </button>
              )}

              {/* Toggle Dividir com Adriano (independent, only when NOT Pais) */}
              <button
                onClick={() => { if (canSplit) setIsAdriano(v => !v); }}
                disabled={!canSplit}
                className={cn("w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all",
                  !canSplit ? "opacity-40 cursor-not-allowed border-[#E8ECF5] bg-[#E8ECF5]" :
                  isAdriano ? "border-blue-400 bg-blue-50" : "border-[#E8ECF5] bg-[#E8ECF5]")}>
                <div className="flex items-center gap-2">
                  <span className="text-base">👨</span>
                  <span className={cn("text-sm font-medium", isAdriano ? "text-blue-700" : "text-muted-foreground")}>
                    Dividir com Adriano
                  </span>
                </div>
                <div className={cn("w-9 h-5 rounded-full flex items-center px-0.5 transition-all",
                  isAdriano ? "bg-blue-400 justify-end" : "bg-muted justify-start")}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </button>
              {isAdriano && (
                <div className="space-y-2 px-1 -mt-1">
                  <p className="text-[10px] text-blue-600">
                    O valor será dividido por 2. Metade fica na sua despesa, metade vai para a aba Pais &gt; Adriano.
                  </p>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Quem pagou?</p>
                    <div className="flex gap-1 p-1 rounded-xl bg-[#E8ECF5]">
                      {([{ key: 'voce', label: '🙋‍♀️ Eu' }, { key: 'adriano', label: '👨 Adriano' }] as const).map(opt => (
                        <button key={opt.key} onClick={() => setPagoPor(opt.key as 'voce' | 'adriano')}
                          className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                            pagoPor === opt.key ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {!canSplit && (
                <p className="text-[10px] text-amber-600 px-4 -mt-2">
                  Despesas de Pais/Vicente/Luísa não podem ser divididas.
                </p>
              )}
            </>
          )}

          {/* ── RECEITA ── */}
          {tipo === "receita" && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {RECEITA_CATS.map((cat) => (
                  <button key={cat} onClick={() => setReceitaCat(cat)}
                    className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                      receitaCat === cat ? "gradient-emerald text-primary-foreground" : "bg-[#E8ECF5] text-muted-foreground")}>
                    {cat}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setRecorrente(v => !v)}
                className={cn("w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all",
                  recorrente ? "border-primary/40 bg-primary/5" : "border-[#E8ECF5] bg-[#E8ECF5]")}>
                <span className={cn("text-sm font-medium", recorrente ? "text-primary" : "text-muted-foreground")}>
                  🔁 Receita recorrente
                </span>
                <div className={cn("w-9 h-5 rounded-full flex items-center px-0.5 transition-all",
                  recorrente ? "bg-primary justify-end" : "bg-muted justify-start")}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </button>
              {recorrente && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-muted-foreground">Repetir no dia</span>
                  <input type="number" min={1} max={31} value={diaRecorrencia}
                    onChange={(e) => setDiaRecorrencia(e.target.value)}
                    className="w-16 text-center bg-[#E8ECF5] border-0 rounded-xl px-2 py-1.5 text-sm font-bold" />
                  <span className="text-xs text-muted-foreground">de cada mês</span>
                </div>
              )}
            </div>
          )}

          {/* Salvar */}
          <button
            onClick={handleSave}
            disabled={isPending}
            className={cn("w-full h-12 font-semibold text-sm rounded-2xl text-white transition-all disabled:opacity-50",
              isLuisa ? "bg-pink-500" :
              isAdriano ? "bg-blue-500" :
              isVicente ? "bg-green-500" :
              isPais ? "bg-amber-500" :
              "gradient-emerald")}>
            {isPending ? "Salvando..." :
              isLuisa ? "👩‍🦳 Salvar despesa da Luísa" :
              isAdriano ? "👨 Salvar dividido com Adriano" :
              isVicente ? "👦 Salvar despesa do Vicente" :
              isPais ? "🧓 Salvar despesa dos pais" :
              tipo === "receita" ? "💰 Salvar receita" :
              isParcelado ? `💳 Salvar em ${parcelas}x` :
              recorrente ? "🔁 Salvar recorrente" :
              "💸 Salvar despesa"}
          </button>
        </div>
      </div>
    </>
  );
};

export default NewExpenseSheet;
