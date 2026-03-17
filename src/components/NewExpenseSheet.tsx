import { useState } from "react";

export default function NewExpenseSheet({ salvarDespesa, cartoes }) {
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [cartaoSelecionado, setCartaoSelecionado] = useState(null);
  const [parcelas, setParcelas] = useState(1);
  const [data, setData] = useState(new Date());

  // 🔹 Apenas Visa e Master
  const cartoesFiltrados = (cartoes || []).filter(
    (c) =>
      c.bandeira?.toLowerCase() === "visa" ||
      c.bandeira?.toLowerCase() === "mastercard"
  );

  async function handleSubmit() {
    if (!valor) {
      alert("Informe o valor");
      return;
    }

    let payloadBase = {
      valor: Number(valor),
      descricao,
    };

    // 🔹 Define forma de pagamento corretamente
    if (formaPagamento === "dinheiro") {
      payloadBase.forma_pagamento = "dinheiro";
      payloadBase.cartao_id = null;
    } else {
      payloadBase.forma_pagamento = "cartao";

      if (!cartaoSelecionado) {
        alert("Selecione um cartão");
        return;
      }

      payloadBase.cartao_id = cartaoSelecionado;
    }

    // 🔹 Parcelamento corrigido
    for (let i = 0; i < parcelas; i++) {
      const dataParcela = new Date(data);
      dataParcela.setMonth(dataParcela.getMonth() + i);

      await salvarDespesa({
        ...payloadBase,
        numero_parcela: parcelas > 1 ? i + 1 : null,
        total_parcelas: parcelas > 1 ? parcelas : null,
        data: dataParcela,
      });
    }

    // reset
    setValor("");
    setDescricao("");
    setParcelas(1);
    setCartaoSelecionado(null);
    setFormaPagamento("dinheiro");
  }

  return (
    <div>
      <h2>Nova Despesa</h2>

      <input
        placeholder="Valor"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
      />

      <input
        placeholder="Descrição"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
      />

      {/* 🔹 Forma de pagamento simplificada */}
      <select
        value={formaPagamento}
        onChange={(e) => setFormaPagamento(e.target.value)}
      >
        <option value="dinheiro">Dinheiro</option>
        <option value="visa">Visa</option>
        <option value="mastercard">Master</option>
      </select>

      {/* 🔹 Seleção de cartão */}
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

      <input
        type="number"
        min="1"
        value={parcelas}
        onChange={(e) => setParcelas(Number(e.target.value))}
      />

      <button onClick={handleSubmit}>Salvar</button>
    </div>
  );
}
