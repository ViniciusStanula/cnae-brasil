# CNAE Brasil

Programmatic SEO site explaining every CNAE (Classificação Nacional de Atividades Econômicas) code in plain Portuguese for Brazilian entrepreneurs.

**Stack:** Astro 6 · Tailwind CSS v4 · TypeScript strict · pnpm · Static SSG

**~2,400 pages** built in under 10 seconds.

## Commands

| Command | Action |
| :--- | :--- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Dev server at `localhost:4321` |
| `pnpm build` | Build to `./dist/` (all ~2,400 pages) |
| `pnpm preview` | Preview built site locally |
| `pnpm scrape:mei` | Scrape MEI activities from gov.br → write `data/mei-permitidos-source.json` |
| `pnpm generate` | Fetch IBGE API + reconcile MEI → write all YAML files (1,332 subclasses) |
| `pnpm enrich` | Enrich 20 sample CNAE codes with editorial content |
| `pnpm test` | Run Vitest unit tests |

## Project structure

```
src/
  content/cnae/        YAML files — one per subclasse (1,332 files)
  content/guias/       MDX guides (add later)
  lib/                 TypeScript utilities
  components/          Astro components (layout, cnae, hierarchy, ui)
  layouts/             BaseLayout, CnaeLayout, HubLayout
  pages/               All routes
scripts/
  generate-cnae-data.ts   Fetch IBGE API → write YAML files
  enrich-sample.ts        Enrich 20 sample codes with editorial content
```

## Data pipeline

1. **`pnpm scrape:mei`** — scrapes MEI-permitted occupations from Portal do Empreendedor (gov.br) across 19 alphabet letters. Outputs `data/mei-permitidos-source.json` (471 ocupações). Re-run to refresh eligibility data.
2. **`pnpm generate`** — fetches all 1,332 subclasses from IBGE API, reconciles MEI eligibility against scraped data (asymmetric: gov.br additions auto-accepted; legacy-only codes flagged for review), writes YAML files + `data/mei-reconciliation-report.json`.
3. **`pnpm enrich`** — adds full editorial content to 20 sample codes. Already run; preserves enrichment fields on re-generate.
4. **Bulk enrichment** — separate workstream (future session). Use Claude API to enrich remaining 1,312 codes.

## YAML schema

Each `src/content/cnae/[codigo-slug].yaml` file has:
- `codigo`, `codigo_slug`, `codigo_numerico` — identity fields
- `descricao_oficial` — IBGE verbatim description
- `descricao_plana` — plain Portuguese (enriched) or same as official
- `secao/divisao/grupo/classe` — full hierarchy with names
- `mei.permitido` — MEI eligibility (Portal do Empreendedor + Resolução CGSN nº 140/2018)
- `mei.consultado_em` — date scraped data was fetched from gov.br
- `mei.ocupacao_oficial` — exact occupation name from gov.br (when matched)
- `mei.conflito_pendente` — true when legacy list includes code not found in gov.br scrape (needs review)
- `simples_nacional.anexo` — I through V or nao_aplicavel
- `exemplos_negocios`, `o_que_inclui`, `o_que_nao_inclui` — editorial (enriched codes only)
- `enriched: boolean` — false until editorial pass done

## Bulk enrichment (next session)

To enrich all codes:
1. Load each YAML file
2. Call Claude API with the official IBGE description
3. Generate: descricao_plana, exemplos_negocios, o_que_inclui, o_que_nao_inclui, licencas_comuns, cnaes_relacionados
4. Write back to YAML with `enriched: true` and `enriched_at: <date>`
5. Rebuild

See `scripts/enrich-sample.ts` for the enrichment schema.

## Deployment

Static site — deploy to Netlify, Vercel, Cloudflare Pages, or any CDN.

No runtime server required. `pnpm build` generates complete `./dist/` directory.

### Environment

- Node 22+
- pnpm 10+
