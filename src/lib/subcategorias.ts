// Subcategoria structure for expenses
export interface SubcategoriaGroup {
  group: string;
  items: string[];
}

export const SUBCATEGORIA_GROUPS: SubcategoriaGroup[] = [
  { group: "Casa", items: ["Mercado", "Hortifruti", "Itens domésticos", "Manutenção/Reformas"] },
  { group: "Alimentação fora", items: ["Restaurantes", "Delivery", "Padaria/Café"] },
  { group: "Transporte", items: ["Combustível", "Uber/99", "Estacionamento", "Manutenção carro"] },
  { group: "Saúde", items: ["Farmácia/Remédios", "Consultas/Exames", "Plano de saúde", "Dentista", "Psicólogo"] },
  { group: "Moda e Beleza", items: ["Roupas/Calçados", "Cosméticos/Perfumes", "Cabelo/Estética", "Acessórios"] },
  { group: "Compras Online", items: ["Amazon", "Mercado Livre", "Shopee", "Outros e-commerce"] },
  { group: "Serviços Fixos", items: ["Assinaturas", "Seguros", "Advogado/Jurídico"] },
  { group: "Lazer e Viagem", items: ["Hotel/Hospedagem", "Passeios", "Academia/Esporte"] },
  { group: "Arte e Decoração", items: ["Objetos de arte", "Decoração", "Quadros/Design"] },
  { group: "Educação", items: ["Livros", "Cursos", "Material"] },
  { group: "Outros", items: ["Loteria", "Doações", "Gorjetas", "Miscelânea"] },
];

/** Flat list of all subcategorias */
export const ALL_SUBCATEGORIAS: string[] = SUBCATEGORIA_GROUPS.flatMap((g) => g.items);

/** Get the group for a subcategoria */
export const getSubcategoriaGroup = (sub: string): string | undefined => {
  return SUBCATEGORIA_GROUPS.find((g) => g.items.includes(sub))?.group;
};

/** Format subcategoria for display: "Group > Item" */
export const formatSubcategoria = (sub: string): string => {
  const group = getSubcategoriaGroup(sub);
  return group ? `${group} > ${sub}` : sub;
};

/** Auto-detect subcategoria from description */
export const detectSubcategoria = (descricao: string): string | null => {
  const d = descricao.toUpperCase();
  
  // Casa > Mercado
  if (/SACOLAO|MERCADO|PAO DE ACUCAR|CARREFOUR|EXTRA\s|ASSAI|ATACADAO|SAMS|BIG\s/.test(d)) return "Mercado";
  // Casa > Hortifruti
  if (/HOMEM DE MELLO|PASTORINHO|HORTIFRUTI|HORTIFRUIT|QUITANDA|SACOLAO/.test(d)) return "Hortifruti";
  // Saúde > Farmácia
  if (/DROGARIA|FARMACIA|PANVEL|RD SAUDE|DROGA\s|DROGASIL|RAIA|PACHECO/.test(d)) return "Farmácia/Remédios";
  // Saúde > Consultas
  if (/CLINICA|MEDIC|HOSPITAL|LABORAT|CONSULTA|EXAME/.test(d)) return "Consultas/Exames";
  // Serviços > Seguros
  if (/TOKIO MARINE|SEGURO|PORTO SEGURO|SULAMERICA|BRADESCO SAUDE/.test(d)) return "Seguros";
  // Transporte
  if (/UBER|99\s|99POP|CABIFY/.test(d)) return "Uber/99";
  if (/COMBUSTIVEL|GASOLINA|ETANOL|POSTO|SHELL|IPIRANGA/.test(d)) return "Combustível";
  if (/ESTACIONAMENTO|ZONA AZUL|ESTAPAR/.test(d)) return "Estacionamento";
  // Alimentação fora
  if (/IFOOD|RAPPI|DELIVERY|UBER EATS/.test(d)) return "Delivery";
  if (/RESTAURANTE|CANTINA|LANCHONETE|BURGUER|BURGER|PIZZA/.test(d)) return "Restaurantes";
  if (/PADARIA|CAFE|CAFETERIA|STARBUCKS/.test(d)) return "Padaria/Café";
  // Compras Online
  if (/AMAZON/.test(d)) return "Amazon";
  if (/MERCADO LIVRE|MERCADOLIVRE/.test(d)) return "Mercado Livre";
  if (/SHOPEE/.test(d)) return "Shopee";
  // Serviços
  if (/NETFLIX|SPOTIFY|DISNEY|YOUTUBE|APPLE|GOOGLE\sONE|PRIME|HBO|GLOBOPLAY/.test(d)) return "Assinaturas";
  // Educação
  if (/LIVRO|LIVRARIA|AMAZON.*BOOK|KINDLE/.test(d)) return "Livros";
  if (/CURSO|UDEMY|ALURA|ESCOLA/.test(d)) return "Cursos";
  
  return null;
};
