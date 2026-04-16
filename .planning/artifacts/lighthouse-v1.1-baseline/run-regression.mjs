// Runner Lighthouse regressione — esegue le 9 pagine gia >= 90 nella baseline
// e scrive *-regression.json per verificare che la modifica di Plan 10.1 Task 2
// (Cloudflare Image Transformations + srcset) NON abbia degradato la performance.
// Stesso parametrizzazione di run-audits.mjs (mobile form-factor, simulated throttling).

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANIFEST = resolve(__dirname, 'selected-slugs.json');

// Pagine gia >= 90 nella baseline v1.1 (run-after.mjs copre le altre 6 sub-90).
// Conteggio: 3 recipe + 3 tutorial + 2 blog + 1 review = 9.
// Include i 2 promossi da Plan 10-05 after-fix (review-it 93, tutorial-it 90).
const PASSING_IDS = new Set([
  'recipe-en', 'recipe-it', 'recipe-es',
  'tutorial-en', 'tutorial-it', 'tutorial-es',
  'blog-it', 'blog-es',
  'review-it',
]);

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const targets = manifest.targets.filter((t) => PASSING_IDS.has(t.id));

console.log(`[lighthouse-regression] ${targets.length} targets (verifica no-regression)`);

function runLighthouse(id, url) {
  return new Promise((resolvePromise) => {
    const outputPath = resolve(__dirname, `${id}-regression.json`);
    if (existsSync(outputPath)) {
      // Validazione veloce: file esiste e ha categoria perf
      try {
        const r = JSON.parse(readFileSync(outputPath, 'utf8'));
        const perf = r.categories?.performance?.score;
        if (perf != null) {
          console.log(`[skip] ${id} -> ${outputPath} (perf=${perf})`);
          resolvePromise({ id, ok: true, score: perf, skipped: true });
          return;
        }
      } catch {
        // file corrotto, riproviamo
      }
    }

    const args = [
      '--yes',
      'lighthouse',
      url,
      '--only-categories=performance,accessibility,best-practices,seo',
      '--form-factor=mobile',
      '--throttling-method=simulate',
      '--output=json',
      `--output-path=${outputPath}`,
      '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
      '--quiet',
      '--max-wait-for-load=60000',
    ];

    const start = Date.now();
    const child = spawn('npx', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      const dur = ((Date.now() - start) / 1000).toFixed(1);
      // Windows EPERM quirk: ignoriamo exit code, validiamo via file+score
      if (existsSync(outputPath)) {
        try {
          const r = JSON.parse(readFileSync(outputPath, 'utf8'));
          const perf = r.categories?.performance?.score;
          if (perf != null) {
            console.log(`[ok]   ${id} -> perf=${perf} (${dur}s, exit=${code})`);
            resolvePromise({ id, ok: true, score: perf });
            return;
          }
        } catch (e) {
          console.log(`[err]  ${id} -> JSON corrupt: ${e.message}`);
        }
      }
      console.log(`[fail] ${id} -> exit=${code} stderr_tail=${stderr.slice(-200)}`);
      resolvePromise({ id, ok: false, score: null });
    });
  });
}

// Esecuzione sequenziale (non in parallelo: Lighthouse e greedy su CPU/disco)
const results = [];
for (const target of targets) {
  console.log(`\n[run] ${target.id} ${target.url}`);
  const result = await runLighthouse(target.id, target.url);
  results.push(result);
}

console.log('\n--- SUMMARY ---');
let pass = 0, fail = 0;
for (const r of results) {
  if (r.ok && r.score >= 0.9) {
    pass++;
    console.log(`  PASS ${r.id} perf=${r.score}`);
  } else {
    fail++;
    console.log(`  FAIL ${r.id} perf=${r.score}`);
  }
}
console.log(`\nTotal: ${pass}/${results.length} pass, ${fail}/${results.length} fail`);
process.exit(fail === 0 ? 0 : 1);
