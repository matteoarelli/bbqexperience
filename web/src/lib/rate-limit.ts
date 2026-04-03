// Rate limiter persistente basato su SQLite — sopravvive ai restart
import Database from 'better-sqlite3';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const DB_PATH = join(tmpdir(), 'bbq-rate-limits.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        ip TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_rate_ip_endpoint ON rate_limits(ip, endpoint);
    `);
  }
  return db;
}

/**
 * Controlla se l'IP ha superato il limite per un dato endpoint.
 * Pulisce automaticamente le entry vecchie.
 */
export function checkRateLimit(
  ip: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number = 60_000,
): boolean {
  const d = getDb();
  const now = Date.now();
  const cutoff = now - windowMs;

  // Pulisci entry vecchie (>1 ora per tutti gli endpoint)
  d.prepare('DELETE FROM rate_limits WHERE timestamp < ?').run(now - 3_600_000);

  // Conta richieste nel window
  const row = d.prepare(
    'SELECT COUNT(*) as count FROM rate_limits WHERE ip = ? AND endpoint = ? AND timestamp > ?',
  ).get(ip, endpoint, cutoff) as { count: number };

  if (row.count >= maxRequests) return false;

  // Registra nuova richiesta
  d.prepare('INSERT INTO rate_limits (ip, endpoint, timestamp) VALUES (?, ?, ?)').run(ip, endpoint, now);
  return true;
}

/** Estrae IP dal request (x-forwarded-for, x-real-ip, fallback) */
export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}
