import { useMemo } from "react";

export default function Pais({ despesas }) {
  // 🔹 Filtra apenas despesas dos pais
  const despesasPais = useMemo(() => {
    return (despesas || []).filter((d) => d.owner === "pais");
  }, [despesas]);

  // 🔹 Agrupamento por categoria
  const categorias = useMemo(() => {
    const map = {};

    despesasPais.forEach((d) => {
      const cat = d.categoria || "Outros";

      if (!map[cat]) {
        map[cat] = 0;
      }

      map[cat] += Number(d.valor || 0);
    });

    return Object.entries(map).map(([categoria, valor]) => ({
      categoria,
      valor,
    }));
  }, [despesasPais]);

  const total = despesasPais.reduce(
    (acc, d) => acc + Number(d.valor || 0),
    0
  );

  return (
    <div>
      <h2>Despesas dos Pais</h2>

      {/* 🔹 Total */}
      <div>Total: R$ {total.toFixed(2)}</div>

      {/* 🔹 Distribuição por categoria */}
      <div>
        <h3>Por Categoria</h3>
        {categorias.map((c) => (
          <div key={c.categoria}>
            {c.categoria}: R$ {c.valor.toFixed(2)}
          </div>
        ))}
      </div>

      {/* 🔹 Lista */}
      <div>
        <h3>Lançamentos</h3>
        {despesasPais.map((d) => (
          <div key={d.id}>
            {d.descricao} - R$ {d.valor}
          </div>
        ))}
      </div>
    </div>
  );
}