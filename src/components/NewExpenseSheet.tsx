import { useState, useMemo } from "react";
import { X, CalendarIcon, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  useAddLancamento,
  useAddMultipleLancamentos,
  useLancamentos,
} from "@/hooks/useLancamentos";
import { useCartoes } from "@/hooks/useCartoes";
import {
  SUBCATEGORIA_GROUPS,
  detectSubcategoria,
  detectCategoriaMacro,
} from "@/lib/subcategorias";
import { toast } from "sonner";

interface NewExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  initialTipo?: "despesa" | "receita";
}

type Tela = 1 | 2;

const FORMA_PAGAMENTO = ["Débito", "Crédito", "PIX", "Dinheiro", "Outros"] as const;
type FormaPagamento = (typeof FORMA_PAGAMENTO)[number];

const incomeCategories = [
  "Salário",
  "Reembolso pais",
  "Renda extra",
  "Investimentos",
  "Resgate Investimento",
  "Outros",
] as const;
type IncomeCategory = (typeof incomeCategories)[number];

const incomeCatMap: Record<IncomeCategory, string> = {
  Salário: "salario",
  "Reembolso pais": "reembolso_pais",
  "Renda extra": "renda_extra",
  Investimentos: "investimentos",
  "Resgate Investimento": "resgate_investimento",
  Outros: "outros",
};

const NewExpenseSheet = ({
  open,
  onClose,
  initialTipo = "despesa",
}: NewExpenseSheetProps) => {
  const [tela, setTela] = useState<Tela>(1);
  const [tipo, setTipo] = useState<"despesa" | "receita">(initialTipo);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState<Date>(new Date());

  // Tela 2 - despesa
  const [subcategoria, setSubcategoria] = useState<string | null>(null);
  const [categoriaMacro, setCategoriaMacro] = useState<string | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("Débito");
  const [cartaoId, setCartaoId] = useState<string | null>(null);
  const [isPais, setIsPais] = useState(false);
  const [isParcelado, setIsParcelado] = useState(false);
  const [numParcelas, setNumParcelas] = useState("2");
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [diaRecorrencia, setDiaRecorrencia] = useState("1");
  const [recorrenciaAte, setRecorrenciaAte] = useState<Date | undefined>(undefined);

  // Tela 2 - receita
  const [incomeCategoria, setIncomeCategoria] = useState<IncomeCategory>("Salário");

  const addLancamento = useAddLancamento();
  const addMultiple = useAddMultipleLancamentos();
  const { data: cartoes = [] } = useCartoes();
  const { data: allLancamentos = [] } = useLancamentos();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestions = useMemo(() => {
    if (!descricao || descricao.length < 2) return [];
    const q = descricao.toLowerCase();
    const map = new Map<string, typeof allLancamentos[0]>();
    for (const l of allLancamentos) {
      const normalizado = l.descricao.replace(/\s*\(\d+\/\d+\)\s*$/, "").trim();
      if (!normalizado.toLowerCase().includes(q)) continue;
      if (!map.has(normalizado) || l.created_at > map.get(normalizado)!.created_at) {
        map.set(normalizado, { ...l, descricao: normalizado });
      }
    }
    return Array.from(map.values())
      .filter((l) => l.descricao.toLowerCase() !== descricao.toLowerCase())
      .slice(0, 4);
  }, [descricao, allLancamentos]);

  const isPending = addLancamento.isPending || addMultiple.isPending;

  const resetForm = () => {
    setTela(1);
    setTipo(initialTipo);
    setDescricao("");
    setValor("");
    setData(new Date());
    setSubcategoria(null);
    setCategoriaMacro(null);
    setFormaPagamento("Débito");
    setCartaoId(null);
    setIsPais(false);
    setIsParcelado(false);
    setNumParcelas("2");
    setIsRecorrente(false);
    setDiaRecorrencia("1");
    setRecorrenciaAte(undefined);
    setIncomeCategoria("Salário");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleValorChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) { setValor(""); return; }
    const num = parseInt(digits, 10) / 100;
    setValor(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleDescricaoChange = (v: string) => {
    setDescricao(v);
    setShowSuggestions(true);
    if (tipo === "despesa") {
      const detected = detectSubcategoria(v);
      if (detected) {
        setSubcategoria(detected);
        setCategoriaMacro(detectCategoriaMacro(detected));
      }
    }
  };

  const applySuggestion = (l: typeof allLancamentos[0]) => {
    setDescricao(l.descricao.replace(/\s*\(\d+\/\d+\)\s*$/, "").trim());
    const numValor = Number(l.valor);
    if (numValor > 0) {
      setValor(numValor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
    if (l.subcategoria) { setSubcategoria(l.subcategoria); setCategoriaMacro(l.categoria_macro); }
    if (l.forma_pagamento) setFormaPagamento(l.forma_pagamento as FormaPagamento);
    if (l.cartao_id) setCartaoId(l.cartao_id);
    if (l.categoria === "pais") setIsPais(true);
    if (l.tipo === "receita" && l.categoria) {
      const found = Object.entries(incomeCatMap).find(([, v]) => v === l.categoria);
      if (found) setIncomeCategoria(found[0] as IncomeCategory);
    }
    setShowSuggestions(false);
  };

  const handleNextTela = () => {
    if (!descricao.trim()) { toast.error("Preencha a descrição"); return; }
    if (!valor) { toast.error("Preencha o valor"); return; }
    setTela(2);
  };

  const handleSave = async () => {
    const numValor = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    if (isNaN(numValor) || numValor <= 0) { toast.error("Valor inválido"); return; }

    const mesRef = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
    const dateStr = format(data, "yyyy-MM-dd");

    try {
      if (tipo === "receita") {
        if (isRecorrente) {
          const recorrenciaPaiId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
          const lancamentos: any[] = [];
          const maxMonths = recorrenciaAte ? 120 : 24;
          const dia = parseInt(diaRecorrencia, 10) || 1;
          for (let i = 0; i < maxMonths; i++) {
            const monthDate = addMonths(data, i);
            if (recorrenciaAte && monthDate > recorrenciaAte) break;
            const mRef = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
            const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
            const actualDay = Math.min(dia, daysInMonth);
            const dStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`;
            lancamentos.push({
              descricao, valor: numValor, tipo: "receita",
              categoria: incomeCatMap[incomeCategoria],
              subcategoria_pais: null, subcategoria: null, categoria_macro: null,
              data: dStr, mes_referencia: mRef,
              parcela_atual: null, parcela_total: null, is_parcelado: false, parcelamento_id: null,
              pago: false, forma_pagamento: null, cartao_id: null,
              recorrente: true, dia_recorrencia: dia,
              recorrencia_ate: recorrenciaAte ? format(recorrenciaAte, "yyyy-MM-dd") : null,
              recorrencia_pai_id: recorrenciaPaiId,
            });
          }
          await addMultiple.mutateAsync(lancamentos);

        } else {
          await addLancamento.mutateAsync({
            descricao, valor: numValor, tipo: "receita",
            categoria: incomeCatMap[incomeCategoria],
            subcategoria_pais: null, subcategoria: null, categoria_macro: null,
            data: dateStr, mes_referencia: mesRef,
            parcela_atual: null, parcela_total: null, is_parcelado: false, parcelamento_id: null,
            pago: false, forma_pagamento: null, cartao_id: null,
            recorrente: false, dia_recorrencia: null, recorrencia_ate: null, recorrencia_pai_id: null,
          });

        }
      } else {
        const categoria = isPais ? "pais" : "extra";

        if (isParcelado) {
          const parcelas = parseInt(numParcelas, 10) || 2;
          const parcelamentoId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
          const lancamentos: any[] = [];
          for (let i = 0; i < parcelas; i++) {
            const monthDate = addMonths(data, i);
            const mRef = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
            lancamentos.push({
              descricao: `${descricao} (${i + 1}/${parcelas})`,
              valor: numValor / parcelas, tipo: "despesa", categoria,
              subcategoria_pais: null, subcategoria, categoria_macro: categoriaMacro,
              data: format(monthDate, "yyyy-MM-dd"), mes_referencia: mRef,
              parcela_atual: i + 1, parcela_total: parcelas,
              is_parcelado: true, parcelamento_id: parcelamentoId,
              pago: false,
              forma_pagamento: formaPagamento === "Crédito" && cartaoId ? null : formaPagamento,
              cartao_id: formaPagamento === "Crédito" ? cartaoId : null,
              recorrente: false, dia_recorrencia: null, recorrencia_ate: null, recorrencia_pai_id: null,
            });
          }
          await addMultiple.mutateAsync(lancamentos);

        } else if (isRecorrente) {
          const recorrenciaPaiId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
          const lancamentos: any[] = [];
          const maxMonths = recorrenciaAte ? 120 : 24;
          const dia = parseInt(diaRecorrencia, 10) || data.getDate();
          for (let i = 0; i < maxMonths; i++) {
            const monthDate = addMonths(data, i);
            if (recorrenciaAte && monthDate > recorrenciaAte) break;
            const mRef = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
            const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
            const actualDay = Math.min(dia, daysInMonth);
            const dStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`;
            lancamentos.push({
              descricao, valor: numValor, tipo: "despesa", categoria,
              subcategoria_pais: null, subcategoria, categoria_macro: categoriaMacro,
              data: dStr, mes_referencia: mRef,
              parcela_atual: null, parcela_total: null, is_parcelado: false, parcelamento_id: null,
              pago: false,
              forma_pagamento: formaPagamento === "Crédito" && cartaoId ? null : formaPagamento,
              cartao_id: formaPagamento === "Crédito" ? cartaoId : null,
              recorrente: true, dia_recorrencia: dia,
              recorrencia_ate: recorrenciaAte ? format(recorrenciaAte, "yyyy-MM-dd") : null,
              recorrencia_pai_id: recorrenciaPaiId,
            });
          }
          await addMultiple.mutateAsync(lancamentos);

        } else {
          await addLancamento.mutateAsync({
            descricao, valor: numValor, tipo: "despesa", categoria,
            subcategoria_pais: null, subcategoria, categoria_macro: categoriaMacro,
            data: dateStr, mes_referencia: mesRef,
            parcela_atual: null, parcela_total: null, is_parcelado: false, parcelamento_id: null,
            pago: false,
            forma_pagamento: formaPagamento === "Crédito" && cartaoId ? null : formaPagamento,
            cartao_id: formaPagamento === "Crédito" ? cartaoId : null,
            recorrente: false, dia_recorrencia: null, recorrencia_ate: null, recorrencia_pai_id: null,
          });

        }
      }
      handleClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const isDespesa = tipo === "despesa";

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl bg-card border-t border-border/50 transition-transform duration-300 ease-out max-h-[92vh] overflow-y-auto",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pb-10 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {tela === 2 && (
                <button onClick={() => setTela(1)} className="p-1 rounded-full hover:bg-muted transition-colors">
                  <ChevronLeft size={20} className="text-muted-foreground" />
                </button>
              )}
              <h2 className="text-lg font-semibold text-foreground">
                {tela === 1 ? "Novo lançamento" : isDespesa ? "Categoria e pagamento" : "Detalhes da receita"}
              </h2>
            </div>
            <button onClick={handleClose} className="p-1 rounded-full hover:bg-muted transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* ── TELA 1 ── */}
          {tela === 1 && (
            <>
              {/* Tipo toggle */}
              <div className="flex gap-2 p-1 rounded-xl bg-secondary/50">
                <button
                  onClick={() => setTipo("despesa")}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
                    tipo === "despesa" ? "bg-destructive text-destructive-foreground shadow" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Despesa
                </button>
                <button
                  onClick={() => setTipo("receita")}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
                    tipo === "receita" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Receita
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                <Input
                  placeholder="Ex: Supermercado, Salário..."
                  value={descricao}
                  onChange={(e) => handleDescricaoChange(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  className="bg-secondary border-border/50"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="rounded-xl border border-border/40 bg-card shadow-lg overflow-hidden">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/30">
                      <Sparkles size={11} className="text-primary" />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Do histórico</span>
                    </div>
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => applySuggestion(s)}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/60 transition-colors border-b border-border/20 last:border-0"
                      >
                        <span className="text-sm text-foreground truncate text-left">{s.descricao.replace(/\s*\(\d+\/\d+\)\s*$/, "").trim()}</span>
                        <span className={cn("text-xs font-semibold ml-2 shrink-0", s.tipo === "despesa" ? "text-destructive" : "text-primary")}>
                          {s.tipo === "despesa" ? "-" : "+"} R$ {Number(s.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Valor</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input
                    placeholder="0,00"
                    value={valor}
                    onChange={(e) => handleValorChange(e.target.value)}
                    className="bg-secondary border-border/50 pl-9 text-lg font-semibold"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Data</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start bg-secondary border-border/50 text-foreground">
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      {format(data, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[80]" align="start">
                    <Calendar mode="single" selected={data} onSelect={(d) => d && setData(d)} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <Button
                onClick={handleNextTela}
                className={cn(
                  "w-full h-12 font-semibold text-sm rounded-xl shadow-lg",
                  isDespesa
                    ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
              >
                Continuar <ChevronRight size={16} className="ml-1" />
              </Button>
            </>
          )}

          {/* ── TELA 2 - DESPESA ── */}
          {tela === 2 && isDespesa && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {SUBCATEGORIA_GROUPS.map((group) => (
                    <div key={group.group}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        {group.emoji} {group.group}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.items.map((item) => (
                          <button
                            key={item}
                            onClick={() => { setSubcategoria(item); setCategoriaMacro(group.group); }}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                              subcategoria === item
                                ? "bg-destructive text-destructive-foreground shadow"
                                : "bg-secondary text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Forma de pagamento</label>
                <div className="flex flex-wrap gap-2">
                  {FORMA_PAGAMENTO.map((fp) => (
                    <button
                      key={fp}
                      onClick={() => { setFormaPagamento(fp); if (fp !== "Crédito") setCartaoId(null); }}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-medium transition-all",
                        formaPagamento === fp
                          ? "bg-destructive text-destructive-foreground shadow"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {fp}
                    </button>
                  ))}
                </div>
                {formaPagamento === "Crédito" && cartoes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {cartoes.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCartaoId(c.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          cartaoId === c.id
                            ? "border-destructive text-destructive bg-destructive/10"
                            : "border-border/50 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {c.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="glass-card p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">Gasto com os pais?</p>
                    <p className="text-[10px] text-muted-foreground">Aparece na aba Pais</p>
                  </div>
                  <Switch checked={isPais} onCheckedChange={(v) => { setIsPais(v); if (v) { setIsParcelado(false); setIsRecorrente(false); } }} />
                </div>

                {!isPais && (
                  <>
                    <div className="glass-card p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-foreground">Parcelado?</label>
                        <Switch checked={isParcelado} onCheckedChange={(v) => { setIsParcelado(v); if (v) setIsRecorrente(false); }} />
                      </div>
                      {isParcelado && (
                        <div className="space-y-1">
                          <label className="text-[11px] text-muted-foreground">Número de parcelas</label>
                          <Input type="number" min={2} max={60} value={numParcelas} onChange={(e) => setNumParcelas(e.target.value)} className="bg-secondary border-border/50 w-24" inputMode="numeric" />
                        </div>
                      )}
                    </div>

                    <div className="glass-card p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-foreground">Recorrente?</label>
                        <Switch checked={isRecorrente} onCheckedChange={(v) => { setIsRecorrente(v); if (v) setIsParcelado(false); }} />
                      </div>
                      {isRecorrente && (
                        <>
                          <div className="space-y-1">
                            <label className="text-[11px] text-muted-foreground">Repetir todo mês no dia</label>
                            <Input type="number" min={1} max={31} value={diaRecorrencia} onChange={(e) => setDiaRecorrencia(e.target.value)} className="bg-secondary border-border/50 w-24" inputMode="numeric" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-muted-foreground">Até quando? (vazio = 24 meses)</label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start bg-secondary border-border/50 text-foreground text-xs">
                                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                  {recorrenciaAte ? format(recorrenciaAte, "dd/MM/yyyy") : "Indefinido"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 z-[80]" align="start">
                                <Calendar mode="single" selected={recorrenciaAte} onSelect={(d) => setRecorrenciaAte(d || undefined)} initialFocus className="p-3 pointer-events-auto" disabled={(d) => d < new Date()} />
                              </PopoverContent>
                            </Popover>
                            {recorrenciaAte && (
                              <button onClick={() => setRecorrenciaAte(undefined)} className="text-[10px] text-primary hover:underline">Limpar data limite</button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              <Button onClick={handleSave} disabled={isPending} className="w-full h-12 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold text-sm rounded-xl shadow-lg">
                {isPending ? "Salvando..." : "Salvar Despesa"}
              </Button>
            </>
          )}

          {/* ── TELA 2 - RECEITA ── */}
          {tela === 2 && !isDespesa && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                <div className="flex flex-wrap gap-2">
                  {incomeCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setIncomeCategoria(cat)}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-medium transition-all",
                        incomeCategoria === cat
                          ? "bg-primary text-primary-foreground shadow"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Receita recorrente?</label>
                  <Switch checked={isRecorrente} onCheckedChange={setIsRecorrente} />
                </div>
                {isRecorrente && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Repetir todo mês no dia</label>
                      <Input type="number" min={1} max={31} value={diaRecorrencia} onChange={(e) => setDiaRecorrencia(e.target.value)} className="bg-secondary border-border/50 w-24" inputMode="numeric" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Até quando? (vazio = 24 meses)</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start bg-secondary border-border/50 text-foreground text-xs">
                            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                            {recorrenciaAte ? format(recorrenciaAte, "dd/MM/yyyy") : "Indefinido"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[80]" align="start">
                          <Calendar mode="single" selected={recorrenciaAte} onSelect={(d) => setRecorrenciaAte(d || undefined)} initialFocus className="p-3 pointer-events-auto" disabled={(d) => d < new Date()} />
                        </PopoverContent>
                      </Popover>
                      {recorrenciaAte && (
                        <button onClick={() => setRecorrenciaAte(undefined)} className="text-[10px] text-primary hover:underline">Limpar data limite</button>
                      )}
                    </div>
                  </>
                )}
              </div>

              <Button onClick={handleSave} disabled={isPending} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-xl shadow-lg">
                {isPending ? "Salvando..." : isRecorrente ? "Salvar Receita Recorrente" : "Salvar Receita"}
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default NewExpenseSheet;
