import { SECAO_BY_LETRA, SECAO_BY_SLUG } from './constants.js';

/** '4711-3/02' → '4711-3-02' (URL-safe) */
export function formatCodigoForUrl(codigo: string): string {
  return codigo.replace(/\//g, '-');
}

/** '4711-3-02' → '4711-3/02' (display with slash) */
export function formatCodigoForDisplay(codigoSlug: string): string {
  // Matches the last hyphen before the 2-digit suffix
  return codigoSlug.replace(/-(\d{2})$/, '/$1');
}

/** '4711-3/02' → '4711302' (digits only) */
export function codigoToNumerico(codigo: string): string {
  return codigo.replace(/[^0-9]/g, '');
}

/**
 * Parse a subclasse code into its hierarchy components.
 * Input: '4711-3/02' or '4711-3-02'
 */
export function parseCodigo(codigo: string): {
  divisao: string;
  grupo: string;
  classe: string;
  subclasse: string;
} {
  const normalized = codigo.replace(/[/-]/g, '');
  if (normalized.length < 7) {
    throw new Error(`Invalid CNAE codigo: ${codigo}`);
  }
  return {
    divisao: normalized.slice(0, 2),
    grupo: normalized.slice(0, 3),
    classe: normalized.slice(0, 4) + '-' + normalized[4],
    subclasse: normalized.slice(0, 4) + '-' + normalized[4] + '/' + normalized.slice(5, 7),
  };
}

export interface BreadcrumbLevel {
  label: string;
  href: string;
}

export function getHierarchyPath(
  secaoSlug: string,
  divisaoCodigo: string,
  grupoCodigo: string,
  classeCodigo: string,
  codigoSlug: string,
  labels: {
    secaoNomeCurto: string;
    divisaoNome: string;
    grupoNome: string;
    classeNome: string;
    subclasseDescricao: string;
  }
): BreadcrumbLevel[] {
  return [
    { label: 'Início', href: '/' },
    { label: 'CNAE', href: '/cnae/' },
    { label: labels.secaoNomeCurto, href: `/cnae/${secaoSlug}/` },
    { label: divisaoCodigo, href: `/cnae/${secaoSlug}/${divisaoCodigo}/` },
    { label: grupoCodigo, href: `/cnae/${secaoSlug}/${divisaoCodigo}/${grupoCodigo}/` },
    {
      label: classeCodigo,
      href: `/cnae/${secaoSlug}/${divisaoCodigo}/${grupoCodigo}/${formatCodigoForUrl(classeCodigo)}/`,
    },
    { label: codigoSlug, href: `/cnae/${codigoSlug}/` },
  ];
}

export function getSecaoByLetra(letra: string) {
  return SECAO_BY_LETRA.get(letra);
}

export function getSecaoBySlug(slug: string) {
  return SECAO_BY_SLUG.get(slug);
}

/** Truncate a string for SEO title — tries to break at word boundary */
export function truncateForTitle(str: string, maxLen = 50): string {
  if (str.length <= maxLen) return str;
  const cut = str.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 30 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

/** Generate SEO title for subclasse page */
export function subclassePageTitle(codigo: string, descricao: string): string {
  const display = formatCodigoForDisplay(formatCodigoForUrl(codigo));
  const short = truncateForTitle(descricao, 38);
  return `CNAE ${display} — ${short} | CNAE Brasil`;
}

/** Generate meta description for subclasse page */
export function subclasseMetaDescription(
  codigo: string,
  descricao: string,
  meiPermitido: boolean
): string {
  const display = formatCodigoForDisplay(formatCodigoForUrl(codigo));
  const meiStr = meiPermitido ? 'Permitido para MEI.' : 'Não permitido para MEI.';
  const base = `CNAE ${display}: ${descricao}. ${meiStr} Veja exemplos, regime tributário e licenças exigidas.`;
  return base.length > 160 ? base.slice(0, 157) + '…' : base;
}
