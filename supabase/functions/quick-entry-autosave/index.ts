const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-quick-entry-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RequestBody = {
  input: string;
  today?: string;
};

type ParsedLancamento = {
  descricao: string;
  valor: number;
  tipo: "despesa" | "receita";
  categoria: string;
  categoria_macro: string;
  subcategoria?: string | null;
  data: string;
  cartao_id: string | null;
  forma_pagamento: string;
  is_parcelado: boolean;
  parcela_atual: number | null;
  parcela_total: number | null;
  confianca: "alta" | "media" | "baixa";
};

const USER_ID = "3b2ffd9c-6122-4128-9474-9bf796410e94";
const VISA_ID = "749d8b20-7c2c-48a9-9601-dd7035c33cd5";
const MASTERCARD_ID = "86e2aca7-ac75-4dfc-93bc-8036d8a6eddf";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function extractJson(text: string): ParsedLancamento {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Claude não retornou JSON válido.");
    return JSON.parse(match[0]);
  }
}

function mesReferencia(data: string) {
  return data.slice(0, 7);
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizeLancamento(parsed: ParsedLancamento, today: string) {
  const data = /^\d{4}-\d{2}-\d{2}$/.test(parsed.data || "") ? parsed.data : today;
  const confianca = parsed.confianca || "baixa";

  return {
    user_id: USER_ID,
    descricao: parsed.descricao?.trim() || "Lançamento por voz",
    valor: Math.abs(Number(parsed.valor || 0)),
    tipo: parsed.tipo === "receita" ? "receita" : "despesa",
    categoria: parsed.categoria || "Outros",
    categoria_macro: parsed.categoria_macro || parsed.categoria || "Outros",
    subcategoria: confianca === "baixa" ? "revisar" : parsed.subcategoria || null,
    data,
    mes_referencia: mesReferencia(data),
    cartao_id: null,
    forma_pagamento: "dinheiro",
    pago: false,
    adriano: false,
    pago_por: "voce",
    is_parcelado: Boolean(parsed.is_parcelado),
    parcela_atual: parsed.parcela_atual ?? null,
    parcela_total: parsed.parcela_total ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const expectedToken = Deno.env.get("QUICK_ENTRY_TOKEN");
    const receivedToken = req.headers.get("x-quick-entry-token");

    if (!expectedToken) throw new Error("QUICK_ENTRY_TOKEN não configurado.");
    if (!receivedToken || receivedToken !== expectedToken) {
      return jsonResponse({ ok: false, error: "Token inválido." }, 401);
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const model = Deno.env.get("ANTHROPIC_MODEL") || "claude-haiku-4-5-20251001";

    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY não configurada.");
    if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
    if (!supabaseUrl) throw new Error("SUPABASE_URL não configurada.");

    const body = (await req.json()) as RequestBody;
    const input = body.input?.trim();
    const today = body.today || new Date().toISOString().slice(0, 10);

    if (!input) throw new Error("Input vazio.");

    const systemPrompt = `Você é um assistente de finanças pessoais brasileiro.

Interprete o texto do usuário e retorne APENAS JSON válido, sem markdown, sem comentários e sem texto adicional.

Schema obrigatório:
{
  "descricao": string,
  "valor": number,
  "tipo": "despesa" | "receita",
  "categoria": string,
  "categoria_macro": string,
  "subcategoria": string | null,
  "data": string,
  "cartao_id": string | null,
  "forma_pagamento": string,
  "is_parcelado": boolean,
  "parcela_atual": number | null,
  "parcela_total": number | null,
  "confianca": "alta" | "media" | "baixa"
}

Regras:
- A data deve estar em YYYY-MM-DD.
- Se não houver data explícita, use a data de hoje: ${today}.
- Valor deve ser número decimal, sem "R$".
- Para uso por Siri/CarPlay, NÃO escolha cartão: retorne cartao_id = null e forma_pagamento = "dinheiro", salvo se o texto for claramente receita.
- Se houver ambiguidade relevante, use confianca = "baixa".
- Se mencionar "em 3x", "03/10", "parcela 2 de 6", preencha is_parcelado/parcela_atual/parcela_total.
- Se for compra aprovada, geralmente é despesa.
- Se for salário, reembolso recebido ou resgate, geralmente é receita.
- Para despesa, categoria deve ser uma destas: Alimentação, Moradia, Transporte, Saúde, Educação, Lazer, Vestuário, Beleza, Pet, Serviços, Outros.
- Para receita, categoria deve ser uma destas: salario, resgate_investimento, reembolso, outros.
- Para despesas dos pais, preserve isso na descrição, por exemplo "Diarista dos pais".

Cartões disponíveis apenas como contexto, sem uso automático no autosave:
- VISA: ${VISA_ID}
- Mastercard: ${MASTERCARD_ID}`;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: "user", content: input }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      throw new Error(errorText || "Erro na Claude API.");
    }

    const anthropicData = await anthropicResponse.json();
    const text = anthropicData?.content?.[0]?.text;
    if (!text) throw new Error("Resposta vazia da Claude API.");

    const parsed = extractJson(text);
    const lancamento = normalizeLancamento(parsed, today);

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/lancamentos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(lancamento),
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      throw new Error(errorText || "Erro ao inserir lançamento.");
    }

    const inserted = await insertResponse.json();
    const row = Array.isArray(inserted) ? inserted[0] : inserted;
    const confirmacao = `Anotado! ${formatBRL(lancamento.valor)} — ${lancamento.descricao} — ${lancamento.categoria}`;

    return jsonResponse({
      ok: true,
      confirmacao,
      lancamento_id: row?.id,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      400
    );
  }
});
