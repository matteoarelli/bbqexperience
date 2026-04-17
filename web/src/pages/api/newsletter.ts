/**
 * POST /api/newsletter — Iscrizione newsletter via Strapi + Brevo
 *
 * @body {{ email: string, locale?: string }}
 *
 * Flusso:
 * 1. Valida email e rate limit (5 req/min per IP)
 * 2. Crea subscriber in Strapi (status: pending)
 * 3. Crea contatto in Brevo con double opt-in
 * 4. Brevo invia email di conferma
 * 5. Al confirm, webhook Brevo aggiorna status a "active"
 *
 * @returns {{ success: boolean, error?: string }}
 */
import type { APIRoute } from 'astro';
import { checkRateLimit, getClientIp } from '@lib/rate-limit';
import { captureError } from '@lib/sentry';

export const prerender = false;

const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = import.meta.env.STRAPI_API_TOKEN || '';
const BREVO_API_KEY = import.meta.env.BREVO_API_KEY || '';
const BREVO_LIST_ID = import.meta.env.BREVO_LIST_ID ? Number(import.meta.env.BREVO_LIST_ID) : 0;
const BREVO_DOI_TEMPLATE_EN = Number(import.meta.env.BREVO_DOI_TEMPLATE_EN || '0');
const BREVO_DOI_TEMPLATE_IT = Number(import.meta.env.BREVO_DOI_TEMPLATE_IT || '0');
const BREVO_DOI_TEMPLATE_ES = Number(import.meta.env.BREVO_DOI_TEMPLATE_ES || '0');
const DOI_TEMPLATES: Record<string, number> = { en: BREVO_DOI_TEMPLATE_EN, it: BREVO_DOI_TEMPLATE_IT, es: BREVO_DOI_TEMPLATE_ES };
const SITE_URL = import.meta.env.SITE_URL || 'https://bbq-experience.com';

const VALID_SOURCES = ['inline', 'landing', 'footer', 'exit-intent'] as const;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const POST: APIRoute = async ({ request }) => {
  const clientIp = getClientIp(request);
  if (!checkRateLimit(clientIp, 'newsletter', 5, 3_600_000)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '3600' },
    });
  }

  try {
    const body = await request.json();

    // Honeypot: campo nascosto, se compilato e un bot
    if (body.website) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const email = (body.email || '').trim().toLowerCase();
    const locale = body.locale || 'en';
    const source = VALID_SOURCES.includes(body.source) ? body.source : 'inline';

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
          source,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    // Se email gia presente, Strapi ritorna 400 per unique constraint
    if (!strapiRes.ok && strapiRes.status !== 400) {
      console.error('Errore Strapi subscriber:', strapiRes.status);
      return new Response(JSON.stringify({ error: 'Servizio iscrizione non disponibile' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Invia Double Opt-In via Brevo (se configurato)
    if (BREVO_API_KEY && BREVO_LIST_ID) {
      const templateId = DOI_TEMPLATES[locale] || DOI_TEMPLATES['en'];
      try {
        await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': BREVO_API_KEY,
          },
          body: JSON.stringify({
            email,
            includeListIds: [BREVO_LIST_ID],
            templateId,
            redirectionUrl: `${SITE_URL}/${locale}/newsletter/?confirmed=true`,
            attributes: { LOCALE: locale, SURFACE: source },
          }),
          signal: AbortSignal.timeout(10_000),
        });
      } catch (brevoErr) {
        captureError(brevoErr, { context: 'brevo-doi-contact', email: '***' });
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
