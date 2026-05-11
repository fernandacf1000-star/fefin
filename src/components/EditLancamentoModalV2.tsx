import React, { useEffect, useMemo, useState } from “react”;
import { X } from “lucide-react”;
import { toast } from “sonner”;
import { useQueryClient } from “@tanstack/react-query”;
import { Input } from “@/components/ui/input”;
import { supabase } from “@/integrations/supabase/client”;
import { useUpdateLancamento, type Lancamento } from “@/hooks/useLancamentos”;
import type { Cartao } from “@/hooks/useCartoes”;
import { SUBCATEGORIA_GROUPS, detectCategoriaMacro } from “@/lib/subcategorias”;
import { cn } from “@/lib/utils”;

interface Props {
open: boolean;
lancamento: Lancamento | null;
onClose: () => void;
onSave: (updates: Partial<Lancamento>) => Promise<void>;
cartoes: Cartao[];
}

type EditScope = “este” | “futuras” | “todos”;
type FormaPagamento = “dinheiro” | “credito”;

const RECEITA_CATS = [“Salario”, “Reembolso Pais”, “Reembolso Adriano”, “Reembolso Luísa”, “Resgate”] as const;
type ReceitaCat = (typeof RECEITA_CATS)[number];

const receitaCatMap: Record<ReceitaCat, string> = {
Salario: “salario”,
“Reembolso Pais”: “reembolso_pais”,
“Reembolso Adriano”: “reembolso_adriano”,
“Reembolso Luísa”: “reembolso_luisa”,
Resgate: “resgate_investimento”,
};

const receitaCatReverseMap: Record<string, ReceitaCat> = Object.fromEntries(
Object.entries(receitaCatMap).map(([label, value]) => [value, label as ReceitaCat]),
);

function dateToStr(date: Date): string {
return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthRef(dateStr: string): string {
return dateStr.slice(0, 7);
}

function parseCurrency(value: string): number {
return parseFloat(value.replace(/./g, “”).replace(”,”, “.”)) || 0;
}

function formatCurrency(value: number): string {
return value.toLocaleString(“pt-BR”, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normalize(value: string | null | undefined): string {
return (value || “”).toLowerCase().normalize(“NFD”).replace(/[\u0300-\u036f]/g, “”);
}

function uniqueRows(rows: Lancamento[]): Lancamento[] {
const map = new Map<string, Lancamento>();
rows.forEach((row) => {
if (row?.id) map.set(row.id, row);
});
return Array.from(map.values()).sort((a, b) => a.data.localeCompare(b.data));
}

async function fetchRowsByColumn(column: “parcelamento_id” | “recorrencia_pai_id” | “id”, value: string): Promise<Lancamento[]> {
const { data, error } = await supabase.from(“lancamentos”).select(”*”).eq(column, value);
if (error) throw error;
return (data || []) as Lancamento[];
}

const EditLancamentoModalV2 = ({ open, lancamento, onClose, cartoes }: Props) => {
const [descricao, setDescricao] = useState(””);
const [valor, setValor] = useState(””);
const [data, setData] = useState<Date>(new Date());
const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
const [subcategoria, setSubcategoria] = useState<string | null>(null);
const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>(“dinheiro”);
const [cartaoId, setCartaoId] = useState(””);
const [receitaCat, setReceitaCat] = useState<ReceitaCat>(“Salario”);
const [subcategoriaPais, setSubcategoriaPais] = useState<string | null>(null);
const [pagoPor, setPagoPor] = useState<“voce” | “adriano”>(“voce”);
const [editScope, setEditScope] = useState<EditScope>(“este”);
const [saving, setSaving] = useState(false);

const updateLancamento = useUpdateLancamento();
const queryClient = useQueryClient();

const isReceita = lancamento?.tipo === “receita”;
const isParcelado = !!(lancamento?.is_parcelado && lancamento?.parcelamento_id);
const isRecorrente = !!(lancamento?.recorrente || lancamento?.recorrencia_pai_id);
const canChooseScope = isParcelado || isRecorrente;

const selectedGroupItems = useMemo(() => {
return SUBCATEGORIA_GROUPS.find((group) => group.group === selectedGroup)?.items || [];
}, [selectedGroup]);

useEffect(() => {
if (!lancamento) return;

```
const displayValue = lancamento.adriano ? Number(lancamento.valor || 0) * 2 : Number(lancamento.valor || 0);
const sub = lancamento.subcategoria || null;
const group = sub ? SUBCATEGORIA_GROUPS.find((g) => g.items.some((i) => i.name === sub))?.group || null : null;

setDescricao(lancamento.descricao || "");
setValor(formatCurrency(displayValue));
setData(lancamento.data ? new Date(`${lancamento.data}T12:00:00`) : new Date());
setSubcategoria(sub);
setSelectedGroup(group || lancamento.categoria_macro || null);
setFormaPagamento(lancamento.cartao_id ? "credito" : "dinheiro");
setCartaoId(lancamento.cartao_id || "");
setReceitaCat(receitaCatReverseMap[lancamento.categoria] || "Salario");
setSubcategoriaPais(lancamento.subcategoria_pais || null);
setPagoPor((lancamento.pago_por === "adriano" ? "adriano" : "voce") as "voce" | "adriano");
setEditScope("este");
```

}, [lancamento]);

if (!open || !lancamento) return null;

const handleValorChange = (raw: string) => {
const digits = raw.replace(/\D/g, “”);
if (!digits) {
setValor(””);
return;
}
setValor(formatCurrency(parseInt(digits, 10) / 100));
};

const getScopeRows = async (): Promise<Lancamento[]> => {
if (editScope === “este”) return [lancamento];

```
const rows: Lancamento[] = [lancamento];

if (lancamento.is_parcelado && lancamento.parcelamento_id) {
  rows.push(...await fetchRowsByColumn("parcelamento_id", lancamento.parcelamento_id));
}

if (lancamento.recorrente || lancamento.recorrencia_pai_id) {
  const idsToTry = Array.from(new Set([lancamento.recorrencia_pai_id, lancamento.id].filter(Boolean))) as string[];
  for (const id of idsToTry) {
    rows.push(...await fetchRowsByColumn("recorrencia_pai_id", id));
  }
  if (lancamento.recorrencia_pai_id) {
    rows.push(...await fetchRowsByColumn("id", lancamento.recorrencia_pai_id));
  }
}

return uniqueRows(rows)
  .filter((row) => !row.adriano)
  .filter((row) => editScope !== "futuras" || row.data >= lancamento.data);
```

};

const buildPayload = (row: Lancamento): Partial<Lancamento> => {
const numValor = parseCurrency(valor);
const selectedMacro = subcategoria ? detectCategoriaMacro(subcategoria) : selectedGroup;
const dateStr = dateToStr(data);
// Detecta se a linha é compartilhada (Adriano)
const isSharedRow = !isReceita && (
!!row.shared_group_id ||
row.adriano ||
normalize(row.subcategoria_pais) === “adriano” ||
pagoPor === “adriano”
);

```
const payload: Partial<Lancamento> = {
  descricao: descricao.trim(),
  valor: isSharedRow ? numValor / 2 : numValor,
  categoria: isReceita ? receitaCatMap[receitaCat] : selectedMacro || row.categoria || "",
  categoria_macro: isReceita ? null : selectedMacro || null,
  subcategoria: isReceita ? null : subcategoria || null,
  forma_pagamento: isReceita ? null : formaPagamento,
  cartao_id: isReceita || formaPagamento !== "credito" ? null : cartaoId || null,
  subcategoria_pais: isReceita ? null : subcategoriaPais || null,
  pago_por: pagoPor,
};

if (editScope === "este") {
  payload.data = dateStr;
  payload.mes_referencia = monthRef(dateStr);
}

return payload;
```

};

const handleSave = async () => {
const numValor = parseCurrency(valor);
if (!descricao.trim()) {
toast.error(“Informe a descrição”);
return;
}
if (!numValor) {
toast.error(“Informe um valor válido”);
return;
}

```
setSaving(true);
try {
  const rows = await getScopeRows();
  if (!rows.length) throw new Error("Nenhum lançamento encontrado para atualizar.");

  for (const row of rows) {
    await updateLancamento.mutateAsync({ id: row.id, ...buildPayload(row) });
  }

  await queryClient.invalidateQueries({ queryKey: ["lancamentos"] });
  await queryClient.invalidateQueries({ queryKey: ["reembolsos"] });

  toast.success(
    editScope === "este"
      ? "Lançamento atualizado"
      : editScope === "futuras"
        ? "Lançamentos futuros atualizados"
        : "Todos os lançamentos atualizados",
    { duration: 1500 },
  );
  onClose();
} catch (error: any) {
  console.error("Erro ao editar lançamento", error);
  toast.error(error?.message || "Erro ao editar lançamento");
} finally {
  setSaving(false);
}
```

};

return (
<div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
<div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl bg-background p-5 shadow-xl">
<div className="flex items-center justify-between mb-4">
<div>
<p className="text-xs uppercase tracking-wide text-muted-foreground">Editar</p>
<h2 className="text-lg font-bold text-foreground">{lancamento.descricao}</h2>
</div>
<button onClick={onClose} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
<X size={18} />
</button>
</div>

```
    {canChooseScope && (
      <div className="mb-4 rounded-2xl bg-secondary/60 p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Aplicar alteração em:</p>
        <div className="grid grid-cols-3 gap-2">
          {([
            ["este", "Só este"],
            ["futuras", "Este e futuros"],
            ["todos", "Todos"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setEditScope(value)}
              className={cn(
                "rounded-xl px-2 py-2 text-xs font-semibold border",
                editScope === value ? "bg-primary text-primary-foreground border-primary" : "bg-white text-muted-foreground border-border",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {editScope !== "este" && (
          <p className="text-[11px] text-muted-foreground">
            Para edições em lote, as datas e o número da parcela são preservados. Apenas valor, descrição, categoria e forma de pagamento são replicados.
          </p>
        )}
      </div>
    )}

    <div className="space-y-4">
      <label className="space-y-1 block">
        <span className="text-xs font-semibold text-muted-foreground">Descrição</span>
        <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </label>

      <label className="space-y-1 block">
        <span className="text-xs font-semibold text-muted-foreground">Valor</span>
        <Input value={valor} onChange={(e) => handleValorChange(e.target.value)} inputMode="numeric" />
      </label>

      {editScope === "este" && (
        <label className="space-y-1 block">
          <span className="text-xs font-semibold text-muted-foreground">Data</span>
          <Input type="date" value={dateToStr(data)} onChange={(e) => setData(new Date(`${e.target.value}T12:00:00`))} />
        </label>
      )}

      {isReceita ? (
        <label className="space-y-1 block">
          <span className="text-xs font-semibold text-muted-foreground">Categoria da receita</span>
          <select
            value={receitaCat}
            onChange={(e) => setReceitaCat(e.target.value as ReceitaCat)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {RECEITA_CATS.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </label>
      ) : (
        <>
          <label className="space-y-1 block">
            <span className="text-xs font-semibold text-muted-foreground">Grupo</span>
            <select
              value={selectedGroup || ""}
              onChange={(e) => {
                setSelectedGroup(e.target.value || null);
                setSubcategoria(null);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Sem grupo</option>
              {SUBCATEGORIA_GROUPS.map((group) => <option key={group.group} value={group.group}>{group.group}</option>)}
            </select>
          </label>

          <label className="space-y-1 block">
            <span className="text-xs font-semibold text-muted-foreground">Subcategoria</span>
            <select
              value={subcategoria || ""}
              onChange={(e) => setSubcategoria(e.target.value || null)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Sem subcategoria</option>
              {selectedGroupItems.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-muted-foreground">Pagamento</span>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="dinheiro">Conta / Pix</option>
                <option value="credito">Cartão</option>
              </select>
            </label>

            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-muted-foreground">Pago por</span>
              <select
                value={pagoPor}
                onChange={(e) => setPagoPor(e.target.value as "voce" | "adriano")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="voce">Você</option>
                <option value="adriano">Adriano</option>
              </select>
            </label>
          </div>

          {formaPagamento === "credito" && (
            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-muted-foreground">Cartão</span>
              <select
                value={cartaoId}
                onChange={(e) => setCartaoId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione</option>
                {cartoes.map((cartao) => <option key={cartao.id} value={cartao.id}>{cartao.nome}</option>)}
              </select>
            </label>
          )}

          <label className="space-y-1 block">
            <span className="text-xs font-semibold text-muted-foreground">Pais / dependentes</span>
            <select
              value={subcategoriaPais || ""}
              onChange={(e) => setSubcategoriaPais(e.target.value || null)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Não se aplica</option>
              <option value="Pais">Pais</option>
              <option value="Vicente">Vicente</option>
              <option value="Luísa">Luísa</option>
            </select>
          </label>
        </>
      )}
    </div>

    <div className="grid grid-cols-2 gap-3 mt-6 pb-2">
      <button onClick={onClose} disabled={saving} className="rounded-2xl bg-secondary px-4 py-3 text-sm font-semibold text-muted-foreground">
        Cancelar
      </button>
      <button onClick={handleSave} disabled={saving} className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {saving ? "Salvando..." : "Salvar"}
      </button>
    </div>
  </div>
</div>
```

);
};

export default EditLancamentoModalV2;