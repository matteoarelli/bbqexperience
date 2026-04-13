/**
 * Renderer markdown per contenuti CMS.
 *
 * Gestisce contenuti che possono essere:
 * - Markdown puro (## headings, **bold**, tabelle GFM)
 * - HTML puro (<p>, <h2>, <a href>)
 * - Mix dei due (es. paragrafi markdown con <a> inline iniettati dal SEO optimizer)
 *
 * Inoltre normalizza pattern corrotti tipici prodotti dal seo_optimizer.py:
 * - <a> annidati: `<a href="x"><a href="y">testo</a></a>` -> `<a href="y">testo</a>`
 * - Soft hyphen U+00AD residui da traduzioni automatiche
 */
import { marked } from 'marked';

marked.setOptions({
  gfm: true,        // tabelle, strikethrough, autolinks
  breaks: false,    // newline -> <br> solo se due spazi (comportamento standard)
});

const SOFT_HYPHEN_RE = /\u00AD/g;

/**
 * Rimuove tag <a> annidati mantenendo l'href piu interno (di solito quello
 * inserito per ultimo dal SEO optimizer e quindi piu specifico/recente).
 * Esegue piu pass perche pattern profondi richiedono passi multipli.
 */
function stripNestedAnchors(html: string): string {
  let prev: string;
  let curr = html;
  let safety = 5;
  do {
    prev = curr;
    // <a ...><a ...>X</a></a> -> <a ...>X</a>  (mantiene href interno)
    curr = curr.replace(/<a\s+[^>]*>\s*(<a\s+[^>]*>)/gi, '$1');
    // Chiusure </a></a> ridondanti subito attaccate
    curr = curr.replace(/<\/a>\s*<\/a>/gi, '</a>');
    safety--;
  } while (curr !== prev && safety > 0);
  return curr;
}

/**
 * Pre-processa il contenuto grezzo: rimuove caratteri invisibili e <a> annidati.
 */
function preprocess(input: string): string {
  return stripNestedAnchors(input.replace(SOFT_HYPHEN_RE, ''));
}

/**
 * Converte markdown (o markdown+HTML misto) in HTML pronto per set:html.
 * Per contenuto gia HTML puro, marked passa attraverso senza danni grazie al
 * supporto di HTML inline (gestisce blocchi HTML in markdown).
 */
export function renderMarkdown(input: string | null | undefined): string {
  if (!input) return '';
  const cleaned = preprocess(input);
  // marked.parse e sincrono di default (nessun async extension)
  return marked.parse(cleaned, { async: false }) as string;
}
