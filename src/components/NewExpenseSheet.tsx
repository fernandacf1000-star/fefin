import { useState } from "react";
import { X, CalendarIcon, Users } from "lucide-react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAddLancamento, useAddMultipleLancamentos } from "@/hooks/useLancamentos";
import { useCartoes } from "@/hooks/useCartoes";
import { SUBCATEGORIA_GROUPS, detectSubcategoria, detectCategoriaMacro } from "@/lib/subcategorias";
import { toast } from "sonner";

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
  const [isPais, setIsPais] = useState(false);
  const [isVicente, setIsVicente] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState<"Dinheiro" | "Crédito">("Dinheiro");
  const [cartaoId, setCartaoId] = useState<string>("");
  const [isParcelado, setIsParcelado] = useState(false);
  const [parcelas, setParcelas] = useState("2");
  const [recorrente, setRecorrente] = useState(false);
  const [diaRecorrencia, setDiaRecorrencia] = useState("1");
  const [receitaCat, setReceitaCat] = useState<ReceitaCat>("Salário");

  const isPending = addLancamento.isPending || addMultiple.isPending;

  const reset = () => {
    setTipo(initialTipo); setDescricao(""); setValor(""); setData(new Date());
    setSubcategoria(null); setIsPais(false); setIsVicente(false);
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
          });
        }
        handleClose(); return;
      }

      const macro = detectCategoriaMacro(subcategoria || "") || null;
      const forma = formaPagamento === "Dinheiro" ? "dinheiro" : "credito";
      const cartao = formaPagamento === "Crédito" ? (cartaoId || cartoes[0]?.id || null) : null;
      const subPais = isPais ? (isVicente ? "Vicente" : (subcategoria || macro || "Geral")) : null;

      const baseRow = {
        descricao, valor: numValor, tipo: "despesa" as const, categoria: "extra",
        subcategoria_pais: subPais, subcategoria: subcategoria || null, categoria_macro: macro,
        pago: false, forma_pagamento: forma, cartao_id: cartao,
      };

      if (isParcelado) {
        const nParcelas = parseInt(parcelas, 10) || 2;
        const parcelamentoId = crypto.randomUUID?.() ?? `${Date.now()}`;
        const rows = Array.from({ length: nParcelas }, (_, i) => {
          const d = addMonths(data, i);
          return {
            ...baseRow,
            data: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(data.getDate()).padStart(2,"0")}`,
            mes_referencia: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,
            parcela_atual: i + 1, parcela_total: nParcelas,
            is_parcelado: true, parcelamento_id: parcelamentoId,
            recorrente: false, dia_recorrencia: null, recorrencia_ate: null, recorrencia_pai_id: null,
          };
        });
        await addMultiple.mutateAsync(rows as any);
      } else if (recorrente) {
        const dia = parseInt(diaRecorrencia, 10) || 1;
        const paiId = crypto.randomUUID?.() ?? `${Date.now()}`;
        const rows: any[] = [];
        for (let i = 0; i < 24; i++) {
          const m = addMonths(data, i);
          const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
          rows.push({
            ...baseRow,
            data: `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}-${String(Math.min(dia,daysInMonth)).padStart(2,"0")}`,
            mes_referencia: `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}`,
            parcela_atual: null, parcela_total: null, is_parcelado: false, parcelamento_id: null,
            recorrente: true, dia_recorrencia: dia, recorrencia_ate: null, recorrencia_pai_id: paiId,
          });
        }
        await addMultiple.mutateAsync(rows);
      } else {
        await addLancamento.mutateAsync({
          ...baseRow,
          data: format(data, "yyyy-MM-dd"), mes_referencia: mesRef,
          parcela_atual: null, parcela_total: null, is_parcelado: false, parcelamento_id: null,
          recorrente: false, dia_recorrencia: null, recorrencia_ate: null, recorrencia_pai_id: null,
        } as any);
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

              {/* Categoria */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Categoria <span className="opacity-50">(opcional)</span></p>
                <div className="flex flex-wrap gap-1.5">
                  {SUBCATEGORIA_GROUPS.map((group) =>
                    group.items.map((item) => (
                      <button key={item}
                        onClick={() => setSubcategoria(subcategoria === item ? null : item)}
                        className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors",
                          subcategoria === item
                            ? "bg-primary text-primary-foreground"
                            : "bg-[#E8ECF5] text-muted-foreground")}>
                        {group.emoji} {item}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Toggle Pais */}
              <button
                onClick={() => { setIsPais(v => { if (v) setIsVicente(false); return !v; }); }}
                className={cn("w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all",
                  isPais ? "border-amber-400 bg-amber-50" : "border-[#E8ECF5] bg-[#E8ECF5]")}>
                <div className="flex items-center gap-2">
                  <Users size={15} className={isPais ? "text-amber-600" : "text-muted-foreground"} />
                  <span className={cn("text-sm font-medium", isPais ? "text-amber-700" : "text-muted-foreground")}>
                    Despesa dos pais
                  </span>
                </div>
                <div className={cn("w-9 h-5 rounded-full flex items-center px-0.5 transition-all",
                  isPais ? "bg-amber-400 justify-end" : "bg-muted justify-start")}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </button>

              {/* Toggle Vicente */}
              {isPais && (
                <button
                  onClick={() => setIsVicente(v => !v)}
                  className={cn("w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 transition-all",
                    isVicente ? "border-blue-400 bg-blue-50" : "border-[#E8ECF5] bg-[#E8ECF5]")}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">👦</span>
                    <span className={cn("text-sm font-medium", isVicente ? "text-blue-700" : "text-muted-foreground")}>
                      Despesa do Vicente
                    </span>
                  </div>
                  <div className={cn("w-9 h-5 rounded-full flex items-center px-0.5 transition-all",
                    isVicente ? "bg-blue-400 justify-end" : "bg-muted justify-start")}>
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </div>
                </button>
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
              isVicente ? "bg-blue-500" :
              isPais ? "bg-amber-500" :
              "gradient-emerald")}>
            {isPending ? "Salvando..." :
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

