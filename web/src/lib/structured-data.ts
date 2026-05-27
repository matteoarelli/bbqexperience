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
//
// SEO-13 (v1.2 Phase 18) — parser-v2 con lookahead positivo per suffix legittimi.
// Pattern: dopo "FAQ|FAQs|Frequently Asked Questions?", accetta:
//   - end-of-line strict: "## FAQ" / "## Frequently Asked Questions"
//   - separator + preposition legittima: "## Frequently Asked Questions about X",
//     "## FAQ on Wireless", "## FAQ for Beginners", "## FAQ regarding pellet",
//     "## FAQ — Best Practices", "## FAQ: Tips" (also IT "sui/sulle/sul", ES "sobre/acerca")
// Resta strict su narrative tipo "## FAQ at a barbecue" / "## Domande frequenti durante" — "at|durante"
// NON sono nei prepositional patterns accettati.
// Accepta: end-of-line | "FAQ: X" / "FAQ — X" (strong separator markers) | "FAQ <preposition> X"
const FAQ_SUFFIX_EN = '(\\s*$|\\s*[:—–-]\\s*\\S|\\s+(about|on|for|regarding|concerning)\\b)';
const FAQ_SUFFIX_IT = '(\\s*$|\\s*[:—–-]\\s*\\S|\\s+(sui|sull[oa]|sulle|riguardo|circa)\\b)';
const FAQ_SUFFIX_ES = '(\\s*$|\\s*[:—–-]\\s*\\S|\\s+(sobre|acerca|para|de\\s+los?)\\b)';
export const FAQ_HEADING_PATTERNS = {
  en: new RegExp(`^##\\s+(FAQs?|Frequently Asked Questions?)${FAQ_SUFFIX_EN}`, 'im'),
  it: new RegExp(`^##\\s+Domande frequenti${FAQ_SUFFIX_IT}`, 'im'),
  es: new RegExp(`^##\\s+Preguntas frecuentes${FAQ_SUFFIX_ES}`, 'im'),
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
 *
 * Fix v1.2.1 (2026-05-27): se markdown detection ritorna null E il content sembra
 * HTML diretto (es. Strapi rich-text che salva HTML rendered) → fallback a HTML parser.
 * Pattern: <h2>...FAQ.../<h2> + <h3>Q?</h3><p>A</p> structure.
 */
export function detectFaqFromMarkdown(
  content: string,
  locale: Locale = 'en',
): FaqResult {
  // STEP 1: prova markdown standard
  const pattern = FAQ_HEADING_PATTERNS[locale];
  const match = pattern.exec(content);
  if (match) {
    const startIdx = match.index + match[0].length;
    const restAfterFaq = content.slice(startIdx);

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

    if (questions.length >= 2) return { questions };
  }

  // STEP 2: fallback HTML — Strapi rich-text può salvare HTML direttamente
  // (verificato live 2026-05-27 su best-bbq-grills-propane: content inizia con <p>...)
  return detectFaqFromHtml(content, locale);
}

/**
 * Fallback HTML parser per FAQ section (Strapi rich-text HTML content).
 * Pattern: <h2>FAQ|Frequently Asked Questions|Domande frequenti|Preguntas frecuentes</h2>
 * + <h3>Question?</h3><p>Answer</p> structure (>= 2 Q-A pairs required).
 */
function detectFaqFromHtml(
  html: string,
  locale: Locale = 'en',
): FaqResult {
  // Locale-aware heading text patterns (mirror markdown FAQ_HEADING_PATTERNS).
  const HEADING_TEXT: Record<Locale, RegExp> = {
    en: /^(FAQs?|Frequently Asked Questions?)(\s*$|\s*[:—–-]\s*\S|\s+(about|on|for|regarding|concerning)\b)/i,
    it: /^Domande frequenti(\s*$|\s*[:—–-]\s*\S|\s+(sui|sull[oa]|sulle|riguardo|circa)\b)/i,
    es: /^Preguntas frecuentes(\s*$|\s*[:—–-]\s*\S|\s+(sobre|acerca|para|de\s+los?)\b)/i,
  };
  const headingRe = HEADING_TEXT[locale];

  // Cerca tutti gli <h2> nel content. matchAll per idempotence.
  const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let faqStartIdx = -1;
  for (const m of html.matchAll(h2Re)) {
    // Strip inner tags (es. <a id="faq">FAQ</a>) e whitespace.
    const text = (m[1] || '').replace(/<[^>]+>/g, '').trim();
    if (headingRe.test(text)) {
      faqStartIdx = m.index + m[0].length;
      break;
    }
  }
  if (faqStartIdx === -1) return null;

  // Trova il prossimo <h2> per limitare il range FAQ.
  const restAfter = html.slice(faqStartIdx);
  const nextH2 = /<h2[^>]*>/i.exec(restAfter);
  const faqSection = nextH2 ? restAfter.slice(0, nextH2.index) : restAfter;

  // Q-A pairs: <h3>Question</h3> + content until next <h3> or end.
  // matchAll su pattern lazy/greedy. NB: usiamo matchAll per evitare stale lastIndex.
  const qaRegex = /<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3[^>]*>|$)/gi;
  const questions: Faq[] = [];
  for (const m of faqSection.matchAll(qaRegex)) {
    // Strip HTML tags from question + answer, collapse whitespace.
    const q = (m[1] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const aRaw = (m[2] || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
    const a = aRaw.replace(/\s+/g, ' ').trim();
    if (q && a) {
      questions.push({ question: q, answer: a });
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
 *
 * Selectors compatibili col DOM reale di BBQ (verificato live 2026-05-26 via sweep_pages):
 * - '.content-body p:first-of-type' = primo paragrafo content (esclude <p class="last-updated"> meta)
 * - '.content-body h2' = ogni section heading strutturale (TOC riassuntivo)
 *
 * Nota: '.content-body' e' la convenzione stabile del template Astro BaseLayout per
 * il content area degli articoli. Se la classe venisse rinominata, aggiornare entrambi
 * questo file E SPEAKABLE_SELECTORS in scripts/sweep_pages.py per mantenere coerenza.
 *
 * Iterazione precedente usava 'article > p:first-of-type' + 'article h2' (selettori
 * "strutturali pure") ma non matchavano: <p> direct children di <article> sono solo
 * meta info, non content; <h2> dentro <article> esistono solo annidati in .content-body.
 *
 * Schema.org spec: cssSelector O xPath (mai entrambi). Usiamo cssSelector.
 */
export function buildSpeakableSpec(): SpeakableSpec {
  return {
    '@type': 'SpeakableSpecification',
    cssSelector: ['.content-body p:first-of-type', '.content-body h2'],
  };
}
