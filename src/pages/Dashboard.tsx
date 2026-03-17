import { useMemo } from "react";

export default function Dashboard({ despesas, cartoes }) {
  const lista = despesas || [];

  // 🔹 Total geral
  const total = useMemo(() => {
    return lista.reduce((acc, d) => acc + Number(d.valor || 0), 0);
  }, [lista]);

  // 🔹 Por categoria (CONSOLIDADO)
  const categorias = useMemo(() => {
    const map = {};

    lista.forEach((d) => {
      const cat = d.categoria || "Outros";

      if (!map[cat]) map[cat] = 0;
      map[cat] += Number(d.valor || 0);
    });

    return Object.entries(map).map(([categoria, valor]) => ({
      categoria,
      valor,
    }));
  }, [lista]);

  // 🔹 Por cartão
  const porCartao = useMemo(() => {
    const map = {};

    lista.forEach((d) => {
      if (!d.cartao_id) return;

      if (!map[d.cartao_id]) map[d.cartao_id] = 0;
      map[d.cartao_id] += Number(d.valor || 0);
    });

    return Object.entries(map).map(([id, valor]) => {
      const cartao = cartoes.find((c) => c.id === id);

      return {
        nome: cartao?.nome || "Cartão",
        valor,
      };
    });
  }, [lista, cartoes]);

  return (
    <div>
      <h2>Dashboard</h2>

      <div>Total: R$ {total.toFixed(2)}</div>

      <h3>Por Categoria</h3>
      {categorias.map((c) => (
        <div key={c.categoria}>
          {c.categoria}: R$ {c.valor.toFixed(2)}
        </div>
      ))}

      <h3>Cartões</h3>
      {porCartao.map((c) => (
        <div key={c.nome}>
          {c.nome}: R$ {c.valor.toFixed(2)}
        </div>
      ))}
    </div>
  );
}