import { useState } from "react";
import { X, CalendarIcon, ChevronLeft, Users } from "lucide-react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useAddLancamento, useAddMultipleLancamentos } from "@/hooks/useLancamentos";
import { useCartoes } from "@/hooks/useCartoes";
import { SUBCATEGORIA_GROUPS, detectSubcategoria, detectCategoriaMacro } from "@/lib/subcategorias";
import { toast } from "sonner";

// ── Receita categories (shown when tipo = receita) ─────────────────────────
const RECEITA_CATS = ["Salário", "Reembolso pais", "Renda extra", "Investimentos", "Resgate Investimento", "Outros"] as const;
type ReceitaCat = (typeof RECEITA_CATS)[number];
const receitaCatMap: Record<ReceitaCat, string> = {
  "Salário": "salario",
  "Reembolso pais": "reembolso_pais",
  "Renda extra": "renda_extra",
  "Investimentos": "investimentos",
  "Resgate Investimento": "resgate_investimento",
  "Outros": "outros",
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

  // ── Screen: 1 = tipo/desc/valor/data | 2 = categoria/pagamento/opções ──
  const [screen, setScreen] = useState<1 | 2>(1);

  // ── Screen 1 ──────────────────────────────────────────────────────────────
  const [tipo, setTipo] = useState<"despesa" | "receita">(initialTipo);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState<Date>(new Date());

  // ── Screen 2 — despesa ────────────────────────────────────────────────────
  const [subcategoria, setSubcategoria] = useState<string | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<"Dinheiro" | "Crédito">("Dinheiro");
  const [cartaoId, setCartaoId] = useState<string>("");
  const [isParcelado, setIsParcelado] = useState(false);
  const [parcelas, setParcelas] = useState("2");
  const [recorrente, setRecorrente] = useState(false);
  const [diaRecorrencia, setDiaRecorrencia] = useState("1");
  const [recorrenciaAte, setRecorrenciaAte] = useState<Date | undefined>(undefined);
  const [isPais, setIsPais] = useState(false);
  const [isVicente, setIsVicente] = useState(false);

  // ── Screen 2 — receita ────────────────────────────────────────────────────
  const [receitaCat, setReceitaCat] = useState<ReceitaCat>("Salário");

  const isPending = addLancamento.isPending || addMultiple.isPending;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const reset = () => {
    setScreen(1);
    setTipo(initialTipo);
    setDescricao("");
    setValor("");
    setData(new Date());
    setSubcategoria(null);
    setFormaPagamento("Dinheiro");
    setCartaoId("");
    setIsParcelado(false);
    setParcelas("2");
    setRecorrente(false);
    setDiaRecorrencia("1");
    setRecorrenciaAte(undefined);
    setReceitaCat("Salário");
    setIsPais(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleValorChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) { setValor(""); return; }
    const num = parseInt(digits, 10) / 100;
    setValor(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const getNumValor = () => {
    return parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const getPaisValue = () => {
    if (!isPais) return null;
    const macro = detectCategoriaMacro(subcategoria || "") || null;
    return subcategoria || macro || "Geral";
  };

  // ── Screen 1 → 2 ──────────────────────────────────────────────────────────
  const goToScreen2 = () => {
    if (!descricao.trim()) { toast.error("Preencha a descrição"); return; }
    if (!valor) { toast.error("Preencha o valor"); return; }
    if (getNumValor() <= 0) { toast.error("Valor inválido"); return; }
    // Auto-detect subcategoria
    const detected = detectSubcategoria(descricao);
    if (detected && !subcategoria) setSubcategoria(detected);
    setScreen(2);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const numValor = getNumValor();
    const mesRef = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

    try {
      if (tipo === "receita") {
        await addLancamento.mutateAsync({
          descricao,
          valor: numValor,
          tipo: "receita",
          categoria: receitaCatMap[receitaCat],
          subcategoria_pais: null,
          subcategoria: null,
          categoria_macro: null,
          data: format(data, "yyyy-MM-dd"),
          mes_referencia: mesRef,
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
        });
        handleClose();
        return;
      }

      // Despesa
      const macro = detectCategoriaMacro(subcategoria || "") || null;
      const forma = formaPagamento === "Dinheiro" ? "dinheiro" : "credito";
      const cartao = formaPagamento === "Crédito" ? (cartaoId || cartoes[0]?.id || null) : null;
      const subcPais = getPaisValue();

      if (isParcelado && !recorrente) {
        const nParcelas = parseInt(parcelas, 10) || 2;
        const parcelamentoId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
        const rows: any[] = [];
        for (let i = 0; i < nParcelas; i++) {
          const parcDate = addMonths(data, i);
          const pMesRef = `${parcDate.getFullYear()}-${String(parcDate.getMonth() + 1).padStart(2, "0")}`;
          const dateStr = `${parcDate.getFullYear()}-${String(parcDate.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
          rows.push({
            descricao,
            valor: numValor,
            tipo: "despesa",
            categoria: "extra",
            subcategoria_pais: subcPais,
            subcategoria: subcategoria || null,
            categoria_macro: macro,
            data: dateStr,
            mes_referencia: pMesRef,
            parcela_atual: i + 1,
            parcela_total: nParcelas,
            is_parcelado: true,
            parcelamento_id: parcelamentoId,
            pago: false,
            forma_pagamento: forma,
            cartao_id: cartao,
            recorrente: false,
            dia_recorrencia: null,
            recorrencia_ate: null,
            recorrencia_pai_id: null,
          });
        }
        await addMultiple.mutateAsync(rows);
      } else if (recorrente && !isParcelado) {
        const dia = parseInt(diaRecorrencia, 10) || 1;
        const recorrenciaPaiId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
        const maxMonths = recorrenciaAte ? 120 : 24;
        const rows: any[] = [];
        for (let i = 0; i < maxMonths; i++) {
          const monthDate = addMonths(data, i);
          if (recorrenciaAte && monthDate > recorrenciaAte) break;
          const rMesRef = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
          const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
          const actualDay = Math.min(dia, daysInMonth);
          const dateStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`;
          rows.push({
            descricao,
            valor: numValor,
            tipo: "despesa",
            categoria: "extra",
            subcategoria_pais: subcPais,
            subcategoria: subcategoria || null,
            categoria_macro: macro,
            data: dateStr,
            mes_referencia: rMesRef,
            parcela_atual: null,
            parcela_total: null,
            is_parcelado: false,
            parcelamento_id: null,
            pago: false,
            forma_pagamento: forma,
            cartao_id: cartao,
            recorrente: true,
            dia_recorrencia: dia,
            recorrencia_ate: recorrenciaAte ? format(recorrenciaAte, "yyyy-MM-dd") : null,
            recorrencia_pai_id: recorrenciaPaiId,
          });
        }
        await addMultiple.mutateAsync(rows);
      } else {
        await addLancamento.mutateAsync({
          descricao,
          valor: numValor,
          tipo: "despesa",
          categoria: "extra",
          subcategoria_pais: subcPais,
          subcategoria: subcategoria || null,
          categoria_macro: macro,
          data: format(data, "yyyy-MM-dd"),
          mes_referencia: mesRef,
          parcela_atual: null,
          parcela_total: null,
          is_parcelado: false,
          parcelamento_id: null,
          pago: false,
          forma_pagamento: forma,
          cartao_id: cartao,
          recorrente: false,
          dia_recorrencia: null,
          recorrencia_ate: null,
          recorrencia_pai_id: null,
        });
      }

      handleClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/25 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[70] rounded-t-[28px] bg-white border-t border-border transition-transform duration-300 ease-out max-h-[92vh] overflow-y-auto",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pb-10 space-y-5">

          {/* ── SCREEN 1 ──────────────────────────────────────────────────── */}
          {screen === 1 && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Nova transação</h2>
                <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              {/* Tipo toggle */}
              <div className="flex gap-2 p-1 rounded-2xl bg-[#E8ECF5]">
                {(["despesa", "receita"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTipo(t)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                      tipo === t
                        ? "bg-white shadow-sm text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {t === "despesa" ? "💸 Despesa" : "💰 Receita"}
                  </button>
                ))}
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                <Input
                  placeholder={tipo === "despesa" ? "Ex: Supermercado" : "Ex: Salário março"}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="bg-[#E8ECF5] border-border/50"
                />
              </div>

              {/* Valor */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Valor</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input
                    placeholder="0,00"
                    value={valor}
                    onChange={(e) => handleValorChange(e.target.value)}
                    className="bg-[#E8ECF5] border-border/50 pl-9 text-lg font-bold"
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* Data */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Data</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start bg-[#E8ECF5] border-border/50 text-foreground">
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      {format(data, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[80]" align="start">
                    <Calendar
                      mode="single"
                      selected={data}
                      onSelect={(d) => d && setData(d)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Continuar */}
              <Button
                onClick={goToScreen2}
                className="w-full h-12 gradient-emerald text-primary-foreground font-semibold text-sm rounded-xl"
              >
                Continuar →
              </Button>
            </>
          )}

          {/* ── SCREEN 2 ──────────────────────────────────────────────────── */}
          {screen === 2 && (
            <>
              {/* Header */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScreen(1)}
                  className="p-1.5 rounded-full hover:bg-secondary transition-colors"
                >
                  <ChevronLeft size={18} className="text-muted-foreground" />
                </button>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-foreground truncate">{descricao}</h2>
                  <p className="text-xs text-muted-foreground">
                    {valor ? `R$ ${valor}` : ""} · {format(data, "dd/MM/yyyy")}
                  </p>
                </div>
                <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              {/* ── Receita: só categoria ──────────────────────────────────── */}
              {tipo === "receita" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                  <div className="flex flex-wrap gap-2">
                    {RECEITA_CATS.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setReceitaCat(cat)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                          receitaCat === cat
                            ? "gradient-emerald text-primary-foreground"
                            : "bg-[#E8ECF5] text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Despesa: subcategoria + pagamento + opções ─────────────── */}
              {tipo === "despesa" && (
                <>
                  {/* Toggle Despesa dos pais */}
                  <button
                    onClick={() => setIsPais(!isPais)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors text-left",
                      isPais
                        ? "bg-amber-50 border-amber-400"
                        : "bg-white border-border"
                    )}
                  >
                    <Users size={18} className={isPais ? "text-amber-600" : "text-muted-foreground"} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-semibold", isPais ? "text-amber-700" : "text-foreground")}>
                        Despesa dos pais
                      </p>
                      {isPais && (
                        <p className="text-[10px] text-amber-600">
                          Aparece na aba Pais e nas Transações
                        </p>
                      )}
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      isPais ? "border-amber-500 bg-amber-500" : "border-muted-foreground/30"
                    )}>
                      {isPais && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>

                  {/* Subcategoria */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                    {SUBCATEGORIA_GROUPS.map((group) => (
                      <div key={group.group} className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide px-1">
                          {group.emoji} {group.group}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.items.map((item) => (
                            <button
                              key={item}
                              onClick={() =>
                                setSubcategoria(subcategoria === item ? null : item)
                              }
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                                subcategoria === item
                                  ? "gradient-emerald text-primary-foreground"
                                  : "bg-[#E8ECF5] text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Forma de pagamento */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Pagamento</label>
                    <div className="flex gap-2 p-1 rounded-2xl bg-[#E8ECF5]">
                      {(["Dinheiro", "Crédito"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setFormaPagamento(f)}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                            formaPagamento === f
                              ? "bg-white shadow-sm text-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {f === "Dinheiro" ? "💵 Dinheiro" : "💳 Crédito"}
                        </button>
                      ))}
                    </div>

                    {formaPagamento === "Crédito" && cartoes.length > 0 && (
                      <div className="flex gap-2 flex-wrap pt-1">
                        {cartoes.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setCartaoId(c.id)}
                            className={cn(
                              "px-3 py-2 rounded-xl text-xs font-medium transition-colors border",
                              cartaoId === c.id || (!cartaoId && cartoes[0]?.id === c.id)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-white border-border text-muted-foreground"
                            )}
                          >
                            {c.nome}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Parcelado */}
                  <div className="glass-card p-4 space-y-3 bg-white border border-border">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Parcelado?</label>
                      <Switch
                        checked={isParcelado}
                        onCheckedChange={(v) => { setIsParcelado(v); if (v) setRecorrente(false); }}
                      />
                    </div>
                    {isParcelado && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-muted-foreground">Número de parcelas</label>
                        <Input
                          type="number"
                          min={2}
                          max={48}
                          value={parcelas}
                          onChange={(e) => setParcelas(e.target.value)}
                          className="bg-[#E8ECF5] border-border/50 w-24"
                          inputMode="numeric"
                        />
                      </div>
                    )}
                  </div>

                  {/* Recorrente */}
                  <div className="glass-card p-4 space-y-3 bg-white border border-border">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Recorrente?</label>
                      <Switch
                        checked={recorrente}
                        onCheckedChange={(v) => { setRecorrente(v); if (v) setIsParcelado(false); }}
                      />
                    </div>
                    {recorrente && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-[11px] text-muted-foreground">Repetir no dia do mês</label>
                          <Input
                            type="number"
                            min={1}
                            max={31}
                            value={diaRecorrencia}
                            onChange={(e) => setDiaRecorrencia(e.target.value)}
                            className="bg-[#E8ECF5] border-border/50 w-24"
                            inputMode="numeric"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] text-muted-foreground">Até quando? (vazio = 24 meses)</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start bg-[#E8ECF5] border-border/50 text-foreground text-xs"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                {recorrenciaAte ? format(recorrenciaAte, "dd/MM/yyyy") : "Indefinido"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-[80]" align="start">
                              <Calendar
                                mode="single"
                                selected={recorrenciaAte}
                                onSelect={(d) => setRecorrenciaAte(d || undefined)}
                                initialFocus
                                className="p-3 pointer-events-auto"
                                disabled={(d) => d < new Date()}
                              />
                            </PopoverContent>
                          </Popover>
                          {recorrenciaAte && (
                            <button
                              onClick={() => setRecorrenciaAte(undefined)}
                              className="text-[10px] text-primary hover:underline"
                            >
                              Limpar data limite
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Salvar */}
              <Button
                onClick={handleSave}
                disabled={isPending}
                className={cn(
                  "w-full h-12 font-semibold text-sm rounded-xl",
                  isPais && tipo === "despesa"
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : "gradient-emerald text-primary-foreground"
                )}
              >
                {isPending
                  ? "Salvando..."
                  : isPais && tipo === "despesa"
                  ? "👨‍👩‍👧 Salvar despesa dos pais"
                  : tipo === "receita"
                  ? "💰 Salvar Receita"
                  : isParcelado
                  ? `💳 Salvar ${parcelas}x`
                  : recorrente
                  ? "🔁 Salvar Recorrente"
                  : "💸 Salvar Despesa"}
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default NewExpenseSheet;
