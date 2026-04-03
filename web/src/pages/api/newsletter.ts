// API endpoint newsletter — salva le iscrizioni in un file JSON lato server
import type { APIRoute } from 'astro';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { checkRateLimit, getClientIp } from '@lib/rate-limit';

export const prerender = false;

/** Percorso file JSON per le iscrizioni */
const SUBSCRIBERS_FILE = join(process.cwd(), 'data', 'newsletter-subscribers.json');

/** Validazione email base */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface Subscriber {
  email: string;
  subscribedAt: string;
  locale: string;
}

/** Legge le iscrizioni esistenti dal file */
async function readSubscribers(): Promise<Subscriber[]> {
  try {
    const data = await fs.readFile(SUBSCRIBERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/** Salva le iscrizioni nel file */
async function writeSubscribers(subscribers: Subscriber[]): Promise<void> {
  const dir = join(process.cwd(), 'data');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2), 'utf-8');
}

export const POST: APIRoute = async ({ request }) => {
  // Controllo rate limit
  const clientIp = getClientIp(request);
  if (!checkRateLimit(clientIp, 'newsletter', 5)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();
    const locale = body.locale || 'en';

    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Email non valida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const subscribers = await readSubscribers();

    // Controlla se già iscritto
    if (subscribers.some(s => s.email === email)) {
      return new Response(JSON.stringify({ success: true, message: 'Già iscritto' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Aggiungi nuovo iscritto
    subscribers.push({
      email,
      subscribedAt: new Date().toISOString(),
      locale,
    });
    await writeSubscribers(subscribers);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Errore newsletter:', err);
    return new Response(JSON.stringify({ error: 'Errore interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
