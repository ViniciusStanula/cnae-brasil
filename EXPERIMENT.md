# Crawl Experiment: HTML vs JavaScript Links

**Start date:** 2026-05-29  
**Duration:** 6–8 weeks minimum  
**Question:** Does Google (and other bots) discover and crawl pages whose links are injected via JavaScript, compared to pages with hard-coded HTML links?

---

## How the site is split

The 21 CNAE seções (A–U) are split into two groups, alternating by letter:

| Group | Seções (letra) | What happens |
|-------|---------------|--------------|
| **HTML** (control) | A C E G I K M O Q S U | Divisão links hard-coded in HTML — bots can see them in raw page source |
| **JS** (treatment) | B D F H J L N P R T | Divisão links injected by JavaScript after page load — invisible in raw HTML |

**This applies at every level of the hierarchy.** For JS-group seções, ALL child links (divisão → grupo → classe → subclasse) are JS-injected, not just the first level.

### What a bot sees on an HTML-group seção page (`/cnae/agricultura/`)
Raw HTML contains `<a href="/cnae/agricultura/01/">` — bot can follow it without executing JS.

### What a bot sees on a JS-group seção page (`/cnae/transporte/`)
Raw HTML contains an empty `<div id="js-children">`. Links are only added after the browser/bot runs the `<script>` tag. A bot that does not execute JavaScript will see no links and cannot discover any child pages.

---

## What we deliberately removed to keep the experiment clean

- **Sitemaps disabled** — all sitemap URLs return 404. If sitemaps were active, Google could discover JS-group pages directly from the sitemap, bypassing the link experiment entirely.
- **Breadcrumbs removed** — leaf pages (`/cnae/0135-1-01/`) previously had breadcrumb links pointing back up to divisão/grupo/classe pages. Those upward links would have let bots discover hierarchy pages without needing to follow seção→divisão links.
- **"Onde este CNAE se encaixa" section removed** — leaf pages had a hierarchy panel with direct HTML links to seção/divisão/grupo/classe. Also removed as it was the same confound.

---

## How logging works

Every bot hit is recorded in two Supabase tables.

### `crawl_logs` — enriched bot-only log
One row per bot request. Fields:

| Field | Meaning |
|-------|---------|
| `path` | The URL path that was crawled (e.g. `/cnae/transporte/49/`) |
| `link_type` | `html` = page belongs to HTML group; `js` = JS group; `null` = leaf page or non-CNAE page |
| `crawled_at` | Timestamp of the hit |
| `bot_name` | Which bot: `Googlebot`, `GPTBot`, `Bingbot`, `ClaudeBot`, etc. |
| `referer` | The page the bot came FROM (if sent). Proves discovery chain. |
| `user_agent` | Full UA string |
| `ip` | Bot's IP address |
| `verified` | `true` = reverse DNS confirmed this is a real Googlebot/Bingbot IP (not spoofed) |

**How `link_type` is assigned:** middleware extracts the seção slug from the path (first segment after `/cnae/`), then checks `experiment.config.ts`. All paths under `/cnae/transporte/...` get `link_type = 'js'`. All paths under `/cnae/agricultura/...` get `link_type = 'html'`. Leaf pages like `/cnae/0135-1-01/` get `null` because the código slug isn't a seção slug.

### `request_logs` — raw fallback log of every hit
Every request (humans + bots). Fields: `path`, `hit_at`, `user_agent`, `ip`, `referer`. No bot enrichment. Use this to verify `crawl_logs` is complete, or to identify bots that weren't in our detection list.

---

## Bots we track

| Bot | Who | rDNS verified |
|-----|-----|--------------|
| Googlebot | Google Search | ✓ |
| Google-InspectionTool | GSC URL inspection | ✗ |
| GoogleOther | Google secondary crawler | ✗ |
| Bingbot | Microsoft Bing | ✓ |
| GPTBot | OpenAI training/search | ✗ |
| OAI-SearchBot | OpenAI SearchGPT | ✗ |
| ClaudeBot | Anthropic | ✗ |
| PerplexityBot | Perplexity AI | ✗ |
| ByteSpider | TikTok/ByteDance | ✗ |
| Applebot | Apple Search | ✗ |
| DuckDuckBot | DuckDuckGo | ✗ |
| YandexBot | Yandex | ✗ |
| AhrefsBot / SemrushBot / MJ12bot | SEO tools | ✗ |
| UnknownBot | Any UA containing "bot/crawler/spider" | ✗ |

"rDNS verified" means we do a reverse DNS lookup to confirm the IP actually belongs to that bot. Only Google and Bing publish verifiable rDNS records.

---

## Early results (Day 1 — 2026-05-29)

**GPTBot** crawled the site within hours of deployment.

- Hit all 10 JS-group seção pages ✓
- Crawled deep into HTML-group hierarchy: divisão → grupo → classe level ✓
- **Zero JS-group divisão/grupo/classe pages crawled** ✗

Conclusion for GPTBot: **does not execute JavaScript**. Followed HTML links deep into HTML group, stopped at seção level for JS group.

**Googlebot** hit `robots.txt` and homepage on 2026-05-29. First JS hierarchy page discovered 9.9 hours after launch. See Day 2 for full results.

---

## How to export data

```powershell
Invoke-WebRequest `
  -Uri "https://cnaebrasil.com.br/api/export-crawl-logs" `
  -Headers @{"x-export-key"="YOUR_SECRET"} `
  -OutFile crawl-logs.csv
```

---

## Key analysis queries

**Summary by bot and group:**
```sql
select 
  bot_name,
  link_type,
  count(*) as hits,
  min(crawled_at) as first_hit,
  max(crawled_at) as last_hit
from crawl_logs
where link_type is not null
group by bot_name, link_type
order by bot_name, link_type;
```

**Did any bot reach JS-group hierarchy pages (divisão or deeper)?**
```sql
select path, bot_name, referer, crawled_at
from crawl_logs
where link_type = 'js'
  and path ~ '^/cnae/[^/]+/[^/]+'  -- at least seção/divisão depth
order by crawled_at asc;
```

**Proof of JS execution (bot followed a JS-injected link):**
```sql
-- path like '%/%/%' is NOT sufficient — seção pages (/cnae/transporte/) also have 3 slashes.
-- Use depth >= 3 filter instead.
select path, bot_name, referer, crawled_at
from crawl_logs
where link_type = 'js'
  and length(path) - length(replace(path, '/', '')) - 1 >= 3
  and referer is not null
order by crawled_at asc;
```

**Crawl depth reached per bot per group:**

> **Important:** Depth 2 (seção pages) hitting `link_type = 'js'` does NOT mean a JS link was followed.
> The seção page itself is always reachable via a hard-coded HTML link from the `/cnae/` index — for both groups.
> What makes a seção "JS group" is that its **outgoing** links to divisão children are JS-injected.
>
> **The real experiment signal starts at depth 3 (divisão level).**
> A JS-group hit at depth 3+ means the bot executed JavaScript and followed an injected link.
> Depth 2 JS hits only confirm "bot found the seção page" — same as HTML group, no signal.

| Depth | Path pattern | Meaning |
|-------|-------------|---------|
| 2 | `/cnae/transporte/` | Seção page — reached via HTML from index. No signal. |
| 3 | `/cnae/transporte/49/` | Divisão page — **only reachable by executing JS**. Signal. |
| 4 | `/cnae/transporte/49/49.2/` | Grupo page — same. Signal. |
| 5 | `/cnae/transporte/49/49.2/4921-3/` | Classe page — same. Signal. |

```sql
-- Only show depth >= 3 (actual experiment signal)
select bot_name, link_type, depth, count(*) as pages
from (
  select bot_name, link_type,
    length(path) - length(replace(path, '/', '')) - 1 as depth
  from crawl_logs
  where link_type is not null
) t
where depth >= 3
group by bot_name, link_type, depth
order by bot_name, link_type, depth;
```

**Coverage gap query (unique pages per group):**
```sql
select
  bot_name,
  link_type,
  count(distinct path) as unique_pages
from crawl_logs
where link_type is not null
group by bot_name, link_type
order by bot_name, link_type;
```

**Recrawl lag — avg hours between first and second visit:**
```sql
select
  bot_name,
  link_type,
  round(avg(extract(epoch from gap)/3600), 1) as avg_hours_to_recrawl
from (
  select
    bot_name, link_type, path,
    lead(crawled_at) over (partition by bot_name, path order by crawled_at) - crawled_at as gap
  from crawl_logs
  where link_type is not null
) t
where gap is not null
group by bot_name, link_type
order by bot_name, link_type;
```

**Per-seção coverage (run for any snapshot):**
```sql
select
  split_part(path, '/', 3) as secao,
  link_type,
  count(distinct path) as pages,
  max(length(path) - length(replace(path, '/', '')) - 1) as max_depth_reached
from crawl_logs
where bot_name in ('Googlebot', 'GoogleOther')
  and link_type is not null
group by secao, link_type
order by link_type, pages desc;
```

**JS seções never reached at depth 3+ by Googlebot:**
```sql
select s.secao
from (values
  ('industrias-extrativas'),('eletricidade-gas-agua'),('construcao'),
  ('transporte'),('informacao-comunicacao'),('atividades-imobiliarias'),
  ('atividades-administrativas'),('educacao'),('artes-cultura-esporte'),
  ('servicos-domesticos')
) as s(secao)
where s.secao not in (
  select split_part(path, '/', 3)
  from crawl_logs
  where bot_name = 'Googlebot'
    and link_type = 'js'
    and length(path) - length(replace(path, '/', '')) - 1 >= 3
);
```

**Discovery velocity (new unique pages per day):**
```sql
select
  bot_name,
  link_type,
  date_trunc('day', crawled_at) as day,
  count(distinct path) as new_pages_that_day
from crawl_logs
where link_type is not null
  and (
    link_type = 'html'
    or (link_type = 'js' and length(path) - length(replace(path, '/', '')) - 1 >= 3)
  )
group by bot_name, link_type, day
order by bot_name, link_type, day;
```

---

## Results log

### Day 2 — 2026-05-30

**Bot activity (last 24h hits):**

| Bot | Hits |
|-----|------|
| ClaudeBot | 3,845 |
| GPTBot | 1,905 |
| GoogleOther | 1,304 |
| Googlebot | 268 |
| Applebot | 8 |
| Bingbot | 6 |
| PerplexityBot | 4 |
| OAI-SearchBot | 4 |

**JS execution confirmed per bot (depth 3+ in JS group):**

| Bot | HTML depth 3+ | JS depth 3+ | Executes JS? |
|-----|--------------|-------------|--------------|
| Googlebot | ✓ (4/5/14) | ✓ (2/3/1) | **YES** |
| GoogleOther | ✓ (79/159/158) | ✓ (31/36/26) | **YES** |
| ClaudeBot | ✓ (108/394/994) | **0/0/0** | **NO** |
| GPTBot | ✓ (54/197/497) | **0/0/0** | **NO** |

**Coverage gap — unique pages reached:**

| Bot | HTML pages | JS pages | JS/HTML ratio |
|-----|-----------|---------|--------------|
| Googlebot | 24 | 6 | 25% |
| GoogleOther | 292 | 76 | 26% |

**Interpretation:** Google crawls JS-group pages at ~¼ the rate of HTML-group pages on day 2.
Both groups have the same number of seções (11 HTML vs 10 JS) so size is not the cause.

**Note on null referers:** All Googlebot JS-group hits show `referer = null`. This is expected —
Googlebot deliberately does not send Referer headers (documented privacy behavior).
The crawl pattern (seção → divisão → grupo → classe, progressively deeper over hours) proves
it followed links rather than discovering pages externally.

**Open question:** Does the gap close over 6–8 weeks (Google catches up) or persist
(JS links permanently reduce crawl coverage)?

**Recrawl frequency — avg hits per already-discovered page (depth ≥ 3 for JS):**

| Bot | HTML avg hits/page | JS avg hits/page |
|-----|-------------------|-----------------|
| Googlebot | 1.00 | 1.17 |
| GoogleOther | 1.46 | 1.56 |
| ClaudeBot | 2.00 | 2.00 (seção only — never reached depth 3+) |
| GPTBot | 1.00 | — (never reached depth 3+) |

**Key finding — the penalty is discovery, not recrawl frequency.**
Once Google finds a page via a JS-injected link, it recrawls that page as often as (or more than) HTML-linked pages. The ~75% gap is entirely in *how many pages get discovered initially*, not in how frequently discovered pages get revisited.

Implication: JS links don't hurt ongoing crawl maintenance. They hurt **initial crawl coverage**. A page that Google never discovers via JS will never be crawled at all — but if it does discover it, it treats it the same as any other page going forward.

**Recrawl queries (run with depth >= 3 filter for JS to exclude seção-level noise):**
```sql
-- Avg hits per page
select bot_name, link_type,
  round(avg(hit_count), 2) as avg_hits_per_page,
  max(hit_count) as max_hits_single_page
from (
  select bot_name, link_type, path, count(*) as hit_count
  from crawl_logs
  where link_type is not null
    and (
      link_type = 'html'
      or (link_type = 'js' and length(path) - length(replace(path, '/', '')) - 1 >= 3)
    )
  group by bot_name, link_type, path
) t
group by bot_name, link_type
order by bot_name, link_type;

-- Pages recrawled more than once
select bot_name, link_type,
  count(*) as pages_recrawled,
  round(avg(hit_count), 2) as avg_recrawl_count
from (
  select bot_name, link_type, path, count(*) as hit_count
  from crawl_logs
  where link_type is not null
    and (
      link_type = 'html'
      or (link_type = 'js' and length(path) - length(replace(path, '/', '')) - 1 >= 3)
    )
  group by bot_name, link_type, path
  having count(*) > 1
) t
group by bot_name, link_type
order by bot_name, link_type;
```

**Recrawl lag — avg hours between first and second visit:**

| Bot | HTML recrawl lag | JS recrawl lag |
|-----|-----------------|---------------|
| ClaudeBot | 1.1h | 1.2h (seção only — never reached depth 3+) |
| GoogleOther | 6.6h | **4.4h** |
| Googlebot | — | 10.2h (only 1 JS page recrawled so far) |

Surprising: GoogleOther recrawls JS-discovered pages ~33% faster than HTML pages.
Possible explanation: Google re-renders JS pages more urgently to confirm content on second pass,
or newly discovered JS pages are placed in a higher-priority crawl queue.

**Per-seção coverage breakdown (Google only, day 2):**

| Seção | Group | Pages | Max depth |
|-------|-------|-------|-----------|
| industrias-de-transformacao | HTML | 193 | 5 |
| agricultura | HTML | 47 | 5 |
| outras-atividades-de-servicos | HTML | 17 | 5 |
| atividades-profissionais | HTML | 15 | 5 |
| comercio | HTML | 8 | 5 |
| financeiro-seguros | HTML | 5 | 5 |
| alojamento-alimentacao | HTML | 5 | 5 |
| saude-servicos-sociais | HTML | 3 | 4 |
| agua-esgoto-residuos | HTML | 3 | 5 |
| organismos-internacionais | HTML | 2 | 3 |
| administracao-publica | HTML | 1 | 2 |
| transporte | JS | 36 | 5 |
| construcao | JS | 14 | 5 |
| artes-cultura-esporte | JS | 10 | 5 |
| atividades-administrativas | JS | 7 | 5 |
| industrias-extrativas | JS | 4 | 3 |
| atividades-imobiliarias | JS | 2 | 3 |
| servicos-domesticos | JS | 2 | 3 |
| educacao | JS | 2 | 3 |
| eletricidade-gas-agua | JS | 1 | **2** (seção only) |
| informacao-comunicacao | JS | 1 | **2** (seção only) |

JS coverage is highly uneven: `transporte` almost as well-covered as mid-tier HTML seções,
while `eletricidade-gas-agua` and `informacao-comunicacao` never had a single hierarchy page discovered.

**JS seções with ZERO Googlebot hierarchy hits (depth 3+) as of day 2:**
industrias-extrativas, eletricidade-gas-agua, informacao-comunicacao, atividades-imobiliarias,
atividades-administrativas, educacao, servicos-domesticos → 7 of 10 JS seções completely invisible to Googlebot.

**Time to first JS hierarchy hit after launch:**

| Bot | Hours after launch |
|-----|-------------------|
| GoogleOther | 0.9h |
| Googlebot | 9.9h |

**Discovery velocity (new unique pages/day):**

| Bot | Group | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 | Day 6 | Day 7 |
|-----|-------|-------|-------|-------|-------|-------|-------|-------|
| GoogleOther | HTML | 68 | 293 | 279 | 26 | 13 | 5 | 2 |
| GoogleOther | JS | 9 | 72 | 72 | 9 | 4 | 1 | 0* |
| Googlebot | HTML | 5 | 22 | 9 | 1 | 2 | 0 | 0 |
| Googlebot | JS | 0 | 5 | 2 | 0 | 0 | 0 | +1 new |
| GPTBot | HTML | 759 | 0 (stopped) | 0 | 0 | 0 | 0 | 0 |
| ClaudeBot | HTML | 11 | 759 | 0 (stopped) | 0 |
| ClaudeBot | JS | 0 | 0 | 0 (never reached depth 3+) | 0 |
| ChatGPT-User | HTML | 0 | 0 | 2 | 2 |
| ChatGPT-User | JS | 0 | 0 | 0 | 0 |

**Note on HTML undercrawling:** `administracao-publica` (HTML group, letter O) only reached depth 2 on day 2 — Googlebot hasn't gone deep there either. Not all HTML seções are equally crawled. This matters for the final comparison: measure coverage ratios across matched seção sizes, not raw page counts.

---

### Day 3 — 2026-05-31

**Coverage gap (unique pages, Google combined):**

| Bot | HTML pages | JS pages | JS/HTML ratio | vs Day 2 |
|-----|-----------|---------|--------------|---------|
| Googlebot | 36 | 8 | 22% | ↓ from 25% |
| GoogleOther | 495 | 150 | 30% | ↑ from 26% |

GoogleOther gap closing consistently. Googlebot small sample makes ratio noisy.

**JS execution signal (depth 3+):**

| Bot | HTML d3/d4/d5 | JS d3/d4/d5 | Executes JS? |
|-----|--------------|-------------|--------------|
| Googlebot | 4/7/25 | 2/3/3 | **YES** |
| GoogleOther | 105/253/467 | 36/68/96 | **YES** |
| ChatGPT-User | 0/1/4 | **0/0/0** | **NO** |

**Per-seção breakdown (Google combined, day 3):**

| Seção | Group | Pages | Max depth | Change from day 2 |
|-------|-------|-------|-----------|------------------|
| industrias-de-transformacao | HTML | 366 | 5 | +173 |
| agricultura | HTML | 47 | 5 | unchanged |
| atividades-profissionais | HTML | 26 | 5 | +11 |
| outras-atividades-de-servicos | HTML | 21 | 5 | +4 |
| comercio | HTML | 15 | 5 | +7 |
| financeiro-seguros | HTML | 5 | 5 | unchanged |
| alojamento-alimentacao | HTML | 5 | 5 | unchanged |
| saude-servicos-sociais | HTML | 4 | 5 | +1 |
| agua-esgoto-residuos | HTML | 3 | 5 | unchanged |
| organismos-internacionais | HTML | 2 | 3 | unchanged |
| administracao-publica | HTML | 1 | 2 | unchanged |
| transporte | JS | 52 | 5 | +16 |
| construcao | JS | 32 | 5 | +18 |
| industrias-extrativas | JS | 22 | **5** | +18, depth 3→5 |
| educacao | JS | 14 | **5** | +12, depth 3→5 |
| artes-cultura-esporte | JS | 13 | 5 | +3 |
| atividades-administrativas | JS | 7 | 5 | unchanged |
| atividades-imobiliarias | JS | 6 | **5** | +4, depth 3→5 |
| servicos-domesticos | JS | 2 | 3 | unchanged |
| eletricidade-gas-agua | JS | 1 | 2 | **stuck at seção** |
| informacao-comunicacao | JS | 1 | 2 | **stuck at seção** |

3 JS seções broke through to depth 5 between day 2 and day 3 (industrias-extrativas, educacao, atividades-imobiliarias). 2 remain completely stuck.

**JS discovery velocity stabilizing:**
GoogleOther JS: 72 new pages on both day 2 AND day 3 — consistent pace.
HTML discovery slowing (293 → 279). JS/HTML ratio will keep improving as HTML saturates faster.

**New bot: ChatGPT-User** (ChatGPT browsing plugin). Appeared day 3, HTML pages only (depth 4-5), zero JS pages. Confirms no JS execution — same behavior as GPTBot.

---

### Day 4 — 2026-06-01 (plateau)

**Coverage gap — frozen:**

| Bot | HTML pages | JS pages | JS/HTML ratio | vs Day 3 |
|-----|-----------|---------|--------------|---------|
| Googlebot | 36 | 8 | 22% | unchanged |
| GoogleOther | 498 | 151 | 30.3% | +3 HTML, +1 JS |

**Discovery velocity collapsed:**

| Bot | Group | Day 3 | Day 4 |
|-----|-------|-------|-------|
| GoogleOther | HTML | 279 | 24 (−91%) |
| GoogleOther | JS | 72 | 9 (−87%) |
| Googlebot | HTML | 9 | 1 |
| Googlebot | JS | 2 | 0 |

Google's initial crawl burst lasted 3 days (days 1–3). Day 4 = maintenance crawl mode. Discovery rate dropped ~90% for both HTML and JS groups equally. The ~30% JS/HTML coverage gap locked in at the end of the burst.

**Interpretation:** Google allocates a crawl budget for new sites. It spent most of that budget in the first 3 days, exploring HTML links aggressively. JS-linked pages received ~30% of the crawl attention HTML pages got. After the burst, recrawl frequency takes over — slower and less likely to discover new pages.

The gap is now stable. It will close only if:
1. Google returns for a second exploration burst (possible after indexing confirms value)
2. External links create new entry points to JS-group pages
3. Recrawl of seção pages re-renders JS and queues more hierarchy pages

---

### Day 5 — 2026-06-03 (stable + new bot)

**Coverage gap — unchanged:**

| Bot | HTML pages | JS pages | JS/HTML ratio |
|-----|-----------|---------|--------------|
| Googlebot | 36 | 8 | 22% |
| GoogleOther | 501 | 152 | 30.3% |

**Discovery fully winding down (GoogleOther):**

| Day | HTML new | JS new |
|-----|---------|-------|
| 3 | 279 | 72 |
| 4 | 26 | 9 |
| 5 | 13 | 4 |
| 6 (partial) | 4 | 0 |

**New bot: OAI-SearchBot** (OpenAI SearchGPT crawler) — appeared day 4 (2026-06-01).
- Hit all 11 HTML seção pages and all 10 JS seção pages (depth 2 only)
- Zero depth 3+ hits — no JS execution confirmed
- Identical behavior to GPTBot: crawled site index → found seção URLs → stopped

```
OAI-SearchBot depth breakdown: depth 2 HTML=11, depth 2 JS=10. No depth 3+.
```

**Executes JS? NO.** OAI-SearchBot joins GPTBot, ClaudeBot, ChatGPT-User as JS-blind bots.

**Updated bot JS execution summary (day 5):**

| Bot | Executes JS | Notes |
|-----|------------|-------|
| Googlebot | ✅ YES | ~22% JS coverage vs HTML |
| GoogleOther | ✅ YES | ~30% JS coverage vs HTML |
| GPTBot | ❌ NO | One pass day 1, stopped |
| ClaudeBot | ❌ NO | One pass day 2, stopped |
| ChatGPT-User | ❌ NO | Browsing plugin, HTML only |
| OAI-SearchBot | ❌ NO | One pass day 4, depth 2 only |
| Bingbot | ❓ | Only 1 hit total |

---

### Discovery speed: HTML vs JS (Google combined, day 5)

How many hours after site launch did Google first discover each page, by depth and link type:

| Depth | HTML avg | JS avg | JS lag | JS lag % | HTML min | JS min |
|-------|---------|-------|--------|---------|---------|-------|
| 3 (divisão) | 6.8h | 8.6h | +1.8h | +26% | 1h | 1h |
| 4 (grupo) | 15.8h | 20.0h | +4.2h | +27% | 1h | 2h |
| 5 (classe) | 25.3h | 29.8h | +4.5h | +18% | 1h | 4h |

**JS pages discovered 20–27% later than HTML pages at every depth level.**

Lag compounds with depth: Google must crawl the parent JS page, render its script, queue discovered child URLs, then schedule those children — adding ~1.8–4.5h overhead per level vs HTML links that are immediately parseable.

The **minimum hours** column shows the floor is higher for JS: HTML pages at any depth were discovered within 1h of launch (best case), but JS pages at depth 5 had a 4h floor even in the best case.

**Query:**
```sql
select
  link_type,
  length(path) - length(replace(path, '/', '')) - 1 as depth,
  round(avg(extract(epoch from (first_hit - '2026-05-29 21:00:00+00'))/3600), 1) as avg_hours_to_discovery,
  min(extract(epoch from (first_hit - '2026-05-29 21:00:00+00'))/3600)::int as min_hours,
  max(extract(epoch from (first_hit - '2026-05-29 21:00:00+00'))/3600)::int as max_hours,
  count(*) as pages
from (
  select path, link_type, min(crawled_at) as first_hit
  from crawl_logs
  where bot_name in ('Googlebot', 'GoogleOther')
    and link_type is not null
    and length(path) - length(replace(path, '/', '')) - 1 >= 3
  group by path, link_type
) t
group by link_type, depth
order by link_type, depth;
```

---

### Recrawl frequency after discovery: HTML vs JS (Google combined, day 5)

After first discovery, how quickly does Google return to recrawl:

| Depth | HTML avg recrawl | JS avg recrawl | Diff |
|-------|-----------------|---------------|------|
| 3 (divisão) | 11.1h | **8.1h** | JS 27% faster |
| 4 (grupo) | 13.5h | 14.2h | roughly equal |
| 5 (classe) | 14.8h | **11.2h** | JS 24% faster |

**JS pages are recrawled faster than HTML pages.** Consistent with day 2 observation (GoogleOther HTML 6.6h vs JS 4.4h lag).

**Complete JS penalty picture:**

| Dimension | HTML | JS | Verdict |
|-----------|------|-----|---------|
| First discovery | faster (6.8–25.3h avg) | slower (+20–27%) | JS loses |
| Coverage (pages found) | 100% baseline | ~30% | JS loses |
| Recrawl frequency | baseline | **25% faster** | JS wins |

**Conclusion:** JavaScript links hurt **initial discovery and coverage**, not ongoing maintenance. Once Google finds a JS-linked page, it treats it as a higher-priority recrawl target — possibly because its rendering pipeline flags JS-discovered pages for re-verification to confirm content stability.

Practical implication: the main SEO risk of JS links is that many pages never get discovered at all during the initial crawl burst (~70% miss rate). But for the minority that do get found, they receive the same or better ongoing crawl attention as HTML-linked pages.

**Query:**
```sql
select
  link_type,
  depth,
  round(avg(extract(epoch from gap)/3600), 1) as avg_hours_to_recrawl,
  count(*) as recrawled_pages
from (
  select
    link_type,
    path,
    length(path) - length(replace(path, '/', '')) - 1 as depth,
    lead(crawled_at) over (partition by bot_name, path order by crawled_at) - crawled_at as gap
  from crawl_logs
  where bot_name in ('Googlebot', 'GoogleOther')
    and link_type is not null
    and length(path) - length(replace(path, '/', '')) - 1 >= 3
) t
where gap is not null
group by link_type, depth
order by link_type, depth;
```

---

### Day 6 — 2026-06-04 (near-zero activity)

**Coverage gap — day 6 snapshot:**

| Bot | HTML | JS | Ratio | vs Day 5 |
|-----|------|----|-------|---------|
| Googlebot | 36 | 8 | 22% | unchanged |
| GoogleOther | 502 | 152 | 30.3% | +1 HTML only |

**Day 7 — 2026-06-05 (marginal activity):**
Googlebot JS: 8 → **9** unique pages (+1 new JS hierarchy page discovered).
GoogleOther: 504 HTML (+2), 152 JS (unchanged) → 30.2%.
Velocity query shows 3 JS paths crawled by GoogleOther today but coverage unchanged — recrawls of known pages, not new discovery.
`*` GoogleOther JS day 7 velocity = 3 crawls but 0 new unique pages.

**Velocity essentially zero:**
GoogleOther: 5 HTML / 0 JS new pages on day 5, 1 HTML / 0 JS on day 6.
Googlebot: 2 HTML new on day 5, 0 on day 6.

**Small depth movements (GoogleOther):** HTML depth 5: 470→487 (+17). JS depth 4: 68→70, depth 5: 96→99. Marginal recrawls, no new seção discovery.

**Googlebot depth 4 HTML:** 7→10 (+3 grupo pages found).

**ChatGPT-User depth 5 HTML:** 8→20 — browsing plugin triggered by real user searches hitting leaf pages. Still zero JS pages. Confirms real-world behavior: ChatGPT users searching for CNAE terms will trigger crawl of HTML-linked pages but never reach JS-linked ones.

**Status:** Experiment in maintenance phase. Gap stable at ~30%. Next meaningful check: day 14 to see if Google initiates second exploration burst.

---

### Day 8 — 2026-06-06

**Coverage gap — day 8 snapshot:**

| Bot | HTML | JS | Ratio | vs Day 7 |
|-----|------|----|-------|---------|
| Googlebot | 36 | 9 | 25% | unchanged |
| GoogleOther | 504 | 152 | 30.2% | unchanged |

**New pages discovered today:**

| Bot | Path | Link type | Depth | Signal? |
|-----|------|-----------|-------|---------|
| Googlebot | `/cnae/artes-cultura-esporte/` | js | 2 (seção) | NO — seção level only |
| GoogleOther | `/cnae/transporte/52/` | js | 3 (divisão) | YES — JS execution confirmed |

Googlebot's only activity today was a depth-2 seção page — not experiment signal.
GoogleOther continues slow trickle of JS hierarchy pages (1 new depth-3 page).

**Notable: Googlebot HTML silent since 2026-06-03 (3 days).** Googlebot's last HTML-group hit was June 3. For the past 3 days its only activity on this site has been JS pages. This is consistent with the recrawl-frequency finding (JS pages recrawled faster after discovery) — Googlebot may be prioritizing JS pages for re-rendering verification.

**Bingbot update (now 31 total hits):**

| link_type | hits | unique_pages |
|-----------|------|-------------|
| html | 21 | 21 |
| js | 10 | 10 |
| null | 51 | 43 |

HTML 21 = 11 seção + 10 divisão pages → Bingbot went to depth 3 for HTML.  
JS 10 = exactly the 10 JS seção pages → depth 2 only.  
**Conclusion: Bingbot does NOT execute JavaScript.** Followed HTML links into divisão level, stopped at seção level for JS group. Now joins the JS-blind list.

**OAI-SearchBot confirmation (11 HTML / 10 JS):**  
Both counts match exactly the seção totals (11 HTML seções, 10 JS seções). Depth 2 only for both groups. Confirmed no JS execution — behavior identical to GPTBot.

**ClaudeBot deep crawl today:** Systematically crawled HTML hierarchy to depth 4–5 (divisão → grupo → classe). Now at 759 HTML unique pages (likely full HTML hierarchy coverage). JS pages: still 10 = all 10 seção pages, zero deeper. Confirms: ClaudeBot reads raw HTML only, never executes scripts.

**Updated bot JS execution table (day 8):**

| Bot | Executes JS | Coverage ratio | Notes |
|-----|------------|---------------|-------|
| Googlebot | ✅ YES | 25% JS vs HTML | Trickle continues, HTML silent 3 days |
| GoogleOther | ✅ YES | 30% JS vs HTML | Slow trickle (+1 depth-3 today) |
| GPTBot | ❌ NO | ~1% (seção only) | One pass day 1, stopped |
| ClaudeBot | ❌ NO | ~1% (seção only) | Deep HTML crawl day 8, still zero JS depth 3+ |
| ChatGPT-User | ❌ NO | seção only | HTML only |
| OAI-SearchBot | ❌ NO | seção only | Confirmed depth 2 only |
| Bingbot | ❌ NO | depth 3 HTML, depth 2 JS | **Confirmed no JS execution day 8** |

**Discovery velocity — day 8 column added:**

| Bot | Group | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 | Day 6 | Day 7 | Day 8 |
|-----|-------|-------|-------|-------|-------|-------|-------|-------|-------|
| GoogleOther | HTML | 68 | 293 | 279 | 26 | 13 | 5 | 2 | 0 |
| GoogleOther | JS | 9 | 72 | 72 | 9 | 4 | 1 | 0 | +1 (d3) |
| Googlebot | HTML | 5 | 22 | 9 | 1 | 2 | 0 | 0 | 0 |
| Googlebot | JS | 0 | 5 | 2 | 0 | 0 | 0 | +1 (d2) | +1 (d2) |
| GPTBot | HTML | 759 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ClaudeBot | HTML | 11 | 759 | 0 | 0 | 0 | 0 | 0 | ~200+ |
| Bingbot | HTML | — | — | — | — | — | — | — | +21 |
| Bingbot | JS | — | — | — | — | — | — | — | +10 (d2 only) |

ClaudeBot re-crawled extensively on day 8 — went deep into HTML divisão/grupo/classe levels for the first time. Likely triggered by Anthropic's crawler re-indexing the site after earlier content stabilized.

**Gap trajectory:**
- Day 2: Googlebot 25%, GoogleOther 26%
- Day 3: Googlebot 22%, GoogleOther 30%
- Days 4–9: **Googlebot ~25%, GoogleOther ~30% — locked**

Gap has been stable for 6 days. No signs of closing.

---

### Day 9 — 2026-06-07 (flatline)

Zero new unique CNAE pages for any bot. Complete standstill.

| Bot | HTML | JS | Ratio | vs Day 8 |
|-----|------|----|-------|---------|
| Googlebot | 36 | 9 | 25% | unchanged |
| GoogleOther | 504 | 152 | 30.2% | unchanged |

Googlebot HTML last seen: 2026-06-03 (4 days silent).
Googlebot JS last seen: 2026-06-06 (3 days silent).

New bots observed (non-CNAE pages only, no experiment signal):
- **DuckDuckBot**: 4 hits, 2 null pages (likely homepage/robots.txt)
- **FacebookBot**: 2 hits, 1 null page
- **PerplexityBot**: 5→9 hits, all null pages

All newcomers stopped at surface level — no CNAE hierarchy crawl.

---

## What to look for at the end (6–8 weeks)

1. **Did the HTML vs JS coverage gap close?** → If still 25%, JS links permanently hurt coverage
2. **Did Googlebot reach all JS-group seções at all depths?** → Which subtrees were never touched?
3. **Bingbot signal** — only 6 hits so far, needs more time
4. **Cross-bot comparison final** — GPTBot/ClaudeBot never followed JS links vs Google did
5. **Verify in GSC** — do indexed page counts match crawl_log coverage ratios?
6. **Referer data** — if any JS-group depth 3+ hit ever shows a referer, document it
