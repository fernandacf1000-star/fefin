import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [despesas, setDespesas] = useState([]);
  const [cartoes, setCartoes] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: despesasData } = await supabase
      .from("despesas")
      .select("*");

    const { data: cartoesData } = await supabase
      .from("cartoes")
      .select("*");

    setDespesas(despesasData || []);
    setCartoes(cartoesData || []);
  }

  // TOTAL GERAL (inclui pais)
  const total = useMemo(() => {
    return despesas.reduce((acc, d) => acc + Number(d.valor || 0), 0);
  }, [despesas]);

  // CONSOLIDADO POR CATEGORIA (inclui pais)
  const categorias = useMemo(() => {
    const map = {};

    despesas.forEach((d) => {
      const cat = d.categoria || "Outros";
      map[cat] = (map[cat] || 0) + Number(d.valor || 0);
    });

    return Object.entries(map)
      .map(([categoria, valor]) => ({
        categoria,
        valor,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [despesas]);

  // CONSOLIDADO POR CARTÃO
  const porCartao = useMemo(() => {
    const map = {};

    despesas.forEach((d) => {
      if (!d.cartao_id) return;

      map[d.cartao_id] = (map[d.cartao_id] || 0) + Number(d.valor || 0);
    });

    return Object.entries(map)
      .map(([id, valor]) => {
        const cartao = cartoes.find((c) => c.id === id);

        return {
          nome: cartao?.nome || "Cartão",
          valor,
        };
      })
      .sort((a, b) => b.valor - a.valor);
  }, [despesas, cartoes]);

  return (
    <div style={{ padding: 16 }}>
      <h1>Dashboard</h1>

      <h2>Total: R$ {total.toFixed(2)}</h2>

      <h3>Por Categoria</h3>
      {categorias.length === 0 && <div>Sem dados</div>}
      {categorias.map((c) => (
        <div
          key={c.categoria}
          style={{ display: "flex", justifyContent: "space-between" }}
        >
          <span>{c.categoria}</span>
          <span>R$ {c.valor.toFixed(2)}</span>
        </div>
      ))}

      <h3>Cartões</h3>
      {porCartao.length === 0 && <div>Sem dados</div>}
      {porCartao.map((c) => (
        <div
          key={c.nome}
          style={{ display: "flex", justifyContent: "space-between" }}
        >
          <span>{c.nome}</span>
          <span>R$ {c.valor.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}