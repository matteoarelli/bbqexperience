// API endpoint newsletter — crea subscriber in Strapi + aggiunge contatto in Brevo
import type { APIRoute } from 'astro';
import { checkRateLimit, getClientIp } from '@lib/rate-limit';
import { captureError } from '@lib/sentry';

export const prerender = false;

const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = import.meta.env.STRAPI_API_TOKEN || '';
const BREVO_API_KEY = import.meta.env.BREVO_API_KEY || '';
const BREVO_LIST_ID = import.meta.env.BREVO_LIST_ID ? Number(import.meta.env.BREVO_LIST_ID) : 0;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const POST: APIRoute = async ({ request }) => {
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

    // 1. Crea subscriber in Strapi
    const strapiRes = await fetch(`${STRAPI_URL}/api/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          email,
          locale_preference: locale,
          status: 'pending',
          subscribed_at: new Date().toISOString(),
        },
      }),
    });

    // Se email gia presente, Strapi ritorna 400 per unique constraint
    if (!strapiRes.ok && strapiRes.status !== 400) {
      console.error('Errore Strapi subscriber:', strapiRes.status);
    }

    // 2. Aggiungi contatto in Brevo (se configurato)
    if (BREVO_API_KEY && BREVO_LIST_ID) {
      try {
        await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': BREVO_API_KEY,
          },
          body: JSON.stringify({
            email,
            listIds: [BREVO_LIST_ID],
            attributes: { LOCALE: locale },
            updateEnabled: true,
          }),
        });
      } catch (brevoErr) {
        captureError(brevoErr, { context: 'brevo-create-contact', email: '***' });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    captureError(err, { context: 'newsletter-signup' });
    return new Response(JSON.stringify({ error: 'Errore interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
