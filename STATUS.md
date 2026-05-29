# STATUS — Session 1 + Session 2 + Session 3 Deliverables

Session 1: 2025-01-15 | Session 2: 2026-05-22 | Session 3: 2026-05-22
Build: PASSING — 2,410 pages in ~7 seconds

## Done

- [x] Astro 6 project initialized with Tailwind CSS v4, TypeScript strict, pnpm
- [x] `src/content.config.ts` — full Zod schema for CNAE entries
- [x] `src/lib/constants.ts` — 21 sections, Simples Nacional annexos, MEI attribution
- [x] `src/lib/slugify.ts` — PT-BR diacritic handling
- [x] `src/lib/cnae-helpers.ts` — parseCodigo, formatCodigoForUrl, formatCodigoForDisplay, SEO title/description generators
- [x] `src/lib/format.ts` — PT-BR date/currency formatters
- [x] `src/lib/seo.ts` — canonical URL builder, title helpers
- [x] `src/lib/schema-org.ts` — JSON-LD generators (WebSite, DefinedTerm, BreadcrumbList, FAQPage, CollectionPage, Article)
- [x] `src/lib/breadcrumbs.ts` — breadcrumb builders for all hierarchy levels
- [x] `src/lib/search.ts` — search index builder
- [x] `scripts/generate-cnae-data.ts` — fetches IBGE API, reconciles MEI from gov.br scrape, writes 1,332 YAML files + reconciliation report
- [x] `scripts/scrape-mei-source.ts` — scrapes 471 MEI ocupações from Portal do Empreendedor (19 letters, Cheerio)
- [x] `scripts/enrich-sample.ts` — Session 1 manual enrichment of 20 sample codes
- [x] `scripts/enrich-cnae.ts` — AI enrichment pipeline: Anthropic API, CLI (--codigo/--codigos/--sample/--limit/--force/--dry-run), retry logic, atomic writes, JSONL audit log
- [x] `prompts/enrichment-v1.ts` — PT-BR prompt template (versioned)
- [x] `prompts/enrichment-output-schema.ts` — Zod schema for LLM JSON output
- [x] `data/sample-batch-codes.json` — 25-code sample batch definition
- [x] `data/enrichment-log-sample-run.jsonl` — audit trail of Session 3 sample run
- [x] `data/mei-permitidos-source.json` — 471 ocupações scraped 2026-05-22
- [x] `data/mei-reconciliation-report.json` — 350 agreed, 233 auto-added, 87 flagged for review
- [x] 1,332 YAML files generated from IBGE API (`servicodados.ibge.gov.br/api/v2/cnae/subclasses`)
- [x] **45 codes enriched** (20 Session 1 + 25 Session 3 sample batch)
- [x] All Astro components: BaseHead, Header, Footer, Breadcrumbs, MeiBadge, HeroBlock, TaxInfoBlock, FaqBlock, RelatedCnaes, DataFreshnessBadge, SectionGrid, HierarchyChildren, SearchBox, AdSlot, Badge, Card, Callout
- [x] All layouts: BaseLayout, CnaeLayout, HubLayout
- [x] Pages:
  - `/` — home with search, MEI callout, section grid
  - `/cnae/` — all 21 sections grid
  - `/cnae/[...path]` — hierarchy (secao, divisao, grupo, classe)
  - `/cnae/[codigo]` — subclasse detail page (full spec)
  - `/mei/` — MEI hub
  - `/mei/atividades-permitidas/` — full MEI table
  - `/mei/atividades-proibidas/` — non-MEI activities
  - `/buscar/` — static search
  - `/guia/` + 6 guide stubs
  - `/sobre/`, `/metodologia/`, `/contato/`
  - `/robots.txt`
  - `/sitemap-index.xml` + 4 sitemaps
- [x] Zero client-side JS on content pages
- [x] JSON-LD on every page (WebSite, BreadcrumbList, FAQPage, DefinedTerm, CollectionPage)
- [x] Canonical URLs on every page
- [x] Open Graph + Twitter Card on every page
- [x] `lang="pt-BR"` on html element
- [x] Skip link for accessibility
- [x] AdSlot components wired (empty for MVP)

## Session 3 — AI Enrichment Sample Run

**Run date:** 2026-05-22
**Command:** `pnpm enrich --sample --force`
**Model:** claude-sonnet-4-6

### 25 codes enriched

**5 re-enrichment baselines (quality comparison vs Session 1):**
- `4711-3/02` Supermercados (Seção G, MEI=false)
- `5611-2/01` Restaurantes (Seção I, MEI=true)
- `9602-5/01` Cabeleireiros (Seção S, MEI=true)
- `6201-5/01` Desenvolvimento de software (Seção J, MEI=true)
- `6422-1/00` Bancos múltiplos — *5th slot; financial code regulated by BACEN, MEI=false* (Seção K)

**20 new codes (15 sections, mix MEI=true/false, tricky + edge cases):**
| Código | Descrição | Seção | MEI | Note |
|--------|-----------|-------|-----|------|
| 0111-3/01 | Cultivo de arroz | A | true | conflito_pendente |
| 1011-2/01 | Abate de bovinos | C | false | highly regulated |
| 1072-4/01 | Fabricação de açúcar de cana refinado | C | false | narrow description |
| 3511-5/01 | Geração de energia elétrica | D | false | |
| 4312-6/00 | Perfurações e sondagens | F | true | conflito_pendente |
| 4399-1/01 | Administração de obras | F | true | conflito_pendente |
| 4741-5/00 | Comércio varejista de tintas e materiais | G | true | |
| 4772-5/00 | Comércio varejista de cosméticos | G | true | |
| 5510-8/01 | Hotéis | I | false | |
| 5911-1/01 | Estúdios cinematográficos | J | false | |
| 6492-1/00 | Securitização de créditos | K | false | tricky financial |
| 6810-2/01 | Compra e venda de imóveis próprios | L | false | |
| 7111-1/00 | Serviços de arquitetura | M | false | regulated profession |
| 7420-0/01 | Atividades de fotografia | M | true | |
| 7810-8/00 | Seleção e agenciamento de mão de obra | N | false | |
| 8592-9/01 | Ensino de dança | P | true | |
| 8592-9/02 | Ensino de artes cênicas, exceto dança | P | true | |
| 8630-5/04 | Atividade odontológica | Q | false | regulated profession |
| 9609-2/99 | Outras atividades de serviços pessoais | S | true | |
| 9700-5/00 | Serviços domésticos | T | true | |

### Cost and timing

| Metric | Value |
|--------|-------|
| Total cost | $0.3997 |
| Avg cost/code | $0.0160 |
| Total input tokens | 36,435 |
| Total output tokens | 19,358 |
| Avg duration/code | 13.5s |
| Validation retries | 2 (licencas_comuns >100 chars — both recovered on retry) |
| Failed | 0 |

**Projected full-batch cost:** 1,307 remaining codes × $0.016 ≈ **$20.90**

### Known prompt limitations

1. **licencas_comuns string length** — 2 of 25 codes required a retry because the model produced license entries > 100 chars on first attempt. Both recovered. Consider raising the Zod max from 100 to 150, or adding explicit length guidance to the prompt.
2. **cnaes_relacionados hallucination risk** — the model was instructed "NÃO invente códigos que não conheça" but there is no runtime validation that returned codes exist in the CNAE 2.3 dataset. Review `cnaes_relacionados` lists carefully before launch.
3. **Thin official descriptions** (e.g., `ATIVIDADE ODONTOLÓGICA` — 22 chars) produce less specific enrichment. The prompt handles this conservatively, but content for these codes is less distinctive.

### Next step for user

1. Review the 25 enriched pages at `pnpm preview` (run `pnpm build && pnpm preview` first)
2. Compare 5 re-enriched codes against their Session 1 versions using git diff
3. If quality is satisfactory: **`pnpm enrich --limit 1307`** to enrich remaining codes (~$21, ~4.9 hours)
4. If prompt needs adjustment: edit `prompts/enrichment-v1.ts` → rename to `enrichment-v2.ts` → re-run with `--force`

## Deferred (future sessions)

- [ ] Full AI enrichment of remaining 1,287 non-enriched codes (`pnpm enrich --limit 1287`)
- [ ] Vitest unit tests for slugify.ts and cnae-helpers.ts
- [ ] Pagefind search integration
- [ ] Per-page OG image generation
- [ ] AdSense integration (slots are empty placeholders)
- [ ] Contabilizei / eGestor affiliate links
- [ ] CNAE comparison pages
- [ ] "Find your CNAE" quiz/wizard
- [ ] Newsletter capture
- [ ] Analytics (GA4 or Plausible)
- [ ] MDX guide content (6 guide stubs need editorial writing)
- [ ] /contato/ form backend (Formspree or Netlify Forms)
- [ ] Lighthouse audit + final CWV verification
- [ ] Domain setup (cnaebrasil.com.br → production)

## To verify before launch

### HIGH PRIORITY — MEI eligibility accuracy (87 codes flagged)

MEI eligibility now sourced from gov.br Portal do Empreendedor (scraped 2026-05-22). 87 codes have `conflito_pendente: true` — they were in the Session 1 legacy list but NOT found in the current gov.br scrape.

See `data/mei-reconciliation-report.json` → `flagged_review` array for full list.

Action required before launch:
1. **Review `flagged_review` list** in the reconciliation report
2. For each flagged code: verify against current CGSN resolutions (nº 140/2018 and amendments)
3. If code is genuinely non-MEI: set `mei.permitido: false` and `mei.conflito_pendente: false` in the YAML
4. If code is genuinely MEI (gov.br omission): set `mei.conflito_pendente: false` and document why
5. After all resolutions: run `pnpm build` to rebuild

233 codes were auto-added from gov.br scrape (not in legacy list) — these are trusted as correct per gov.br authority.

### HIGH PRIORITY — Simples Nacional annexo accuracy

The `inferAnexo()` function in `generate-cnae-data.ts` uses heuristics by section. Verify:
- Section I (Alimentação): restaurants may be Anexo III or IV depending on service type
- Section M (Profissionais): some codes are Anexo III, some V — depends on fator-R
- Section N (Administrativo): cleaning/security are Anexo IV, others may be III

### MEDIUM — /contato/ form

Currently static (no backend). Wire up Formspree or Netlify Forms before launch.

### MEDIUM — /guia/ pages

6 guide stubs with placeholder content. Write actual editorial content before relying on them for SEO.

### LOW — OG image

`/og-default.png` referenced but no actual file in public/. Add a real OG image before launch.

### LOW — Lighthouse audit

Run Lighthouse on production build before launch to confirm Performance ≥98, SEO 100.
`pnpm preview` then Lighthouse DevTools panel on any subclasse page.

## Build performance

- 1,332 subclasse pages + hierarchy + MEI + static = ~2,410 pages
- Build time: ~7 seconds
- Content collection loaded once in getStaticPaths (no N+1)
