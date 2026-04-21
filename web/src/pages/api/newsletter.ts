/**
 * POST /api/newsletter — Iscrizione newsletter via Strapi + Brevo DOI
 *
 * @body {{ email: string, locale?: string, source?: string, website?: string }}
 *
 * Flusso:
 * 1. Rifiuta bot (honeypot: campo "website" non vuoto → 403)
 * 2. Rate limit 5 req/ora per IP (SQLite)
 * 3. Valida email
 * 4. Crea subscriber in Strapi (status: pending, source attribution)
 * 5. Invia richiesta DOI a Brevo (template per locale)
 * 6. Brevo invia email di conferma
 * 7. Al confirm, webhook Brevo aggiorna status a "active"
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

// Template ID per conferma DOI per locale
const BREVO_DOI_TEMPLATES: Record<string, number> = {
  en: Number(import.meta.env.BREVO_DOI_TEMPLATE_EN) || 0,
  it: Number(import.meta.env.BREVO_DOI_TEMPLATE_IT) || 0,
  es: Number(import.meta.env.BREVO_DOI_TEMPLATE_ES) || 0,
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const POST: APIRoute = async ({ request }) => {
  const clientIp = getClientIp(request);

  // 0. Rate limit: 5 tentativi per IP per ora
  if (!checkRateLimit(clientIp, 'newsletter', 5, 3_600_000)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '3600' },
    });
  }

  try {
    const body = await request.json();

    // 1. Honeypot: campo nascosto "website" deve essere vuoto
    if (body.website) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const email = (body.email || '').trim().toLowerCase();
    const locale = body.locale || 'en';
    const source = body.source || 'inline';

    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Email non valida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Crea subscriber in Strapi con source attribution
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
          source,
          subscribed_at: new Date().toISOString(),
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

    // 3. Brevo DOI (double opt-in) con template per locale
    if (BREVO_API_KEY && BREVO_LIST_ID) {
      const templateId = BREVO_DOI_TEMPLATES[locale] || BREVO_DOI_TEMPLATES.en;

      try {
        if (templateId) {
          // Usa endpoint DOI con template di conferma per locale
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
              redirectionUrl: `https://bbq-experience.com/${locale}/newsletter/?confirmed=true`,
              attributes: { LOCALE: locale, SURFACE: source },
            }),
            signal: AbortSignal.timeout(10_000),
          });
        } else {
          // Fallback: contatto diretto (se template non configurato)
          await fetch('https://api.brevo.com/v3/contacts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': BREVO_API_KEY,
            },
            body: JSON.stringify({
              email,
              listIds: [BREVO_LIST_ID],
              attributes: { LOCALE: locale, SURFACE: source },
              updateEnabled: true,
            }),
            signal: AbortSignal.timeout(10_000),
          });
        }
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
