#!/usr/bin/env node
// refresh-instagram-token.mjs — Rinnova il long-lived token Instagram
// Cron: 0 4 * * 1 (ogni lunedi alle 04:00)
import { readFileSync, writeFileSync } from 'fs';

const TOKEN_FILE = process.env.TOKEN_FILE || '/opt/services/bbqexperience/.instagram-token';

async function main() {
  console.log(`[${new Date().toISOString()}] Refresh token Instagram iniziato`);

  let currentToken;
  try {
    currentToken = readFileSync(TOKEN_FILE, 'utf-8').trim();
  } catch {
    currentToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  }

  if (!currentToken) {
    console.error('ERRORE: Nessun token trovato');
    process.exit(1);
  }

  const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`;
  const res = await fetch(url);

  if (!res.ok) {
    console.error(`ERRORE: Refresh fallito: ${res.status} ${await res.text()}`);
    process.exit(1);
  }

  const data = await res.json();
  writeFileSync(TOKEN_FILE, data.access_token);
  console.log(`  Token rinnovato, scade tra ${data.expires_in} secondi (~${Math.round(data.expires_in / 86400)} giorni)`);
}

main().catch((err) => {
  console.error('ERRORE refresh token:', err);
  process.exit(1);
});
