export interface Crumb {
  label: string;
  href: string;
  current?: boolean;
}

export function homeCrumb(): Crumb {
  return { label: 'Início', href: '/' };
}

export function cnaeCrumb(): Crumb {
  return { label: 'CNAE', href: '/cnae/' };
}

export function secaoCrumb(slug: string, nomeCurto: string): Crumb {
  return { label: nomeCurto, href: `/cnae/${slug}/` };
}

export function divisaoCrumb(secaoSlug: string, codigo: string): Crumb {
  return { label: codigo, href: `/cnae/${secaoSlug}/${codigo}/` };
}

export function grupoCrumb(secaoSlug: string, divisaoCodigo: string, codigo: string): Crumb {
  return { label: codigo, href: `/cnae/${secaoSlug}/${divisaoCodigo}/${codigo}/` };
}

export function classeCrumb(
  secaoSlug: string,
  divisaoCodigo: string,
  grupoCodigo: string,
  codigo: string
): Crumb {
  const slugCodigo = codigo.replace(/\//g, '-');
  return {
    label: codigo,
    href: `/cnae/${secaoSlug}/${divisaoCodigo}/${grupoCodigo}/${slugCodigo}/`,
  };
}

export function subclasseCrumb(codigoSlug: string): Crumb {
  return { label: codigoSlug, href: `/cnae/${codigoSlug}/`, current: true };
}
