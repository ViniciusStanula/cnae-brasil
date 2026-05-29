import type { CnaeEntry } from '../content.config.js';
import { formatCodigoForDisplay } from './cnae-helpers.js';

export interface SearchItem {
  slug: string;
  codigo: string;
  descricao: string;
  label: string;
}

export function buildSearchIndex(entries: CnaeEntry[]): SearchItem[] {
  return entries.map((e) => ({
    slug: e.codigo_slug,
    codigo: e.codigo,
    descricao: e.descricao_oficial,
    label: `${formatCodigoForDisplay(e.codigo_slug)} — ${e.descricao_oficial}`,
  }));
}
