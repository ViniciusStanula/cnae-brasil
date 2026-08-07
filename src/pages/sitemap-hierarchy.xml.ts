import { getCollection } from 'astro:content';
import { urlsetResponse } from '../lib/sitemap.js';
import { formatCodigoForUrl } from '../lib/cnae-helpers.js';

export async function GET() {
  const entries = await getCollection('cnae');
  const paths = new Set<string>();

  for (const { data } of entries) {
    const secao = data.secao.slug;
    const divisao = data.divisao.codigo;
    const grupo = data.grupo.codigo;
    const classe = formatCodigoForUrl(data.classe.codigo);

    paths.add(`/cnae/${secao}/`);
    paths.add(`/cnae/${secao}/${divisao}/`);
    paths.add(`/cnae/${secao}/${divisao}/${grupo}/`);
    paths.add(`/cnae/${secao}/${divisao}/${grupo}/${classe}/`);
  }

  return urlsetResponse([...paths].sort().map((path) => ({ path })));
}
