import React, { useMemo, useRef, useState } from "react";
import { X, Mic, Clipboard, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { format, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useAddLancamento } from "@/hooks/useLancamentos";
import { useCartoes } from "@/hooks/useCartoes";
import type { Cartao } from "@/hooks/useCartoes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TipoLancamento = "despesa" | "receita";
type Confianca = "alta" | "media" | "baixa";

type SuggestedLancamento = {
  descricao: string;
  valor: number;
  tipo: TipoLancamento;
  categoria: string;
  categoria_macro: string | null;
  data: string;
  cartao_id: string | null;
  forma_pagamento: string | null;
  is_parcelado: boolean;
  parcela_atual: number | null;
  parcela_total: number | null;
  confianca: Confianca;
};

interface Props {
  open: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

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

function parseCurrencyToNumber(value: string): number {
  if (!value) return 0;
  return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
}

function formatCurrency(value: number): string {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeDate(value: string): string {
  if (!value) return format(new Date(), "yyyy-MM-dd");
  return value.slice(0, 10);
}

function getCategoriaForDb(suggestion: SuggestedLancamento): string {
  if (suggestion.tipo === "receita") {
    return suggestion.categoria || "outros";
  }

  return "despesa";
}

function getCategoriaMacroForDb(suggestion: SuggestedLancamento): string | null {
  if (suggestion.tipo === "receita") {
    return suggestion.categoria_macro || null;
  }

  return suggestion.categoria_macro || suggestion.categoria || "Outros";
}

const QuickEntrySheet = ({ open, onClose }: Props) => {
  const { data: cartoes = [] } = useCartoes();
  const addLancamento = useAddLancamento();

  const [activeTab, setActiveTab] = useState<"voz" | "texto">("texto");
  const [listening, setListening] = useState(false);
  const [rawText, setRawText] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestedLancamento | null>(null);
  const [savePending, setSavePending] = useState(false);

  const recognitionRef = useRef<any>(null);

  const selectedCartao = useMemo(() => {
    if (!suggestion?.cartao_id) return null;
    return cartoes.find((c) => c.id === suggestion.cartao_id) || null;
  }, [cartoes, suggestion?.cartao_id]);

  const reset = () => {
    setActiveTab("texto");
    setListening(false);
    setRawText("");
    setInterpreting(false);
    setSuggestion(null);
    setSavePending(false);
    recognitionRef.current = null;
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleStartVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Reconhecimento de voz não disponível neste navegador. Use a aba Colar SMS.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setListening(true);
      setRawText("");
    };

    recognition.onresult = (event: any) => {
      let transcript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setRawText(transcript.trim());
    };

    recognition.onerror = () => {
      setListening(false);
      toast.error("Não consegui captar o áudio. Tente novamente ou cole o texto.");
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleStopVoice = () => {
    recognitionRef.current?.stop?.();
    setListening(false);
  };

  const handleInterpret = async () => {
    const input = rawText.trim();

    if (!input) {
      toast.error("Digite, cole ou grave uma entrada antes de interpretar.");
      return;
    }

    setInterpreting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("https://zhzaiphsnfqcgvtckdgv.supabase.co/functions/v1/quick-entry-interpret", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          input,
          today: format(new Date(), "yyyy-MM-dd"),
          cartoes: cartoes.map((c) => ({
            id: c.id,
            nome: c.nome,
            bandeira: c.bandeira,
            dia_fechamento: c.dia_fechamento,
            dia_vencimento: c.dia_vencimento,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Erro ao interpretar entrada.");
      }

      const parsed = await response.json();

      const normalized: SuggestedLancamento = {
        descricao: parsed.descricao || input,
        valor: Number(parsed.valor || 0),
        tipo: parsed.tipo === "receita" ? "receita" : "despesa",
        categoria: parsed.categoria || "Outros",
        categoria_macro: parsed.categoria_macro || null,
        data: normalizeDate(parsed.data),
        cartao_id: parsed.cartao_id || null,
        forma_pagamento: parsed.forma_pagamento || (parsed.cartao_id ? "credito" : "dinheiro"),
        is_parcelado: !!parsed.is_parcelado,
        parcela_atual: parsed.parcela_atual ?? null,
        parcela_total: parsed.parcela_total ?? null,
        confianca: parsed.confianca || "media",
      };

      if (!normalized.valor || normalized.valor <= 0) {
        toast.error("Não consegui identificar um valor válido.");
        return;
      }

      setSuggestion(normalized);
      toast.success("Entrada interpretada. Confira antes de salvar.");
    } catch (error: any) {
      toast.error(error?.message || "Erro ao chamar a interpretação.");
    } finally {
      setInterpreting(false);
    }
  };

  const updateSuggestion = <K extends keyof SuggestedLancamento>(
    key: K,
    value: SuggestedLancamento[K]
  ) => {
    setSuggestion((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: value };
    });
  };

  const handleSave = async () => {
    if (!suggestion) return;

    if (!suggestion.descricao.trim()) {
      toast.error("Preencha a descrição.");
      return;
    }

    if (!suggestion.valor || suggestion.valor <= 0) {
      toast.error("Preencha um valor válido.");
      return;
    }

    setSavePending(true);

    try {
      const dataObj = new Date(`${suggestion.data}T12:00:00`);
      const cartaoObj = suggestion.cartao_id
        ? cartoes.find((c) => c.id === suggestion.cartao_id) || null
        : null;

      const formaPagamento =
        suggestion.forma_pagamento ||
        (suggestion.cartao_id ? "credito" : "dinheiro");

      const mesReferencia =
        suggestion.tipo === "despesa" && suggestion.cartao_id
          ? getMesReferenciaFatura(dataObj, cartaoObj)
          : suggestion.data.slice(0, 7);

      await addLancamento.mutateAsync({
        descricao: suggestion.descricao.trim(),
        valor: Number(suggestion.valor),
        tipo: suggestion.tipo,
        categoria: getCategoriaForDb(suggestion),
        categoria_macro: getCategoriaMacroForDb(suggestion),
        subcategoria_pais: null,
        subcategoria: null,
        data: suggestion.data,
        mes_referencia: mesReferencia,
        parcela_atual: suggestion.parcela_atual,
        parcela_total: suggestion.parcela_total,
        is_parcelado: suggestion.is_parcelado,
        parcelamento_id: suggestion.is_parcelado ? crypto.randomUUID?.() ?? `${Date.now()}` : null,
        pago: false,
        forma_pagamento: formaPagamento,
        cartao_id: suggestion.cartao_id,
        recorrente: false,
        dia_recorrencia: null,
        recorrencia_ate: null,
        recorrencia_pai_id: null,
        adriano: false,
        shared_group_id: null,
        shared_role: null,
        pago_por: "voce",
      } as any);

      toast.success("Lançamento salvo.");
      handleClose();
    } catch (error: any) {
      toast.error(error?.message || "Erro ao salvar lançamento.");
    } finally {
      setSavePending(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[80] bg-black/25 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={handleClose}
      />

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[90] rounded-t-[28px] border-t border-border bg-white transition-transform duration-300 ease-out max-h-[92vh] overflow-y-auto",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="sticky top-0 z-10 bg-white">
          <div className="flex justify-center pt-3">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <div>
              <h2 className="text-base font-bold text-foreground">Entrada rápida</h2>
              <p className="text-xs text-muted-foreground">
                Fale ou cole um SMS do banco.
              </p>
            </div>

            <button onClick={handleClose} className="rounded-full p-1.5 hover:bg-secondary">
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 pb-10">
          <div className="flex gap-1 rounded-2xl bg-[#E8ECF5] p-1">
            <button
              onClick={() => setActiveTab("voz")}
              className={cn(
                "flex-1 rounded-xl py-2 text-sm font-semibold transition-all",
                activeTab === "voz" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              🎤 Voz
            </button>

            <button
              onClick={() => setActiveTab("texto")}
              className={cn(
                "flex-1 rounded-xl py-2 text-sm font-semibold transition-all",
                activeTab === "texto" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              📋 Colar SMS
            </button>
          </div>

          {activeTab === "voz" && (
            <div className="space-y-4">
              <button
                onClick={listening ? handleStopVoice : handleStartVoice}
                className={cn(
                  "mx-auto flex h-28 w-28 items-center justify-center rounded-full text-white shadow-lg transition-all active:scale-95",
                  listening ? "animate-pulse bg-[#0D9488]" : "bg-[#6366F1]"
                )}
                style={{
                  boxShadow: listening
                    ? "0 0 0 14px rgba(13,148,136,0.12)"
                    : "0 12px 30px rgba(99,102,241,0.25)",
                }}
              >
                <Mic size={38} />
              </button>

              <p className="text-center text-xs text-muted-foreground">
                {listening ? "Gravando... toque para parar." : "Toque para falar."}
              </p>

              <div className="rounded-2xl bg-[#E8ECF5] p-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Transcrição
                </p>
                <p className="min-h-[48px] text-sm text-foreground">
                  {rawText || "O texto transcrito aparecerá aqui."}
                </p>
              </div>
            </div>
          )}

          {activeTab === "texto" && (
            <div className="space-y-3">
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Cole aqui o SMS do banco. Ex: Compra aprovada: R$127,50 em MERCADO PINHEIROS. Cartão final 9364."
                className="min-h-[150px] w-full resize-none rounded-2xl border-0 bg-[#E8ECF5] p-4 text-sm outline-none placeholder:text-muted-foreground"
              />

              <div className="rounded-2xl bg-white border border-[#DDE3EE] p-3 text-xs text-muted-foreground">
                <div className="mb-1 flex items-center gap-1 font-semibold text-foreground">
                  <Clipboard size={13} />
                  Exemplos aceitos
                </div>
                <p>Compra aprovada: R$127,50 em MERCADO PINHEIROS.</p>
                <p>Pgto R$ 89,90 NETFLIX VISA ****9364.</p>
                <p>Débito de R$450,00 - FARMÁCIA - 05/05/2026.</p>
              </div>
            </div>
          )}

          <button
            onClick={handleInterpret}
            disabled={interpreting || !rawText.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6366F1] px-4 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50"
            style={{ boxShadow: "0 8px 24px rgba(99,102,241,0.25)" }}
          >
            {interpreting ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
            Interpretar
          </button>

          {suggestion && (
            <div className="space-y-3 rounded-[24px] border border-[#DDE3EE] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">Confirmar lançamento</p>
                  <p className="text-xs text-muted-foreground">
                    Confiança: {suggestion.confianca}
                  </p>
                </div>
                <CheckCircle2 size={20} className="text-[#0D9488]" />
              </div>

              <div className="space-y-2">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Descrição</p>
                  <Input
                    value={suggestion.descricao}
                    onChange={(e) => updateSuggestion("descricao", e.target.value)}
                    className="rounded-xl border-0 bg-[#E8ECF5]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Valor</p>
                    <Input
                      value={formatCurrency(suggestion.valor)}
                      onChange={(e) =>
                        updateSuggestion("valor", parseCurrencyToNumber(e.target.value))
                      }
                      inputMode="decimal"
                      className="rounded-xl border-0 bg-[#E8ECF5]"
                    />
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Data</p>
                    <Input
                      type="date"
                      value={suggestion.data}
                      onChange={(e) => updateSuggestion("data", e.target.value)}
                      className="rounded-xl border-0 bg-[#E8ECF5]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Tipo</p>
                    <select
                      value={suggestion.tipo}
                      onChange={(e) =>
                        updateSuggestion("tipo", e.target.value as TipoLancamento)
                      }
                      className="h-10 w-full rounded-xl border-0 bg-[#E8ECF5] px-3 text-sm"
                    >
                      <option value="despesa">Despesa</option>
                      <option value="receita">Receita</option>
                    </select>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Categoria</p>
                    <Input
                      value={suggestion.categoria_macro || suggestion.categoria || ""}
                      onChange={(e) => updateSuggestion("categoria_macro", e.target.value)}
                      className="rounded-xl border-0 bg-[#E8ECF5]"
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Cartão</p>
                  <select
                    value={suggestion.cartao_id || ""}
                    onChange={(e) => {
                      const value = e.target.value || null;
                      updateSuggestion("cartao_id", value);
                      updateSuggestion("forma_pagamento", value ? "credito" : "dinheiro");
                    }}
                    className="h-10 w-full rounded-xl border-0 bg-[#E8ECF5] px-3 text-sm"
                  >
                    <option value="">Sem cartão / dinheiro / débito</option>
                    {cartoes.map((cartao) => (
                      <option key={cartao.id} value={cartao.id}>
                        {cartao.nome}
                      </option>
                    ))}
                  </select>

                  {selectedCartao && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Mês referência calculado pelo fechamento do cartão.
                    </p>
                  )}
                </div>

                {suggestion.is_parcelado && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Parcela atual</p>
                      <Input
                        value={suggestion.parcela_atual || ""}
                        onChange={(e) =>
                          updateSuggestion("parcela_atual", Number(e.target.value) || null)
                        }
                        inputMode="numeric"
                        className="rounded-xl border-0 bg-[#E8ECF5]"
                      />
                    </div>

                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Total parcelas</p>
                      <Input
                        value={suggestion.parcela_total || ""}
                        onChange={(e) =>
                          updateSuggestion("parcela_total", Number(e.target.value) || null)
                        }
                        inputMode="numeric"
                        className="rounded-xl border-0 bg-[#E8ECF5]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setSuggestion(null)}
                  className="rounded-2xl bg-[#E8ECF5] px-4 py-3 text-sm font-bold text-muted-foreground"
                >
                  Editar texto
                </button>

                <button
                  onClick={handleSave}
                  disabled={savePending}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#0D9488] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {savePending && <Loader2 size={16} className="animate-spin" />}
                  Confirmar e salvar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default QuickEntrySheet;
