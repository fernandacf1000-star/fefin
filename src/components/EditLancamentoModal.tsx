import { useEffect, useState } from "react";

export default function EditLancamentoModal({
  lancamento,
  onSave,
  cartoes,
}) {
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [cartaoSelecionado, setCartaoSelecionado] = useState(null);

  const cartoesFiltrados = (cartoes || []).filter(
    (c) =>
      c.bandeira?.toLowerCase() === "visa" ||
      c.bandeira?.toLowerCase() === "mastercard"
  );

  useEffect(() => {
    if (!lancamento) return;

    setValor(lancamento.valor);
    setDescricao(lancamento.descricao);

    // 🔹 Corrige leitura do pagamento
    if (lancamento.cartao_id) {
      setFormaPagamento("cartao");
      setCartaoSelecionado(lancamento.cartao_id);
    } else {
      setFormaPagamento("dinheiro");
      setCartaoSelecionado(null);
    }
  }, [lancamento]);

  async function handleSave() {
    let payload = {
      valor: Number(valor),
      descricao,
    };

    if (formaPagamento === "dinheiro") {
      payload.forma_pagamento = "dinheiro";
      payload.cartao_id = null;
    } else {
      payload.forma_pagamento = "cartao";

      if (!cartaoSelecionado) {
        alert("Selecione um cartão");
        return;
      }

      payload.cartao_id = cartaoSelecionado;
    }

    await onSave(payload);
  }

  return (
    <div>
      <h2>Editar Lançamento</h2>

      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
      />

      <input
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
      />

      <select
        value={formaPagamento}
        onChange={(e) => setFormaPagamento(e.target.value)}
      >
        <option value="dinheiro">Dinheiro</option>
        <option value="cartao">Cartão</option>
      </select>

      {formaPagamento !== "dinheiro" && (
        <select
          value={cartaoSelecionado || ""}
          onChange={(e) => setCartaoSelecionado(e.target.value)}
        >
          <option value="">Selecione</option>
          {cartoesFiltrados.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      )}

      <button onClick={handleSave}>Salvar</button>
    </div>
  );
}
