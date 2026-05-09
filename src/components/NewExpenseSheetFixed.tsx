import { useEffect, useMemo, useState } from "react";
import { X, CalendarIcon, Users } from "lucide-react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAddLancamento, useAddMultipleLancamentos, useLancamentos, type Lancamento } from "@/hooks/useLancamentos";
import { useCartoes } from "@/hooks/useCartoes";
import type { Cartao } from "@/hooks/useCartoes";
import { SUBCATEGORIA_GROUPS, detectCategoriaMacro, detectSubcategoria } from "@/lib/subcategorias";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  initialTipo?: "despesa" | "receita";
}

type Tipo = "despesa" | "receita";
type FormaPagamento = "Dinheiro" | "Crédito";
type PagoPor = "voce" | "adriano";
type ReceitaCat = "Salário" | "Reembolso Pais" | "Reembolso Adriano" | "Reembolso Luísa" | "Resgate";

const RECEITA_CATS: ReceitaCat[] = ["Salário", "Reembolso Pais", "Reembolso Adriano", "Reembolso Luísa", "Resgate"];
const receitaCatMap: Record<ReceitaCat, string> = {
  "Salário": "salario",
  "Reembolso Pais": "reembolso_pais",
  "Reembolso Adriano": "reembolso_adriano",
  "Reembolso Luísa": "reembolso_luisa",
  "Resgate": "resgate_investimento",
};
const reverseCatMap: Record<string, ReceitaCat> = {
  salario: "Salário",
  reembolso_pais: "Reembolso Pais",
  reembolso_adriano: "Reembolso Adriano",
  reembolso_luisa: "Reembolso Luísa",
  resgate_investimento: "Resgate",
};

function dateToStr(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function mesRef(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMesReferenciaFatura(dataCompra: Date, cartaoSelecionado: Cartao | null): string {
  if (!cartaoSelecionado) return mesRef(dataCompra);
  const diaCompra = dataCompra.getDate();
  const diaFecha = cartaoSelecionado.dia_fechamento;
  const diaVence = cartaoSelecionado.dia_vencimento ?? diaFecha + 5;
  const mesFechamento = diaCompra <= diaFecha ? dataCompra : addMonths(dataCompra, 1);
  const mesVencimento = diaVence > diaFecha ? mesFechamento : addMonths(mesFechamento, 1);
  return mesRef(mesVencimento);
}

function normalizeText(text?: string | null): string {
  return (text || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function getGroupForSub(sub: string | null) {
  if (!sub) return null;
  return SUBCATEGORIA_GROUPS.find((group) => group.items.some((item) => item.name === sub))?.group || null;
}

function makeUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function addMonthsKeepingDay(base: Date, months: number) {
  const tentative = addMonths(base, months);
  const lastDay = new Date(tentative.getFullYear(), tentative.getMonth() + 1, 0).getDate();
  return new Date(tentative.getFullYear(), tentative.getMonth(), Math.min(base.getDate(), lastDay));
}

export default function NewExpenseSheetFixed({ open, onClose, initialTipo = "despesa" }: Props) {
  const { data: cartoes = [] } = useCartoes();
  const { data: historicoLancamentos = [] } = useLancamentos();
  const addLancamento = useAddLancamento();
  const addMultiple = useAddMultipleLancamentos();

  const [tipo, setTipo] = useState<Tipo>(initialTipo);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState<Date>(new Date());
  const [subcategoria, setSubcategoria] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isPais, setIsPais] = useState(false);
  const [isVicente, setIsVicente] = useState(false);
  const [isLuisa, setIsLuisa] = useState(false);
  const [isAdriano, setIsAdriano] = useState(false);
  const [pagoPor, setPagoPor] = useState<PagoPor>("voce");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("Dinheiro");
  const [cartaoId, setCartaoId] = useState("");
  const [isParcelado, setIsParcelado] = useState(false);
  const [parcelas, setParcelas] = useState("2");
  const [recorrente, setRecorrente] = useState(false);
  const [diaRecorrencia, setDiaRecorrencia] = useState("1");
  const [receitaCat, setReceitaCat] = useState<ReceitaCat>("Salário");
  const [autoFillAppliedFor, setAutoFillAppliedFor] = useState("");
  const [showAutoFillHint, setShowAutoFillHint] = useState(false);
  const [manualTouched, setManualTouched] = useState({ subcategoria: false, pagamento: false, pais: false, adriano: false, receitaCat: false });

  const isPending = addLancamento.isPending || addMultiple.isPending;
  const cartaoSelecionado = useMemo(() => cartoes.find((cartao) => cartao.id === cartaoId) || null, [cartoes, cartaoId]);

  useEffect(() => {
    if (open) setTipo(initialTipo);
  }, [open, initialTipo]);

  useEffect(() => {
    if (isPais) {
      setIsAdriano(false);
      setPagoPor("voce");
    }
  }, [isPais]);

  const reset = () => {
    setTipo(initialTipo);
    setDescricao("");
    setValor("");
    setData(new Date());
    setSubcategoria(null);
    setSelectedGroup(null);
    setIsPais(false);
    setIsVicente(false);
    setIsLuisa(false);
    setIsAdriano(false);
    setPagoPor("voce");
    setFormaPagamento("Dinheiro");
    setCartaoId("");
    setIsParcelado(false);
    setParcelas("2");
    setRecorrente(false);
    setDiaRecorrencia("1");
    setReceitaCat("Salário");
    setAutoFillAppliedFor("");
    setShowAutoFillHint(false);
    setManualTouched({ subcategoria: false, pagamento: false, pais: false, adriano: false, receitaCat: false });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleValorChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setValor("");
      return;
    }
    const num = parseInt(digits, 10) / 100;
    setValor(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const getNumValor = () => parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0;

  const findHistoricoMatch = (texto: string, tipoAtual: Tipo): Lancamento | null => {
    const normalized = normalizeText(texto);
    if (normalized.length < 3) return null;
    const candidatos = historicoLancamentos.filter((l) => l.tipo === tipoAtual && normalizeText(l.descricao));
    const sorted = [...candidatos].sort((a, b) => {
      const dateCompare = new Date(b.data).getTime() - new Date(a.data).getTime();
      if (dateCompare !== 0) return dateCompare;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
    return sorted.find((l) => normalizeText(l.descricao) === normalized)
      || sorted.find((l) => normalizeText(l.descricao).startsWith(normalized))
      || sorted.find((l) => normalizeText(l.descricao).includes(normalized))
      || null;
  };

  useEffect(() => {
    const normalized = normalizeText(descricao);
    if (!normalized || normalized === autoFillAppliedFor) return;

    const match = findHistoricoMatch(descricao, tipo);
    if (!match) {
      if (tipo === "despesa" && !manualTouched.subcategoria) {
        const detected = detectSubcategoria(descricao);
        if (detected) {
          setSubcategoria(detected);
          setSelectedGroup(getGroupForSub(detected));
        }
      }
      setShowAutoFillHint(false);
      return;
    }

    setAutoFillAppliedFor(normalized);
    setShowAutoFillHint(true);

    if (tipo === "despesa") {
      if (!manualTouched.subcategoria && match.subcategoria) {
        setSubcategoria(match.subcategoria);
        setSelectedGroup(getGroupForSub(match.subcategoria));
      }
      if (!manualTouched.pagamento) {
        const credito = match.forma_pagamento === "credito" || !!match.cartao_id;
        setFormaPagamento(credito ? "Crédito" : "Dinheiro");
        setCartaoId(match.cartao_id || "");
      }
      if (!manualTouched.pais) {
        const pais = match.subcategoria_pais;
        setIsPais(!!pais && pais !== "Adriano");
        setIsVicente(pais === "Vicente");
        setIsLuisa(pais === "Luísa");
      }
      if (!manualTouched.adriano) {
        setIsAdriano(match.adriano === true || match.subcategoria_pais === "Adriano");
        setPagoPor(match.pago_por === "adriano" ? "adriano" : "voce");
      }
    } else if (!manualTouched.receitaCat && match.categoria) {
      setReceitaCat(reverseCatMap[match.categoria] || "Salário");
    }
  }, [descricao, tipo, historicoLancamentos, manualTouched, autoFillAppliedFor]);

  const buildBaseDespesa = (valorLinha: number, sharedGroupId: string | null, role: "principal" | "adriano" | null) => {
    const forma = formaPagamento === "Dinheiro" ? "dinheiro" : "credito";
    const cartao = formaPagamento === "Crédito" ? (cartaoId || cartoes[0]?.id || null) : null;
    const subPais = role === "adriano" ? "Adriano" : isPais ? (isVicente ? "Vicente" : isLuisa ? "Luísa" : "Pais") : null;
    return {
      descricao,
      valor: valorLinha,
      tipo: "despesa" as const,
      categoria: "despesa",
      subcategoria_pais: subPais,
      subcategoria: subcategoria || null,
      categoria_macro: detectCategoriaMacro(subcategoria || "") || null,
      pago: false,
      forma_pagamento: forma,
      cartao_id: cartao,
      adriano: role === "adriano",
      shared_group_id: sharedGroupId,
      shared_role: role,
      pago_por: pagoPor,
    };
  };

  const handleSave = async () => {
    if (!descricao.trim()) {
      toast.error("Preencha a descrição");
      return;
    }
    const numValor = getNumValor();
    if (numValor <= 0) {
      toast.error("Preencha o valor");
      return;
    }

    try {
      if (tipo === "receita") {
        if (recorrente) {
          const dia = parseInt(diaRecorrencia, 10) || 1;
          const paiId = makeUUID();
          const rows = Array.from({ length: 24 }, (_, i) => {
            const d = addMonthsKeepingDay(data, i);
            d.setDate(Math.min(dia, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
            return {
              descricao,
              valor: numValor,
              tipo: "receita" as const,
              categoria: receitaCatMap[receitaCat],
              subcategoria_pais: null,
              subcategoria: null,
              categoria_macro: null,
              data: dateToStr(d),
              mes_referencia: mesRef(d),
              parcela_atual: null,
              parcela_total: null,
              is_parcelado: false,
              parcelamento_id: null,
              pago: false,
              forma_pagamento: null,
              cartao_id: null,
              recorrente: true,
              dia_recorrencia: dia,
              recorrencia_ate: null,
              recorrencia_pai_id: paiId,
              adriano: false,
              shared_group_id: null,
              shared_role: null,
              pago_por: "voce",
            };
          });
          await addMultiple.mutateAsync(rows as any);
        } else {
          await addLancamento.mutateAsync({
            descricao,
            valor: numValor,
            tipo: "receita",
            categoria: receitaCatMap[receitaCat],
            subcategoria_pais: null,
            subcategoria: null,
            categoria_macro: null,
            data: dateToStr(data),
            mes_referencia: mesRef(data),
            parcela_atual: null,
            parcela_total: null,
            is_parcelado: false,
            parcelamento_id: null,
            pago: false,
            forma_pagamento: null,
            cartao_id: null,
            recorrente: false,
            dia_recorrencia: null,
            recorrencia_ate: null,
            recorrencia_pai_id: null,
            adriano: false,
            shared_group_id: null,
            shared_role: null,
            pago_por: "voce",
          } as any);
        }
        handleClose();
        return;
      }

      const sharedGroupId = isAdriano ? makeUUID() : null;
      const valorLinha = isAdriano ? numValor / 2 : numValor;
      const baseRow = buildBaseDespesa(valorLinha, sharedGroupId, isAdriano ? "principal" : null);
      const adrianoRow = isAdriano ? buildBaseDespesa(valorLinha, sharedGroupId, "adriano") : null;
      const rows: any[] = [];

      if (recorrente && !isParcelado) {
        const dia = parseInt(diaRecorrencia, 10) || 1;
        const paiId = makeUUID();
        for (let i = 0; i < 24; i++) {
          const d = addMonthsKeepingDay(data, i);
          d.setDate(Math.min(dia, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
          const common = {
            data: dateToStr(d),
            mes_referencia: formaPagamento === "Crédito" ? getMesReferenciaFatura(d, cartaoSelecionado) : mesRef(d),
            parcela_atual: null,
            parcela_total: null,
            is_parcelado: false,
            parcelamento_id: null,
            recorrente: true,
            dia_recorrencia: dia,
            recorrencia_ate: null,
            recorrencia_pai_id: paiId,
          };
          rows.push({ ...baseRow, ...common });
          if (adrianoRow) rows.push({ ...adrianoRow, ...common });
        }
      } else if (isParcelado) {
        const n = parseInt(parcelas, 10) || 2;
        const pId = makeUUID();
        for (let i = 0; i < n; i++) {
          const d = addMonthsKeepingDay(data, i);
          const common = {
            data: dateToStr(d),
            mes_referencia: formaPagamento === "Crédito" ? getMesReferenciaFatura(d, cartaoSelecionado) : mesRef(d),
            parcela_atual: i + 1,
            parcela_total: n,
            is_parcelado: true,
            parcelamento_id: pId,
            recorrente: false,
            dia_recorrencia: null,
            recorrencia_ate: null,
            recorrencia_pai_id: null,
          };
          rows.push({ ...baseRow, ...common });
          if (adrianoRow) rows.push({ ...adrianoRow, ...common });
        }
      } else {
        const common = {
          data: dateToStr(data),
          mes_referencia: formaPagamento === "Crédito" ? getMesReferenciaFatura(data, cartaoSelecionado) : mesRef(data),
          parcela_atual: null,
          parcela_total: null,
          is_parcelado: false,
          parcelamento_id: null,
          recorrente: false,
          dia_recorrencia: null,
          recorrencia_ate: null,
          recorrencia_pai_id: null,
        };
        rows.push({ ...baseRow, ...common });
        if (adrianoRow) rows.push({ ...adrianoRow, ...common });
      }

      if (rows.length === 1) await addLancamento.mutateAsync(rows[0]);
      else await addMultiple.mutateAsync(rows);
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar");
    }
  };

  if (!open) return null;

  const selectedGroupData = SUBCATEGORIA_GROUPS.find((group) => group.group === selectedGroup);

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={handleClose} />
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-border/40 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold">Nova {tipo === "receita" ? "Receita" : "Despesa"}</h2>
          <button onClick={handleClose} className="text-muted-foreground"><X size={22} /></button>
        </div>

        <div className="px-5 pt-4 pb-6 space-y-4">
          <div className="flex gap-1 p-1 rounded-xl bg-[#E8ECF5]">
            {(["despesa", "receita"] as const).map((t) => (
              <button key={t} onClick={() => setTipo(t)} className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all", tipo === t ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>{t === "receita" ? "💰 Receita" : "💸 Despesa"}</button>
            ))}
          </div>

          <div className="space-y-1">
            <Input placeholder="Digite a descrição..." value={descricao} onChange={(e) => setDescricao(e.target.value)} className="h-11 rounded-2xl border-2 border-[#E8ECF5] bg-[#E8ECF5]/30 px-4 text-sm font-medium" />
            {showAutoFillHint && <p className="text-[10px] text-emerald-600 px-1">✨ Preenchido com base no histórico</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="R$ 0,00" value={valor} onChange={(e) => handleValorChange(e.target.value)} inputMode="numeric" className="h-11 rounded-2xl border-2 border-[#E8ECF5] bg-[#E8ECF5]/30 px-4 text-sm font-bold" />
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-11 rounded-2xl border-2 border-[#E8ECF5] bg-[#E8ECF5]/30 px-4 text-sm font-medium text-left flex items-center justify-between"><span>{format(data, "dd/MM/yyyy", { locale: ptBR })}</span><CalendarIcon className="h-4 w-4 text-muted-foreground" /></button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={data} onSelect={(d) => d && setData(d)} locale={ptBR} /></PopoverContent>
            </Popover>
          </div>

          {tipo === "despesa" && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground px-1">Categoria</p>
                <div className="flex flex-wrap gap-2">
                  {SUBCATEGORIA_GROUPS.map((group) => (
                    <button key={group.group} onClick={() => { setSelectedGroup(group.group); setSubcategoria(null); setManualTouched((prev) => ({ ...prev, subcategoria: true })); }} className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-colors", selectedGroup === group.group ? "gradient-emerald text-primary-foreground" : "bg-[#E8ECF5] text-muted-foreground")}>{group.emoji} {group.group}</button>
                  ))}
                </div>
              </div>

              {selectedGroupData && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground px-1">Subcategoria</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedGroupData.items.map((item) => (
                      <button key={item.name} onClick={() => { setSubcategoria(item.name); setManualTouched((prev) => ({ ...prev, subcategoria: true })); }} className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-colors", subcategoria === item.name ? "gradient-emerald text-primary-foreground" : "bg-[#E8ECF5] text-muted-foreground")}>{item.emoji} {item.name}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground px-1">Forma de pagamento</p>
                <div className="flex gap-1 p-1 rounded-xl bg-[#E8ECF5]">
                  {(["Dinheiro", "Crédito"] as const).map((f) => (
                    <button key={f} onClick={() => { setFormaPagamento(f); setManualTouched((prev) => ({ ...prev, pagamento: true })); }} className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all", formaPagamento === f ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>{f === "Dinheiro" ? "💵 Dinheiro" : "💳 Crédito"}</button>
                  ))}
                </div>
              </div>

              {formaPagamento === "Crédito" && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground px-1">Cartão</p>
                  <div className="flex gap-2 flex-wrap">
                    {cartoes.map((c) => (
                      <button key={c.id} onClick={() => { setCartaoId(c.id); setManualTouched((prev) => ({ ...prev, pagamento: true })); }} className={cn("py-2 px-3 rounded-xl text-xs font-semibold transition-all", cartaoId === c.id ? "gradient-emerald text-primary-foreground" : "bg-[#E8ECF5] text-muted-foreground")}>{c.nome}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => { setIsParcelado((v) => !v); if (!isParcelado) setRecorrente(false); }} className={cn("flex-1 px-4 py-2.5 rounded-2xl border-2 text-sm font-medium", isParcelado ? "border-primary/40 bg-primary/5 text-primary" : "border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground")}>💳 Parcelar</button>
                <button onClick={() => { setRecorrente((v) => !v); if (!recorrente) setIsParcelado(false); }} className={cn("flex-1 px-4 py-2.5 rounded-2xl border-2 text-sm font-medium", recorrente ? "border-primary/40 bg-primary/5 text-primary" : "border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground")}>🔁 Recorrente</button>
              </div>

              {isParcelado && <Input type="number" min={2} max={48} value={parcelas} onChange={(e) => setParcelas(e.target.value)} className="h-10 rounded-2xl border-2 border-[#E8ECF5] bg-[#E8ECF5]/30 px-4 text-sm font-medium" placeholder="Parcelas" />}
              {recorrente && <Input type="number" min={1} max={31} value={diaRecorrencia} onChange={(e) => setDiaRecorrencia(e.target.value)} className="h-10 rounded-2xl border-2 border-[#E8ECF5] bg-[#E8ECF5]/30 px-4 text-sm font-medium" placeholder="Dia da recorrência" />}

              <button onClick={() => { setIsPais((v) => !v); setManualTouched((prev) => ({ ...prev, pais: true })); }} className={cn("w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all", isPais ? "border-amber-400 bg-amber-50" : "border-[#E8ECF5] bg-[#E8ECF5]")}>
                <div className="flex items-center gap-2"><Users size={15} className={isPais ? "text-amber-600" : "text-muted-foreground"} /><span className={cn("text-sm font-medium", isPais ? "text-amber-700" : "text-muted-foreground")}>Despesa dos Pais</span></div>
                <div className={cn("w-9 h-5 rounded-full flex items-center px-0.5", isPais ? "bg-amber-400 justify-end" : "bg-muted justify-start")}><div className="w-4 h-4 rounded-full bg-white shadow-sm" /></div>
              </button>

              {isPais && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setIsVicente((v) => !v); setIsLuisa(false); setManualTouched((prev) => ({ ...prev, pais: true })); }} className={cn("py-2 rounded-xl text-xs font-medium", isVicente ? "bg-green-100 text-green-700" : "bg-[#E8ECF5] text-muted-foreground")}>👦 Vicente</button>
                  <button onClick={() => { setIsLuisa((v) => !v); setIsVicente(false); setManualTouched((prev) => ({ ...prev, pais: true })); }} className={cn("py-2 rounded-xl text-xs font-medium", isLuisa ? "bg-pink-100 text-pink-700" : "bg-[#E8ECF5] text-muted-foreground")}>👩‍🦳 Luísa</button>
                </div>
              )}

              <button disabled={isPais} onClick={() => { setIsAdriano((v) => !v); setManualTouched((prev) => ({ ...prev, adriano: true })); }} className={cn("w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all", isPais ? "opacity-40 border-[#E8ECF5] bg-[#E8ECF5]" : isAdriano ? "border-blue-400 bg-blue-50" : "border-[#E8ECF5] bg-[#E8ECF5]")}>
                <span className={cn("text-sm font-medium", isAdriano ? "text-blue-700" : "text-muted-foreground")}>👨 Dividir com Adriano</span>
                <div className={cn("w-9 h-5 rounded-full flex items-center px-0.5", isAdriano ? "bg-blue-400 justify-end" : "bg-muted justify-start")}><div className="w-4 h-4 rounded-full bg-white shadow-sm" /></div>
              </button>

              {isAdriano && (
                <div className="flex gap-1 p-1 rounded-xl bg-[#E8ECF5]">
                  {([{ key: "voce", label: "🙋‍♀️ Eu paguei" }, { key: "adriano", label: "👨 Adriano pagou" }] as const).map((opt) => (
                    <button key={opt.key} onClick={() => { setPagoPor(opt.key); setManualTouched((prev) => ({ ...prev, adriano: true })); }} className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all", pagoPor === opt.key ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>{opt.label}</button>
                  ))}
                </div>
              )}
            </>
          )}

          {tipo === "receita" && (
            <>
              <div className="flex flex-wrap gap-2">
                {RECEITA_CATS.map((cat) => (
                  <button key={cat} onClick={() => { setReceitaCat(cat); setManualTouched((prev) => ({ ...prev, receitaCat: true })); }} className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-colors", receitaCat === cat ? "gradient-emerald text-primary-foreground" : "bg-[#E8ECF5] text-muted-foreground")}>{cat}</button>
                ))}
              </div>
              <button onClick={() => setRecorrente((v) => !v)} className={cn("w-full px-4 py-2.5 rounded-2xl border-2 text-sm font-medium", recorrente ? "border-primary/40 bg-primary/5 text-primary" : "border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground")}>🔁 Receita recorrente</button>
            </>
          )}

          <button onClick={handleSave} disabled={isPending} className="w-full py-3.5 rounded-2xl gradient-emerald text-white font-bold shadow-lg disabled:opacity-60 active:scale-[0.99] transition-transform">
            {isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </>
  );
}
