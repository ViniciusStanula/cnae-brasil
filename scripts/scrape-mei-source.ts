/**
 * Scrapes MEI-permitted occupations from the official Portal do Empreendedor.
 * Source: https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/quero-ser-mei/atividades-permitidas/[letter]
 *
 * Run: pnpm scrape:mei
 * Output: data/mei-permitidos-source.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { load } from 'cheerio';

const BASE_URL =
  'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/quero-ser-mei/atividades-permitidas';

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'l', 'm', 'o', 'p', 'q', 'r', 's', 't', 'v'];

const USER_AGENT =
  'Mozilla/5.0 (compatible; CnaeBrasilBot/1.0; +https://cnaebrasil.com.br/sobre)';

const DELAY_MS = 500;

const OUT_DIR = path.join(process.cwd(), 'data');
const OUT_FILE = path.join(OUT_DIR, 'mei-permitidos-source.json');

export interface Ocupacao {
  ocupacao: string;
  cnae: string;
  cnae_normalized: string;
  letra: string;
}

interface Output {
  fonte: string;
  fonte_url: string;
  scraped_at: string;
  total_ocupacoes: number;
  letras_processadas: string[];
  ocupacoes: Ocupacao[];
}

function normalizeCnae(raw: string): string {
  return raw.trim().replace(/\//g, '-');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchLetter(letter: string): Promise<Ocupacao[]> {
  const url = `${BASE_URL}/${letter}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for letter ${letter.toUpperCase()} — ${url}`);
  }

  const html = await response.text();
  const $ = load(html);

  // Primary selector: div#parent-fieldname-text > table.plain
  let table = $('#parent-fieldname-text table.plain');

  // Fallback: any table.plain on the page
  if (table.length === 0) {
    table = $('table.plain');
  }

  // Second fallback: look for tables with thead containing OCUPAÇÃO/CNAE
  if (table.length === 0) {
    $('table').each((_, el) => {
      const text = $(el).find('tr').first().text().toUpperCase();
      if (text.includes('OCUPA') && text.includes('CNAE')) {
        table = $(el) as ReturnType<typeof $>;
        return false;
      }
    });
  }

  if (table.length === 0) {
    throw new Error(
      `No occupation table found for letter ${letter.toUpperCase()} at ${url}. ` +
        `Check if the page structure changed.`
    );
  }

  const ocupacoes: Ocupacao[] = [];

  table.find('tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;

    const rawOcupacao = $(cells[0]).text().replace(/\s+/g, ' ').trim();
    const rawCnae = $(cells[1]).text().replace(/\s+/g, ' ').trim();

    // Skip header rows
    if (
      rawOcupacao.toUpperCase() === 'OCUPAÇÃO' ||
      rawOcupacao.toUpperCase() === 'OCUPACAO' ||
      rawCnae.toUpperCase() === 'CNAE'
    ) {
      return;
    }

    // Skip empty rows
    if (!rawOcupacao || !rawCnae) return;

    // Validate CNAE format — should look like NNNN-N/NN or NNNN-N/NNN
    if (!/^\d{4}-\d\/\d{2,3}$/.test(rawCnae)) {
      console.warn(
        `  ⚠ Unexpected CNAE format "${rawCnae}" for ocupação "${rawOcupacao}" (letter ${letter.toUpperCase()}) — including anyway`
      );
    }

    ocupacoes.push({
      ocupacao: rawOcupacao,
      cnae: rawCnae,
      cnae_normalized: normalizeCnae(rawCnae),
      letra: letter.toUpperCase(),
    });
  });

  if (ocupacoes.length === 0) {
    throw new Error(
      `Table found but no occupation rows parsed for letter ${letter.toUpperCase()} at ${url}. ` +
        `Check table structure.`
    );
  }

  return ocupacoes;
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const allOcupacoes: Ocupacao[] = [];
  const letrasProcessadas: string[] = [];
  const scrapedAt = new Date().toISOString();

  console.log(`Scraping ${LETTERS.length} letters from Portal do Empreendedor…\n`);

  for (const letter of LETTERS) {
    try {
      const ocupacoes = await fetchLetter(letter);
      allOcupacoes.push(...ocupacoes);
      letrasProcessadas.push(letter.toUpperCase());
      console.log(`  Letter ${letter.toUpperCase()}… ✓ ${ocupacoes.length} ocupações`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  Letter ${letter.toUpperCase()}… ✗ ERROR: ${msg}`);
      throw err;
    }

    if (letter !== LETTERS[LETTERS.length - 1]) {
      await sleep(DELAY_MS);
    }
  }

  // Sort alphabetically by occupation name (PT-BR locale)
  allOcupacoes.sort((a, b) =>
    a.ocupacao.localeCompare(b.ocupacao, 'pt-BR', { sensitivity: 'base' })
  );

  // Validate total count
  const total = allOcupacoes.length;
  if (total < 400 || total > 600) {
    console.warn(
      `\n⚠ WARNING: Total occupation count ${total} is outside expected range 400–600. ` +
        `Verify scrape quality before using this data.`
    );
  }

  // Detect duplicate CNAEs across letters
  const cnaeCounts = new Map<string, string[]>();
  for (const o of allOcupacoes) {
    const existing = cnaeCounts.get(o.cnae) ?? [];
    existing.push(o.letra);
    cnaeCounts.set(o.cnae, existing);
  }
  const duplicates = Array.from(cnaeCounts.entries()).filter(([, letters]) => letters.length > 1);
  if (duplicates.length > 0) {
    console.warn(`\n⚠ Duplicate CNAEs found across letters:`);
    for (const [cnae, letters] of duplicates) {
      console.warn(`  ${cnae} appears in: ${letters.join(', ')}`);
    }
  }

  const output: Output = {
    fonte: 'Ocupações Permitidas ao MEI — Portal do Empreendedor',
    fonte_url: BASE_URL,
    scraped_at: scrapedAt,
    total_ocupacoes: total,
    letras_processadas: letrasProcessadas,
    ocupacoes: allOcupacoes,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n✓ Done. ${total} ocupações from ${letrasProcessadas.length} letters.`);
  console.log(`  Output: ${OUT_FILE}`);

  if (duplicates.length > 0) {
    console.log(`  ⚠ ${duplicates.length} duplicate CNAE(s) detected — see warnings above.`);
  }
}

main().catch((err) => {
  console.error('\n✗ Scrape failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
