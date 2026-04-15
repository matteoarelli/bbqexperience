// Runner Lighthouse — esegue 15 audit (mobile form-factor, simulated throttling)
// e scrive i JSON report in .planning/artifacts/lighthouse-v1.1-baseline/<id>.json
// Con retry fino a 3 tentativi per URL.

import { spawn } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANIFEST = resolve(__dirname, 'selected-slugs.json');

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const targets = manifest.targets;

console.log(`[lighthouse-runner] ${targets.length} targets`);

function runLighthouse(id, url) {
  return new Promise((resolvePromise) => {
    const outputPath = resolve(__dirname, `${id}.json`);
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
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.stdout.on('data', () => {
      // output quiet attivo, ignoriamo
    });

    child.on('close', (code) => {
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      // Windows: Lighthouse spesso esce con errore per EPERM tmp cleanup DOPO
      // aver scritto il JSON. Validiamo il file ignorando l'exit code.
      if (existsSync(outputPath)) {
        try {
          const report = JSON.parse(readFileSync(outputPath, 'utf8'));
          if (report?.categories?.performance?.score != null) {
            console.log(`  [ok] ${id} (${duration}s, exit=${code})`);
            resolvePromise({ success: true });
            return;
          }
        } catch (e) {
          // fallthrough
        }
      }
      console.error(`  [fail] ${id} code=${code} (${duration}s)`);
      if (stderr) console.error(`    stderr: ${stderr.substring(0, 300)}`);
      resolvePromise({ success: false, stderr: stderr.substring(0, 500) });
    });
  });
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runWithRetry(id, url, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[${id}] attempt ${attempt}/${maxAttempts} -> ${url}`);
    const res = await runLighthouse(id, url);
    if (res.success) return true;
    if (attempt < maxAttempts) {
      console.log(`  [retry] sleeping 10s before attempt ${attempt + 1}`);
      await sleep(10000);
    } else {
      // scrivi stub error
      const stubPath = resolve(__dirname, `${id}.json`);
      writeFileSync(
        stubPath,
        JSON.stringify(
          { error: `failed after ${maxAttempts} retries`, url, stderr: res.stderr },
          null,
          2
        ),
        'utf8'
      );
    }
  }
  return false;
}

async function main() {
  const results = [];
  for (const t of targets) {
    // skip gia fatto (in caso di ripresa)
    const existing = resolve(__dirname, `${t.id}.json`);
    if (existsSync(existing)) {
      try {
        const rep = JSON.parse(readFileSync(existing, 'utf8'));
        if (rep?.categories?.performance?.score != null) {
          console.log(`[skip] ${t.id} gia presente e valido`);
          results.push({ id: t.id, status: 'ok-cached' });
          continue;
        }
      } catch {}
    }
    const ok = await runWithRetry(t.id, t.url, 3);
    results.push({ id: t.id, status: ok ? 'ok' : 'error-stub' });
    await sleep(2000);
  }

  console.log('\n=== Summary ===');
  for (const r of results) console.log(`  ${r.id}: ${r.status}`);
  const failed = results.filter((r) => r.status === 'error-stub');
  console.log(`\n${results.length - failed.length}/${results.length} successful`);
  if (failed.length > 1) {
    console.error(`FAIL: ${failed.length} errors > tolerance of 1`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('fatal', e);
  process.exit(1);
});
