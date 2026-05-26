/**
 * Structured Data Parsers — FAQ + HowTo + speakable per BBQ Experience.
 *
 * Schema.org markup ancora valido anche dopo deprecation rich results Google.
 * AI search engines (Perplexity, ChatGPT browse, Gemini, Bing) consumano ancora
 * FAQPage + HowTo. speakable e' content-priority signal per AI Overviews.
 *
 * - FAQPage rich result deprecated by Google on 7 May 2026 (schema STILL VALID
 *   per AI engines — keep emitting).
 * - HowTo rich result deprecated Sep 2023 (schema STILL VALID per AI engines).
 * - speakable is BETA Schema.org (cssSelector OR xPath, not both).
 *
 * IMPORTANT (M6): tutte le funzioni sono CALL-IDEMPOTENT. Usiamo .matchAll()
 * (iterator, nessuno stato condiviso) invece di while+exec su pattern /g
 * (che condivide lastIndex tra chiamate consecutive).
 *
 * Locale support: 'en' | 'it' | 'es' (other locales fall back to 'en' at caller).
 */

// FAQ heading patterns sono /im (NON /g) — .exec() su pattern non-global parte
// sempre da inizio stringa, no stale lastIndex.
export const FAQ_HEADING_PATTERNS = {
  en: /^##\s+(FAQ|Frequently Asked Questions)\s*$/im,
  it: /^##\s+Domande frequenti\s*$/im,
  es: /^##\s+Preguntas frecuentes\s*$/im,
} as const;

// Step heading patterns sono /gim — usiamo SEMPRE matchAll() per evitare stale state.
export const STEP_HEADING_PATTERNS = {
  en: /^#{2,3}\s+Step\s+(\d+)\s*[:.]?\s*(.*)$/gim,
  it: /^#{2,3}\s+Passo\s+(\d+)\s*[:.]?\s*(.*)$/gim,
  es: /^#{2,3}\s+Paso\s+(\d+)\s*[:.]?\s*(.*)$/gim,
} as const;

const OL_HOWTO_PATTERN = /<ol[^>]*>([\s\S]+?)<\/ol>/i;
const LI_PATTERN = /<li[^>]*>([\s\S]+?)<\/li>/gi;

export type Locale = 'en' | 'it' | 'es';
export type Faq = { question: string; answer: string };
export type FaqResult = { questions: Faq[] } | null;
export type HowToStep = { name: string; text: string };
export type HowToResult = { name: string; steps: HowToStep[] } | null;
export type SpeakableSpec = {
  '@type': 'SpeakableSpecification';
  cssSelector: string[];
};

/**
 * Rileva FAQ section nel markdown e ritorna Q-A pairs.
 * Richiede >= 2 coppie per emettere FAQPage (single Q non e' FAQ).
 * Guard anti-false-positive: regex /im richiede heading INTERA riga, no trailing text.
 */
export function detectFaqFromMarkdown(
  markdown: string,
  locale: Locale = 'en',
): FaqResult {
  const pattern = FAQ_HEADING_PATTERNS[locale];
  // Pattern non-global — exec ritorna sempre da inizio (no stale lastIndex).
  const match = pattern.exec(markdown);
  if (!match) return null;

  const startIdx = match.index + match[0].length;
  const restAfterFaq = markdown.slice(startIdx);

  // Trova la prossima H2 per limitare il range FAQ (evita catturare H3 di sezioni dopo).
  const nextSection = /^##\s+/im.exec(restAfterFaq);
  const faqSection = nextSection
    ? restAfterFaq.slice(0, nextSection.index)
    : restAfterFaq;

  // M6: matchAll, NON while+exec — no stato condiviso tra chiamate.
  const qaRegex = /^###\s+(.+?)\s*\r?$([\s\S]*?)(?=^###\s+|$(?![\s\S]))/gim;
  const questions: Faq[] = [];
  for (const m of faqSection.matchAll(qaRegex)) {
    const q = m[1].trim();
    const a = (m[2] || '').trim();
    if (q && a) {
      questions.push({ question: q, answer: a.replace(/\s+/g, ' ') });
    }
  }

  return questions.length >= 2 ? { questions } : null;
}

/**
 * Estrae step da tutorial markdown.
 * Pattern 1: heading "## Step N" / "## Passo N" / "## Paso N" (anche H3).
 * Pattern 2: lista ordinata HTML <ol><li>...</li></ol>.
 * Richiede >= 3 step per emettere HowTo.
 */
export function extractHowToSteps(
  markdown: string,
  locale: Locale = 'en',
  name: string = 'Tutorial',
): HowToResult {
  // Pattern 1: heading-based. matchAll evita stale lastIndex tra chiamate (M6).
  const headingPattern = STEP_HEADING_PATTERNS[locale];
  const matches = [...markdown.matchAll(headingPattern)];

  const steps: HowToStep[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const stepNum = m[1];
    const stepTitle = (m[2] || '').trim();
    const startIdx = (m.index ?? 0) + m[0].length;
    const nextMatch = matches[i + 1];
    let body: string;
    if (nextMatch) {
      body = markdown.slice(startIdx, nextMatch.index ?? markdown.length);
    } else {
      const rest = markdown.slice(startIdx);
      const nextH = /^##\s+/m.exec(rest);
      body = nextH ? rest.slice(0, nextH.index) : rest;
    }
    steps.push({
      name: stepTitle || `Step ${stepNum}`,
      text: body.trim().replace(/\s+/g, ' ').slice(0, 500),
    });
  }
  if (steps.length >= 3) return { name, steps };

  // Pattern 2: <ol><li> — matchAll qui pure (M6).
  const olMatch = OL_HOWTO_PATTERN.exec(markdown);
  if (olMatch) {
    const items: HowToStep[] = [];
    for (const lm of olMatch[1].matchAll(LI_PATTERN)) {
      const text = lm[1].replace(/<[^>]+>/g, '').trim();
      if (text) {
        items.push({
          name: `Step ${items.length + 1}`,
          text: text.slice(0, 500),
        });
      }
    }
    if (items.length >= 3) return { name, steps: items };
  }

  return null;
}

/**
 * Costruisce SpeakableSpecification per Article schema.
 * Selectors STRUTTURALI (NON class-based) per resistere a refactor Astro/Tailwind:
 * - 'article > p:first-of-type' = primo paragrafo (intro/lead)
 * - 'article h2' = ogni section heading (TOC riassuntivo)
 *
 * Schema.org spec: cssSelector O xPath (mai entrambi). Usiamo cssSelector.
 */
export function buildSpeakableSpec(): SpeakableSpec {
  return {
    '@type': 'SpeakableSpecification',
    cssSelector: ['article > p:first-of-type', 'article h2'],
  };
}
