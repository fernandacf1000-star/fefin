import { useState } from "react";

export default function NewExpenseSheet({ salvarDespesa, cartoes }) {
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [cartaoSelecionado, setCartaoSelecionado] = useState(null);

  const cartoesFiltrados = (cartoes || []).filter(
    (c) =>
      c.bandeira?.toLowerCase() === "visa" ||
      c.bandeira?.toLowerCase() === "mastercard"
  );

  async function handleSubmit() {
    let payload = {
      valor: Number(valor),
      descricao,
      owner: "me", // padrão
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

    await salvarDespesa(payload);
  }

  return (
    <div>
      <input value={valor} onChange={(e) => setValor(e.target.value)} />
      <input value={descricao} onChange={(e) => setDescricao(e.target.value)} />

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

      <button onClick={handleSubmit}>Salvar</button>
    </div>
  );
}