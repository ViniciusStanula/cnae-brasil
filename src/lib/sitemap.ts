import { SITE_URL } from './constants.js';

export interface SitemapEntry {
  path: string;
  lastmod?: string;
}

const XML_HEADERS = { 'Content-Type': 'application/xml; charset=utf-8' };

export function urlsetResponse(entries: SitemapEntry[]): Response {
  const urls = entries
    .map(({ path, lastmod }) => {
      const mod = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
      return `  <url><loc>${SITE_URL}${path}</loc>${mod}</url>`;
    })
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
    { headers: XML_HEADERS }
  );
}

export function sitemapIndexResponse(paths: string[]): Response {
  const maps = paths.map((p) => `  <sitemap><loc>${SITE_URL}${p}</loc></sitemap>`).join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${maps}
</sitemapindex>
`,
    { headers: XML_HEADERS }
  );
}
