import { urlsetResponse } from '../lib/sitemap.js';

export async function GET() {
  return urlsetResponse([
    { path: '/mei/' },
    { path: '/mei/atividades-permitidas/' },
    { path: '/mei/atividades-proibidas/' },
  ]);
}
