/**
 * Enriches 20 representative CNAE codes with full plain-language content.
 * Run once: pnpm enrich
 * Writes directly to existing YAML files in src/content/cnae/
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const CNAE_DIR = path.join(process.cwd(), 'src', 'content', 'cnae');
const ENRICHED_AT = '2025-01-15';

interface Enrichment {
  codigoSlug: string;
  descricao_plana: string;
  exemplos_negocios: string[];
  o_que_inclui: string[];
  o_que_nao_inclui: string[];
  licencas_comuns: string[];
  cnaes_relacionados: string[];
}

const ENRICHMENTS: Enrichment[] = [
  {
    codigoSlug: '4711-3-02',
    descricao_plana:
      'Supermercados: lojas de autoatendimento que vendem alimentos, bebidas, produtos de limpeza e higiene pessoal em grande variedade. O cliente faz as compras de forma independente e passa pelo caixa para pagar.',
    exemplos_negocios: [
      'Supermercado de bairro',
      'Supermercado compacto em galeria comercial',
      'Rede regional de supermercados',
      'Mercado de vizinhança',
    ],
    o_que_inclui: [
      'Venda de alimentos em geral (frescos, embalados, congelados)',
      'Venda de bebidas alcoólicas e não alcoólicas',
      'Venda de produtos de limpeza doméstica',
      'Venda de itens de higiene pessoal',
      'Seções de padaria e açougue integradas',
      'Hortifrutigranjeiros',
    ],
    o_que_nao_inclui: [
      'Hipermercados (acima de 5.000 m²) — use CNAE 4711-3/01',
      'Lojas de conveniência — use CNAE 4712-1/00',
      'Mercearias e armazéns sem autoatendimento — use CNAE 4712-1/00',
    ],
    licencas_comuns: [
      'Alvará de funcionamento (Prefeitura)',
      'Licença sanitária (Vigilância Sanitária)',
      'Licença para venda de bebidas alcoólicas',
      'Certificado de corpo de bombeiros (AVCB)',
      'Registro no MAPA se empacotar alimentos',
    ],
    cnaes_relacionados: [
      '4711-3/01',
      '4712-1/00',
      '4721-1/02',
      '4722-9/01',
      '4729-6/99',
    ],
  },
  {
    codigoSlug: '5611-2-01',
    descricao_plana:
      'Restaurantes e similares: estabelecimentos que preparam e servem refeições completas para consumo no local, incluindo almoço, jantar e outros cardápios. Abrange desde lanchonetes com menu fixo até restaurantes à la carte.',
    exemplos_negocios: [
      'Restaurante por quilo (self-service)',
      'Restaurante à la carte',
      'Lanchonete e hamburgueria',
      'Restaurante de culinária regional',
      'Pizzaria com salão',
      'Cantina italiana',
    ],
    o_que_inclui: [
      'Serviço de refeições no próprio estabelecimento',
      'Venda de bebidas alcoólicas para consumo no local',
      'Delivery e take-away como atividade secundária',
      'Buffet de eventos como atividade secundária',
      'Bar com serviço de comida',
    ],
    o_que_nao_inclui: [
      'Serviços de buffet para eventos fora do estabelecimento — use CNAE 5620-1/01',
      'Lanchonetes e fast food sem serviço de mesa — use CNAE 5611-2/03',
      'Bares sem serviço de refeição — use CNAE 5611-2/04',
      'Delivery exclusivo sem atendimento presencial — use CNAE 5612-1/00',
    ],
    licencas_comuns: [
      'Alvará de funcionamento (Prefeitura)',
      'Licença sanitária para manipulação de alimentos',
      'Licença para venda de bebidas alcoólicas',
      'Certificado de corpo de bombeiros (AVCB)',
      'Registro na Vigilância Sanitária',
    ],
    cnaes_relacionados: [
      '5611-2/03',
      '5611-2/04',
      '5612-1/00',
      '5620-1/01',
      '5620-1/02',
    ],
  },
  {
    codigoSlug: '9602-5-01',
    descricao_plana:
      'Cabeleireiros: profissionais e salões que realizam cortes de cabelo, coloração, tratamentos capilares, penteados e serviços relacionados ao cuidado dos fios. Uma das atividades mais populares para MEI.',
    exemplos_negocios: [
      'Salão de beleza feminino',
      'Barbearia masculina',
      'Salão unissex',
      'Cabelereiro autônomo (MEI)',
      'Studio de coloração e escova',
    ],
    o_que_inclui: [
      'Corte de cabelo feminino e masculino',
      'Coloração, mechas e ombré',
      'Escovação e tratamento capilar',
      'Penteados para eventos',
      'Progressiva e relaxamento',
      'Manicure e pedicure como serviço integrado',
    ],
    o_que_nao_inclui: [
      'Maquiagem artística — use CNAE 9602-5/02',
      'Serviços de estética corporal — use CNAE 9602-5/03',
      'Depilação — use CNAE 9602-5/03',
      'Tatuagem e piercing — use CNAE 9609-2/99',
    ],
    licencas_comuns: [
      'Alvará de funcionamento (Prefeitura)',
      'Licença sanitária da Vigilância Sanitária',
      'Registro profissional (em alguns estados)',
    ],
    cnaes_relacionados: [
      '9602-5/02',
      '9602-5/03',
      '9609-2/99',
      '9601-7/01',
    ],
  },
  {
    codigoSlug: '4520-0-01',
    descricao_plana:
      'Manutenção e reparação de automóveis: serviços mecânicos, elétricas e gerais de manutenção em carros de passeio e veículos leves. Inclui conserto de motor, freios, suspensão e revisões programadas.',
    exemplos_negocios: [
      'Oficina mecânica geral',
      'Mecânica especializada em injeção eletrônica',
      'Elétrica de automóveis',
      'Centro de revisões automotivas',
    ],
    o_que_inclui: [
      'Reparação e revisão de motor',
      'Serviços de freios e suspensão',
      'Elétrica automotiva',
      'Troca de óleo e filtros',
      'Diagnóstico eletrônico (scanner)',
      'Ar-condicionado automotivo',
    ],
    o_que_nao_inclui: [
      'Funilaria e pintura — use CNAE 4520-0/02',
      'Troca de pneus e alinhamento — use CNAE 4530-7/03',
      'Reparação de caminhões e ônibus — use CNAE 4520-0/04',
      'Reparação de motos — use CNAE 4542-1/01',
    ],
    licencas_comuns: [
      'Alvará de funcionamento (Prefeitura)',
      'Licença ambiental (para descarte de óleo e fluidos)',
      'Registro no DETRAN em alguns estados',
      'Certificado de corpo de bombeiros (AVCB)',
    ],
    cnaes_relacionados: [
      '4520-0/02',
      '4520-0/03',
      '4520-0/05',
      '4530-7/01',
      '4530-7/03',
      '4542-1/01',
    ],
  },
  {
    codigoSlug: '8230-0-01',
    descricao_plana:
      'Organização de eventos: empresas e profissionais que planejam, coordenam e executam eventos corporativos, sociais e culturais. Inclui casamentos, formaturas, congressos e feiras.',
    exemplos_negocios: [
      'Empresa de organização de casamentos (wedding planner)',
      'Produtora de eventos corporativos',
      'Organizadora de formaturas',
      'Empresa de congressos e feiras',
    ],
    o_que_inclui: [
      'Planejamento e coordenação de eventos',
      'Contratação e gestão de fornecedores',
      'Locação de espaços e montagem',
      'Produção de formaturas e bailes',
      'Organização de congressos e seminários',
    ],
    o_que_nao_inclui: [
      'Serviços de buffet (fornecimento de refeições) — use CNAE 5620-1/01',
      'Locação de equipamentos de áudio/vídeo — use CNAE 7719-5/99',
      'Decoração de festas como atividade principal — use CNAE 9003-5/00',
    ],
    licencas_comuns: [
      'Alvará de funcionamento (Prefeitura)',
      'Cadastro na Prefeitura para eventos em espaço público',
      'Licença da ABRAPE (opcional, para credibilidade)',
    ],
    cnaes_relacionados: [
      '8230-0/02',
      '5620-1/01',
      '7719-5/99',
      '9003-5/00',
      '7420-0/01',
    ],
  },
  {
    codigoSlug: '4781-4-00',
    descricao_plana:
      'Comércio varejista de artigos do vestuário e acessórios: lojas que vendem roupas, calçados, bolsas, cintos e demais acessórios de moda para o público em geral.',
    exemplos_negocios: [
      'Loja de roupas femininas',
      'Boutique masculina',
      'Loja de moda infantil',
      'Multimarca de vestuário',
      'Brechó de roupas usadas',
    ],
    o_que_inclui: [
      'Venda de roupas femininas, masculinas e infantis',
      'Acessórios de moda (bolsas, cintos, lenços)',
      'Roupas de cama, mesa e banho como item secundário',
      'Roupas íntimas e meias',
    ],
    o_que_nao_inclui: [
      'Calçados como atividade principal — use CNAE 4782-2/01',
      'Tecidos por metro — use CNAE 4755-5/01',
      'Roupas de trabalho e uniformes — use CNAE 4789-0/08',
    ],
    licencas_comuns: [
      'Alvará de funcionamento (Prefeitura)',
      'Registro no CREA/CFA se confeccionar roupas',
    ],
    cnaes_relacionados: [
      '4782-2/01',
      '4782-2/02',
      '4755-5/01',
      '4789-0/08',
      '4763-6/01',
    ],
  },
  {
    codigoSlug: '6201-5-01',
    descricao_plana:
      'Desenvolvimento de programas de computador sob encomenda: criação de software personalizado para clientes específicos, incluindo sistemas web, aplicativos mobile, APIs e automações. Difere de software de prateleira pois é criado para uma necessidade específica.',
    exemplos_negocios: [
      'Empresa de desenvolvimento de sistemas web',
      'Desenvolvedora de aplicativos mobile',
      'Fábrica de software sob demanda',
      'Freelancer de desenvolvimento (MEI)',
      'Software house de pequeno porte',
    ],
    o_que_inclui: [
      'Desenvolvimento de sistemas customizados (ERP, CRM, etc.)',
      'Criação de aplicativos mobile (iOS e Android)',
      'Desenvolvimento de APIs e integrações',
      'Automação de processos (RPA)',
      'Consultoria técnica em arquitetura de software',
    ],
    o_que_nao_inclui: [
      'Software de prateleira (licença para muitos usuários) — use CNAE 6201-5/02',
      'Hospedagem de sistemas (SaaS) — use CNAE 6311-9/00',
      'Suporte e manutenção de TI — use CNAE 6209-1/00',
      'Web design (focado em layout) — use CNAE 7410-2/02',
    ],
    licencas_comuns: [
      'Cadastro na Receita Federal (CNPJ)',
      'Registro na OAB/TI (se exigido pelo cliente)',
      'Contrato de sigilo (NDA) — não é licença mas é praxe',
    ],
    cnaes_relacionados: [
      '6201-5/02',
      '6201-5/03',
      '6202-3/00',
      '6204-0/00',
      '6209-1/00',
      '7410-2/02',
    ],
  },
  {
    codigoSlug: '8650-0-04',
    descricao_plana:
      'Atividades de fisioterapia: serviços de reabilitação física prestados por fisioterapeutas habilitados, incluindo tratamento de lesões, dores musculares, recuperação pós-cirúrgica e fisioterapia preventiva.',
    exemplos_negocios: [
      'Clínica de fisioterapia e reabilitação',
      'Fisioterapeuta autônomo em consultório',
      'Clínica de pilates terapêutico',
      'Centro de reabilitação esportiva',
    ],
    o_que_inclui: [
      'Fisioterapia ortopédica e traumatológica',
      'Fisioterapia neurológica',
      'Fisioterapia respiratória',
      'Pilates clínico e terapêutico',
      'RPG (Reeducação Postural Global)',
      'Tratamento de lesões esportivas',
    ],
    o_que_nao_inclui: [
      'Terapia ocupacional — use CNAE 8650-0/05',
      'Fonoaudiologia — use CNAE 8650-0/02',
      'Academia de ginástica comum — use CNAE 9313-1/00',
      'Massagem relaxante sem fins terapêuticos — use CNAE 9609-2/99',
    ],
    licencas_comuns: [
      'Registro no CREFITO (Conselho Regional de Fisioterapia)',
      'Alvará sanitário da Vigilância Sanitária',
      'Alvará de funcionamento (Prefeitura)',
      'Responsável técnico registrado',
    ],
    cnaes_relacionados: [
      '8650-0/01',
      '8650-0/02',
      '8650-0/05',
      '8650-0/06',
      '9313-1/00',
    ],
  },
  {
    codigoSlug: '7319-0-03',
    descricao_plana:
      'Marketing direto: serviços de comunicação que se dirigem diretamente ao consumidor final, incluindo email marketing, SMS marketing, telemarketing ativo, mala direta e campanhas digitais personalizadas.',
    exemplos_negocios: [
      'Agência de email marketing',
      'Empresa de telemarketing ativo',
      'Operadora de mala direta digital',
      'Startup de automação de marketing',
    ],
    o_que_inclui: [
      'Envio de email marketing e newsletters',
      'SMS e notificações push em massa',
      'Telemarketing de prospecção',
      'Mala direta física e digital',
      'Automação de marketing (marketing automation)',
    ],
    o_que_nao_inclui: [
      'Publicidade em geral — use CNAE 7311-4/00',
      'Gestão de redes sociais — use CNAE 7319-0/99',
      'Pesquisa de mercado — use CNAE 7320-3/00',
    ],
    licencas_comuns: [
      'Cadastro na Receita Federal (CNPJ)',
      'Conformidade com LGPD (Lei 13.709/2018)',
      'Registro na ABRAREC/ABT se telemarketing',
    ],
    cnaes_relacionados: [
      '7311-4/00',
      '7319-0/99',
      '7320-3/00',
      '6311-9/00',
    ],
  },
  {
    codigoSlug: '0161-0-01',
    descricao_plana:
      'Serviço de pulverização e controle de pragas na agricultura: atividades de aplicação de defensivos agrícolas, herbicidas e controle fitossanitário em lavouras e pastagens.',
    exemplos_negocios: [
      'Empresa de pulverização aérea (drone agrícola)',
      'Prestador de serviços de aplicação de agrotóxico',
      'Cooperativa de aplicação de defensivos',
    ],
    o_que_inclui: [
      'Pulverização terrestre de defensivos agrícolas',
      'Pulverização aérea com aeronaves ou drones',
      'Controle biológico de pragas',
      'Monitoramento fitossanitário',
    ],
    o_que_nao_inclui: [
      'Controle de pragas urbanas (dedetização) — use CNAE 8122-2/00',
      'Comércio de defensivos — use CNAE 4683-4/00',
    ],
    licencas_comuns: [
      'Receituário agronômico (obrigatório por lei)',
      'Registro no MAPA como prestador de serviços',
      'Licença ambiental estadual',
      'Certificado de aplicador de defensivos',
    ],
    cnaes_relacionados: [
      '0162-8/01',
      '8122-2/00',
      '0111-3/01',
    ],
  },
  {
    codigoSlug: '4313-4-00',
    descricao_plana:
      'Obras de terraplanagem: serviços de movimentação de terra, nivelamento de terrenos, corte e aterro para preparação de obras civis, loteamentos e estradas.',
    exemplos_negocios: [
      'Empresa de terraplanagem e nivelamento',
      'Construtora especializada em obras de terra',
      'Prestador de serviços de escavação e aterro',
    ],
    o_que_inclui: [
      'Corte e aterro de terreno',
      'Nivelamento e compactação',
      'Escavação de fundações',
      'Drenagem superficial',
      'Preparação de leito de estradas',
    ],
    o_que_nao_inclui: [
      'Perfuração de poços — use CNAE 0990-4/01',
      'Construção de estradas concluída — use CNAE 4211-1/01',
      'Demolição de edificações — use CNAE 4311-9/01',
    ],
    licencas_comuns: [
      'Licença ambiental (LP/LI) conforme porte da obra',
      'ART (Anotação de Responsabilidade Técnica) do CREA',
      'Alvará de obras da Prefeitura',
    ],
    cnaes_relacionados: [
      '4311-9/01',
      '4311-9/02',
      '4312-6/00',
      '4211-1/01',
    ],
  },
  {
    codigoSlug: '8512-1-00',
    descricao_plana:
      'Educação infantil — pré-escola: estabelecimentos de educação para crianças de 4 a 5 anos (pré-escola), última etapa antes do ensino fundamental.',
    exemplos_negocios: [
      'Escola de educação infantil privada',
      'Pré-escola em bairro residencial',
      'Centro de educação infantil (CEI) privado',
    ],
    o_que_inclui: [
      'Educação pré-escolar (4 a 5 anos)',
      'Atividades pedagógicas lúdicas',
      'Desenvolvimento motor e cognitivo',
      'Preparação para alfabetização',
    ],
    o_que_nao_inclui: [
      'Creche (0 a 3 anos) — use CNAE 8511-2/00',
      'Ensino fundamental — use CNAE 8513-9/00',
      'Recreação infantil sem foco pedagógico — use CNAE 9329-8/01',
    ],
    licencas_comuns: [
      'Autorização de funcionamento da Secretaria Municipal de Educação',
      'Alvará sanitário',
      'Alvará de bombeiros (AVCB)',
      'Registro no CNE/CME conforme localidade',
    ],
    cnaes_relacionados: [
      '8511-2/00',
      '8513-9/00',
      '9329-8/01',
    ],
  },
  {
    codigoSlug: '6422-1-00',
    descricao_plana:
      'Bancos múltiplos com carteira comercial: instituições financeiras autorizadas pelo Banco Central a operar múltiplas carteiras, incluindo carteira comercial (captação de depósitos à vista). São os grandes bancos tradicionais.',
    exemplos_negocios: [
      'Bancos nacionais de varejo',
      'Bancos regionais com múltiplas carteiras',
    ],
    o_que_inclui: [
      'Captação de depósitos à vista e a prazo',
      'Concessão de crédito para pessoas físicas e jurídicas',
      'Operações de câmbio',
      'Investimentos e aplicações financeiras',
    ],
    o_que_nao_inclui: [
      'Fintechs de pagamento sem licença de banco — use CNAE 6499-3/01',
      'Corretoras de valores — use CNAE 6612-6/01',
    ],
    licencas_comuns: [
      'Autorização do Banco Central do Brasil (BACEN)',
      'Registro na CVM se tiver carteira de investimentos',
    ],
    cnaes_relacionados: [
      '6421-2/00',
      '6423-9/00',
      '6499-3/01',
      '6612-6/01',
    ],
  },
  {
    codigoSlug: '7410-2-02',
    descricao_plana:
      'Design de interiores: serviços de projeto e execução de ambientes internos residenciais, comerciais e corporativos, incluindo planejamento de layout, seleção de materiais, iluminação e decoração.',
    exemplos_negocios: [
      'Escritório de design de interiores',
      'Designer de interiores autônomo',
      'Studio de arquitetura de interiores',
      'Decoradora de festas e eventos',
    ],
    o_que_inclui: [
      'Projeto de interiores residenciais',
      'Design de espaços corporativos',
      'Seleção e especificação de materiais',
      'Coordenação de execução da obra de interiores',
      'Consultoria de decoração',
    ],
    o_que_nao_inclui: [
      'Arquitetura (projeto estrutural) — use CNAE 7111-1/00',
      'Design gráfico — use CNAE 7410-2/01',
      'Loja de móveis e decoração — use CNAE 4754-7/01',
    ],
    licencas_comuns: [
      'Registro no CAU (Conselho de Arquitetura e Urbanismo) se arquiteto',
      'Registro na ABD (Associação Brasileira de Design de Interiores) — opcional',
      'ART ou RRT para projetos que envolvem estrutura',
    ],
    cnaes_relacionados: [
      '7111-1/00',
      '7410-2/01',
      '4754-7/01',
      '4759-8/01',
    ],
  },
  {
    codigoSlug: '4930-2-01',
    descricao_plana:
      'Transporte rodoviário de carga, exceto produtos perigosos e mudanças, municipal: serviços de entrega e transporte de mercadorias dentro do mesmo município. Popular entre MEIs que atuam como entregadores.',
    exemplos_negocios: [
      'Entregador autônomo com van ou pick-up',
      'Transportadora local de pequenas cargas',
      'Serviço de frete municipal',
      'Motorista de entrega de e-commerce',
    ],
    o_que_inclui: [
      'Entrega de mercadorias no mesmo município',
      'Frete de pequenas e médias cargas',
      'Transporte de móveis e eletrodomésticos localmente',
      'Última milha de e-commerce',
    ],
    o_que_nao_inclui: [
      'Transporte intermunicipal — use CNAE 4930-2/02',
      'Transporte de produtos perigosos — use CNAE 4930-2/03',
      'Mudanças residenciais — use CNAE 4930-2/04',
      'Mototaxi — use CNAE 4929-9/02',
    ],
    licencas_comuns: [
      'Registro como ETC (Empresa de Transporte de Carga) no RNTRC/ANTT',
      'CNH categoria D ou E (veículos pesados)',
      'Seguro obrigatório de carga (RCTR-C)',
    ],
    cnaes_relacionados: [
      '4930-2/02',
      '4940-0/00',
      '5320-2/01',
      '4929-9/02',
    ],
  },
  {
    codigoSlug: '7020-4-00',
    descricao_plana:
      'Atividades de consultoria em gestão empresarial: serviços de assessoria e consultoria em estratégia, gestão, processos, finanças e outras áreas organizacionais para empresas.',
    exemplos_negocios: [
      'Consultoria empresarial e estratégica',
      'Consultor de gestão autônomo (MEI possível em alguns casos)',
      'Empresa de consultoria em processos',
      'Consultoria financeira para PMEs',
    ],
    o_que_inclui: [
      'Consultoria em gestão estratégica',
      'Mapeamento e melhoria de processos',
      'Reestruturação organizacional',
      'Consultoria em fusões e aquisições',
      'Coaching executivo e empresarial',
    ],
    o_que_nao_inclui: [
      'Consultoria em TI — use CNAE 6204-0/00',
      'Consultoria jurídica — exige registro na OAB',
      'Consultoria contábil — use CNAE 6920-6/01',
      'Recrutamento e seleção — use CNAE 7810-8/00',
    ],
    licencas_comuns: [
      'Cadastro no CRA (Conselho Regional de Administração) — recomendado',
      'Cadastro no CFC para consultoria contábil (se aplicável)',
    ],
    cnaes_relacionados: [
      '6920-6/01',
      '6204-0/00',
      '7810-8/00',
      '6910-7/00',
    ],
  },
  {
    codigoSlug: '4321-5-00',
    descricao_plana:
      'Instalação e manutenção elétrica: serviços de instalação, reforma e manutenção de sistemas elétricos em edificações residenciais, comerciais e industriais. Atividade popular para eletricistas autônomos e MEI.',
    exemplos_negocios: [
      'Eletricista autônomo (MEI)',
      'Empresa de instalações elétricas',
      'Prestador de serviços elétricos residenciais',
      'Técnico em eletricidade predial',
    ],
    o_que_inclui: [
      'Instalação elétrica residencial e comercial',
      'Manutenção e reparo de redes elétricas internas',
      'Instalação de quadros de distribuição',
      'Instalação de sistemas de automação residencial',
      'Laudos elétricos (ART)',
    ],
    o_que_nao_inclui: [
      'Instalação de telefonia e lógica — use CNAE 4329-1/01',
      'Ar-condicionado e refrigeração — use CNAE 4322-3/01',
      'Geração de energia solar — use CNAE 4321-5/00 (mesma classe, mas conferir)',
    ],
    licencas_comuns: [
      'Registro no CREA ou CFT como eletricista',
      'ART (Anotação de Responsabilidade Técnica) por serviço',
      'NR-10 (treinamento em segurança elétrica — obrigatório)',
    ],
    cnaes_relacionados: [
      '4322-3/01',
      '4329-1/01',
      '4329-1/04',
      '4399-1/03',
    ],
  },
  {
    codigoSlug: '8599-6-04',
    descricao_plana:
      'Treinamento em desenvolvimento profissional e gerencial: cursos e treinamentos voltados para capacitação de adultos no mercado de trabalho, incluindo cursos de vendas, liderança, comunicação e soft skills.',
    exemplos_negocios: [
      'Escola de treinamentos corporativos',
      'Treinador (coach) profissional autônomo',
      'Empresa de T&D (Treinamento e Desenvolvimento)',
      'Plataforma de cursos online profissionais',
    ],
    o_que_inclui: [
      'Treinamentos de liderança e gestão',
      'Cursos de vendas e negociação',
      'Treinamentos de comunicação e apresentação',
      'Capacitação em ferramentas de gestão (Agile, SCRUM)',
      'Mentoria profissional',
    ],
    o_que_nao_inclui: [
      'Ensino regular (credenciado pelo MEC) — use CNAE de educação formal',
      'Cursos técnicos com certificação — use CNAE 8532-5/00',
      'Coaching de vida (não profissional) — use CNAE 9609-2/99',
    ],
    licencas_comuns: [
      'Cadastro no CRC/CRA se treinamentos contábeis/administrativos',
      'Credenciamento em entidades de classe (opcional)',
    ],
    cnaes_relacionados: [
      '8599-6/05',
      '8532-5/00',
      '7020-4/00',
      '9609-2/99',
    ],
  },
  {
    codigoSlug: '5620-1-01',
    descricao_plana:
      'Fornecimento de alimentos preparados para empresas (catering): serviço de produção e entrega de refeições para empresas, cantinas corporativas, escolas e outros estabelecimentos que precisam alimentar grupos de pessoas.',
    exemplos_negocios: [
      'Empresa de catering e fornecimento de marmitas corporativas',
      'Fornecedora de refeições para escolas',
      'Cozinha industrial para eventos',
      'Bufê especializado em refeições empresariais',
    ],
    o_que_inclui: [
      'Fornecimento de refeições prontas para empresas',
      'Gestão de cantinas corporativas',
      'Produção de marmitas em escala para distribuição',
      'Catering para eventos corporativos e sociais',
    ],
    o_que_nao_inclui: [
      'Restaurante com atendimento presencial no local — use CNAE 5611-2/01',
      'Delivery de restaurante comum — use CNAE 5611-2/01',
      'Bufê de festas (organização de eventos) — use CNAE 8230-0/01',
    ],
    licencas_comuns: [
      'Licença sanitária com APPCC (Análise de Perigos e Pontos Críticos)',
      'Registro no MAPA ou SIF para produção em escala',
      'Alvará de funcionamento',
      'Vigilância Sanitária municipal',
    ],
    cnaes_relacionados: [
      '5611-2/01',
      '5620-1/02',
      '5620-1/03',
      '8230-0/01',
    ],
  },
  {
    codigoSlug: '3600-6-01',
    descricao_plana:
      'Captação, tratamento e distribuição de água: atividade de coleta, tratamento e fornecimento de água potável para consumidores, incluindo companhias de saneamento e operadores privados de sistemas de abastecimento.',
    exemplos_negocios: [
      'Companhia estadual de saneamento (SAAE, SABESP, etc.)',
      'Operador privado de sistema de água em condomínio',
      'Sistema autônomo de abastecimento rural',
    ],
    o_que_inclui: [
      'Captação de água bruta em rios e poços',
      'Tratamento e purificação da água',
      'Distribuição por rede de tubulações',
      'Gestão de reservatórios',
    ],
    o_que_nao_inclui: [
      'Perfuração de poços apenas — use CNAE 4291-0/00',
      'Coleta de esgoto — use CNAE 3700-1/00',
      'Venda de água mineral envasada — use CNAE 1121-6/00',
    ],
    licencas_comuns: [
      'Outorga de uso de recursos hídricos (ANA/órgão estadual)',
      'Licença ambiental de operação',
      'Concessão municipal ou estadual',
    ],
    cnaes_relacionados: [
      '3700-1/00',
      '3811-4/00',
      '1121-6/00',
    ],
  },
];

async function main() {
  let enriched = 0;
  let missing = 0;

  for (const enrichment of ENRICHMENTS) {
    const filePath = path.join(CNAE_DIR, `${enrichment.codigoSlug}.yaml`);

    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${enrichment.codigoSlug}.yaml — skipping`);
      missing++;
      continue;
    }

    const existing = yaml.load(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;

    const updated = {
      ...existing,
      descricao_plana: enrichment.descricao_plana,
      exemplos_negocios: enrichment.exemplos_negocios,
      o_que_inclui: enrichment.o_que_inclui,
      o_que_nao_inclui: enrichment.o_que_nao_inclui,
      licencas_comuns: enrichment.licencas_comuns,
      cnaes_relacionados: enrichment.cnaes_relacionados,
      enriched: true,
      enriched_at: ENRICHED_AT,
    };

    const yamlStr = yaml.dump(updated, {
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    });
    fs.writeFileSync(filePath, yamlStr, 'utf-8');
    console.log(`Enriched: ${enrichment.codigoSlug}`);
    enriched++;
  }

  console.log(`\nDone. Enriched: ${enriched}, Missing: ${missing}`);
}

main().catch(console.error);
