import { urlsetResponse } from '../lib/sitemap.js';

export async function GET() {
  return urlsetResponse([
    { path: '/' },
    { path: '/cnae/' },
    { path: '/buscar/' },
    { path: '/sobre/' },
    { path: '/metodologia/' },
  ]);
}
