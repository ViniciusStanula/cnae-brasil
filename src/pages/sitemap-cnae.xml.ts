import { getCollection } from 'astro:content';
import { urlsetResponse } from '../lib/sitemap.js';

export async function GET() {
  const entries = await getCollection('cnae');

  return urlsetResponse(
    entries.map((e) => ({
      path: `/cnae/${e.data.codigo_slug}/`,
      lastmod: e.data.last_reviewed,
    }))
  );
}
