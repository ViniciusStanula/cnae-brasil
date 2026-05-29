import { describe, it, expect } from 'vitest';
import {
  formatCodigoForUrl,
  formatCodigoForDisplay,
  codigoToNumerico,
  parseCodigo,
  truncateForTitle,
} from './cnae-helpers.js';

describe('formatCodigoForUrl', () => {
  it('replaces slash with hyphen', () => {
    expect(formatCodigoForUrl('4711-3/02')).toBe('4711-3-02');
    expect(formatCodigoForUrl('9602-5/01')).toBe('9602-5-01');
  });

  it('leaves already-safe codes alone', () => {
    expect(formatCodigoForUrl('4711-3-02')).toBe('4711-3-02');
  });
});

describe('formatCodigoForDisplay', () => {
  it('converts slug back to display format', () => {
    expect(formatCodigoForDisplay('4711-3-02')).toBe('4711-3/02');
    expect(formatCodigoForDisplay('9602-5-01')).toBe('9602-5/01');
  });
});

describe('codigoToNumerico', () => {
  it('strips non-digits', () => {
    expect(codigoToNumerico('4711-3/02')).toBe('4711302');
    expect(codigoToNumerico('0111-3/01')).toBe('0111301');
  });
});

describe('parseCodigo', () => {
  it('parses a valid code', () => {
    const result = parseCodigo('4711-3/02');
    expect(result.divisao).toBe('47');
    expect(result.grupo).toBe('471');
    expect(result.classe).toBe('4711-3');
    expect(result.subclasse).toBe('4711-3/02');
  });

  it('works with slug format', () => {
    const result = parseCodigo('4711-3-02');
    expect(result.divisao).toBe('47');
  });
});

describe('truncateForTitle', () => {
  it('returns short strings unchanged', () => {
    expect(truncateForTitle('Short title', 50)).toBe('Short title');
  });

  it('truncates at word boundary', () => {
    const long = 'This is a very long description that exceeds fifty characters limit';
    const result = truncateForTitle(long, 50);
    expect(result.length).toBeLessThanOrEqual(51);
    expect(result.endsWith('…')).toBe(true);
  });
});
