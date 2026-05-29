import { describe, it, expect } from 'vitest';
import { slugify, removeDiacritics } from './slugify.js';

describe('removeDiacritics', () => {
  it('removes PT-BR accents', () => {
    expect(removeDiacritics('ação')).toBe('acao');
    expect(removeDiacritics('comércio')).toBe('comercio');
    expect(removeDiacritics('construção')).toBe('construcao');
    expect(removeDiacritics('informação e comunicação')).toBe('informacao e comunicacao');
    expect(removeDiacritics('eletricidade')).toBe('eletricidade');
  });

  it('handles cedilla', () => {
    expect(removeDiacritics('serviço')).toBe('servico');
    expect(removeDiacritics('Ç')).toBe('C');
  });

  it('handles uppercase', () => {
    expect(removeDiacritics('AÇÃO')).toBe('ACAO');
  });
});

describe('slugify', () => {
  it('lowercases and removes diacritics', () => {
    expect(slugify('Comércio')).toBe('comercio');
    expect(slugify('Informação e Comunicação')).toBe('informacao-e-comunicacao');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world');
  });

  it('collapses multiple separators', () => {
    expect(slugify('foo  bar--baz')).toBe('foo-bar-baz');
  });

  it('strips leading/trailing hyphens', () => {
    expect(slugify('  foo  ')).toBe('foo');
  });

  it('handles section names', () => {
    expect(slugify('Agricultura, pecuária, produção florestal, pesca e aquicultura')).toBe(
      'agricultura-pecuaria-producao-florestal-pesca-e-aquicultura'
    );
  });
});
