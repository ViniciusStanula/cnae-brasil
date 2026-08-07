/**
 * Manual enrichment helper — same output as `pnpm enrich`, but the content is
 * authored in a Claude Code session instead of via the Anthropic API.
 *
 *   pnpm enrich:next            # print context for the next 15 unenriched codes
 *   pnpm enrich:next 20 --mei   # 20 codes, MEI-permitted only
 *   pnpm enrich:apply batch.json
 *
 * The apply step validates against prompts/enrichment-output-schema.ts, checks
 * that every cnaes_relacionados entry is a real code, and writes atomically.
 */
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { enrichmentOutputSchema } from '../prompts/enrichment-output-schema.js';

const CNAE_DIR = path.join(process.cwd(), 'src', 'content', 'cnae');
const BOM = '﻿';

interface CnaeYaml {
  codigo: string;
  codigo_slug: string;
  descricao_oficial: string;
  descricao_plana: string;
  secao: { nome_curto: string };
  divisao: { codigo: string; nome: string };
  grupo: { codigo: string; nome: string };
  classe: { codigo: string; nome: string };
  mei: { permitido: boolean };
  simples_nacional: { anexo: string };
  enriched: boolean;
  enriched_at?: string;
  [key: string]: unknown;
}

function loadAll(): Array<{ file: string; data: CnaeYaml; bom: boolean }> {
  return fs
    .readdirSync(CNAE_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => {
      const file = path.join(CNAE_DIR, f);
      const raw = fs.readFileSync(file, 'utf-8');
      const bom = raw.startsWith(BOM);
      return { file, data: yaml.load(bom ? raw.slice(1) : raw) as CnaeYaml, bom };
    });
}

function writeYaml(file: string, data: CnaeYaml, bom: boolean): void {
  const body = yaml.dump(data, { lineWidth: 120, noRefs: true, sortKeys: false });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, (bom ? BOM : '') + body, 'utf-8');
  fs.renameSync(tmp, file);
}

function next(limit: number, meiOnly: boolean): void {
  const all = loadAll();
  const pending = all
    .filter(({ data }) => !data.enriched)
    .filter(({ data }) => !meiOnly || data.mei.permitido)
    .sort((a, b) => a.data.codigo.localeCompare(b.data.codigo))
    .slice(0, limit);

  const batch = pending.map(({ data }) => ({
    codigo: data.codigo,
    descricao_oficial: data.descricao_oficial,
    secao: data.secao.nome_curto,
    divisao: data.divisao.codigo,
    grupo: `${data.grupo.codigo} ${data.grupo.nome}`,
    classe: `${data.classe.codigo} ${data.classe.nome}`,
    mei_permitido: data.mei.permitido,
    anexo_simples: data.simples_nacional.anexo,
  }));

  // Real codes per divisão, listed once rather than per-code. cnaes_relacionados
  // must be picked from the dataset, never invented — apply rejects unknown codes.
  const vizinhos: Record<string, string[]> = {};
  for (const codigo of new Set(batch.map((b) => b.divisao))) {
    vizinhos[codigo] = all
      .filter(({ data: d }) => d.divisao.codigo === codigo)
      .map(({ data: d }) => `${d.codigo} ${d.descricao_oficial}`);
  }

  const remaining = all.filter(({ data }) => !data.enriched).length;
  console.error(`${remaining} unenriched remaining; showing ${batch.length}`);
  console.log(JSON.stringify({ vizinhos, batch }, null, 1));
}

function apply(jsonPath: string): void {
  const all = loadAll();
  const byCodigo = new Map(all.map((e) => [e.data.codigo, e]));
  const results = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as Array<
    Record<string, unknown> & { codigo: string }
  >;

  // Validate everything before writing anything.
  const validated = results.map((r) => {
    const entry = byCodigo.get(r.codigo);
    if (!entry) throw new Error(`${r.codigo}: no such CNAE`);

    const { codigo, ...fields } = r;
    const parsed = enrichmentOutputSchema.safeParse(fields);
    if (!parsed.success) {
      throw new Error(`${codigo}: ${JSON.stringify(parsed.error.issues)}`);
    }
    const unknown = parsed.data.cnaes_relacionados.filter((c) => !byCodigo.has(c));
    if (unknown.length) {
      throw new Error(`${codigo}: cnaes_relacionados not in dataset: ${unknown.join(', ')}`);
    }
    // "use CNAE X" cross-references are prose, so the schema can't catch a code
    // that doesn't exist — but it still sends the reader to a dead code.
    const prose = [...parsed.data.o_que_nao_inclui, ...parsed.data.o_que_inclui].join(' ');
    const dangling = [...prose.matchAll(/use CNAE (\d{4}-\d\/\d{2})/g)]
      .map((m) => m[1]!)
      .filter((c) => !byCodigo.has(c));
    if (dangling.length) {
      throw new Error(`${codigo}: "use CNAE" refers to codes not in dataset: ${dangling.join(', ')}`);
    }
    if (parsed.data.cnaes_relacionados.includes(codigo)) {
      throw new Error(`${codigo}: cnaes_relacionados references itself`);
    }
    return { entry, fields: parsed.data };
  });

  const now = new Date().toISOString();
  for (const { entry, fields } of validated) {
    writeYaml(entry.file, { ...entry.data, ...fields, enriched: true, enriched_at: now }, entry.bom);
    console.log(`enriched ${entry.data.codigo}`);
  }
  console.log(`\n${validated.length} written.`);
}

const args = process.argv.slice(2);
if (args[0] === 'apply') {
  apply(args[1]!);
} else {
  const limit = Number(args.find((a) => /^\d+$/.test(a)) ?? 15);
  next(limit, args.includes('--mei'));
}
