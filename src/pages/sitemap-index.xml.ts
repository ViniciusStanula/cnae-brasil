import { sitemapIndexResponse } from '../lib/sitemap.js';

export async function GET() {
  return sitemapIndexResponse([
    '/sitemap-pages.xml',
    '/sitemap-hierarchy.xml',
    '/sitemap-cnae.xml',
    '/sitemap-mei.xml',
  ]);
}
