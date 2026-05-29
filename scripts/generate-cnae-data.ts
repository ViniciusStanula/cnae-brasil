/**
 * Fetches all CNAE 2.3 subclasses from IBGE API and writes YAML files.
 * MEI eligibility is sourced from data/mei-permitidos-source.json (run pnpm scrape:mei first).
 *
 * Run: pnpm generate
 * Output: src/content/cnae/[codigo-slug].yaml
 *         data/mei-reconciliation-report.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { Ocupacao } from './scrape-mei-source.js';

const OUT_DIR = path.join(process.cwd(), 'src', 'content', 'cnae');
const IBGE_SUBCLASSES_URL = 'https://servicodados.ibge.gov.br/api/v2/cnae/subclasses';
const DATA_DIR = path.join(process.cwd(), 'data');
const MEI_SOURCE_FILE = path.join(DATA_DIR, 'mei-permitidos-source.json');
const REPORT_FILE = path.join(DATA_DIR, 'mei-reconciliation-report.json');

// ── Malformed CNAE fixes (gov.br data quality issues) ─────────────────────
// Applied before building the scraped set.
const GOVBR_CNAE_FIXES: Record<string, string> = {
  '602-5/02': '9602-5/02',    // Missing leading digit
  '7729 2/99': '7729-2/99',   // Space instead of hyphen
};

function fixGovBrCnae(raw: string): string {
  return GOVBR_CNAE_FIXES[raw] ?? raw;
}

// ── Legacy MEI_PERMITIDOS (Session 1 best-effort list) ─────────────────────
// Used only for conflict detection — not the source of truth.
const LEGACY_MEI_PERMITIDOS = new Set<string>([
  '4711-3/01', '4711-3/02', '4712-1/00', '4713-0/01', '4713-0/02',
  '4721-1/02', '4721-1/03', '4722-9/01', '4722-9/02', '4723-7/00',
  '4724-5/00', '4725-3/00', '4729-6/01', '4729-6/02', '4729-6/03',
  '4729-6/04', '4729-6/05', '4729-6/06', '4729-6/07', '4729-6/08',
  '4729-6/09', '4729-6/10', '4729-6/11', '4729-6/12', '4729-6/13',
  '4729-6/14', '4729-6/99', '4731-8/00', '4732-6/00', '4741-5/00',
  '4742-3/00', '4743-1/00', '4744-0/01', '4744-0/02', '4744-0/03',
  '4744-0/04', '4744-0/05', '4744-0/06', '4744-0/07', '4744-0/99',
  '4751-2/01', '4751-2/02', '4752-1/00', '4753-9/00', '4754-7/01',
  '4754-7/02', '4755-5/01', '4755-5/02', '4756-3/00', '4757-1/00',
  '4759-8/01', '4759-8/02', '4759-8/99', '4761-0/01', '4761-0/02',
  '4761-0/03', '4762-8/00', '4763-6/01', '4763-6/02', '4763-6/03',
  '4771-7/01', '4771-7/02', '4771-7/03', '4771-7/04', '4772-5/00',
  '4773-3/00', '4774-1/00', '4781-4/00', '4782-2/01', '4782-2/02',
  '4783-1/00', '4784-9/00', '4785-7/01', '4785-7/02', '4786-5/00',
  '4787-3/00', '4789-0/01', '4789-0/02', '4789-0/03', '4789-0/04',
  '4789-0/05', '4789-0/06', '4789-0/07', '4789-0/08', '4789-0/09',
  '4789-0/10', '4789-0/11', '4789-0/12', '4789-0/13', '4789-0/14',
  '4789-0/15', '4789-0/16', '4789-0/17', '4789-0/18', '4789-0/19',
  '4789-0/20', '4789-0/21', '4789-0/22', '4789-0/23', '4789-0/24',
  '4789-0/99',
  '5611-2/01', '5611-2/03', '5611-2/04', '5611-2/05',
  '5612-1/00', '5620-1/01', '5620-1/02', '5620-1/03',
  '9601-7/01', '9601-7/02', '9601-7/03',
  '9602-5/01', '9602-5/02', '9602-5/03',
  '9603-3/04', '9609-2/99',
  '4520-0/01', '4520-0/02', '4520-0/03', '4520-0/04', '4520-0/05',
  '4530-7/01', '4530-7/03', '4541-2/01', '4541-2/06', '4542-1/01',
  '4542-1/07', '9529-1/01', '9529-1/02', '9529-1/03', '9529-1/04',
  '9529-1/05', '9529-1/06', '9529-1/07', '9529-1/08', '9529-1/09',
  '9529-1/99',
  '4311-9/02', '4312-6/00', '4313-4/00', '4321-5/00', '4322-3/01',
  '4322-3/03', '4329-1/01', '4329-1/02', '4329-1/03', '4329-1/04',
  '4329-1/05', '4329-1/06', '4330-4/02', '4330-4/03', '4330-4/04',
  '4330-4/05', '4330-4/06', '4391-6/00', '4399-1/01', '4399-1/02',
  '4399-1/03', '4399-1/05',
  '4921-3/01', '4922-1/01', '4923-0/01', '4924-8/00',
  '4929-9/01', '4929-9/02', '4930-2/01', '4930-2/02',
  '4940-0/00', '4950-7/00', '5091-2/01', '5091-2/02',
  '8650-0/01', '8650-0/02', '8650-0/03', '8650-0/04', '8650-0/05',
  '8650-0/06',
  '8511-2/00', '8512-1/00', '8513-9/00', '8520-1/00',
  '8531-7/00', '8532-5/00', '8541-4/00', '8542-2/00',
  '8550-3/01', '8550-3/02', '8591-1/00', '8592-9/01',
  '8592-9/02', '8592-9/03', '8593-7/00', '8599-6/04',
  '8599-6/05',
  '6201-5/01', '6201-5/02', '6201-5/03', '6202-3/00', '6203-1/00',
  '6204-0/00', '6209-1/00',
  '8230-0/01', '8230-0/02',
  '7420-0/01', '7420-0/02', '7420-0/03', '7420-0/04', '7420-0/05',
  '7420-0/06',
  '0111-3/01', '0111-3/02', '0111-3/03', '0111-3/99',
  '0112-1/01', '0112-1/02', '0113-0/00', '0114-8/00',
  '0115-6/00', '0116-4/01', '0116-4/02', '0119-9/01',
  '0119-9/99', '0121-1/01', '0121-1/02', '0122-9/00',
  '0133-4/02', '0151-2/01', '0151-2/02', '0152-1/01',
  '0153-9/01', '0154-7/00', '0155-5/01', '0155-5/02',
  '0156-3/00', '0159-8/01', '0159-8/02', '0159-8/03',
  '0161-0/01', '0162-8/01', '0162-8/02', '0163-6/00',
  '0210-1/01', '0210-1/02', '0210-1/03', '0210-1/04',
  '0220-9/01', '0230-6/01', '0240-3/01', '0311-6/01',
  '0311-6/02', '0312-4/00', '0321-3/01', '0322-1/00',
]);

// ── MEI source types ────────────────────────────────────────────────────────
interface MeiSource {
  fonte: string;
  fonte_url: string;
  scraped_at: string;
  total_ocupacoes: number;
  letras_processadas: string[];
  ocupacoes: Ocupacao[];
}

// ── Simples Nacional Anexo mapping ─────────────────────────────────────────
function inferAnexo(
  secaoLetra: string,
  descricao: string
): 'I' | 'II' | 'III' | 'IV' | 'V' | 'nao_aplicavel' {
  const d = descricao.toLowerCase();
  if (secaoLetra === 'G') return 'I';
  if (secaoLetra === 'C') return 'II';
  if (secaoLetra === 'B') return 'II';
  if (secaoLetra === 'F') return 'IV';
  if (secaoLetra === 'H') return 'III';
  if (secaoLetra === 'I') {
    if (d.includes('fornecimento') || d.includes('catering') || d.includes('refeição')) return 'IV';
    return 'III';
  }
  if (secaoLetra === 'J') {
    if (d.includes('desenvolvimento') || d.includes('software') || d.includes('programas')) return 'V';
    return 'III';
  }
  if (secaoLetra === 'K') return 'nao_aplicavel';
  if (secaoLetra === 'L') return 'V';
  if (secaoLetra === 'M') {
    if (d.includes('publicidade') || d.includes('propaganda') || d.includes('fotografia')) return 'III';
    return 'V';
  }
  if (secaoLetra === 'N') {
    if (d.includes('vigilância') || d.includes('segurança') || d.includes('limpeza') || d.includes('conservação')) return 'IV';
    return 'III';
  }
  if (secaoLetra === 'P') return 'III';
  if (secaoLetra === 'Q') return 'V';
  if (secaoLetra === 'R') return 'III';
  if (secaoLetra === 'S') return 'III';
  if (secaoLetra === 'A') return 'nao_aplicavel';
  return 'nao_aplicavel';
}

function inferNaturezaJuridica(meiPermitido: boolean, secaoLetra: string): string[] {
  const base: string[] = [];
  if (meiPermitido) base.push('mei');
  if (['K', 'O'].includes(secaoLetra)) return ['ltda', 'sa'];
  base.push('me', 'epp', 'ltda');
  return base;
}

// ── IBGE API types ─────────────────────────────────────────────────────────
interface IBGESubclasse {
  id: string;
  descricao: string;
  classe: {
    id: string;
    descricao: string;
    grupo: {
      id: string;
      descricao: string;
      divisao: {
        id: string;
        descricao: string;
        secao: { id: string; descricao: string };
      };
    };
  };
}

function parseIBGECode(id: string): { codigo: string; slug: string; numerico: string } {
  const s = id.replace(/\D/g, '');
  let codigo: string;
  if (s.length === 7) {
    codigo = `${s.slice(0, 4)}-${s[4]}/${s.slice(5, 7)}`;
  } else {
    codigo = id;
  }
  return { codigo, slug: codigo.replace(/\//g, '-'), numerico: codigo.replace(/\D/g, '') };
}

const SECAO_MAP: Record<string, { slug: string; nome: string; nome_curto: string }> = {
  A: { slug: 'agricultura', nome: 'Agricultura, pecuária, produção florestal, pesca e aquicultura', nome_curto: 'Agricultura' },
  B: { slug: 'industrias-extrativas', nome: 'Indústrias extrativas', nome_curto: 'Extrativa' },
  C: { slug: 'industrias-de-transformacao', nome: 'Indústrias de transformação', nome_curto: 'Transformação' },
  D: { slug: 'eletricidade-gas-agua', nome: 'Eletricidade, gás, vapor e ar condicionado', nome_curto: 'Energia' },
  E: { slug: 'agua-esgoto-residuos', nome: 'Água, esgoto, atividades de gestão de resíduos e descontaminação', nome_curto: 'Saneamento' },
  F: { slug: 'construcao', nome: 'Construção', nome_curto: 'Construção' },
  G: { slug: 'comercio', nome: 'Comércio; reparação de veículos automotores e motocicletas', nome_curto: 'Comércio' },
  H: { slug: 'transporte', nome: 'Transporte, armazenagem e correio', nome_curto: 'Transporte' },
  I: { slug: 'alojamento-alimentacao', nome: 'Alojamento e alimentação', nome_curto: 'Alimentação' },
  J: { slug: 'informacao-comunicacao', nome: 'Informação e comunicação', nome_curto: 'TI e Comunicação' },
  K: { slug: 'financeiro-seguros', nome: 'Atividades financeiras, de seguros e serviços relacionados', nome_curto: 'Financeiro' },
  L: { slug: 'atividades-imobiliarias', nome: 'Atividades imobiliárias', nome_curto: 'Imóveis' },
  M: { slug: 'atividades-profissionais', nome: 'Atividades profissionais, científicas e técnicas', nome_curto: 'Profissionais' },
  N: { slug: 'atividades-administrativas', nome: 'Atividades administrativas e serviços complementares', nome_curto: 'Administrativo' },
  O: { slug: 'administracao-publica', nome: 'Administração pública, defesa e seguridade social', nome_curto: 'Adm. Pública' },
  P: { slug: 'educacao', nome: 'Educação', nome_curto: 'Educação' },
  Q: { slug: 'saude-servicos-sociais', nome: 'Saúde humana e serviços sociais', nome_curto: 'Saúde' },
  R: { slug: 'artes-cultura-esporte', nome: 'Artes, cultura, esporte e recreação', nome_curto: 'Cultura e Esporte' },
  S: { slug: 'outras-atividades-de-servicos', nome: 'Outras atividades de serviços', nome_curto: 'Outros Serviços' },
  T: { slug: 'servicos-domesticos', nome: 'Serviços domésticos', nome_curto: 'Domésticos' },
  U: { slug: 'organismos-internacionais', nome: 'Organismos internacionais e outras instituições extraterritoriais', nome_curto: 'Internacional' },
};

// ── Load and index MEI source ───────────────────────────────────────────────
function loadMeiSource(): {
  byCode: Map<string, Ocupacao>;
  consultadoEm: string;
  fonte: string;
} {
  if (!fs.existsSync(MEI_SOURCE_FILE)) {
    throw new Error(
      `MEI source file not found: ${MEI_SOURCE_FILE}\nRun "pnpm scrape:mei" first.`
    );
  }
  const raw = JSON.parse(fs.readFileSync(MEI_SOURCE_FILE, 'utf-8')) as MeiSource;
  const byCode = new Map<string, Ocupacao>();

  for (const o of raw.ocupacoes) {
    const fixedCnae = fixGovBrCnae(o.cnae);
    const fixed: Ocupacao = { ...o, cnae: fixedCnae, cnae_normalized: fixedCnae.replace(/\//g, '-') };
    // For duplicates, keep first occurrence (alphabetically earliest occupation)
    if (!byCode.has(fixedCnae)) {
      byCode.set(fixedCnae, fixed);
    }
  }

  const consultadoEm = raw.scraped_at.slice(0, 10);
  return {
    byCode,
    consultadoEm,
    fonte: 'Portal do Empreendedor — gov.br/empresas-e-negocios (Anexo XI da Resolução CGSN nº 140/2018 e alterações)',
  };
}

// ── Reconciliation result types ─────────────────────────────────────────────
interface AddedEntry {
  cnae: string;
  ocupacao_oficial: string;
  reason: string;
}

interface FlaggedEntry {
  cnae: string;
  current_decision: string;
  reason: string;
  hint: string;
}

interface ReconciliationReport {
  generated_at: string;
  scraped_at: string;
  summary: {
    total_cnaes: number;
    scraped_unique: number;
    legacy_total: number;
    agreement_mei: number;
    added_auto: number;
    flagged_review: number;
    matching_no_mei: number;
  };
  govbr_fixes_applied: Array<{ original: string; fixed: string }>;
  added_auto: AddedEntry[];
  flagged_review: FlaggedEntry[];
}

// ── Build YAML for a subclasse ──────────────────────────────────────────────
function buildYaml(
  sub: IBGESubclasse,
  meiByCode: Map<string, Ocupacao>,
  consultadoEm: string,
  fonte: string,
  report: Pick<ReconciliationReport, 'added_auto' | 'flagged_review'>
): Record<string, unknown> {
  const { id: rawId, descricao: descricaoSubclasse, classe } = sub;
  const { id: classeId, descricao: classeDescricao, grupo } = classe;
  const { id: grupoId, descricao: grupoDescricao, divisao } = grupo;
  const { id: divisaoId, descricao: divisaoDescricao, secao } = divisao;
  const secaoLetra = secao.id;

  const { codigo, slug: codigoSlug, numerico } = parseIBGECode(rawId);
  const scraped = meiByCode.has(codigo);
  const current = LEGACY_MEI_PERMITIDOS.has(codigo);
  const scrapedEntry = meiByCode.get(codigo);

  const anexo = inferAnexo(secaoLetra, descricaoSubclasse);
  const secaoInfo = SECAO_MAP[secaoLetra] ?? {
    slug: secaoLetra.toLowerCase(),
    nome: secao.descricao,
    nome_curto: secao.descricao,
  };

  const classeFormatted =
    classeId.length >= 5 ? `${classeId.slice(0, 4)}-${classeId[4]}` : classeId;
  const grupoFormatted =
    grupoId.length === 3 ? `${grupoId.slice(0, 2)}.${grupoId[2]}` : grupoId;

  // ── Reconciliation logic ──────────────────────────────────────────────────
  let meiPermitido: boolean;
  let conflitoPendente = false;
  let notesInternal: string | undefined;
  let ocupacaoOficial: string | undefined;

  if (scraped && current) {
    // Agreement: both say yes
    meiPermitido = true;
    ocupacaoOficial = scrapedEntry!.ocupacao;
  } else if (scraped && !current) {
    // Gov.br found an occupation we missed — auto-accept
    meiPermitido = true;
    ocupacaoOficial = scrapedEntry!.ocupacao;
    report.added_auto.push({
      cnae: codigo,
      ocupacao_oficial: scrapedEntry!.ocupacao,
      reason: 'Found in gov.br scrape, was not in legacy MEI_PERMITIDOS',
    });
  } else if (!scraped && current) {
    // Our list has it, gov.br doesn't — keep pending review
    meiPermitido = true;
    conflitoPendente = true;
    notesInternal = `FALSE POSITIVE FLAGGED: not found in gov.br scrape on ${consultadoEm}. Review needed — verify against current CGSN resolutions.`;
    report.flagged_review.push({
      cnae: codigo,
      current_decision: 'permitido=true (kept pending review)',
      reason: `Not found in gov.br scrape on ${consultadoEm}`,
      hint: 'Verify against current CGSN resolutions, or remove from legacy MEI_PERMITIDOS',
    });
  } else {
    // Both say no
    meiPermitido = false;
  }

  return {
    codigo,
    codigo_slug: codigoSlug,
    codigo_numerico: numerico,
    descricao_oficial: descricaoSubclasse,
    descricao_plana: descricaoSubclasse,
    secao: {
      letra: secaoLetra,
      slug: secaoInfo.slug,
      nome: secaoInfo.nome,
      nome_curto: secaoInfo.nome_curto,
    },
    divisao: { codigo: divisaoId, nome: divisaoDescricao },
    grupo: { codigo: grupoFormatted, nome: grupoDescricao },
    classe: { codigo: classeFormatted, nome: classeDescricao },
    mei: {
      permitido: meiPermitido,
      observacao: undefined,
      fonte,
      consultado_em: consultadoEm,
      ocupacao_oficial: ocupacaoOficial,
      conflito_pendente: conflitoPendente,
      notes_internal: notesInternal,
    },
    simples_nacional: { anexo, observacao: undefined },
    natureza_juridica_recomendada: inferNaturezaJuridica(meiPermitido, secaoLetra),
    exemplos_negocios: [],
    o_que_inclui: [],
    o_que_nao_inclui: [],
    licencas_comuns: [],
    cnaes_relacionados: [],
    enriched: false,
    last_reviewed: consultadoEm,
    data_year: 2024,
  };
}

function cleanYaml(obj: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj));
}

async function fetchSubclasses(): Promise<IBGESubclasse[]> {
  console.log('Fetching from IBGE API…');
  const response = await fetch(IBGE_SUBCLASSES_URL);
  if (!response.ok) {
    throw new Error(`IBGE API error: ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as IBGESubclasse[];
  console.log(`Fetched ${data.length} subclasses`);
  return data;
}

// ── Merge YAML — preserve enriched fields, update mei subtree ─────────────
function mergeWithExisting(
  existing: Record<string, unknown>,
  generated: Record<string, unknown>
): Record<string, unknown> {
  const enriched = Boolean(existing.enriched);
  if (!enriched) return generated;

  // Preserve editorial fields on enriched codes
  return {
    ...generated,
    descricao_plana: existing.descricao_plana ?? generated.descricao_plana,
    exemplos_negocios: existing.exemplos_negocios ?? [],
    o_que_inclui: existing.o_que_inclui ?? [],
    o_que_nao_inclui: existing.o_que_nao_inclui ?? [],
    licencas_comuns: existing.licencas_comuns ?? [],
    cnaes_relacionados: existing.cnaes_relacionados ?? [],
    enriched: true,
    enriched_at: existing.enriched_at,
    last_reviewed: existing.last_reviewed ?? generated.last_reviewed,
  };
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // Load MEI source
  const { byCode: meiByCode, consultadoEm, fonte } = loadMeiSource();
  const meiSourceData = JSON.parse(fs.readFileSync(MEI_SOURCE_FILE, 'utf-8')) as MeiSource;
  console.log(`Loaded ${meiByCode.size} unique MEI CNAEs from gov.br scrape`);

  // Reconciliation report accumulator
  const reportData: Pick<ReconciliationReport, 'added_auto' | 'flagged_review'> = {
    added_auto: [],
    flagged_review: [],
  };

  let subclasses: IBGESubclasse[];
  try {
    subclasses = await fetchSubclasses();
  } catch (err) {
    console.error('IBGE API fetch failed:', err);
    process.exit(1);
  }

  let written = 0;
  let agreementMei = 0;
  let matchingNoMei = 0;

  for (const sub of subclasses) {
    try {
      const generated = buildYaml(sub, meiByCode, consultadoEm, fonte, reportData);
      const codigoSlug = generated.codigo_slug as string;
      const filePath = path.join(OUT_DIR, `${codigoSlug}.yaml`);

      let final = cleanYaml(generated);

      // Merge with existing to preserve enrichment
      if (fs.existsSync(filePath)) {
        const existing = yaml.load(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
        final = cleanYaml(mergeWithExisting(existing, generated));
      }

      const meiField = final.mei as Record<string, unknown>;
      if (meiField.permitido === true && !meiField.conflito_pendente) agreementMei++;
      else if (meiField.permitido === false) matchingNoMei++;

      const yamlStr = yaml.dump(final, { lineWidth: 120, noRefs: true, sortKeys: false });
      fs.writeFileSync(filePath, yamlStr, 'utf-8');
      written++;
    } catch (err) {
      console.error(`Error processing ${sub.id}:`, err);
    }
  }

  // ── Generate reconciliation report ────────────────────────────────────────
  const report: ReconciliationReport = {
    generated_at: new Date().toISOString(),
    scraped_at: meiSourceData.scraped_at,
    summary: {
      total_cnaes: subclasses.length,
      scraped_unique: meiByCode.size,
      legacy_total: LEGACY_MEI_PERMITIDOS.size,
      agreement_mei: agreementMei,
      added_auto: reportData.added_auto.length,
      flagged_review: reportData.flagged_review.length,
      matching_no_mei: matchingNoMei,
    },
    govbr_fixes_applied: Object.entries(GOVBR_CNAE_FIXES).map(([original, fixed]) => ({
      original,
      fixed,
    })),
    added_auto: reportData.added_auto,
    flagged_review: reportData.flagged_review,
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`\nDone. Written: ${written} YAML files`);
  console.log(`\nMEI Reconciliation Summary:`);
  console.log(`  Total CNAEs:        ${report.summary.total_cnaes}`);
  console.log(`  Scraped unique:     ${report.summary.scraped_unique}`);
  console.log(`  Legacy total:       ${report.summary.legacy_total}`);
  console.log(`  Agreement (MEI):    ${report.summary.agreement_mei}`);
  console.log(`  Auto-added:         ${report.summary.added_auto}`);
  console.log(`  Flagged for review: ${report.summary.flagged_review}`);
  console.log(`  No MEI (both):      ${report.summary.matching_no_mei}`);
  console.log(`\n  Report: ${REPORT_FILE}`);

  if (report.summary.flagged_review > 50) {
    console.warn(
      `\n⚠ WARNING: ${report.summary.flagged_review} codes flagged for review — unusually high. ` +
        `Check the legacy MEI_PERMITIDOS list quality.`
    );
  }
}

main().catch(console.error);
