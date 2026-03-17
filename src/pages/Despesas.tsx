export default function Despesas({ despesas }) {
  // 🔹 NÃO filtra mais pais → visão unificada
  const lista = despesas || [];

  return (
    <div>
      <h2>Despesas</h2>

      {lista.map((d) => (
        <div key={d.id}>
          {d.descricao} - R$ {d.valor}
        </div>
      ))}
    </div>
  );
}