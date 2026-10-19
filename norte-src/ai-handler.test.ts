import { describe, expect, it, vi } from "vitest";
import { createHandler } from "../supabase/functions/norte-ai/handler";
function setup(status = 200, result: unknown = { items: [{ kind: "despesa", amount: 45, label: "Mercado", category: "Alimentação", subcategory: "Supermercado", dayOffset: 0 }] }) {
  const deps = {
    authenticate: vi.fn().mockResolvedValue(true),
    env: vi.fn((name: string) => name === "ANTHROPIC_API_KEY" ? "test-placeholder" : undefined),
    fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(result) }] }), { status })),
    log: vi.fn(),
  };
  const handler = createHandler(deps);
  const call = (body: unknown = { task: "parse", text: "45 mercado" }, headers = { Authorization: "Bearer test-placeholder" }) => handler(new Request("https://example.test", { method: "POST", headers, body: JSON.stringify(body) }));
  return { deps, call, handler };
}
describe("norte-ai: contrato e erros sem dados sensíveis", () => {
  it("chave ausente retorna config sem chamar provedor", async () => {
    const { deps, call } = setup(); deps.env.mockReturnValue(undefined);
    const r = await call(); expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: "IA não configurada", code: "config" });
    expect(deps.fetch).not.toHaveBeenCalled();
    expect(deps.log).toHaveBeenCalledWith({ code: "config", provider_status: null, task: "parse" });
  });
  it.each([401,403,404,429,500,502,503])("mapeia HTTP %s do provedor", async (status) => {
    const { deps, call } = setup(status); const r = await call();
    const code = status === 401 || status === 403 ? "provider_auth" : status === 404 ? "model" : "provider_unavailable";
    expect(r.status).toBe(503); expect((await r.json()).code).toBe(code);
    expect(deps.log).toHaveBeenCalledWith({ code, provider_status: status, task: "parse" });
  });
  it("timeout e falha de rede não expõem mensagens da exceção", async () => {
    const { deps, call } = setup(); deps.fetch.mockRejectedValue(new Error("texto privado token chave"));
    const r = await call(); expect(r.status).toBe(503); expect((await r.json()).code).toBe("provider_unavailable");
    expect(JSON.stringify(deps.log.mock.calls)).not.toMatch(/privado|token|chave/);
  });
  it("JWT ausente ou inválido retorna auth sem chamar provedor", async () => {
    const { deps, call } = setup();
    expect((await (await call(undefined, {} as { Authorization: string })).json()).code).toBe("auth");
    deps.authenticate.mockResolvedValue(false); const r = await call();
    expect(r.status).toBe(401); expect((await r.json()).code).toBe("auth"); expect(deps.fetch).not.toHaveBeenCalled();
  });
  it.each([null, [], {}, { task: "anything-private" }, { task: "parse", text: 10 }, { task: "classify", items: [null] }, { task: "parse", text: "x", kind: "other" }])("corpo inválido retorna 400", async (body) => {
    const { call, deps } = setup(); expect((await call(body)).status).toBe(400); expect(deps.fetch).not.toHaveBeenCalled();
    expect(JSON.stringify(deps.log.mock.calls)).not.toContain("anything-private");
  });
  it("JSON malformado retorna 400", async () => {
    const { handler } = setup(); const r = await handler(new Request("https://example.test", { method: "POST", headers: { Authorization: "Bearer test-placeholder" }, body: "{" })); expect(r.status).toBe(400);
  });
  it.each(["receita", "despesa"])("preserva parse e classify para %s e regra Pais", async (kind) => {
    const parse = setup(); const r = await parse.call({ task: "parse", kind, text: "45 mercado" });
    const parsed = await r.json();
    expect(r.status).toBe(200); expect(parsed.items[0].category).toBe("Alimentação");
    expect(parsed.items[0].subcategory).toBe(kind === "despesa" ? "Supermercado" : null);
    const classify = setup(200, { categories: ["Pessoal"], subcategories: ["Presentes"] });
    const c = await classify.call({ task: "classify", kind, items: [{ label: "Amélia", amount: 50 }] });
    expect(c.status).toBe(200); expect(await c.json()).toEqual({ categories: ["Pais"], subcategories: [kind === "despesa" ? "Presentes" : null] });
  });
  it("detecta automaticamente receita e despesa no mesmo texto", async () => {
    const { call } = setup(200, { items: [
      { kind: "receita", amount: 300, label: "Venda", category: "Pessoal", dayOffset: 0 },
      { kind: "despesa", amount: 45, label: "Mercado", category: "Alimentação", dayOffset: -1 },
    ] });
    const r = await call({ task: "parse", text: "Recebi 300 da venda e gastei 45 no mercado ontem" });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ items: [
      { kind: "receita", amount: 300, label: "Venda" },
      { kind: "despesa", amount: 45, label: "Mercado" },
    ] });
  });
  it("retorna o cartão padrão para o gasto sem pagamento informado e respeita Pix explícito", async () => {
    const cards = [{ id: "master", name: "Master" }];
    const standard = setup(200, { items: [{ kind: "despesa", amount: 45, label: "Mercado", category: "Alimentação", dayOffset: 0 }] });
    const defaultCard = await standard.call({ task: "parse", text: "45 mercado", cards, defaultCardId: "master" });
    expect((await defaultCard.json()).items[0].cardId).toBe("master");
    const pix = setup(200, { items: [{ kind: "despesa", amount: 45, label: "Mercado", category: "Alimentação", dayOffset: 0, cardId: null }] });
    const explicitPix = await pix.call({ task: "parse", text: "45 no pix no mercado", cards, defaultCardId: "master" });
    expect((await explicitPix.json()).items[0].cardId).toBeNull();
  });
  it("resposta inválida ou categoria inventada não é sucesso", async () => {
    const { call } = setup(200, { items: [{ amount: 40, label: "Loja", category: "Outro", dayOffset: 0 }] });
    expect((await call()).status).toBe(503);
  });
  it("parse e classify validam subcategorias da lista fixa", async () => {
    const parsed = setup(200, { items: [{ kind: "despesa", amount: 45, label: "Mercado", category: "Alimentação", subcategory: "Sem categoria", dayOffset: 0 }] });
    expect((await parsed.call()).status).toBe(503);
    const classified = setup(200, { categories: ["Alimentação"], subcategories: ["Inventada"] });
    expect((await classified.call({ task: "classify", kind: "despesa", items: [{ label: "Mercado", amount: 45 }] })).status).toBe(503);
  });
  it("classify respeita categoria conhecida e só aceita subcategoria compatível", async () => {
    const service = setup(200, { categories: ["Pessoal"], subcategories: ["Supermercado"] });
    const body = { task: "classify", kind: "despesa", items: [{ label: "Mercado", amount: 45, category: "Alimentação" }] };
    const response = await service.call(body);
    expect(await response.json()).toEqual({ categories: ["Alimentação"], subcategories: ["Supermercado"] });
    const request = JSON.parse(String(service.deps.fetch.mock.calls[0][1]?.body));
    expect(request.messages[0].content).toContain("categoria: Alimentação");
    const invalid = setup();
    expect((await invalid.call({ ...body, items: [{ ...body.items[0], category: "Outro" }] })).status).toBe(400);
  });
});
