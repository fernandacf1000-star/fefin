import { useEffect, useState } from "react";
import { X, CalendarIcon, Users } from "lucide-react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";

import type { Lancamento } from "@/hooks/useLancamentos";
import {
useUpdateLancamento,
useUpdateAllParcelamento,
useUpdateParcelamentoFuturas,
useAddMultipleLancamentos,
useUpdateFutureRecorrencia,
useUpdateAllRecorrencia,
} from "@/hooks/useLancamentos";
import type { Cartao } from "@/hooks/useCartoes";
import { SUBCATEGORIA_GROUPS, detectCategoriaMacro } from "@/lib/subcategorias";

/**

- Calcula o mes_referencia considerando o ciclo de fechamento e vencimento do cartão.
  */
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

const RECEITA_CATS_EDIT = ["Salário", "Reembolso Pais", "Resgate"] as const;
type ReceitaCatEdit = (typeof RECEITA_CATS_EDIT)[number];
const receitaCatMapEdit: Record<ReceitaCatEdit, string> = {
"Salário": "salario", "Reembolso Pais": "reembolso_pais", "Resgate": "resgate_investimento",
};
const receitaCatReverseMap: Record<string, ReceitaCatEdit> = Object.fromEntries(
Object.entries(receitaCatMapEdit).map(([k, v]) => [v, k as ReceitaCatEdit]),
);

interface Props {
open: boolean;
lancamento: Lancamento | null;
onClose: () => void;
onSave: (updates: Partial<Lancamento>) => Promise<void>;
cartoes: Cartao[];
}

type EditScope = "este" | "futuras" | "todos";

const EditLancamentoModal = ({ open, lancamento, onClose, onSave, cartoes }: Props) => {
const [descricao, setDescricao] = useState("");
const [valor, setValor] = useState("");
const [data, setData] = useState<Date>(new Date());
const [subcategoria, setSubcategoria] = useState<string | null>(null);
const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
const [formaPagamento, setFormaPagamento] = useState<"dinheiro" | "credito">("dinheiro");
const [cartaoId, setCartaoId] = useState("");
const [saving, setSaving] = useState(false);
const [calendarOpen, setCalendarOpen] = useState(false);
const [isParcelado, setIsParcelado] = useState(false);
const [parcelas, setParcelas] = useState("2");
const [recorrente, setRecorrente] = useState(false);
const [diaRecorrencia, setDiaRecorrencia] = useState("1");
const [editScope, setEditScope] = useState<EditScope>("este");
// Pais / Vicente
const [isPais, setIsPais] = useState(false);
const [isVicente, setIsVicente] = useState(false);
const [isLuisa, setIsLuisa] = useState(false);
// Receita categoria
const [receitaCat, setReceitaCat] = useState<ReceitaCatEdit>("Salário");

const updateLancamento = useUpdateLancamento();
const updateAll = useUpdateAllParcelamento();
const updateFuturas = useUpdateParcelamentoFuturas();
const addMultiple = useAddMultipleLancamentos();
const updateFuturasRecorrencia = useUpdateFutureRecorrencia();
const updateAllRecorrencia = useUpdateAllRecorrencia();

useEffect(() => {
if (!lancamento) return;
setDescricao(lancamento.descricao || "");
setValor(Number(lancamento.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
setData(lancamento.data ? new Date(lancamento.data + "T12:00:00") : new Date());
setSubcategoria(lancamento.subcategoria || null);
// Abrir o grupo correto se já tem subcategoria
const sub = lancamento.subcategoria || null;
if (sub) {
const grp = SUBCATEGORIA_GROUPS.find((g) => g.items.some((i) => i.name === sub));
setSelectedGroup(grp?.group || null);
} else {
setSelectedGroup(null);
}
setIsParcelado(lancamento.is_parcelado || false);
setParcelas(String(lancamento.parcela_total || 2));
setRecorrente(lancamento.recorrente || false);
setDiaRecorrencia(String(lancamento.dia_recorrencia || 1));
setEditScope("este");
// Pais/Vicente
const subP = lancamento.subcategoria_pais;
setIsVicente(subP === "Vicente");
setIsLuisa(subP === "Luísa");
setIsPais(!!(subP && subP !== "") ? true : false);
if (lancamento.cartao_id) {
setFormaPagamento("credito");
setCartaoId(lancamento.cartao_id);
} else {
setFormaPagamento("dinheiro");
setCartaoId("");
}
// Receita categoria
setReceitaCat(receitaCatReverseMap[lancamento.categoria] || "Salário");
}, [lancamento]);

const handleValorChange = (raw: string) => {
const digits = raw.replace(/\D/g, "");
if (!digits) {
setValor("");
return;
}
setValor(
(parseInt(digits, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
);
};

const getNumValor = () => parseFloat(valor.replace(/./g, "").replace(",", ".")) || 0;

const getSubPais = () => {
if (!isPais) return null;
if (isVicente) return "Vicente";
if (isLuisa) return "Luísa";
return subcategoria || detectCategoriaMacro(subcategoria || "") || "Geral";
};

const handleSave = async () => {
if (!lancamento) return;
const numValor = getNumValor();
if (numValor <= 0) return;
setSaving(true);
try {
const macro = detectCategoriaMacro(subcategoria || "") || null;
const forma = formaPagamento === "dinheiro" ? "dinheiro" : "credito";
const cartao = formaPagamento === "credito" ? cartaoId || null : null;
const novaData = format(data, "yyyy-MM-dd");
const novoMesRef = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
const isReceitaEdit = lancamento.tipo === "receita";

// Resolver cartão para calcular ciclo de fatura
const cartaoObj = cartao ? cartoes.find((c) => c.id === cartao) || null : null;
const mesRefFatura = !isReceitaEdit && forma === "credito"
? getMesReferenciaFatura(data, cartaoObj)
: novoMesRef;

const baseUpdates: Record<string, any> = {
descricao,
valor: numValor,
subcategoria: subcategoria || null,
categoria_macro: macro,
forma_pagamento: isReceitaEdit ? null : forma,
cartao_id: isReceitaEdit ? null : cartao,
subcategoria_pais: isReceitaEdit ? null : getSubPais(),
data: novaData,
mes_referencia: mesRefFatura,
};
if (isReceitaEdit) {
baseUpdates.categoria = receitaCatMapEdit[receitaCat];
}

const wasParcelado = lancamento.is_parcelado;
const wasRecorrente = lancamento.recorrente;
const wasSimples = !wasParcelado && !wasRecorrente;

if (wasSimples && isParcelado && !recorrente) {
const nParcelas = parseInt(parcelas, 10) || 2;
const parcelamentoId = crypto.randomUUID?.() ?? `${Date.now()}`;
await updateLancamento.mutateAsync({
id: lancamento.id,
...baseUpdates,
data: format(data, "yyyy-MM-dd"),
mes_referencia: mesRefFatura,
is_parcelado: true,
parcela_atual: 1,
parcela_total: nParcelas,
parcelamento_id: parcelamentoId,
});
const rows: any[] = [];
for (let i = 1; i < nParcelas; i++) {
const d = addMonths(data, i);
rows.push({
...baseUpdates,
tipo: "despesa",
categoria: lancamento.categoria || "extra",
data: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`,
mes_referencia: getMesReferenciaFatura(d, cartaoObj),
parcela_atual: i + 1,
parcela_total: nParcelas,
is_parcelado: true,
parcelamento_id: parcelamentoId,
pago: false,
recorrente: false,
dia_recorrencia: null,
recorrencia_ate: null,
recorrencia_pai_id: null,
});
}
if (rows.length > 0) await addMultiple.mutateAsync(rows);
} else if (wasSimples && recorrente && !isParcelado) {
const dia = parseInt(diaRecorrencia, 10) || 1;
const paiId = crypto.randomUUID?.() ?? `${Date.now()}`;
await updateLancamento.mutateAsync({
id: lancamento.id,
...baseUpdates,
data: format(data, "yyyy-MM-dd"),
mes_referencia: mesRefFatura,
recorrente: true,
dia_recorrencia: dia,
recorrencia_pai_id: paiId,
is_parcelado: false,
parcela_atual: null,
parcela_total: null,
parcelamento_id: null,
});
const rows: any[] = [];
for (let i = 1; i < 24; i++) {
const m = addMonths(data, i);
const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
const dataRecorrente = new Date(m.getFullYear(), m.getMonth(), Math.min(dia, daysInMonth));
rows.push({
...baseUpdates,
tipo: "despesa",
categoria: lancamento.categoria || "extra",
data: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(Math.min(dia, daysInMonth)).padStart(2, "0")}`,
mes_referencia: getMesReferenciaFatura(dataRecorrente, cartaoObj),
parcela_atual: null,
parcela_total: null,
is_parcelado: false,
parcelamento_id: null,
pago: false,
recorrente: true,
dia_recorrencia: dia,
recorrencia_ate: null,
recorrencia_pai_id: paiId,
});
}
await addMultiple.mutateAsync(rows);
} else if (wasParcelado) {
if (editScope === "este")
await updateLancamento.mutateAsync({ id: lancamento.id, ...baseUpdates, data: format(data, "yyyy-MM-dd") });
else if (editScope === "futuras")
await updateFuturas.mutateAsync({
parcelamento_id: lancamento.parcelamento_id!,
fromDate: lancamento.data,
updates: baseUpdates,
});
else await updateAll.mutateAsync({ parcelamento_id: lancamento.parcelamento_id!, updates: baseUpdates });
} else if (wasRecorrente) {
if (editScope === "este")
await updateLancamento.mutateAsync({ id: lancamento.id, ...baseUpdates, data: format(data, "yyyy-MM-dd") });
else if (editScope === "futuras")
await updateFuturasRecorrencia.mutateAsync({
recorrencia_pai_id: lancamento.recorrencia_pai_id!,
fromDate: lancamento.data,
updates: baseUpdates,
});
else
await updateAllRecorrencia.mutateAsync({
recorrencia_pai_id: lancamento.recorrencia_pai_id!,
updates: baseUpdates,
});
} else {
await onSave(baseUpdates);
}
onClose();
} finally {
setSaving(false);
}

};

if (!open || !lancamento) return null;
const isReceita = lancamento.tipo === "receita";
const wasParcelado = lancamento.is_parcelado;
const wasRecorrente = lancamento.recorrente;
const wasSimples = !wasParcelado && !wasRecorrente;

return (
<>

<div className="fixed inset-0 z-[80] bg-black/25 backdrop-blur-sm" onClick={onClose} />
<div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[90] max-h-[88vh] overflow-y-auto rounded-3xl bg-white shadow-xl border border-border">
<div className="px-5 pt-5 pb-8 space-y-4">
{/* Header */}
<div className="flex items-center justify-between">
<h2 className="text-base font-bold text-foreground">Editar lançamento</h2>
<button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
<X size={17} className="text-muted-foreground" />
</button>
</div>

{/* Descrição */}

  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground">Descrição</label>
    <Input
      value={descricao}
      onChange={(e) => setDescricao(e.target.value)}
      className="bg-[#E8ECF5] border-0 rounded-xl"
    />
  </div>

{/* Valor */}

  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground">Valor</label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
      <Input
        value={valor}
        onChange={(e) => handleValorChange(e.target.value)}
        className="bg-[#E8ECF5] border-0 pl-9 text-base font-bold rounded-xl"
        inputMode="numeric"
      />
    </div>
  </div>

{/* Data */}

  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground">Data</label>
    <Button
      variant="outline"
      className="w-full justify-start bg-[#E8ECF5] border-0 text-foreground text-sm rounded-xl"
      onClick={() => setCalendarOpen((v) => !v)}
    >
      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
      {format(data, "dd 'de' MMMM, yyyy", { locale: ptBR })}
    </Button>
    {calendarOpen && (
      <div className="rounded-xl overflow-hidden border border-border bg-white shadow-md">
        <Calendar
          mode="single"
          selected={data}
          onSelect={(d) => { if (d) { setData(d); setCalendarOpen(false); } }}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </div>
    )}
  </div>

{/* Categoria receita */}
{isReceita && (
<div className="space-y-2">
<label className="text-xs font-medium text-muted-foreground">Categoria</label>
<div className="flex flex-wrap gap-1.5">
{RECEITA_CATS_EDIT.map((cat) => (
<button
key={cat}
onClick={() => setReceitaCat(cat)}
className={cn(
"px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
receitaCat === cat
? "gradient-emerald text-primary-foreground"
: "bg-[#E8ECF5] text-muted-foreground",
)}
>
{cat}
</button>
))}
</div>
</div>
)}

{/* Categoria (só despesa) */}
{!isReceita && (
<div className="space-y-2">
<label className="text-xs font-medium text-muted-foreground">Categoria</label>
<div className="grid grid-cols-4 gap-1.5">
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
<span className="text-lg">{group.emoji}</span>
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
        )}

{/* Pagamento (só despesa) */}
{!isReceita && (
<div className="space-y-2">
<label className="text-xs font-medium text-muted-foreground">Pagamento</label>
<div className="flex gap-1 p-1 rounded-xl bg-[#E8ECF5]">
{(["dinheiro", "credito"] as const).map((f) => (
<button
key={f}
onClick={() => setFormaPagamento(f)}
className={cn(
"flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
formaPagamento === f ? "bg-white shadow-sm text-foreground" : "text-muted-foreground",
)}
>
{f === "dinheiro" ? "💵 Dinheiro" : "💳 Crédito"}
</button>
))}
</div>
{formaPagamento === "credito" && cartoes.length > 0 && (
<div className="flex gap-2 flex-wrap">
{cartoes.map((c) => (
<button
key={c.id}
onClick={() => setCartaoId(c.id)}
className={cn(
"px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors",
cartaoId === c.id
? "bg-primary text-primary-foreground border-primary"
: "bg-white border-border text-muted-foreground",
)}
>
{c.nome}
</button>
))}
</div>
)}
</div>
)}

{/* Toggle Pais (só despesa) */}
{!isReceita && (
<>
<button
onClick={() => {
setIsPais((v) => {
if (v) { setIsVicente(false); setIsLuisa(false); }
return !v;
});
}}
className={cn(
"w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all",
isPais ? "border-amber-400 bg-amber-50" : "border-[#E8ECF5] bg-[#E8ECF5]",
)}
>
<div className="flex items-center gap-2">
<Users size={15} className={isPais ? "text-amber-600" : "text-muted-foreground"} />
<span className={cn("text-sm font-medium", isPais ? "text-amber-700" : "text-muted-foreground")}>
Despesa dos pais
</span>
</div>
<div
className={cn(
"w-9 h-5 rounded-full flex items-center px-0.5 transition-all",
isPais ? "bg-amber-400 justify-end" : "bg-muted justify-start",
)}
>
<div className="w-4 h-4 rounded-full bg-white shadow-sm" />
</div>
</button>

  {isPais && (
    <>
      <button
        onClick={() => { setIsVicente((v) => !v); setIsLuisa(false); }}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all",
          isVicente ? "border-blue-400 bg-blue-50" : "border-[#E8ECF5] bg-[#E8ECF5]",
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">👦</span>
          <span className={cn("text-sm font-medium", isVicente ? "text-blue-700" : "text-muted-foreground")}>
            Despesa do Vicente
          </span>
        </div>
        <div
          className={cn(
            "w-9 h-5 rounded-full flex items-center px-0.5 transition-all",
            isVicente ? "bg-blue-400 justify-end" : "bg-muted justify-start",
          )}
        >
          <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
        </div>
      </button>

      <button
        onClick={() => { setIsLuisa((v) => !v); setIsVicente(false); }}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all",
          isLuisa ? "border-pink-400 bg-pink-50" : "border-[#E8ECF5] bg-[#E8ECF5]",
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">👧</span>
          <span className={cn("text-sm font-medium", isLuisa ? "text-pink-700" : "text-muted-foreground")}>
            Despesa da Luísa
          </span>
        </div>
        <div
          className={cn(
            "w-9 h-5 rounded-full flex items-center px-0.5 transition-all",
            isLuisa ? "bg-pink-400 justify-end" : "bg-muted justify-start",
          )}
        >
          <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
        </div>
      </button>
    </>
  )}
</>

)}

{/* Converter (só despesa simples) */}
{!isReceita && wasSimples && (
<div className="space-y-2">
<label className="text-xs font-medium text-muted-foreground">Converter em</label>
<div className="flex gap-2">
<button
onClick={() => {
setIsParcelado((v) => !v);
if (!isParcelado) setRecorrente(false);
}}
className={cn(
"flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium border transition-all",
isParcelado
? "border-primary/40 bg-primary/5 text-primary"
: "border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground",
)}
>
<span>📆 Parcelado</span>
{isParcelado && (
<input
type="number"
min={2}
max={48}
value={parcelas}
onChange={(e) => setParcelas(e.target.value)}
onClick={(e) => e.stopPropagation()}
className="w-10 text-center bg-white rounded-lg border border-border text-xs font-bold text-foreground"
inputMode="numeric"
/>
)}
</button>
<button
onClick={() => {
setRecorrente((v) => !v);
if (!recorrente) setIsParcelado(false);
}}
className={cn(
"flex-1 flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-medium border transition-all",
recorrente
? "border-primary/40 bg-primary/5 text-primary"
: "border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground",
)}
>
🔁 Recorrente
</button>
</div>
{recorrente && (
<div className="flex items-center gap-2 px-1">
<span className="text-xs text-muted-foreground">Repetir no dia</span>
<Input
type="number"
min={1}
max={31}
value={diaRecorrencia}
onChange={(e) => setDiaRecorrencia(e.target.value)}
className="bg-[#E8ECF5] border-0 w-16 text-center rounded-xl"
inputMode="numeric"
/>
<span className="text-xs text-muted-foreground">de cada mês</span>
</div>
)}
</div>
)}

{/* Escopo (parcelado/recorrente existente) */}
{!isReceita && (wasParcelado || wasRecorrente) && (
<div className="space-y-2">
<label className="text-xs font-medium text-muted-foreground">Aplicar alteração em</label>
<div className="flex flex-col gap-1.5">
{[
{ key: "este", label: "Só este lançamento" },
{ key: "futuras", label: wasParcelado ? "Este e próximas parcelas" : "Este e próximas recorrências" },
{ key: "todos", label: wasParcelado ? "Todas as parcelas" : "Todas as recorrências" },
].map((opt) => (
<button
key={opt.key}
onClick={() => setEditScope(opt.key as EditScope)}
className={cn(
"flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left",
editScope === opt.key
? "border-primary/40 bg-primary/5 text-primary"
: "border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground",
)}
>
<div
className={cn(
"w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
editScope === opt.key ? "border-primary" : "border-muted-foreground/40",
)}
>
{editScope === opt.key && <div className="w-2 h-2 rounded-full bg-primary" />}
</div>
{opt.label}
</button>
))}
</div>
</div>
)}

{/* Actions */}

  <div className="flex gap-3 pt-1">
    <Button
      variant="outline"
      onClick={onClose}
      className="flex-1 bg-secondary border-0 text-muted-foreground rounded-xl"
    >
      Cancelar
    </Button>
    <Button
      onClick={handleSave}
      disabled={saving}
      className="flex-1 gradient-emerald text-primary-foreground font-semibold rounded-xl"
    >
      {saving ? "Salvando..." : "Salvar"}
    </Button>
  </div>
</div>

  </div>
</>

);
};

export default EditLancamentoModal;