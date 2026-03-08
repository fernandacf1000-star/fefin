// New category/subcategory structure
export interface SubcategoriaGroup {
  group: string;
  emoji: string;
  items: string[];
}

export const SUBCATEGORIA_GROUPS: SubcategoriaGroup[] = [
  { group: "Moradia", emoji: "🏠", items: ["Condomínio", "IPTU", "Manutenção da casa", "Diarista", "Luz", "Água", "Gás", "Internet/Celular", "Seguro residencial"] },
  { group: "Alimentação", emoji: "🍔", items: ["Supermercado", "Restaurantes", "Delivery"] },
  { group: "Transporte", emoji: "🚗", items: ["Combustível", "Transporte por app", "Estacionamento", "Manutenção do carro", "Seguro do carro"] },
  { group: "Saúde", emoji: "🏥", items: ["Plano de saúde", "Consultas/Exames", "Medicamentos", "Seguro saúde"] },
  { group: "Pessoal", emoji: "🛍️", items: ["Roupas", "Cuidados pessoais", "Academia", "Cursos", "Advogado/Jurídico", "Outros"] },
  { group: "Lazer", emoji: "🎉", items: ["Viagens", "Entretenimento", "Presentes"] },
  { group: "Investimentos/Patrimônio", emoji: "💰", items: ["Renda fixa", "Ações", "ETF/Fundos", "Previdência"] },
];

/** Groups that Pais can use (all except Parceladas) */
export const PAIS_GROUPS = SUBCATEGORIA_GROUPS;

/** Flat list of all subcategorias */
export const ALL_SUBCATEGORIAS: string[] = SUBCATEGORIA_GROUPS.flatMap((g) => g.items);

/** Get the group for a subcategoria */
export const getSubcategoriaGroup = (sub: string): string | undefined => {
  return SUBCATEGORIA_GROUPS.find((g) => g.items.includes(sub))?.group;
};

/** Get emoji for a group */
export const getGroupEmoji = (group: string): string => {
  return SUBCATEGORIA_GROUPS.find((g) => g.group === group)?.emoji || "📋";
};

/** Format subcategoria for display: "Group > Item" */
export const formatSubcategoria = (sub: string): string => {
  const group = getSubcategoriaGroup(sub);
  return group ? `${group} > ${sub}` : sub;
};

/** Auto-detect subcategoria from description */
export const detectSubcategoria = (descricao: string): string | null => {
  const d = descricao.toUpperCase();

  // Moradia
  if (/CONDOMINIO|CONDOMÍNIO/.test(d)) return "Condomínio";
  if (/IPTU/.test(d)) return "IPTU";
  if (/DIARISTA|FAXINA/.test(d)) return "Diarista";
  if (/\bLUZ\b|ENERGIA|ENEL|CEMIG|CPFL|ELETRO/.test(d)) return "Luz";
  if (/\bAGUA\b|\bÁGUA\b|SABESP|SANEPAR|COPASA/.test(d)) return "Água";
  if (/\bGAS\b|\bGÁS\b|COMGAS|COMGÁS/.test(d)) return "Gás";
  if (/INTERNET|CELULAR|CLARO|VIVO|TIM|OI\s|FIBRA/.test(d)) return "Internet/Celular";

  // Alimentação
  if (/SACOLAO|MERCADO|PAO DE ACUCAR|CARREFOUR|EXTRA\s|ASSAI|ATACADAO|SAMS|BIG\s|HORTIFRUTI|HORTIFRUIT|QUITANDA|HOMEM DE MELLO|PASTORINHO/.test(d)) return "Supermercado";
  if (/IFOOD|RAPPI|DELIVERY|UBER EATS/.test(d)) return "Delivery";
  if (/RESTAURANTE|CANTINA|LANCHONETE|BURGUER|BURGER|PIZZA|PADARIA|CAFE|CAFETERIA|STARBUCKS/.test(d)) return "Restaurantes";

  // Transporte
  if (/UBER|99\s|99POP|CABIFY/.test(d)) return "Transporte por app";
  if (/COMBUSTIVEL|GASOLINA|ETANOL|POSTO|SHELL|IPIRANGA/.test(d)) return "Combustível";
  if (/ESTACIONAMENTO|ZONA AZUL|ESTAPAR/.test(d)) return "Estacionamento";

  // Saúde
  if (/DROGARIA|FARMACIA|PANVEL|RD SAUDE|DROGA\s|DROGASIL|RAIA|PACHECO/.test(d)) return "Medicamentos";
  if (/CLINICA|MEDIC|HOSPITAL|LABORAT|CONSULTA|EXAME/.test(d)) return "Consultas/Exames";
  if (/TOKIO MARINE|SEGURO.*SAUDE|SULAMERICA|BRADESCO SAUDE/.test(d)) return "Seguro saúde";
  if (/PLANO.*SAUDE|UNIMED|AMIL|HAPVIDA/.test(d)) return "Plano de saúde";

  // Pessoal
  if (/ACADEMIA|SMART FIT|BIO RITMO/.test(d)) return "Academia";
  if (/CURSO|UDEMY|ALURA|ESCOLA/.test(d)) return "Cursos";
  if (/ADVOGAD|JURIDIC/.test(d)) return "Advogado/Jurídico";

  // Lazer
  if (/NETFLIX|SPOTIFY|DISNEY|YOUTUBE|APPLE|GOOGLE\sONE|PRIME|HBO|GLOBOPLAY/.test(d)) return "Entretenimento";

  return null;
};

/** Detect categoria_macro from subcategoria */
export const detectCategoriaMacro = (subcategoria: string): string | null => {
  return getSubcategoriaGroup(subcategoria) || null;
};
