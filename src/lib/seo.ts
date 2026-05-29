import { SITE_NAME, SITE_URL } from './constants.js';

export interface SeoProps {
  title: string;
  description: string;
  canonical: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  robots?: string;
  noindex?: boolean;
}

export function buildCanonical(path: string): string {
  const clean = path.endsWith('/') ? path : path + '/';
  return `${SITE_URL}${clean}`;
}

export function buildPageTitle(title: string): string {
  if (title.includes(SITE_NAME)) return title;
  return `${title} | ${SITE_NAME}`;
}

export function truncateDescription(desc: string, max = 160): string {
  if (desc.length <= max) return desc;
  return desc.slice(0, max - 1).trimEnd() + '…';
}
