const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RequestBody = {
  input: string;
  today?: string;
  cartoes?: Array<{
    id: string;
    nome: string;
    bandeira?: string | null;
    dia_fechamento?: number | null;
    dia_vencimento?: number | null;
  }>;
};

function extractJson(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Claude não retornou JSON válido.");
    return JSON.parse(match[0]);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const model = Deno.env.get("ANTHROPIC_MODEL") || "claude-haiku-4-5-20251001";

    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY não configurada.");
    }

    const body = (await req.json()) as RequestBody;
    const input = body.input?.trim();

    if (!input) {
      throw new Error("Input vazio.");
    }

    const today = body.today || new Date().toISOString().slice(0, 10);

    const cartoesTexto =
      body.cartoes && body.cartoes.length > 0
        ? body.cartoes
            .map(
              (c) =>
                `- ${c.nome} (${c.bandeira || "cartão"}): ${c.id}; fecha dia ${
                  c.dia_fechamento || "?"
                }, vence dia ${c.dia_vencimento || "?"}`
            )
            .join("\n")
        : `- VISA final 9364: 749d8b20-7c2c-48a9-9601-dd7035c33cd5
- Mastercard final 9364 (The One): 86e2aca7-ac75-4dfc-93bc-8036d8a6eddf`;

    const systemPrompt = `Você é um assistente de finanças pessoais brasileiro.

Interprete o texto do usuário e retorne APENAS JSON válido, sem markdown, sem comentários e sem texto adicional.

Schema obrigatório:
{
  "descricao": string,
  "valor": number,
  "tipo": "despesa" | "receita",
  "categoria": string,
  "categoria_macro": string,
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
- Para despesa no cartão, use forma_pagamento = "credito".
- Para débito/dinheiro/pix, use forma_pagamento = "dinheiro".
- Se mencionar final de cartão, escolha o cartao_id mais provável pelos cartões disponíveis.
- Se houver ambiguidade de cartão, use cartao_id = null e confianca = "baixa".
- Se mencionar "em 3x", "03/10", "parcela 2 de 6", preencha is_parcelado/parcela_atual/parcela_total.
- Se for compra aprovada, geralmente é despesa.
- Se for salário, reembolso recebido ou resgate, geralmente é receita.
- Para despesa, categoria deve ser uma destas: Alimentação, Moradia, Transporte, Saúde, Educação, Lazer, Vestuário, Beleza, Pet, Serviços, Outros.
- Para receita, categoria deve ser uma destas: salario, resgate_investimento, reembolso, outros.

Cartões disponíveis:
${cartoesTexto}`;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        temperature: 0,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: input,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      throw new Error(errorText || "Erro na Claude API.");
    }

    const data = await anthropicResponse.json();
    const text = data?.content?.[0]?.text;

    if (!text) {
      throw new Error("Resposta vazia da Claude API.");
    }

    const parsed = extractJson(text);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro desconhecido.",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
