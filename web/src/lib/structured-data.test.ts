/**
 * Vitest unit tests per structured-data.ts
 *
 * Coverage:
 * - detectFaqFromMarkdown: EN/IT/ES heading variants, false-positive guard,
 *   single-question rejection, no-section returns null
 * - extractHowToSteps: H2/H3 step headings (EN/IT/ES), <ol><li> pattern,
 *   below-threshold rejection
 * - buildSpeakableSpec: shape contract (@type + cssSelector only, NO xPath)
 * - M6 idempotence: chiamare due volte con stesso input ritorna stesso risultato
 *   (no stale regex.lastIndex state — usiamo matchAll, non while+exec)
 */
import { describe, it, expect } from 'vitest';
import {
  detectFaqFromMarkdown,
  extractHowToSteps,
  buildSpeakableSpec,
  FAQ_HEADING_PATTERNS,
  STEP_HEADING_PATTERNS,
} from './structured-data';

describe('detectFaqFromMarkdown', () => {
  it('test_detectFaq_en_FAQ_heading: parses "## FAQ" with 2 Q-A pairs', () => {
    const md = '## FAQ\n### Q1\nA1\n### Q2\nA2\n';
    const result = detectFaqFromMarkdown(md, 'en');
    expect(result).not.toBeNull();
    expect(result!.questions).toHaveLength(2);
    expect(result!.questions[0].question).toBe('Q1');
    expect(result!.questions[0].answer).toContain('A1');
    expect(result!.questions[1].question).toBe('Q2');
  });

  it('test_detectFaq_en_full_heading: parses "## Frequently Asked Questions"', () => {
    const md = '## Frequently Asked Questions\n### What is BBQ?\nA classic.\n### Why smoke?\nFlavor.\n';
    const result = detectFaqFromMarkdown(md, 'en');
    expect(result).not.toBeNull();
    expect(result!.questions).toHaveLength(2);
  });

  it('test_detectFaq_it: "## Domande frequenti" returns 2 questions', () => {
    const md = '## Domande frequenti\n### D1\nR1\n### D2\nR2\n';
    const result = detectFaqFromMarkdown(md, 'it');
    expect(result).not.toBeNull();
    expect(result!.questions).toHaveLength(2);
  });

  it('test_detectFaq_es: "## Preguntas frecuentes" returns 2 questions', () => {
    const md = '## Preguntas frecuentes\n### P1\nR1\n### P2\nR2\n';
    const result = detectFaqFromMarkdown(md, 'es');
    expect(result).not.toBeNull();
    expect(result!.questions).toHaveLength(2);
  });

  it('test_detectFaq_single_question_returns_null: 1 Q is not a FAQ section', () => {
    const md = '## FAQ\n### Only question\nAnswer\n';
    const result = detectFaqFromMarkdown(md, 'en');
    expect(result).toBeNull();
  });

  it('test_detectFaq_false_positive_guard: "## FAQ at a barbecue" does NOT trigger', () => {
    const md = '## FAQ at a barbecue\n### Q1\nA1\n### Q2\nA2\n';
    const result = detectFaqFromMarkdown(md, 'en');
    // Strict regex requires "## FAQ" (or full heading) as the entire line; trailing text fails.
    expect(result).toBeNull();
  });

  it('test_detectFaq_no_section: returns null when no FAQ heading present', () => {
    const md = '## Intro\nSome text.\n## Conclusion\nMore text.\n';
    const result = detectFaqFromMarkdown(md, 'en');
    expect(result).toBeNull();
  });

  it('test_detectFaq_called_twice_same_input_returns_same_questions (M6 idempotence)', () => {
    const md = '## FAQ\n### Q1\nA1\n### Q2\nA2\n';
    const r1 = detectFaqFromMarkdown(md, 'en');
    const r2 = detectFaqFromMarkdown(md, 'en');
    expect(r1).toEqual(r2);
    expect(r2!.questions).toHaveLength(2);
  });
});

describe('extractHowToSteps', () => {
  it('test_extractHowTo_ol_pattern: <ol><li> x3 returns 3 steps', () => {
    const md = 'Intro\n<ol><li>First step</li><li>Second step</li><li>Third step</li></ol>\nOutro';
    const result = extractHowToSteps(md, 'en', 'Test Tutorial');
    expect(result).not.toBeNull();
    expect(result!.steps).toHaveLength(3);
    expect(result!.name).toBe('Test Tutorial');
  });

  it('test_extractHowTo_h2_pattern: "## Step N" x3 returns 3 steps', () => {
    const md = '## Step 1: Prep\nDo prep.\n## Step 2: Cook\nDo cook.\n## Step 3: Serve\nDo serve.\n';
    const result = extractHowToSteps(md, 'en', 'Cook Tutorial');
    expect(result).not.toBeNull();
    expect(result!.steps).toHaveLength(3);
    expect(result!.steps[0].name).toBe('Prep');
    expect(result!.steps[0].text).toContain('Do prep');
  });

  it('test_extractHowTo_it: "## Passo 1/2/3" returns 3 steps', () => {
    const md = '## Passo 1: Prepara\nPreparare.\n## Passo 2: Cuoci\nCuocere.\n## Passo 3: Servi\nServire.\n';
    const result = extractHowToSteps(md, 'it', 'Guida');
    expect(result).not.toBeNull();
    expect(result!.steps).toHaveLength(3);
    expect(result!.steps[0].name).toBe('Prepara');
  });

  it('test_extractHowTo_es: "## Paso 1/2/3" returns 3 steps', () => {
    const md = '## Paso 1: Preparar\nPreparar.\n## Paso 2: Cocinar\nCocinar.\n## Paso 3: Servir\nServir.\n';
    const result = extractHowToSteps(md, 'es', 'Tutorial');
    expect(result).not.toBeNull();
    expect(result!.steps).toHaveLength(3);
  });

  it('test_extractHowTo_below_threshold: 2 steps returns null', () => {
    const md = '## Step 1: One\nDo one.\n## Step 2: Two\nDo two.\n';
    const result = extractHowToSteps(md, 'en');
    expect(result).toBeNull();
  });

  it('test_extractHowTo_no_pattern: no step structure returns null', () => {
    const md = '## Intro\nPlain text.\n## Conclusion\nMore text.\n';
    const result = extractHowToSteps(md, 'en');
    expect(result).toBeNull();
  });

  it('test_extractHowTo_called_twice_same_input_returns_same_steps (M6 idempotence)', () => {
    const md = '## Step 1: First\nDo first.\n## Step 2: Second\nDo second.\n## Step 3: Third\nDo third.\n';
    const r1 = extractHowToSteps(md, 'en', 'Tutorial');
    const r2 = extractHowToSteps(md, 'en', 'Tutorial');
    expect(r1).toEqual(r2);
    expect(r2!.steps).toHaveLength(3);
  });
});

describe('buildSpeakableSpec', () => {
  it('test_buildSpeakable_format: returns SpeakableSpecification with cssSelector', () => {
    const spec = buildSpeakableSpec();
    expect(spec['@type']).toBe('SpeakableSpecification');
    expect(spec.cssSelector).toEqual(['.content-body p:first-of-type', '.content-body h2']);
  });

  it('test_buildSpeakable_no_xpath: NO xPath key (Schema.org spec: cssSelector OR xPath, not both)', () => {
    const spec = buildSpeakableSpec() as Record<string, unknown>;
    expect(spec.xPath).toBeUndefined();
  });
});

describe('FAQ_HEADING_PATTERNS + STEP_HEADING_PATTERNS exports', () => {
  it('exports locale-keyed FAQ patterns', () => {
    expect(FAQ_HEADING_PATTERNS.en).toBeInstanceOf(RegExp);
    expect(FAQ_HEADING_PATTERNS.it).toBeInstanceOf(RegExp);
    expect(FAQ_HEADING_PATTERNS.es).toBeInstanceOf(RegExp);
  });

  it('exports locale-keyed step patterns', () => {
    expect(STEP_HEADING_PATTERNS.en).toBeInstanceOf(RegExp);
    expect(STEP_HEADING_PATTERNS.it).toBeInstanceOf(RegExp);
    expect(STEP_HEADING_PATTERNS.es).toBeInstanceOf(RegExp);
  });
});
