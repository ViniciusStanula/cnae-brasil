export const SITE_NAME = 'CNAE Brasil';
export const SITE_URL = 'https://cnaebrasil.com.br';
export const SITE_TAGLINE = 'Tudo sobre CNAE em linguagem clara';
export const CNAE_VERSION = '2.3';
export const CNAE_DATA_YEAR = 2024;
export const MEI_FONTE = 'Portal do Empreendedor — gov.br (Resolução CGSN nº 140/2018 e alterações)';
export const MEI_LIMITE_FATURAMENTO = 'R$ 81.000/ano';
export const LAST_REVIEWED_DEFAULT = '2025-01-15';

export interface SecaoInfo {
  letra: string;
  slug: string;
  nome: string;
  nome_curto: string;
  descricao: string;
}

export const SECOES: SecaoInfo[] = [
  {
    letra: 'A',
    slug: 'agricultura',
    nome: 'Agricultura, pecuária, produção florestal, pesca e aquicultura',
    nome_curto: 'Agricultura',
    descricao: 'Atividades agropecuárias, florestais, pesca e aquicultura',
  },
  {
    letra: 'B',
    slug: 'industrias-extrativas',
    nome: 'Indústrias extrativas',
    nome_curto: 'Extrativa',
    descricao: 'Extração de minerais, petróleo, gás e carvão',
  },
  {
    letra: 'C',
    slug: 'industrias-de-transformacao',
    nome: 'Indústrias de transformação',
    nome_curto: 'Transformação',
    descricao: 'Fabricação de produtos industrializados',
  },
  {
    letra: 'D',
    slug: 'eletricidade-gas-agua',
    nome: 'Eletricidade, gás, vapor e ar condicionado',
    nome_curto: 'Energia',
    descricao: 'Geração e distribuição de energia e utilidades',
  },
  {
    letra: 'E',
    slug: 'agua-esgoto-residuos',
    nome: 'Água, esgoto, atividades de gestão de resíduos e descontaminação',
    nome_curto: 'Saneamento',
    descricao: 'Abastecimento de água, saneamento e gestão de resíduos',
  },
  {
    letra: 'F',
    slug: 'construcao',
    nome: 'Construção',
    nome_curto: 'Construção',
    descricao: 'Construção civil, obras e serviços especializados',
  },
  {
    letra: 'G',
    slug: 'comercio',
    nome: 'Comércio; reparação de veículos automotores e motocicletas',
    nome_curto: 'Comércio',
    descricao: 'Comércio atacadista, varejista e reparação de veículos',
  },
  {
    letra: 'H',
    slug: 'transporte',
    nome: 'Transporte, armazenagem e correio',
    nome_curto: 'Transporte',
    descricao: 'Transporte de cargas e passageiros, armazenagem e correios',
  },
  {
    letra: 'I',
    slug: 'alojamento-alimentacao',
    nome: 'Alojamento e alimentação',
    nome_curto: 'Alimentação',
    descricao: 'Hotéis, pousadas, restaurantes e serviços de alimentação',
  },
  {
    letra: 'J',
    slug: 'informacao-comunicacao',
    nome: 'Informação e comunicação',
    nome_curto: 'TI e Comunicação',
    descricao: 'Tecnologia da informação, telecomunicações e mídia',
  },
  {
    letra: 'K',
    slug: 'financeiro-seguros',
    nome: 'Atividades financeiras, de seguros e serviços relacionados',
    nome_curto: 'Financeiro',
    descricao: 'Bancos, seguradoras, corretoras e serviços financeiros',
  },
  {
    letra: 'L',
    slug: 'atividades-imobiliarias',
    nome: 'Atividades imobiliárias',
    nome_curto: 'Imóveis',
    descricao: 'Compra, venda, locação e administração de imóveis',
  },
  {
    letra: 'M',
    slug: 'atividades-profissionais',
    nome: 'Atividades profissionais, científicas e técnicas',
    nome_curto: 'Profissionais',
    descricao: 'Consultoria, engenharia, arquitetura e serviços técnicos',
  },
  {
    letra: 'N',
    slug: 'atividades-administrativas',
    nome: 'Atividades administrativas e serviços complementares',
    nome_curto: 'Administrativo',
    descricao: 'Locação, agências de emprego, segurança e limpeza',
  },
  {
    letra: 'O',
    slug: 'administracao-publica',
    nome: 'Administração pública, defesa e seguridade social',
    nome_curto: 'Adm. Pública',
    descricao: 'Administração pública, defesa nacional e seguridade social',
  },
  {
    letra: 'P',
    slug: 'educacao',
    nome: 'Educação',
    nome_curto: 'Educação',
    descricao: 'Ensino infantil, fundamental, médio, superior e cursos',
  },
  {
    letra: 'Q',
    slug: 'saude-servicos-sociais',
    nome: 'Saúde humana e serviços sociais',
    nome_curto: 'Saúde',
    descricao: 'Hospitais, clínicas, consultórios e assistência social',
  },
  {
    letra: 'R',
    slug: 'artes-cultura-esporte',
    nome: 'Artes, cultura, esporte e recreação',
    nome_curto: 'Cultura e Esporte',
    descricao: 'Atividades artísticas, esportivas, culturais e de lazer',
  },
  {
    letra: 'S',
    slug: 'outras-atividades-de-servicos',
    nome: 'Outras atividades de serviços',
    nome_curto: 'Outros Serviços',
    descricao: 'Associações, serviços pessoais, reparação e outros',
  },
  {
    letra: 'T',
    slug: 'servicos-domesticos',
    nome: 'Serviços domésticos',
    nome_curto: 'Domésticos',
    descricao: 'Empregados domésticos e serviços em residências',
  },
  {
    letra: 'U',
    slug: 'organismos-internacionais',
    nome: 'Organismos internacionais e outras instituições extraterritoriais',
    nome_curto: 'Internacional',
    descricao: 'Organismos internacionais e representações diplomáticas',
  },
];

export const SECAO_BY_LETRA = new Map(SECOES.map((s) => [s.letra, s]));
export const SECAO_BY_SLUG = new Map(SECOES.map((s) => [s.slug, s]));

export interface AnexoInfo {
  anexo: 'I' | 'II' | 'III' | 'IV' | 'V' | 'nao_aplicavel';
  nome: string;
  descricao: string;
  aliquota_min: string;
  aliquota_max: string;
  tipo: string;
}

export const SIMPLES_ANEXOS: AnexoInfo[] = [
  {
    anexo: 'I',
    nome: 'Anexo I',
    descricao: 'Comércio',
    aliquota_min: '4,00%',
    aliquota_max: '19,00%',
    tipo: 'Comércio em geral',
  },
  {
    anexo: 'II',
    nome: 'Anexo II',
    descricao: 'Indústria',
    aliquota_min: '4,50%',
    aliquota_max: '30,00%',
    tipo: 'Indústria e fabricação',
  },
  {
    anexo: 'III',
    nome: 'Anexo III',
    descricao: 'Serviços (baixa tributação)',
    aliquota_min: '6,00%',
    aliquota_max: '33,00%',
    tipo: 'Serviços de instalação, reparos, etc.',
  },
  {
    anexo: 'IV',
    nome: 'Anexo IV',
    descricao: 'Serviços (tributação intermediária)',
    aliquota_min: '4,50%',
    aliquota_max: '33,00%',
    tipo: 'Construção civil, vigilância, limpeza',
  },
  {
    anexo: 'V',
    nome: 'Anexo V',
    descricao: 'Serviços (fator r)',
    aliquota_min: '15,50%',
    aliquota_max: '30,50%',
    tipo: 'Serviços intelectuais e profissionais',
  },
  {
    anexo: 'nao_aplicavel',
    nome: 'Não aplicável',
    descricao: 'Não enquadrado no Simples Nacional',
    aliquota_min: '-',
    aliquota_max: '-',
    tipo: 'Regime específico ou vedado',
  },
];

export const ANEXO_BY_CODE = new Map(SIMPLES_ANEXOS.map((a) => [a.anexo, a]));
