/**
 * Enriches CNAE YAML files with plain-language content via the Anthropic API.
 *
 * Usage:
 *   pnpm enrich --help
 *   pnpm enrich --codigo 4711-3/02
 *   pnpm enrich --codigos 4711-3/02,9602-5/01
 *   pnpm enrich --limit 10
 *   pnpm enrich --sample            (uses data/sample-batch-codes.json)
 *   pnpm enrich --limit 10 --dry-run
 *   pnpm enrich --codigo 4711-3/02 --force
 */

import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { buildEnrichmentPrompt, type EnrichmentInput } from '../prompts/enrichment-v1.js';
import { enrichmentOutputSchema, type EnrichmentOutput } from '../prompts/enrichment-output-schema.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const PRICE_INPUT_PER_MTOK = 3.0;
const PRICE_OUTPUT_PER_MTOK = 15.0;
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1500;
const TEMPERATURE = 0.3;
const DELAY_MS = 1000;
const BACKOFF_MS = [2000, 4000, 8000];

const CNAE_DIR = path.join(process.cwd(), 'src', 'content', 'cnae');
const DATA_DIR = path.join(process.cwd(), 'data');
const LOG_FILE = path.join(DATA_DIR, 'enrichment-log.jsonl');
const SAMPLE_CODES_FILE = path.join(DATA_DIR, 'sample-batch-codes.json');

// ── ANSI helpers ──────────────────────────────────────────────────────────────

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface CnaeYaml {
  codigo: string;
  codigo_slug: string;
  descricao_oficial: string;
  descricao_plana: string;
  secao: { letra: string; nome: string; slug: string; nome_curto: string };
  divisao: { codigo: string; nome: string };
  grupo: { codigo: string; nome: string };
  classe: { codigo: string; nome: string };
  mei: {
    permitido: boolean;
    observacao?: string;
    fonte: string;
    consultado_em?: string;
    ocupacao_oficial?: string;
    conflito_pendente?: boolean;
  };
  simples_nacional: { anexo: string; observacao?: string };
  natureza_juridica_recomendada: string[];
  exemplos_negocios: string[];
  o_que_inclui: string[];
  o_que_nao_inclui: string[];
  licencas_comuns: string[];
  cnaes_relacionados: string[];
  enriched: boolean;
  enriched_at?: string;
  last_reviewed: string;
  data_year: number;
  notes_internal?: string;
}

interface LogEntry {
  ts: string;
  codigo: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  duration_ms: number;
  status: 'success' | 'validation_failed' | 'api_error' | 'skipped';
  error: string | null;
}

interface RunStats {
  attempted: number;
  successful: number;
  validationFailed: number;
  apiErrors: number;
  skipped: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  totalDurationMs: number;
  failures: Array<{ codigo: string; reason: string }>;
  filesUpdated: number;
  logEntries: number;
}

interface Args {
  help: boolean;
  codigo: string | null;
  codigos: string[] | null;
  sample: boolean;
  limit: number | null;
  force: boolean;
  dryRun: boolean;
}

// ── CLI parsing ───────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): Args {
  const args = argv.slice(2);
  const result: Args = {
    help: false,
    codigo: null,
    codigos: null,
    sample: false,
    limit: null,
    force: false,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--codigo') {
      result.codigo = args[++i];
    } else if (arg === '--codigos') {
      result.codigos = args[++i].split(',').map((s) => s.trim()).filter(Boolean);
    } else if (arg === '--sample') {
      result.sample = true;
    } else if (arg === '--limit') {
      result.limit = parseInt(args[++i], 10);
    } else if (arg === '--force') {
      result.force = true;
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    }
  }
  return result;
}

function printHelp(): void {
  console.log(`
Usage: pnpm enrich [options]

Options:
  --codigo <code>     Enrich a single CNAE code (e.g., 4711-3/02)
  --codigos <list>    Enrich specific codes (comma-separated)
  --sample            Enrich the 25-code sample batch (data/sample-batch-codes.json)
  --limit <n>         Enrich up to N unenriched codes (alphabetical order)
  --force             Re-enrich codes already marked as enriched
  --dry-run           Build prompts and log estimated cost, skip API calls
  --help              Show this help

Examples:
  pnpm enrich --codigo 4711-3/02
  pnpm enrich --codigos 4711-3/02,9602-5/01
  pnpm enrich --sample
  pnpm enrich --limit 10 --dry-run
  pnpm enrich --limit 1307
  pnpm enrich --codigo 4711-3/02 --force
`);
}

// ── YAML helpers ──────────────────────────────────────────────────────────────

const codigoToSlug = (codigo: string): string => codigo.replace(/\//g, '-');

function loadYaml(filePath: string): CnaeYaml {
  const content = fs.readFileSync(filePath, 'utf-8');
  return yaml.load(content) as CnaeYaml;
}

function writeYamlAtomic(filePath: string, data: CnaeYaml): void {
  const yamlStr = yaml.dump(data, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, yamlStr, 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

// ── Sibling index ─────────────────────────────────────────────────────────────

interface SiblingEntry {
  codigo: string;
  descricao_oficial: string;
}

function buildSiblingIndex(): Map<string, SiblingEntry[]> {
  const index = new Map<string, SiblingEntry[]>();
  const files = fs.readdirSync(CNAE_DIR).filter((f) => f.endsWith('.yaml'));

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(CNAE_DIR, file), 'utf-8');
      const data = yaml.load(content) as { codigo: string; descricao_oficial: string; classe: { codigo: string } };
      const classeCode = data.classe?.codigo;
      if (!classeCode) continue;
      if (!index.has(classeCode)) index.set(classeCode, []);
      index.get(classeCode)!.push({ codigo: data.codigo, descricao_oficial: data.descricao_oficial });
    } catch {
      // skip malformed files
    }
  }

  return index;
}

function getSiblings(targetCodigo: string, classeCode: string, index: Map<string, SiblingEntry[]>): SiblingEntry[] {
  const all = index.get(classeCode) ?? [];
  return all.filter((s) => s.codigo !== targetCodigo).slice(0, 9);
}

// ── Target resolution ─────────────────────────────────────────────────────────

function resolveTargets(args: Args): string[] {
  if (args.codigo) {
    return [args.codigo];
  }

  if (args.codigos) {
    return args.codigos;
  }

  if (args.sample) {
    if (!fs.existsSync(SAMPLE_CODES_FILE)) {
      console.error(red(`ERROR: ${SAMPLE_CODES_FILE} not found.`));
      process.exit(1);
    }
    const raw = JSON.parse(fs.readFileSync(SAMPLE_CODES_FILE, 'utf-8')) as { all_codes: string[] };
    return raw.all_codes;
  }

  if (args.limit !== null) {
    const files = fs.readdirSync(CNAE_DIR)
      .filter((f) => f.endsWith('.yaml'))
      .sort();

    const candidates: string[] = [];
    for (const file of files) {
      if (candidates.length >= args.limit) break;
      try {
        const data = loadYaml(path.join(CNAE_DIR, file));
        if (!data.enriched || args.force) {
          candidates.push(data.codigo);
        }
      } catch {
        // skip
      }
    }
    return candidates;
  }

  return [];
}

// ── Log ───────────────────────────────────────────────────────────────────────

function appendLog(entry: LogEntry): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf-8');
}

// ── API call ──────────────────────────────────────────────────────────────────

function extractText(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callApiWithRetry(
  client: Anthropic,
  system: string,
  messages: Anthropic.MessageParam[],
): Promise<{ response: Anthropic.Message; attempts: number }> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        system,
        messages,
      });
      return { response, attempts: attempt + 1 };
    } catch (err) {
      lastError = err;
      if (err instanceof Anthropic.APIError) {
        if (err.status === 429) {
          const retryAfter = (err.headers as Record<string, string> | undefined)?.['retry-after'];
          const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 30_000;
          console.warn(yellow(`  ⚠ Rate limit hit — waiting ${waitMs / 1000}s…`));
          await sleep(waitMs);
          continue;
        }
        if (err.status && err.status >= 500 && attempt < BACKOFF_MS.length) {
          const wait = BACKOFF_MS[attempt];
          console.warn(yellow(`  ⚠ API ${err.status} — retrying in ${wait / 1000}s…`));
          await sleep(wait);
          continue;
        }
      }
      throw err;
    }
  }

  throw lastError;
}

// ── Enrichment ────────────────────────────────────────────────────────────────

interface EnrichmentResult {
  status: LogEntry['status'];
  output?: EnrichmentOutput;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  error?: string;
}

async function enrichOneCode(
  client: Anthropic,
  codigo: string,
  data: CnaeYaml,
  siblingIndex: Map<string, SiblingEntry[]>,
  dryRun: boolean,
): Promise<EnrichmentResult> {
  const start = Date.now();
  let totalInput = 0;
  let totalOutput = 0;

  const siblings = getSiblings(codigo, data.classe.codigo, siblingIndex);

  const enrichInput: EnrichmentInput = {
    codigo,
    descricao_oficial: data.descricao_oficial,
    secao: data.secao,
    divisao: data.divisao,
    grupo: data.grupo,
    classe: data.classe,
    mei: {
      permitido: data.mei.permitido,
      ocupacao_oficial: data.mei.ocupacao_oficial,
    },
    simples_nacional: data.simples_nacional,
    siblings,
  };

  const { system, user } = buildEnrichmentPrompt(enrichInput);

  if (dryRun) {
    const estimatedInput = Math.ceil((system.length + user.length) / 4);
    const estimatedOutput = 520;
    const estimatedCost =
      (estimatedInput / 1_000_000) * PRICE_INPUT_PER_MTOK +
      (estimatedOutput / 1_000_000) * PRICE_OUTPUT_PER_MTOK;
    return {
      status: 'success',
      inputTokens: estimatedInput,
      outputTokens: estimatedOutput,
      costUsd: estimatedCost,
      durationMs: 0,
    };
  }

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: user }];

  // First attempt
  let firstText = '';
  try {
    const { response } = await callApiWithRetry(client, system, messages);
    totalInput += response.usage.input_tokens;
    totalOutput += response.usage.output_tokens;
    firstText = stripMarkdownFences(extractText(response));
  } catch (err) {
    return {
      status: 'api_error',
      inputTokens: totalInput,
      outputTokens: totalOutput,
      costUsd: calcCost(totalInput, totalOutput),
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Parse + validate first attempt
  let parsed: ReturnType<typeof enrichmentOutputSchema.safeParse>;
  try {
    const json = JSON.parse(firstText);
    parsed = enrichmentOutputSchema.safeParse(json);
  } catch {
    parsed = enrichmentOutputSchema.safeParse(null);
  }

  if (parsed.success) {
    return {
      status: 'success',
      output: parsed.data,
      inputTokens: totalInput,
      outputTokens: totalOutput,
      costUsd: calcCost(totalInput, totalOutput),
      durationMs: Date.now() - start,
    };
  }

  // Second attempt with correction
  const validationError = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  console.warn(dim(`    retry — validation error: ${validationError}`));

  const correctionMessages: Anthropic.MessageParam[] = [
    { role: 'user', content: user },
    { role: 'assistant', content: firstText },
    {
      role: 'user',
      content: `Sua resposta anterior falhou na validação com o seguinte erro: ${validationError}. Por favor, refaça a resposta seguindo estritamente o schema. Responda APENAS com JSON válido.`,
    },
  ];

  let secondText = '';
  try {
    const { response: resp2 } = await callApiWithRetry(client, system, correctionMessages);
    totalInput += resp2.usage.input_tokens;
    totalOutput += resp2.usage.output_tokens;
    secondText = stripMarkdownFences(extractText(resp2));
  } catch (err) {
    return {
      status: 'api_error',
      inputTokens: totalInput,
      outputTokens: totalOutput,
      costUsd: calcCost(totalInput, totalOutput),
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  let parsed2: ReturnType<typeof enrichmentOutputSchema.safeParse>;
  try {
    const json2 = JSON.parse(secondText);
    parsed2 = enrichmentOutputSchema.safeParse(json2);
  } catch {
    parsed2 = enrichmentOutputSchema.safeParse(null);
  }

  if (parsed2.success) {
    return {
      status: 'success',
      output: parsed2.data,
      inputTokens: totalInput,
      outputTokens: totalOutput,
      costUsd: calcCost(totalInput, totalOutput),
      durationMs: Date.now() - start,
    };
  }

  const finalError = parsed2.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  return {
    status: 'validation_failed',
    inputTokens: totalInput,
    outputTokens: totalOutput,
    costUsd: calcCost(totalInput, totalOutput),
    durationMs: Date.now() - start,
    error: finalError,
  };
}

function calcCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * PRICE_INPUT_PER_MTOK + (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_MTOK;
}

// ── Summary ───────────────────────────────────────────────────────────────────

function printSummary(stats: RunStats, dryRun: boolean): void {
  const dryTag = dryRun ? ' (DRY RUN — estimated)' : '';
  console.log(`
${dryRun ? yellow('DRY RUN — ') : ''}ENRICHMENT RUN SUMMARY${dryTag}
======================
Codes attempted:          ${stats.attempted}
Successful:               ${green(String(stats.successful))}
Validation failed:        ${stats.validationFailed > 0 ? red(String(stats.validationFailed)) : '0'}
API errors:               ${stats.apiErrors > 0 ? red(String(stats.apiErrors)) : '0'}
Skipped (enriched):       ${stats.skipped}

Total input tokens:       ${stats.totalInputTokens.toLocaleString()}
Total output tokens:      ${stats.totalOutputTokens.toLocaleString()}
Total cost:               $${stats.totalCostUsd.toFixed(4)}${dryTag}`);

  if (stats.successful > 0) {
    const avgIn = Math.round(stats.totalInputTokens / stats.successful);
    const avgOut = Math.round(stats.totalOutputTokens / stats.successful);
    const avgCost = stats.totalCostUsd / stats.successful;
    const avgDur = (stats.totalDurationMs / stats.successful / 1000).toFixed(1);
    console.log(`
Avg per successful enrichment:
  Tokens:   ${(avgIn + avgOut).toLocaleString()} (${avgIn.toLocaleString()} in / ${avgOut.toLocaleString()} out)
  Cost:     $${avgCost.toFixed(4)}
  Duration: ${dryRun ? 'n/a' : avgDur + 's'}`);
  }

  if (stats.failures.length > 0) {
    console.log('\nFailures:');
    for (const f of stats.failures) {
      console.log(`  ${red('✗')} ${f.codigo}: ${f.reason}`);
    }
  }

  if (!dryRun) {
    console.log(`\nOutput written to:
  - ${stats.filesUpdated} YAML file(s) updated
  - ${LOG_FILE} (${stats.logEntries} entries)`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  dotenv.config();

  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Require API key (even for dry run — validates env is set up)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      red(
        'ERROR: ANTHROPIC_API_KEY is not set.\n' +
          'Create a .env file from .env.example and add your Anthropic API key.',
      ),
    );
    process.exit(1);
  }

  const targets = resolveTargets(args);
  if (targets.length === 0) {
    console.log('No codes to enrich. Use --help for usage.');
    process.exit(0);
  }

  if (args.dryRun) {
    console.log(yellow(`DRY RUN — will estimate cost for ${targets.length} code(s), no API calls.\n`));
  } else {
    console.log(`Enriching ${targets.length} code(s) with ${MODEL}…\n`);
  }

  // Build sibling index once
  process.stdout.write('Building sibling index…');
  const siblingIndex = buildSiblingIndex();
  console.log(dim(` ${siblingIndex.size} classes indexed.\n`));

  const client = new Anthropic({ apiKey });

  const stats: RunStats = {
    attempted: 0,
    successful: 0,
    validationFailed: 0,
    apiErrors: 0,
    skipped: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUsd: 0,
    totalDurationMs: 0,
    failures: [],
    filesUpdated: 0,
    logEntries: 0,
  };

  for (let i = 0; i < targets.length; i++) {
    const codigo = targets[i];
    const slug = codigoToSlug(codigo);
    const filePath = path.join(CNAE_DIR, `${slug}.yaml`);
    const prefix = `[${i + 1}/${targets.length}]`;

    // Check file exists
    if (!fs.existsSync(filePath)) {
      console.warn(yellow(`${prefix} ⚠ ${codigo} — YAML not found (${slug}.yaml), skipping`));
      const entry: LogEntry = {
        ts: new Date().toISOString(),
        codigo,
        model: MODEL,
        input_tokens: 0,
        output_tokens: 0,
        cost_usd: 0,
        duration_ms: 0,
        status: 'skipped',
        error: 'YAML file not found',
      };
      appendLog(entry);
      stats.skipped++;
      stats.logEntries++;
      continue;
    }

    const data = loadYaml(filePath);
    const label = data.descricao_oficial.slice(0, 45);

    // Skip if already enriched and not forcing
    if (data.enriched && !args.force) {
      console.log(dim(`${prefix} — ${codigo} (${label}) skipped (already enriched)`));
      const entry: LogEntry = {
        ts: new Date().toISOString(),
        codigo,
        model: MODEL,
        input_tokens: 0,
        output_tokens: 0,
        cost_usd: 0,
        duration_ms: 0,
        status: 'skipped',
        error: null,
      };
      appendLog(entry);
      stats.skipped++;
      stats.logEntries++;
      continue;
    }

    stats.attempted++;

    const result = await enrichOneCode(client, codigo, data, siblingIndex, args.dryRun);

    // Accumulate stats
    stats.totalInputTokens += result.inputTokens;
    stats.totalOutputTokens += result.outputTokens;
    stats.totalCostUsd += result.costUsd;
    stats.totalDurationMs += result.durationMs;

    const durSec = (result.durationMs / 1000).toFixed(1);
    const costStr = `$${result.costUsd.toFixed(4)}`;

    const entry: LogEntry = {
      ts: new Date().toISOString(),
      codigo,
      model: MODEL,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      cost_usd: result.costUsd,
      duration_ms: result.durationMs,
      status: result.status,
      error: result.error ?? null,
    };

    if (result.status === 'success') {
      stats.successful++;

      if (!args.dryRun && result.output) {
        const updated: CnaeYaml = {
          ...data,
          descricao_plana: result.output.descricao_plana,
          exemplos_negocios: result.output.exemplos_negocios,
          o_que_inclui: result.output.o_que_inclui,
          o_que_nao_inclui: result.output.o_que_nao_inclui,
          licencas_comuns: result.output.licencas_comuns,
          cnaes_relacionados: result.output.cnaes_relacionados,
          enriched: true,
          enriched_at: new Date().toISOString(),
        };
        writeYamlAtomic(filePath, updated);
        stats.filesUpdated++;
      }

      const dryTag = args.dryRun ? dim(' (dry)') : '';
      console.log(
        `${prefix} ${green('✓')} ${codigo} ${dim(`(${label})`)} — ${args.dryRun ? dim('~') : ''}${durSec}s, ${costStr}${dryTag}`,
      );
    } else if (result.status === 'validation_failed') {
      stats.validationFailed++;
      stats.failures.push({ codigo, reason: `validation error: ${result.error}` });
      console.log(`${prefix} ${red('✗')} ${codigo} ${dim(`(${label})`)} — validation failed: ${result.error}`);
    } else {
      stats.apiErrors++;
      stats.failures.push({ codigo, reason: `api error: ${result.error}` });
      console.log(`${prefix} ${red('✗')} ${codigo} ${dim(`(${label})`)} — API error: ${result.error}`);
    }

    appendLog(entry);
    stats.logEntries++;

    // Delay between calls (skip after last code and for skipped/dry-run)
    if (!args.dryRun && i < targets.length - 1 && result.status !== 'skipped') {
      await sleep(DELAY_MS);
    }
  }

  printSummary(stats, args.dryRun);

  // Abort if too many failures
  if (stats.validationFailed > 5) {
    console.error(
      red(
        `\n⚠ STOP: ${stats.validationFailed} validation failures — more than the 5-failure threshold.\n` +
          'Review and fix the prompt in prompts/enrichment-v1.ts before running the full batch.',
      ),
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(red(`\n✗ Fatal: ${err instanceof Error ? err.message : String(err)}`));
  process.exit(1);
});
