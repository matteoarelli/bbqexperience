import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('converte heading markdown in <h2>', () => {
    expect(renderMarkdown('## Titolo')).toContain('<h2>Titolo</h2>');
  });

  it('converte bold in <strong>', () => {
    expect(renderMarkdown('Testo **importante**.')).toContain('<strong>importante</strong>');
  });

  it('converte tabelle GFM', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |';
    const html = renderMarkdown(md);
    expect(html).toContain('<table>');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>1</td>');
  });

  it('lascia HTML puro inalterato (a parte normalizzazioni)', () => {
    const html = '<p>Un <a href="/x/">link</a>.</p>';
    expect(renderMarkdown(html)).toContain('<a href="/x/">link</a>');
  });

  it('rimuove anchor annidati mantenendo href interno', () => {
    const broken = '<a href="/outer/"><a href="/inner/">Click</a></a>';
    const out = renderMarkdown(broken);
    expect(out).not.toMatch(/<a [^>]+>\s*<a /);
    expect(out).toContain('<a href="/inner/">Click</a>');
  });

  it('rimuove soft hyphen invisibili', () => {
    expect(renderMarkdown('deber\u00ADias')).not.toContain('\u00AD');
    expect(renderMarkdown('deber\u00ADias')).toContain('deberias');
  });

  it('gestisce input vuoto/null', () => {
    expect(renderMarkdown(null)).toBe('');
    expect(renderMarkdown(undefined)).toBe('');
    expect(renderMarkdown('')).toBe('');
  });

  it('riduce [<a>testo</a>](url) a singolo anchor con href markdown (no nesting)', () => {
    const corrupted = '[<a href="/inner/">Jealous Devil</a>](/outer/)';
    const out = renderMarkdown(corrupted);
    expect(out).not.toMatch(/<a [^>]+>\s*<a /);
    expect(out).toContain('<a href="/outer/">Jealous Devil</a>');
  });

  it('riduce [<a>parte1</a> parte2](url) preservando il testo extra', () => {
    const corrupted = '[<a href="/x/">Smoked baby</a> back ribs](/en/recipes/smoked-baby-back-ribs-honey-glaze/)';
    const out = renderMarkdown(corrupted);
    expect(out).not.toMatch(/<a [^>]+>\s*<a /);
    expect(out).toContain('Smoked baby back ribs');
    expect(out).toContain('href="/en/recipes/smoked-baby-back-ribs-honey-glaze/"');
  });
});
