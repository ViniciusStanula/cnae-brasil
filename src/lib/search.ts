import type { CnaeEntry } from '../content.config.js';
import { formatCodigoForDisplay } from './cnae-helpers.js';

export interface SearchItem {
  slug: string;
  codigo: string;
  codigoNumerico: string;
  descricao: string;
  label: string;
}

export function buildSearchIndex(entries: CnaeEntry[]): SearchItem[] {
  return entries.map((e) => ({
    slug: e.codigo_slug,
    codigo: e.codigo,
    codigoNumerico: e.codigo_numerico,
    descricao: e.descricao_oficial,
    // slug first so plain number input (e.g. "4711") matches datalist suggestions
    label: `${e.codigo_slug} — ${formatCodigoForDisplay(e.codigo_slug)} — ${e.descricao_oficial}`,
  }));
}
