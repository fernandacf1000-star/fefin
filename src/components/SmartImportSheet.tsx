import React, { useState, useRef } from "react";
import { X, Sparkles, Camera, ClipboardPaste, Check, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";
import { useCartoes } from "@/hooks/useCartoes";
import { useAddLancamento, useAddMultipleLancamentos } from "@/hooks/useLancamentos";
import { detectSubcategoria, detectCategoriaMacro } from "@/lib/subcategorias";
import { toast } from "sonner";

// ── Tipos ──────────────────────────────────────────────────────────────────

type Owner = "eu" | "pais" | "amelia" | "antonio" | "adriano";

interface ParsedExpense {
  descricao: string;
  valor: number;
  data: string;          // yyyy-MM-dd
  cartaoNome: string | null;
  owner: Owner;
  ownerRaw: string | null;
  formaPagamento: "credito" | "dinheiro";
  subcategoria: string | null;
  confidence: "high" | "medium" | "low";
  rawText: string;
}

// Nomes conhecidos → owner
const KNOWN_NAMES: Record<string, Owner> = {
  "FERNANDA": "eu",
  "FERNANDA CAVALHEIRO": "eu",
  "ADRIANO": "adriano",
  "AMELIA": "pais",
  "AMÉLIA": "pais",
  "AMELIA CAVALHEIRO": "pais",
  "AMÉLIA CAVALHEIRO": "pais",
  "ANTONIO": "pais",
  "ANTÔNIO": "pais",
  "ANTONIO JOSE": "pais",
  "ANTÔNIO JOSÉ": "pais",
};

function ownerLabel(o: Owner): string {
  switch (o) {
    case "eu":      return "💚 Minha despesa";
    case "pais":    return "🧓 Despesa dos Pais";
    case "amelia":  return "👩 Despesa da Amélia";
    case "antonio": return "👴 Despesa do Antônio";
    case "adriano": return "👨 Dividir com Adriano";
    default:        return "💚 Minha despesa";
  }
}

function ownerColor(o: Owner): string {
  switch (o) {
    case "eu":      return "border-green-400 bg-green-50 text-green-700";
    case "pais":
    case "amelia":
    case "antonio": return "border-amber-400 bg-amber-50 text-amber-700";
    case "adriano": return "border-blue-400 bg-blue-50 text-blue-700";
    default:        return "border-green-400 bg-green-50 text-green-700";
  }
}

// ── Parser via Claude API ──────────────────────────────────────────────────

async function parseExpenseWithAI(
  text: string,
  imageBase64: string | null,
  cartoes: Array<{ id: string; nome: string; bandeira: string }>
): Promise<ParsedExpense> {
  const cartoesList = cartoes.map(c => `${c.nome} (${c.bandeira})`).join(", ");
  const today = format(new Date(), "yyyy-MM-dd");

  const systemPrompt = `Você é um parser especializado em notificações de cartão de crédito e comprovantes brasileiros.
Extraia as informações e retorne APENAS JSON válido, sem markdown, sem explicações.

Cartões disponíveis no app: ${cartoesList || "Mastercard, Visa"}
Data de hoje: ${today}

Nomes conhecidos:
- FERNANDA CAVALHEIRO = dono: "eu"
- ADRIANO = dono: "adriano"  
- AMELIA / AMÉLIA / AMELIA CAVALHEIRO = dono: "pais"
- ANTONIO / ANTÔNIO = dono: "pais"
- Qualquer outro nome = dono: "pais"

Retorne exatamente este JSON:
{
  "descricao": "nome do estabelecimento limpo (ex: The One Personnalité, iFood, Uber)",
  "valor": 163.23,
  "data": "2026-06-09",
  "cartaoNome": "nome do cartão dos disponíveis, ou null se não identificado",
  "owner": "eu | pais | adriano",
  "ownerRaw": "nome como apareceu no texto, ou null",
  "formaPagamento": "credito | dinheiro",
  "subcategoria": "categoria mais provável: Restaurante, Supermercado, Farmácia, Transporte, Saúde, Lazer, Vestuário, Streaming, Assinatura, Casa, Eletrônicos, Viagem, ou null",
  "confidence": "high | medium | low"
}`;

  const userContent: any[] = [];

  if (imageBase64) {
    userContent.push({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: imageBase64 }
    });
  }

  userContent.push({
    type: "text",
    text: text || "Extraia as informações da imagem acima."
  });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!response.ok) throw new Error("Erro na API de IA");

  const data = await response.json();
  const raw = data.content?.[0]?.text || "";

  const clean = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);

  // Normaliza owner
  const ownerMap: Record<string, Owner> = {
    "eu": "eu", "pais": "pais", "adriano": "adriano",
    "amelia": "pais", "antonio": "pais"
  };

  return {
    descricao: parsed.descricao || "Despesa importada",
    valor: typeof parsed.valor === "number" ? parsed.valor : parseFloat(String(parsed.valor).replace(",", ".")) || 0,
    data: parsed.data || today,
    cartaoNome: parsed.cartaoNome || null,
    owner: ownerMap[parsed.owner] || "eu",
    ownerRaw: parsed.ownerRaw || null,
    formaPagamento: parsed.formaPagamento === "dinheiro" ? "dinheiro" : "credito",
    subcategoria: parsed.subcategoria || null,
    confidence: parsed.confidence || "medium",
    rawText: text,
  };
}

// ── Componente ──────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = "input" | "parsing" | "review" | "saving";

function getMesReferenciaFatura(dataCompra: Date, cartao: any): string {
  if (!cartao) {
    return `${dataCompra.getFullYear()}-${String(dataCompra.getMonth() + 1).padStart(2, "0")}`;
  }
  const diaFecha = cartao.dia_fechamento;
  const diaVence = cartao.dia_vencimento;
  for (let offset = 0; offset <= 2; offset++) {
    const fechamento = new Date(dataCompra.getFullYear(), dataCompra.getMonth() + offset, diaFecha);
    if (dataCompra <= fechamento) {
      const vencimento = diaVence > diaFecha
        ? new Date(dataCompra.getFullYear(), dataCompra.getMonth() + offset, diaVence)
        : new Date(dataCompra.getFullYear(), dataCompra.getMonth() + offset + 1, diaVence);
      return `${vencimento.getFullYear()}-${String(vencimento.getMonth() + 1).padStart(2, "0")}`;
    }
  }
  const v = new Date(dataCompra.getFullYear(), dataCompra.getMonth() + 3, diaVence);
  return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}`;
}

const SmartImportSheet = ({ open, onClose }: Props) => {
  const { data: cartoes = [] } = useCartoes();
  const addLancamento = useAddLancamento();
  const addMultiple = useAddMultipleLancamentos();

  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedExpense | null>(null);
  const [editedParsed, setEditedParsed] = useState<ParsedExpense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("input"); setText(""); setImageBase64(null);
    setImagePreview(null); setParsed(null); setEditedParsed(null); setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImagePreview(result);
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleParse = async () => {
    if (!text.trim() && !imageBase64) {
      setError("Cole uma mensagem ou adicione uma foto.");
      return;
    }
    setError(null);
    setStep("parsing");
    try {
      const result = await parseExpenseWithAI(text, imageBase64, cartoes);
      setParsed(result);
      setEditedParsed({ ...result });
      setStep("review");
    } catch (e: any) {
      setError("Não consegui ler a mensagem. Tente novamente.");
      setStep("input");
    }
  };

  const handleSave = async () => {
    if (!editedParsed) return;
    setStep("saving");

    try {
      const dataCompra = new Date(editedParsed.data + "T12:00:00");
      const cartaoObj = cartoes.find(c =>
        editedParsed.cartaoNome &&
        c.nome.toLowerCase().includes(editedParsed.cartaoNome.toLowerCase())
      ) || (editedParsed.formaPagamento === "credito" ? cartoes[0] : null) || null;

      const cartaoId = cartaoObj?.id || null;
      const mesRef = editedParsed.formaPagamento === "credito"
        ? getMesReferenciaFatura(dataCompra, cartaoObj)
        : `${dataCompra.getFullYear()}-${String(dataCompra.getMonth() + 1).padStart(2, "0")}`;

      const macro = detectCategoriaMacro(editedParsed.subcategoria || "") || null;

      const isPais = editedParsed.owner === "pais";
      const isAdriano = editedParsed.owner === "adriano";
      const subPais = isPais ? "Pais" : null;
      const valorPrincipal = isAdriano ? editedParsed.valor / 2 : editedParsed.valor;

      const baseRow = {
        descricao: editedParsed.descricao,
        valor: valorPrincipal,
        tipo: "despesa" as const,
        categoria: "despesa",
        subcategoria_pais: subPais,
        subcategoria: editedParsed.subcategoria || null,
        categoria_macro: macro,
        data: editedParsed.data,
        mes_referencia: mesRef,
        parcela_atual: null, parcela_total: null,
        is_parcelado: false, parcelamento_id: null,
        pago: false,
        forma_pagamento: editedParsed.formaPagamento,
        cartao_id: cartaoId,
        recorrente: false, dia_recorrencia: null,
        recorrencia_ate: null, recorrencia_pai_id: null,
        adriano: false, shared_group_id: null, shared_role: null,
        pago_por: "voce" as const,
      };

      if (isAdriano) {
        const adrianoRow = {
          ...baseRow,
          valor: editedParsed.valor / 2,
          subcategoria_pais: "Adriano",
          adriano: true,
        };
        await addMultiple.mutateAsync([baseRow, adrianoRow] as any);
      } else {
        await addLancamento.mutateAsync(baseRow as any);
      }

      toast.success(`✅ "${editedParsed.descricao}" registrada!`);
      handleClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
      setStep("review");
    }
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              <h2 className="text-base font-bold text-foreground">Importar notificação</h2>
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-secondary">
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>

          {/* ── STEP: INPUT ── */}
          {(step === "input" || step === "parsing") && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Cole a mensagem do banco ou foto do comprovante. A IA identifica valor, estabelecimento e de quem é a despesa.
              </p>

              {/* Textarea */}
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={"Cole aqui a mensagem do banco:\n\nEx: Compra aprovada no THE ONE PERSONNALITE p/ AMELIA CAVALHEIRO valor RS 163,23 em 09/06/2026"}
                rows={5}
                className="w-full bg-[#E8ECF5] rounded-2xl px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/60"
              />

              {/* Foto */}
              <input ref={fileRef} type="file" accept="image/*" capture="environment"
                className="hidden" onChange={handleImage} />

              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden">
                  <img src={imagePreview} alt="Comprovante" className="w-full max-h-48 object-cover" />
                  <button
                    onClick={() => { setImageBase64(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center"
                  >
                    <X size={14} className="text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <Camera size={16} />
                  Tirar foto do comprovante
                </button>
              )}

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100">
                  <AlertCircle size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <button
                onClick={handleParse}
                disabled={step === "parsing" || (!text.trim() && !imageBase64)}
                className="w-full h-12 rounded-2xl gradient-emerald text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {step === "parsing" ? (
                  <><Loader2 size={16} className="animate-spin" /> Analisando com IA...</>
                ) : (
                  <><Sparkles size={16} /> Analisar com IA</>
                )}
              </button>
            </div>
          )}

          {/* ── STEP: REVIEW ── */}
          {step === "review" && editedParsed && (
            <div className="space-y-3">

              {/* Confiança */}
              {editedParsed.confidence !== "high" && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
                  <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    {editedParsed.confidence === "low"
                      ? "Confiança baixa — revise os campos antes de salvar."
                      : "Confira os dados antes de salvar."}
                  </p>
                </div>
              )}

              {/* Dono */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">De quem é a despesa?</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["eu", "pais", "adriano"] as Owner[]).map(o => (
                    <button key={o}
                      onClick={() => setEditedParsed(p => p ? { ...p, owner: o } : p)}
                      className={cn("px-3 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all text-left",
                        editedParsed.owner === o
                          ? ownerColor(o)
                          : "border-[#E8ECF5] bg-[#E8ECF5] text-muted-foreground"
                      )}>
                      {ownerLabel(o)}
                    </button>
                  ))}
                </div>
                {editedParsed.ownerRaw && (
                  <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
                    Nome detectado: <span className="font-medium">{editedParsed.ownerRaw}</span>
                  </p>
                )}
              </div>

              {/* Valor */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Valor</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <input
                    type="text"
                    value={editedParsed.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, "");
                      if (!digits) return;
                      const num = parseInt(digits, 10) / 100;
                      setEditedParsed(p => p ? { ...p, valor: num } : p);
                    }}
                    className="w-full bg-[#E8ECF5] border-0 rounded-xl pl-9 py-2.5 text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Estabelecimento</p>
                <input
                  type="text"
                  value={editedParsed.descricao}
                  onChange={e => setEditedParsed(p => p ? { ...p, descricao: e.target.value } : p)}
                  className="w-full bg-[#E8ECF5] border-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Data */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Data</p>
                <input
                  type="date"
                  value={editedParsed.data}
                  onChange={e => setEditedParsed(p => p ? { ...p, data: e.target.value } : p)}
                  className="w-full bg-[#E8ECF5] border-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Cartão */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Forma de pagamento</p>
                <div className="flex gap-1 p-1 rounded-xl bg-[#E8ECF5]">
                  {(["credito", "dinheiro"] as const).map(f => (
                    <button key={f}
                      onClick={() => setEditedParsed(p => p ? { ...p, formaPagamento: f } : p)}
                      className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                        editedParsed.formaPagamento === f ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>
                      {f === "credito" ? "💳 Crédito" : "💵 Dinheiro"}
                    </button>
                  ))}
                </div>
                {editedParsed.formaPagamento === "credito" && cartoes.length > 0 && (
                  <div className="flex gap-2 flex-wrap pt-1">
                    {cartoes.map(c => {
                      const isMatch = editedParsed.cartaoNome &&
                        c.nome.toLowerCase().includes(editedParsed.cartaoNome.toLowerCase());
                      return (
                        <button key={c.id}
                          onClick={() => setEditedParsed(p => p ? { ...p, cartaoNome: c.nome } : p)}
                          className={cn("px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors",
                            isMatch
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-white border-border text-muted-foreground")}>
                          {c.nome}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Resumo */}
              <div className={cn("rounded-xl p-3 border-2", ownerColor(editedParsed.owner))}>
                <p className="text-xs font-semibold">{ownerLabel(editedParsed.owner)}</p>
                <p className="text-lg font-bold mt-0.5">{fmt(editedParsed.valor)}</p>
                <p className="text-xs opacity-80">{editedParsed.descricao} · {editedParsed.data}</p>
                {editedParsed.owner === "adriano" && (
                  <p className="text-[10px] mt-1 opacity-70">
                    Será dividido: {fmt(editedParsed.valor / 2)} para você + {fmt(editedParsed.valor / 2)} para Adriano
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setParsed(null); setEditedParsed(null); setStep("input"); }}
                  className="flex-1 h-11 rounded-2xl bg-[#E8ECF5] text-muted-foreground text-sm font-medium"
                >
                  ← Refazer
                </button>
                <button
                  onClick={handleSave}
                  className={cn("flex-2 h-11 px-6 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2",
                    editedParsed.owner === "pais" ? "bg-amber-500" :
                    editedParsed.owner === "adriano" ? "bg-blue-500" :
                    "gradient-emerald")}
                >
                  <Check size={16} /> Registrar
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: SAVING ── */}
          {step === "saving" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Registrando...</p>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default SmartImportSheet;
