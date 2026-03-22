// Category/subcategory structure
export interface SubcategoriaGroup {
group: string;
emoji: string;
items: { name: string; emoji: string }[];
}

export const SUBCATEGORIA_GROUPS: SubcategoriaGroup[] = [
{ group: "Moradia", emoji: "🏠", items: [
{ name: "Condomínio/IPTU", emoji: "🏠" },
{ name: "Contas", emoji: "💡" },
{ name: "Internet/Celular", emoji: "📱" },
{ name: "Casa", emoji: "🔧" },
]},
{ group: "Alimentação", emoji: "🍔", items: [
{ name: "Supermercado", emoji: "🛒" },
{ name: "Restaurantes", emoji: "🍽️" },
{ name: "Delivery", emoji: "🛵" },
]},
{ group: "Transporte", emoji: "🚗", items: [
{ name: "Combustível", emoji: "⛽" },
{ name: "Uber/Taxi", emoji: "🚕" },
{ name: "Estacionamento", emoji: "🅿️" },
{ name: "Seguro auto", emoji: "🔩" },
]},
{ group: "Saúde", emoji: "🏥", items: [
{ name: "Plano de saúde", emoji: "🏥" },
{ name: "Consultas", emoji: "🩺" },
{ name: "Farmácia", emoji: "💊" },
]},
{ group: "Pessoal", emoji: "🛍️", items: [
{ name: "Beleza", emoji: "💇" },
{ name: "Roupas", emoji: "👗" },
{ name: "Academia", emoji: "🏋️" },
{ name: "Educação", emoji: "📚" },
{ name: "Presentes", emoji: "🎁" },
]},
{ group: "Lazer", emoji: "🎉", items: [
{ name: "Assinaturas", emoji: "📺" },
{ name: "Entretenimento", emoji: "🎭" },
{ name: "Viagens", emoji: "✈️" },
]},
{ group: "Aportes", emoji: "📊", items: [
{ name: "Aportes", emoji: "📊" },
]},
];

/** Groups that Pais can use (all) */
export const PAIS_GROUPS = SUBCATEGORIA_GROUPS;

/** Flat list of all subcategoria names */
export const ALL_SUBCATEGORIAS: string[] = SUBCATEGORIA_GROUPS.flatMap((g) => g.items.map((i) => i.name));

/** Get the group for a subcategoria */
export const getSubcategoriaGroup = (sub: string): string | undefined => {
// Check new structure
const found = SUBCATEGORIA_GROUPS.find((g) => g.items.some((i) => i.name === sub));
if (found) return found.group;
// Check legacy mappings
if (LEGACY_SUB_MAP[sub]) return LEGACY_SUB_MAP[sub].macro;
return undefined;
};

/** Get emoji for a group */
export const getGroupEmoji = (group: string): string => {
return SUBCATEGORIA_GROUPS.find((g) => g.group === group)?.emoji || "📋";
};

/** Get emoji for a specific subcategoria */
export const getSubcategoriaEmoji = (sub: string): string => {
for (const g of SUBCATEGORIA_GROUPS) {
const item = g.items.find((i) => i.name === sub);
if (item) return item.emoji;
}
return "📋";
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
if (/CONDOMINIO|CONDOMÍNIO|IPTU/.test(d)) return "Condomínio/IPTU";
if (/PAYGO|ARTSOUL|CUKIER|QUADRO E COR|CILA ART|LEROY MERLIN|SAMSUNG|COMERCIAL BUCALO/.test(d)) return "Casa";
if (/APPLECOMBILL|EC *LIVO|MP*LTCOMERC|INTERNET|CELULAR|CLARO|VIVO|TIM|OI\s|FIBRA/.test(d)) return "Internet/Celular";
if (/LUZ|ENERGIA|ELETRICIDADE|AGUA|ESGOTO|GAS|SABESP|ENEL|COMGAS|CPFL/.test(d)) return "Contas";
if (/PORTO SEGURO|TOKIO MARINE|SEGURO.*RESID/.test(d)) return "Casa";

// Alimentação
if (/PAO DE ACUCAR|HOMEM DE MELLO|HOMEM DE MEL|MERCADO|SACOLAO|HORTIFRUTI|PASTORINHO|CARREFOUR|EXTRA\s|ASSAI|ATACADAO/.test(d)) return "Supermercado";
if (/IFD*BR|IFD*IFOOD|IFOOD|RAPPI|DELIVERY|UBER EATS/.test(d)) return "Delivery";
if (/HOT POT RESTAURANT|A LAREIRA|RODOSNACK|QUIOSQUE O GUARUCA|RESTAURANTE|CANTINA|LANCHONETE|BURGUER|BURGER|PIZZA|PADARIA|CAFE|CAFETERIA|STARBUCKS/.test(d)) return "Restaurantes";

// Transporte
if (/UBER|99\s|99POP|CABIFY/.test(d)) return "Uber/Taxi";
if (/ABASTEC|COMBUSTIVEL|GASOLINA|ETANOL|POSTO|SHELL|IPIRANGA/.test(d)) return "Combustível";
if (/CARDIM PARK|ALLPARK|ESTACIONAMENTO|ZONA AZUL|ESTAPAR|PEDAGIO|PEDÁGIO/.test(d)) return "Estacionamento";
if (/SEGURO.*AUTO|SEGURO.*CARRO/.test(d)) return "Seguro auto";

// Saúde
if (/DROGARIA|RD SAUDE|FARMACIA|PANVEL|DROGASIL|RAIA|PACHECO/.test(d)) return "Farmácia";
if (/CLINICA CARLA VIDA|OCULISTA|CLINICA|MEDIC|HOSPITAL|LABORAT|CONSULTA|EXAME/.test(d)) return "Consultas";
if (/OMINT|PLANO.*SAUDE|UNIMED|AMIL|HAPVIDA/.test(d)) return "Plano de saúde";

// Pessoal
if (/SEPHORA|GRANADO|BELEZA NA WEB|RETRO HAIR|STUDIO GARCIA|MP*STUDIOGARCIA/.test(d)) return "Beleza";
if (/ZARA|CENTAURO|NIKE|CRIS BARROS|LAFORT|CATRAN|GRUPO BRABUS|SHOP2GETHER|VINDI|BOBO PATIO|E-COM HERING|INVICTU|NETSHOES|ANSELMI|PORTO COMERCIO|STUDIO MORMAII/.test(d)) return "Roupas";
if (/ACADEMIA|SMART FIT/.test(d)) return "Academia";
if (/JIM.COM|CURSO|UDEMY|ALURA|ESCOLA|CLAUDE/.test(d)) return "Educação";
if (/CASAR *PRE*SENTE|PRESENTE/.test(d)) return "Presentes";

// Lazer
if (/NETFLIX|SPOTIFY|DISNEY|YOUTUBE|APPLE|GOOGLE\sONE|PRIME|HBO|GLOBOPLAY/.test(d)) return "Assinaturas";
if (/SYMPLA|GRANDE HOTEL SAO P|HOTELAR MAUA BRASI/.test(d)) return "Entretenimento";

// Marketplace — default Supermercado (most common use)
if (/MERCADOLIVRE|MP*2PRODUTOS/.test(d)) return "Supermercado";

return null;
};

/** Detect categoria_macro from subcategoria */
export const detectCategoriaMacro = (subcategoria: string): string | null => {
return getSubcategoriaGroup(subcategoria) || null;
};

/** Per-subcategoria unique colors */
export const SUBCAT_COLORS: Record<string, string> = {
/* MORADIA */
"Condomínio/IPTU": "#6366F1",
"Contas": "#818CF8",
"Internet/Celular": "#0EA5E9",
"Casa": "#8B5CF6",
/* ALIMENTAÇÃO */
"Supermercado": "#F59E0B",
"Restaurantes": "#F97316",
"Delivery": "#EF4444",
/* TRANSPORTE */
"Combustível": "#3B82F6",
"Uber/Taxi": "#06B6D4",
"Estacionamento": "#64748B",
"Seguro auto": "#475569",
/* SAÚDE */
"Plano de saúde": "#10B981",
"Consultas": "#34D399",
"Farmácia": "#14B8A6",
/* PESSOAL */
"Beleza": "#EC4899",
"Roupas": "#F472B6",
"Academia": "#A855F7",
"Educação": "#6366F1",
"Presentes": "#F43F5E",
/* LAZER */
"Viagens": "#FBBF24",
"Entretenimento": "#FB7185",
"Assinaturas": "#C084FC",
/* APORTES */
"Aportes": "#4ADE80",
};

/** Get color for a subcategoria */
export const getSubcategoriaColor = (sub: string, _macro?: string | null): string => {
return SUBCAT_COLORS[sub] || "#475569";
};

/** Category colors for charts */
export const CAT_COLORS: Record<string, string> = {
"Moradia": "#6366F1",
"Alimentação": "#F59E0B",
"Transporte": "#3B82F6",
"Saúde": "#10B981",
"Pessoal": "#EC4899",
"Lazer": "#F97316",
"Aportes": "#4ADE80",
};

/** Legacy subcategoria mapping — remap old subcategorias to new structure */
const LEGACY_SUB_MAP: Record<string, { macro: string; sub: string }> = {
// Old names → new names
"Manutenção": { macro: "Moradia", sub: "Casa" },
"Estacionamento/Pedágio": { macro: "Transporte", sub: "Estacionamento" },
"Manutenção/Seguro": { macro: "Transporte", sub: "Seguro auto" },
"Consultas/Exames": { macro: "Saúde", sub: "Consultas" },
"Medicamentos": { macro: "Saúde", sub: "Farmácia" },
"Roupas/Cuidados pessoais": { macro: "Pessoal", sub: "Roupas" },
"Outros": { macro: "Pessoal", sub: "Educação" },
// Legacy from older migrations
"Amazon": { macro: "Pessoal", sub: "Roupas" },
"Shopee": { macro: "Pessoal", sub: "Roupas" },
"Outros e-commerce": { macro: "Pessoal", sub: "Roupas" },
"Roupas/Calçados": { macro: "Pessoal", sub: "Roupas" },
"Hortifruti": { macro: "Alimentação", sub: "Supermercado" },
"Mercado": { macro: "Alimentação", sub: "Supermercado" },
"Cabelo/Estética": { macro: "Pessoal", sub: "Beleza" },
"Farmácia/Remédios": { macro: "Saúde", sub: "Farmácia" },
"Advogado/Jurídico": { macro: "Pessoal", sub: "Educação" },
"Seguros": { macro: "Transporte", sub: "Seguro auto" },
"Itens domésticos": { macro: "Moradia", sub: "Casa" },
"Hotel/Hospedagem": { macro: "Lazer", sub: "Entretenimento" },
"Objetos de arte": { macro: "Moradia", sub: "Casa" },
"Miscelânea": { macro: "Pessoal", sub: "Roupas" },
"Livros": { macro: "Pessoal", sub: "Educação" },
"Loteria": { macro: "Lazer", sub: "Entretenimento" },
// Investimentos → Aportes
"Renda fixa": { macro: "Aportes", sub: "Aportes" },
"Ações/ETF": { macro: "Aportes", sub: "Aportes" },
"Fundos": { macro: "Aportes", sub: "Aportes" },
"Previdência": { macro: "Aportes", sub: "Aportes" },
};

/** Legacy category mapping */
const LEGACY_CATEGORY_MAP: Record<string, { macro: string; sub: string }> = {
"Compras Online": { macro: "Pessoal", sub: "Roupas" },
"Investimentos": { macro: "Aportes", sub: "Aportes" },
};

/** Normalize a categoria_macro, remapping legacy values */
export const normalizeMacro = (macro: string | null | undefined, sub?: string | null): string => {
if (sub && LEGACY_SUB_MAP[sub]) return LEGACY_SUB_MAP[sub].macro;
if (!macro) return "Sem categoria";
const mapped = LEGACY_CATEGORY_MAP[macro];
return mapped ? mapped.macro : macro;
};

/** Normalize subcategoria for legacy categories */
export const normalizeSub = (macro: string | null | undefined, sub: string | null | undefined): string | null => {
if (sub && LEGACY_SUB_MAP[sub]) return LEGACY_SUB_MAP[sub].sub;
if (macro && LEGACY_CATEGORY_MAP[macro]) return LEGACY_CATEGORY_MAP[macro].sub;
return sub || null;
};
