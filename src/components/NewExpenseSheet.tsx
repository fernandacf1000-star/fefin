import React, { useState, useEffect } from “react”;
import { X, CalendarIcon, Users } from “lucide-react”;
import { format, addMonths } from “date-fns”;
import { ptBR } from “date-fns/locale”;
import { cn } from “@/lib/utils”;
import { Input } from “@/components/ui/input”;
import { Calendar } from “@/components/ui/calendar”;
import { Popover, PopoverContent, PopoverTrigger } from “@/components/ui/popover”;
import { useAddLancamento, useAddMultipleLancamentos, useLancamentos } from “@/hooks/useLancamentos”;
import { useCartoes } from “@/hooks/useCartoes”;
import type { Cartao } from “@/hooks/useCartoes”;
import { SUBCATEGORIA_GROUPS, detectSubcategoria, detectCategoriaMacro } from “@/lib/subcategorias”;
import { toast } from “sonner”;

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

const RECEITA_CATS = [“Salário”, “Reembolso Pais”, “Reembolso Adriano”, “Reembolso Luísa”, “Resgate”] as const;
type ReceitaCat = (typeof RECEITA_CATS)[number];
const receitaCatMap: Record<ReceitaCat, string> = {
“Salário”: “salario”,
“Reembolso Pais”: “reembolso_pais”,
“Reembolso Adriano”: “reembolso_adriano”,
“Reembolso Luísa”: “reembolso_luisa”,
“Resgate”: “resgate_investimento”,
};

// Reverse map para receitas
const reverseCatMap: Record<string, ReceitaCat> = {
“salario”: “Salário”,
“reembolso_pais”: “Reembolso Pais”,
“reembolso_adriano”: “Reembolso Adriano”,
“reembolso_luisa”: “Reembolso Luísa”,
“resgate_investimento”: “Resgate”,
};

interface Props {
open: boolean;
onClose: () => void;
initialTipo?: “despesa” | “receita”;
}

// Normalize text for matching
function normalizeText(text: string): string {
return text
.trim()
.toLowerCase()
.normalize(“NFD”)
.replace(/[\u0300-\u036f]/g, “”) // Remove accents
.replace(/\s+/g, “ “); // Multiple spaces to single space
}

const NewExpenseSheet = ({ open, onClose, initialTipo = “despesa” }: Props) => {
const { data: cartoes = [] } = useCartoes();
const { data: historicoLancamentos = [] } = useLancamentos();
const addLancamento = useAddLancamento();
const addMultiple = useAddMultipleLancamentos();

const [tipo, setTipo] = useState<“despesa” | “receita”>(initialTipo);
const [descricao, setDescricao] = useState(””);
const [valor, setValor] = useState(””);
const [data, setData] = useState<Date>(new Date());
const [subcategoria, setSubcategoria] = useState<string | null>(null);
const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
const [isPais, setIsPais] = useState(false);
const [isVicente, setIsVicente] = useState(false);
const [isLuisa, setIsLuisa] = useState(false);
const [isAdriano, setIsAdriano] = useState(false);
const [pagoPor, setPagoPor] = useState<‘voce’ | ‘adriano’>(‘voce’);
const [formaPagamento, setFormaPagamento] = useState<“Dinheiro” | “Crédito”>(“Dinheiro”);
const [cartaoId, setCartaoId] = useState<string>(””);
const [isParcelado, setIsParcelado] = useState(false);
const [parcelas, setParcelas] = useState(“2”);
const [recorrente, setRecorrente] = useState(false);
const [diaRecorrencia, setDiaRecorrencia] = useState(“1”);
const [receitaCat, setReceitaCat] = useState<ReceitaCat>(“Salário”);

// Autocomplete state
const [autoFillAppliedFor, setAutoFillAppliedFor] = useState(””);
const [showAutoFillHint, setShowAutoFillHint] = useState(false);
const [manualTouched, setManualTouched] = useState({
subcategoria: false,
pagamento: false,
pais: false,
adriano: false,
receitaCat: false,
});

const isPending = addLancamento.isPending || addMultiple.isPending;

// Block split for dependents: only “voce” or “adriano” can split
const canSplit = !isPais;
React.useEffect(() => {
if (isPais) { setIsAdriano(false); setPagoPor(‘voce’); }
}, [isPais]);

// Find historical match for autocomplete
const findHistoricoMatch = (texto: string, tipoAtual: “despesa” | “receita”) => {
const normalized = normalizeText(texto);
if (normalized.length < 3) return null;

```
// Filter by tipo and non-empty descriptions
const candidatos = historicoLancamentos.filter(
  (l) => l.tipo === tipoAtual && l.descricao && l.descricao.trim() !== ""
);

if (candidatos.length === 0) return null;

// Sort by most recent (data DESC, created_at DESC)
const sorted = [...candidatos].sort((a, b) => {
  const dateCompare = new Date(b.data).getTime() - new Date(a.data).getTime();
  if (dateCompare !== 0) return dateCompare;
  return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
});

// Try exact match first
let match = sorted.find((l) => normalizeText(l.descricao || "") === normalized);
if (match) return match;

// Then starts with
match = sorted.find((l) => normalizeText(l.descricao || "").startsWith(normalized));
if (match) return match;

// Finally contains
match = sorted.find((l) => normalizeText(l.descricao || "").includes(normalized));
return match || null;
```

};

// Apply autocomplete when description changes
useEffect(() => {
if (!descricao || descricao === autoFillAppliedFor) return;

```
const match = findHistoricoMatch(descricao, tipo);

if (match) {
  setAutoFillAppliedFor(descricao);
  setShowAutoFillHint(true);

  if (tipo === "despesa") {
    // Fill despesa fields only if not manually touched
    if (!manualTouched.subcategoria && match.subcategoria) {
      setSubcategoria(match.subcategoria);
      
      // Find matching group
      const group = Object.keys(SUBCATEGORIA_GROUPS).find((g) =>
        SUBCATEGORIA_GROUPS[g].includes(match.subcategoria || "")
      );
      if (group) setSelectedGroup(group);
    }

    if (!manualTouched.pagamento) {
      // Set forma_pagamento
      if (match.forma_pagamento === "credito" || match.cartao_id) {
        setFormaPagamento("Crédito");
        if (match.cartao_id) setCartaoId(match.cartao_id);
      } else {
        setFormaPagamento("Dinheiro");
      }
    }

    if (!manualTouched.pais) {
      // Set Pais/Vicente/Luísa
      if (match.subcategoria_pais && match.subcategoria_pais !== "Adriano") {
        setIsPais(true);
        if (match.subcategoria_pais === "Vicente") {
          setIsVicente(true);
          setIsLuisa(false);
        } else if (match.subcategoria_pais === "Luísa") {
          setIsLuisa(true);
          setIsVicente(false);
        } else {
          setIsVicente(false);
          setIsLuisa(false);
        }
      } else {
        setIsPais(false);
        setIsVicente(false);
        setIsLuisa(false);
      }
    }

    if (!manualTouched.adriano) {
      // Set Adriano split
      if (match.adriano === true || match.subcategoria_pais === "Adriano") {
        setIsAdriano(true);
      } else {
        setIsAdriano(false);
      }
    }

    // Set pago_por (always apply from history unless manually touched)
    if (!manualTouched.adriano) {
      if (match.pago_por === "adriano") {
        setPagoPor("adriano");
      } else {
        setPagoPor("voce");
      }
    }

  } else if (tipo === "receita") {
    // Fill receita fields
    if (!manualTouched.receitaCat && match.categoria) {
      const mappedCat = reverseCatMap[match.categoria];
      if (mappedCat) {
        setReceitaCat(mappedCat);
      }
    }
  }
} else {
  // No match - try regex detection for despesa
  if (tipo === "despesa" && !manualTouched.subcategoria) {
    const detected = detectSubcategoria(descricao);
    if (detected) {
      setSubcategoria(detected);
      const group = Object.keys(SUBCATEGORIA_GROUPS).find((g) =>
        SUBCATEGORIA_GROUPS[g].includes(detected)
      );
      if (group) setSelectedGroup(group);
    }
  }
  setShowAutoFillHint(false);
}
```

}, [descricao, tipo, historicoLancamentos, manualTouched, autoFillAppliedFor]);

const reset = () => {
setTipo(initialTipo); setDescricao(””); setValor(””); setData(new Date());
setSubcategoria(null); setSelectedGroup(null); setIsPais(false); setIsVicente(false); setIsLuisa(false);
setIsAdriano(false); setPagoPor(‘voce’);
setFormaPagamento(“Dinheiro”); setCartaoId(””);
setIsParcelado(false); setParcelas(“2”);
setRecorrente(false); setDiaRecorrencia(“1”);
setReceitaCat(“Salário”);
setAutoFillAppliedFor(””);
setShowAutoFillHint(false);
setManualTouched({
subcategoria: false,
pagamento: false,
pais: false,
adriano: false,
receitaCat: false,
});
};

const handleClose = () => { reset(); onClose(); };

const handleValorChange = (raw: string) => {
const digits = raw.replace(/\D/g, “”);
if (!digits) { setValor(””); return; }
const num = parseInt(digits, 10) / 100;
setValor(num.toLocaleString(“pt-BR”, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
};

const getNumValor = () => parseFloat(valor.replace(/./g, “”).replace(”,”, “.”)) || 0;

const handleSave = async () => {
if (!descricao.trim()) { toast.error(“Preencha a descrição”); return; }
if (getNumValor() <= 0) { toast.error(“Preencha o valor”); return; }

```
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
  const subPais = isPais ? (isVicente ? "Vicente" : isLuisa ? "Luísa" : "Pais") : null;
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
    ...baseRow, valor: numValor / 2, adriano: true, pago_por: pagoPor === 'voce' ? 'adriano' : 'voce',
    subcategoria_pais: "Adriano",
  } : null;

  if (recorrente && !isParcelado) {
    const dia = parseInt(diaRecorrencia, 10) || 1;
    const paiId = crypto.randomUUID?.() ?? `${Date.now()}`;
    const rows: any[] = [];
    for (let i = 0; i < 24; i++) {
      const m = addMonths(data, i);
      const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      const dataRecorrente = `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}-${String(Math.min(dia,daysInMonth)).padStart(2,"0")}`;
      rows.push({
        ...baseRow, data: dataRecorrente,
        mes_referencia: cartao ? getMesReferenciaFatura(new Date(dataRecorrente), cartaoObj) : `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}`,
        recorrente: true, dia_recorrencia: dia, recorrencia_pai_id: paiId, parcela_atual: null, parcela_total: null, parcelamento_id: null, is_parcelado: false,
      });
      if (adrianoRow) {
        rows.push({
          ...adrianoRow, data: dataRecorrente,
          mes_referencia: cartao ? getMesReferenciaFatura(new Date(dataRecorrente), cartaoObj) : `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}`,
          recorrente: true, dia_recorrencia: dia, recorrencia_pai_id: paiId, parcela_atual: null, parcela_total: null, parcelamento_id: null, is_parcelado: false,
        });
      }
    }
    await addMultiple.mutateAsync(rows);
    handleClose(); return;
  }

  if (isParcelado) {
    const n = parseInt(parcelas, 10) || 2;
    const pId = crypto.randomUUID?.() ?? `${Date.now()}`;
    const rows: any[] = [];
    for (let i = 0; i < n; i++) {
      const m = addMonths(data, i);
      const dataStr = format(m, "yyyy-MM-dd");
      rows.push({
        ...baseRow, data: dataStr,
        mes_referencia: cartao ? getMesReferenciaFatura(m, cartaoObj) : `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}`,
        parcela_atual: i + 1, parcela_total: n, is_parcelado: true, parcelamento_id: pId,
        recorrente: false, dia_recorrencia: null, recorrencia_pai_id: null,
      });
      if (adrianoRow) {
        rows.push({
          ...adrianoRow, data: dataStr,
          mes_referencia: cartao ? getMesReferenciaFatura(m, cartaoObj) : `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}`,
          parcela_atual: i + 1, parcela_total: n, is_parcelado: true, parcelamento_id: pId,
          recorrente: false, dia_recorrencia: null, recorrencia_pai_id: null,
        });
      }
    }
    await addMultiple.mutateAsync(rows);
    handleClose(); return;
  }

  const dataStr = format(data, "yyyy-MM-dd");
  const mesRefFinal = cartao ? getMesReferenciaFatura(data, cartaoObj) : mesRef;
  await addLancamento.mutateAsync({
    ...baseRow, data: dataStr, mes_referencia: mesRefFinal,
    parcela_atual: null, parcela_total: null, is_parcelado: false, parcelamento_id: null,
    recorrente: false, dia_recorrencia: null, recorrencia_pai_id: null,
  });
  if (adrianoRow) {
    await addLancamento.mutateAsync({
      ...adrianoRow, data: dataStr, mes_referencia: mesRefFinal,
      parcela_atual: null, parcela_total: null, is_parcelado: false, parcelamento_id: null,
      recorrente: false, dia_recorrencia: null, recorrencia_pai_id: null,
    });
  }
  handleClose();
} catch (err) {
  console.error("Error saving:", err);
  toast.error("Erro ao salvar");
}
```

};

if (!open) return null;

return (
<>
<div className="fixed inset-0 bg-black/20 z-40" onClick={handleClose} />
<div className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto">
<div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-border/40 flex items-center justify-between z-10">
<h2 className="text-lg font-bold">Nova {tipo === “receita” ? “Receita” : “Despesa”}</h2>
<button onClick={handleClose} className="text-muted-foreground"><X size={22} /></button>
</div>

```
    <div className="px-5 pt-4 pb-6 space-y-4">
      {/* Tipo toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-[#E8ECF5]">
        {(["despesa", "receita"] as const).map((t) => (
          <button key={t} onClick={() => setTipo(t)}
            className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
              tipo === t ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>
            {t === "receita" ? "💰 Receita" : "💸 Despesa"}
          </button>
        ))}
      </div>

      {/* Descrição */}
      <div className="space-y-1">
        <Input
          placeholder="Digite a descrição..."
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="h-11 rounded-2xl border-2 border-[#E8ECF5] bg-[#E8ECF5]/30 px-4 text-sm font-medium"
        />
        {showAutoFillHint && (
          <p className="text-[10px] text-emerald-600 px-1">
            ✨ Preenchido com base no histórico
          </p>
        )}
      </div>

      {/* Valor e Data */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder="R$ 0,00"
          value={valor}
          onChange={(e) => handleValorChange(e.target.value)}
          inputMode="numeric"
          className="h-11 rounded-2xl border-2 border-[#E8ECF5] bg-[#E8ECF5]/30 px-4 text-sm font-bold"
        />
        <Popover>
          <PopoverTrigger asChild>
            <button className="h-11 rounded-2xl border-2 border-[#E8ECF5] bg-[#E8ECF5]/30 px-4 text-sm font-medium text-left flex items-center justify-between">
              <span>{format(data, "dd/MM/yyyy", { locale: ptBR })}</span>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={data} onSelect={(d) => d && setData(d)} locale={ptBR} /></PopoverContent>
        </Popover>
      </div>

      {/* ── DESPESA ── */}
      {tipo === "despesa" && (
        <>
          {/* Categoria */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground px-1">Categoria</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(SUBCATEGORIA_GROUPS).map((group) => (
                <button key={group}
                  onClick={() => { 
                    setSelectedGroup(group); 
                    setSubcategoria(null); 
                    setManualTouched(prev => ({ ...prev, subcategoria: true }));
                  }}
                  className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                    selectedGroup === group ? "gradient-emerald text-primary-foreground" : "bg-[#E8ECF5] text-muted-foreground")}>
                  {group}
                </button>
              ))}
            </div>
          </div>

          {/* Subcategoria */}
          {selectedGroup && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-1">Subcategoria</p>
              <div className="flex flex-wrap gap-2">
                {SUBCATEGORIA_GROUPS[selectedGroup].map((sub) => (
                  <button key={sub}
                    onClick={() => { 
                      setSubcategoria(sub); 
                      setManualTouched(prev => ({ ...prev, subcategoria: true }));
                    }}
                    className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                      subcategoria === sub ? "gradient-emerald text-primary-foreground" : "bg-[#E8ECF5] text-muted-foreground")}>
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Forma de pagamento */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground px-1">Forma de Pagamento</p>
            <div className="flex gap-1 p-1 rounded-xl bg-[#E8ECF5]">
              {(["Dinheiro", "Crédito"] as const).map((f) => (
                <button key={f}
                  onClick={() => { 
                    setFormaPagamento(f); 
                    setManualTouched(prev => ({ ...prev, pagamento: true }));
                  }}
                  className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                    formaPagamento === f ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>
                  {f === "Dinheiro" ? "💵 Dinheiro" : "💳 Crédito"}
                </button>
              ))}
            </div>
          </div>

          {/* Cartão */}
          {formaPagamento === "Crédito" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-1">Cartão</p>
              <div className="flex gap-2">
                {cartoes.map((c) => (
                  <button key={c.id}
                    onClick={() => { 
                      setCartaoId(c.id); 
                      setManualTouched(prev => ({ ...prev, pagamento: true }));
                    }}
                    className={cn("flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all",
                      cartaoId === c.id ? "gradient-emerald text-primary-foreground" : "bg-[#E8ECF5] text-muted-foreground")}>
                    {c.nome}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsParcelado(v => !v)}
                  className={cn("flex-1 flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all",
                    isParcelado ? "border-primary/40 bg-primary/5" : "border-[#E8ECF5] bg-[#E8ECF5]")}>
                  <span className={cn("text-sm font-medium", isParcelado ? "text-primary" : "text-muted-foreground")}>
                    💳 Parcelar
                  </span>
                  <div className={cn("w-9 h-5 rounded-full flex items-center px-0.5 transition-all",
                    isParcelado ? "bg-primary justify-end" : "bg-muted justify-start")}>
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </div>
                </button>
                {isParcelado && (
                  <div className="flex items-center gap-1">
                    <input type="number" min={2} max={24} value={parcelas}
                      onChange={(e) => setParcelas(e.target.value)}
                      className="w-12 text-center bg-[#E8ECF5] border-0 rounded-xl px-2 py-2.5 text-sm font-bold" />
                    <span className="text-xs text-muted-foreground">x</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recorrente */}
          {!isParcelado && (
            <button
              onClick={() => setRecorrente(v => !v)}
              className={cn("w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all",
                recorrente ? "border-primary/40 bg-primary/5" : "border-[#E8ECF5] bg-[#E8ECF5]")}>
              <span className={cn("text-sm font-medium", recorrente ? "text-primary" : "text-muted-foreground")}>
                🔁 Despesa recorrente
              </span>
              <div className={cn("w-9 h-5 rounded-full flex items-center px-0.5 transition-all",
                recorrente ? "bg-primary justify-end" : "bg-muted justify-start")}>
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </div>
            </button>
          )}
          {recorrente && !isParcelado && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs text-muted-foreground">Repetir no dia</span>
              <input type="number" min={1} max={31} value={diaRecorrencia}
                onChange={(e) => setDiaRecorrencia(e.target.value)}
                className="w-16 text-center bg-[#E8ECF5] border-0 rounded-xl px-2 py-1.5 text-sm font-bold" />
              <span className="text-xs text-muted-foreground">de cada mês</span>
            </div>
          )}

          {/* Toggle Pais */}
          <button
            onClick={() => { 
              setIsPais(v => !v); 
              setManualTouched(prev => ({ ...prev, pais: true }));
            }}
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
              onClick={() => { 
                setIsVicente(v => { if (!v) setIsLuisa(false); return !v; }); 
                setManualTouched(prev => ({ ...prev, pais: true }));
              }}
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
              onClick={() => { 
                setIsLuisa(v => { if (!v) setIsVicente(false); return !v; }); 
                setManualTouched(prev => ({ ...prev, pais: true }));
              }}
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
            onClick={() => { 
              if (canSplit) {
                setIsAdriano(v => !v); 
                setManualTouched(prev => ({ ...prev, adriano: true }));
              }
            }}
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
                    <button key={opt.key} 
                      onClick={() => {
                        setPagoPor(opt.key as 'voce' | 'adriano');
                        setManualTouched(prev => ({ ...prev, adriano: true }));
                      }}
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
              <button key={cat} 
                onClick={() => {
                  setReceitaCat(cat);
                  setManualTouched(prev => ({ ...prev, receitaCat: true }));
                }}
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
```

);
};

export default NewExpenseSheet;