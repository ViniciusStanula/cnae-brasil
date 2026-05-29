/**
 * Audits MEI eligibility data against contabilizei.com.br source.
 * Produces a diff report only — does NOT modify any YAML files.
 *
 * Run: pnpm tsx scripts/audit-mei.ts
 * Or:  pnpm tsx scripts/audit-mei.ts --apply   (apply fixes after review)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { load as cheerioLoad } from 'cheerio';

const CNAE_DIR = path.join(process.cwd(), 'src', 'content', 'cnae');
const DATA_DIR = path.join(process.cwd(), 'data');
const OUT_SCRAPED = path.join(DATA_DIR, 'mei-cnaes-contabilizei.json');
const OUT_REPORT = path.join(DATA_DIR, 'mei-audit-report.json');
const SOURCE_URL = 'https://www.contabilizei.com.br/contabilidade-online/atividades-mei-tabela/';

const USER_AGENT =
  'Mozilla/5.0 (compatible; CnaeBrasilBot/1.0; +https://cnaebrasil.com.br/sobre)';

// ── Normalize CNAE code to 7-digit string ─────────────────────────────────────
// Input: any format — "4711-3/02", "4711-3-02", "4711302", "0121101"
// Output: "4711302" or "0121101"

function normalize(code: string): string {
  return code.replace(/[\s.\-\/]/g, '');
}

// ── Scrape ────────────────────────────────────────────────────────────────────

interface ScrapedRow {
  cnae_code: string;  // 7-digit
  ocupacao: string;
  iss: boolean;
  icms: boolean;
}

async function scrape(): Promise<ScrapedRow[]> {
  console.log(`Fetching ${SOURCE_URL}…`);
  const res = await fetch(SOURCE_URL, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();
  const $ = cheerioLoad(html);

  const rows: ScrapedRow[] = [];

  // Try #tableMEI first, fall back to .tabela tbody
  let tbody = $('#tableMEI');
  if (tbody.length === 0) tbody = $('table.tabela tbody');
  if (tbody.length === 0) tbody = $('table tbody').first();

  tbody.find('tr').each((_, tr) => {
    const cells = $(tr).find('td');
    if (cells.length < 2) return;

    const rawCode = $(cells[0]).text().replace(/\s+/g, '').trim();
    const ocupacao = $(cells[1]).text().replace(/\s+/g, ' ').trim();

    // Skip header rows or empty rows
    if (!rawCode || !ocupacao || rawCode.toUpperCase() === 'CNAE') return;

    // Validate: should be 7 digits after strip
    const code = normalize(rawCode);
    if (!/^\d{7}$/.test(code)) {
      console.warn(`  ⚠ Unexpected CNAE format "${rawCode}" → "${code}" — skipping`);
      return;
    }

    const issText = cells.length > 3 ? $(cells[3]).text().trim().toLowerCase() : '';
    const icmsText = cells.length > 4 ? $(cells[4]).text().trim().toLowerCase() : '';

    rows.push({
      cnae_code: code,
      ocupacao,
      iss: issText === 'sim',
      icms: icmsText === 'sim',
    });
  });

  return rows;
}

// ── Load YAML data ────────────────────────────────────────────────────────────

interface YamlMei {
  slug: string;
  codigo: string;       // "4711-3/02"
  codigo_numerico: string; // "4711302"
  descricao_oficial: string;
  mei_permitido: boolean;
  conflito_pendente: boolean;
}

function loadYamlMeiData(): YamlMei[] {
  const files = fs.readdirSync(CNAE_DIR).filter(f => f.endsWith('.yaml'));
  const result: YamlMei[] = [];

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(CNAE_DIR, file), 'utf-8');
      const data = yaml.load(raw) as {
        codigo: string;
        codigo_numerico: string;
        descricao_oficial: string;
        mei?: { permitido?: boolean; conflito_pendente?: boolean };
      };
      result.push({
        slug: file.replace('.yaml', ''),
        codigo: data.codigo,
        codigo_numerico: data.codigo_numerico,
        descricao_oficial: data.descricao_oficial,
        mei_permitido: data.mei?.permitido ?? false,
        conflito_pendente: data.mei?.conflito_pendente ?? false,
      });
    } catch {
      console.warn(`  ⚠ Could not parse ${file}`);
    }
  }

  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const applyFixes = process.argv.includes('--apply');

  // 1. Scrape (or load cached)
  let rows: ScrapedRow[];
  if (fs.existsSync(OUT_SCRAPED)) {
    console.log(`Loading cached scrape from ${OUT_SCRAPED}`);
    rows = JSON.parse(fs.readFileSync(OUT_SCRAPED, 'utf-8')) as ScrapedRow[];
  } else {
    rows = await scrape();
    fs.writeFileSync(OUT_SCRAPED, JSON.stringify(rows, null, 2), 'utf-8');
    console.log(`Saved ${rows.length} rows to ${OUT_SCRAPED}`);
  }

  // 2. Deduplicate: unique set of MEI-eligible 7-digit codes
  const meiSet = new Set(rows.map(r => r.cnae_code));
  console.log(`\nSource: ${rows.length} total rows → ${meiSet.size} unique MEI-eligible CNAEs`);

  // Build occupation map: code → first occupation name
  const occupationMap = new Map<string, string>();
  for (const row of rows) {
    if (!occupationMap.has(row.cnae_code)) occupationMap.set(row.cnae_code, row.ocupacao);
  }

  // 3. Load project YAML data
  console.log('Loading YAML files…');
  const yamlData = loadYamlMeiData();
  console.log(`Loaded ${yamlData.length} YAML files`);

  // 4. Build project sets
  const projectMeiSet = new Set(yamlData.filter(y => y.mei_permitido).map(y => y.codigo_numerico));
  const projectAllSet = new Set(yamlData.map(y => y.codigo_numerico));
  const yamlByNumerico = new Map(yamlData.map(y => [y.codigo_numerico, y]));

  // 5. Diff
  const falsePositives: Array<{ codigo: string; codigo_numerico: string; descricao: string; conflito_pendente: boolean }> = [];
  const falseNegatives: Array<{ codigo: string; codigo_numerico: string; descricao: string; source_ocupacao: string }> = [];
  const sourceOnlyNotInProject: Array<{ cnae_code: string; ocupacao: string }> = [];

  for (const entry of yamlData) {
    const num = entry.codigo_numerico;
    if (entry.mei_permitido && !meiSet.has(num)) {
      // Project says MEI, source says no → false positive
      falsePositives.push({
        codigo: entry.codigo,
        codigo_numerico: num,
        descricao: entry.descricao_oficial,
        conflito_pendente: entry.conflito_pendente,
      });
    } else if (!entry.mei_permitido && meiSet.has(num)) {
      // Source says MEI, project says no → false negative
      falseNegatives.push({
        codigo: entry.codigo,
        codigo_numerico: num,
        descricao: entry.descricao_oficial,
        source_ocupacao: occupationMap.get(num) ?? '',
      });
    }
  }

  for (const code of meiSet) {
    if (!projectAllSet.has(code)) {
      sourceOnlyNotInProject.push({ cnae_code: code, ocupacao: occupationMap.get(code) ?? '' });
    }
  }

  // 6. Print summary
  console.log(`
╔══════════════════════════════════════════════╗
  MEI ELIGIBILITY AUDIT REPORT
╚══════════════════════════════════════════════╝

Source (contabilizei.com.br):
  Total rows scraped:       ${rows.length}
  Unique MEI-eligible CNAEs: ${meiSet.size}

Project (YAML files):
  Total CNAEs:              ${yamlData.length}
  Currently MEI=true:       ${projectMeiSet.size}

Diff:
  FALSE POSITIVES (MEI=true in project, not in source): ${falsePositives.length}
  FALSE NEGATIVES (MEI=false in project, in source):    ${falseNegatives.length}
  Source codes not in project at all:                   ${sourceOnlyNotInProject.length}
`);

  if (falsePositives.length > 0) {
    console.log(`FALSE POSITIVES (project marks MEI=true but source disagrees):`);
    const flagged = falsePositives.filter(f => f.conflito_pendente);
    const clean = falsePositives.filter(f => !f.conflito_pendente);
    console.log(`  (${flagged.length} already have conflito_pendente=true, ${clean.length} do not)\n`);
    for (const f of falsePositives.slice(0, 20)) {
      const flag = f.conflito_pendente ? ' ⚑' : '';
      console.log(`  ${f.codigo} — ${f.descricao.slice(0, 50)}${flag}`);
    }
    if (falsePositives.length > 20) console.log(`  … and ${falsePositives.length - 20} more`);
  }

  if (falseNegatives.length > 0) {
    console.log(`\nFALSE NEGATIVES (source says MEI=true, project says false):`);
    for (const f of falseNegatives.slice(0, 20)) {
      console.log(`  ${f.codigo} — ${f.descricao.slice(0, 50)}`);
      console.log(`    source: "${f.source_ocupacao}"`);
    }
    if (falseNegatives.length > 20) console.log(`  … and ${falseNegatives.length - 20} more`);
  }

  if (sourceOnlyNotInProject.length > 0) {
    console.log(`\nCNAEs in source not in project (likely obsolete CNAE codes or data gap):`);
    for (const s of sourceOnlyNotInProject.slice(0, 10)) {
      console.log(`  ${s.cnae_code} — ${s.ocupacao}`);
    }
    if (sourceOnlyNotInProject.length > 10) console.log(`  … and ${sourceOnlyNotInProject.length - 10} more`);
  }

  // 7. Save full report JSON
  const report = {
    generated_at: new Date().toISOString(),
    source_url: SOURCE_URL,
    summary: {
      source_rows: rows.length,
      source_unique_mei: meiSet.size,
      project_total: yamlData.length,
      project_mei_true: projectMeiSet.size,
      false_positives: falsePositives.length,
      false_negatives: falseNegatives.length,
      source_only_not_in_project: sourceOnlyNotInProject.length,
    },
    false_positives: falsePositives,
    false_negatives: falseNegatives,
    source_only_not_in_project: sourceOnlyNotInProject,
  };

  fs.writeFileSync(OUT_REPORT, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\nFull report saved to ${OUT_REPORT}`);

  if (applyFixes) {
    console.log('\n--apply flag detected. Applying fixes…');
    applyMeiFixes(yamlData, meiSet, occupationMap, SOURCE_URL);
  } else {
    console.log('\nTo apply fixes: pnpm tsx scripts/audit-mei.ts --apply');
  }
}

// ── Apply fixes ───────────────────────────────────────────────────────────────

function applyMeiFixes(
  yamlData: YamlMei[],
  meiSet: Set<string>,
  occupationMap: Map<string, string>,
  sourceUrl: string,
) {
  const today = new Date().toISOString().slice(0, 10);
  let fixed = 0;

  for (const entry of yamlData) {
    const filePath = path.join(CNAE_DIR, `${entry.slug}.yaml`);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = yaml.load(raw) as Record<string, unknown> & {
      mei: Record<string, unknown>;
    };

    const shouldBeMei = meiSet.has(entry.codigo_numerico);
    const currentlyMei = entry.mei_permitido;

    if (shouldBeMei === currentlyMei) continue; // no change needed

    const ocupacaoOficial = occupationMap.get(entry.codigo_numerico);

    data.mei = {
      ...data.mei,
      permitido: shouldBeMei,
      fonte: `Atividades Permitidas para MEI — contabilizei.com.br (baseado em Resolução CGSN nº 140/2018 e alterações)`,
      consultado_em: today,
      ocupacao_oficial: shouldBeMei ? (ocupacaoOficial ?? undefined) : undefined,
      conflito_pendente: false,
      notes_internal: undefined,
    };

    // Remove undefined keys
    for (const key of Object.keys(data.mei)) {
      if (data.mei[key] === undefined) delete data.mei[key];
    }

    const yamlStr = yaml.dump(data, { lineWidth: 120, noRefs: true, sortKeys: false });
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, yamlStr, 'utf-8');
    fs.renameSync(tmpPath, filePath);
    fixed++;
  }

  console.log(`\n✓ Fixed ${fixed} YAML files.`);
  console.log('Run pnpm build to verify.');
}

main().catch(err => {
  console.error('✗ Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
