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

Conclusion for GPTBot: **does not execute JavaScript**. It followed HTML links deep into the HTML group but stopped at the seção level for the JS group.

**Googlebot** hit `robots.txt` and homepage on 2026-05-29. Full crawl pending.

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
select path, bot_name, referer, crawled_at
from crawl_logs
where link_type = 'js'
  and path like '%/%/%'
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
where bot_name in ('Googlebot', 'GoogleOther')
  and link_type is not null
group by bot_name, link_type
order by bot_name, link_type;
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

---

## What to look for at the end (6–8 weeks)

1. **Did the HTML vs JS coverage gap close?** → If still 25%, JS links permanently hurt coverage
2. **Did Googlebot reach all JS-group seções at all depths?** → Which subtrees were never touched?
3. **Bingbot signal** — only 6 hits so far, needs more time
4. **Cross-bot comparison final** — GPTBot/ClaudeBot never followed JS links vs Google did
5. **Verify in GSC** — do indexed page counts match crawl_log coverage ratios?
6. **Referer data** — if any JS-group depth 3+ hit ever shows a referer, document it
