import { next } from '@vercel/edge';
import { HTML_SECOES, JS_SECOES } from './experiment.config.js';

export const config = {
  matcher: ['/(.*)', '/'],
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

// Order matters — more specific substrings first
const BOT_PATTERNS: Array<{ match: string; name: string }> = [
  // Google
  { match: 'googlebot',            name: 'Googlebot' },
  { match: 'googleother',          name: 'GoogleOther' },
  { match: 'google-inspectiontool', name: 'Google-InspectionTool' },
  { match: 'apis-google',          name: 'APIs-Google' },
  // Microsoft / Bing
  { match: 'bingbot',              name: 'Bingbot' },
  // OpenAI
  { match: 'gptbot',               name: 'GPTBot' },
  { match: 'oai-searchbot',        name: 'OAI-SearchBot' },
  { match: 'chatgpt-user',         name: 'ChatGPT-User' },
  // Anthropic
  { match: 'claudebot',            name: 'ClaudeBot' },
  { match: 'anthropic-ai',         name: 'Anthropic-AI' },
  // Other AI
  { match: 'perplexitybot',        name: 'PerplexityBot' },
  { match: 'cohere-ai',            name: 'Cohere-AI' },
  { match: 'bytespider',           name: 'ByteSpider' },
  // Search engines
  { match: 'applebot',             name: 'Applebot' },
  { match: 'duckduckbot',          name: 'DuckDuckBot' },
  { match: 'yandexbot',            name: 'YandexBot' },
  // Social
  { match: 'facebookexternalhit',  name: 'FacebookBot' },
  { match: 'twitterbot',           name: 'TwitterBot' },
  // SEO tools
  { match: 'ahrefsbot',            name: 'AhrefsBot' },
  { match: 'semrushbot',           name: 'SemrushBot' },
  { match: 'mj12bot',              name: 'MJ12bot' },
];

// Fallback: catch any unknown crawler so nothing slips through
const BOT_FALLBACK = /bot|crawler|spider/i;

function detectBot(ua: string): string | null {
  const lower = ua.toLowerCase();
  for (const { match, name } of BOT_PATTERNS) {
    if (lower.includes(match)) return name;
  }
  if (BOT_FALLBACK.test(ua)) return 'UnknownBot';
  return null;
}

// rDNS verification only reliable for Googlebot and Bingbot
async function verifyBotIp(ip: string, botName: string): Promise<boolean> {
  if (botName !== 'Googlebot' && botName !== 'Bingbot') return false;
  try {
    const reversed = ip.split('.').reverse().join('.') + '.in-addr.arpa';
    const ptrRes = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(reversed)}&type=PTR`,
    );
    const ptrData = (await ptrRes.json()) as { Answer?: Array<{ data: string }> };
    const hostname = ptrData.Answer?.[0]?.data?.replace(/\.$/, '');
    if (!hostname) return false;

    const validSuffixes =
      botName === 'Googlebot'
        ? ['.googlebot.com', '.google.com']
        : ['.search.msn.com'];

    if (!validSuffixes.some((s) => hostname.endsWith(s))) return false;

    const aRes = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`,
    );
    const aData = (await aRes.json()) as { Answer?: Array<{ data: string }> };
    return aData.Answer?.[0]?.data === ip;
  } catch {
    return false;
  }
}

async function logCrawl(
  path: string,
  linkType: string | null,
  userAgent: string,
  ip: string,
  botName: string,
): Promise<void> {
  const verified = await verifyBotIp(ip, botName);
  await fetch(`${SUPABASE_URL}/rest/v1/crawl_logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      path,
      link_type: linkType,
      user_agent: userAgent,
      ip,
      bot_name: botName,
      verified,
    }),
  });
}

export default function middleware(
  request: Request,
  context: { waitUntil: (p: Promise<unknown>) => void },
) {
  try {
    const ua = request.headers.get('user-agent') ?? '';
    const botName = detectBot(ua);
    if (!botName) return next();

    const { pathname } = new URL(request.url);
    const afterCnae = pathname.replace(/^\/cnae\//, '').replace(/\/$/, '');
    const secaoSlug = afterCnae.split('/')[0];

    let linkType: string | null = null;
    if (secaoSlug) {
      if ((HTML_SECOES as readonly string[]).includes(secaoSlug)) linkType = 'html';
      else if ((JS_SECOES as readonly string[]).includes(secaoSlug)) linkType = 'js';
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      '';
    context.waitUntil(logCrawl(pathname, linkType, ua, ip, botName));
  } catch {
    // never block the response
  }

  return next();
}
