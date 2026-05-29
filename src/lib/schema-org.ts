import { SITE_NAME, SITE_URL, CNAE_VERSION } from './constants.js';
import { formatCodigoForDisplay } from './cnae-helpers.js';
import type { CnaeEntry } from '../content.config.js';

interface BreadcrumbItem {
  label: string;
  href: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: `${SITE_URL}${item.href}`,
    })),
  };
}

export function buildWebsiteJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: 'Consulta de códigos CNAE com informações sobre MEI, Simples Nacional e abertura de empresa',
    inLanguage: 'pt-BR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/buscar/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildDefinedTermJsonLd(entry: CnaeEntry): object {
  const display = formatCodigoForDisplay(entry.codigo_slug);
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: `CNAE ${display}`,
    description: entry.descricao_plana,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: `CNAE ${CNAE_VERSION}`,
      url: 'https://concla.ibge.gov.br/estrutura/concla/classificacao/cnae-2-3',
    },
    url: `${SITE_URL}/cnae/${entry.codigo_slug}/`,
  };
}

export function buildFaqJsonLd(
  faqs: Array<{ question: string; answer: string }>
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function buildCollectionPageJsonLd(
  name: string,
  description: string,
  url: string,
  items: Array<{ name: string; url: string }>
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: `${SITE_URL}${url}`,
    inLanguage: 'pt-BR',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        url: `${SITE_URL}${item.url}`,
      })),
    },
  };
}

export function buildArticleJsonLd(
  title: string,
  description: string,
  url: string,
  datePublished: string
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: `${SITE_URL}${url}`,
    inLanguage: 'pt-BR',
    datePublished,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}
