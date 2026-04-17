/**
 * POST /api/brevo-webhook — Riceve eventi webhook da Brevo
 *
 * Eventi gestiti:
 * - contact_updated: marca subscriber come "active" in Strapi
 * - unsubscribed: marca subscriber come "unsubscribed" in Strapi
 *
 * Sicurezza: validazione HMAC-SHA256 via header x-sib-signature
 * (richiede BREVO_WEBHOOK_SECRET configurato)
 *
 * @returns {string} "OK" (200) o "Unauthorized" (401) o "Internal Error" (500)
 */
import type { APIRoute } from 'astro';
import { captureError } from '@lib/sentry';
import { createHmac } from 'node:crypto';

export const prerender = false;

const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = import.meta.env.STRAPI_API_TOKEN || '';
const BREVO_WEBHOOK_SECRET = import.meta.env.BREVO_WEBHOOK_SECRET || '';
const BREVO_API_KEY = import.meta.env.BREVO_API_KEY || '';

function validateSignature(body: string, signature: string | null): boolean {
  if (!BREVO_WEBHOOK_SECRET || !signature) return false;
  const expected = createHmac('sha256', BREVO_WEBHOOK_SECRET).update(body).digest('hex');
  return expected === signature;
}

async function updateSubscriberStatus(email: string, status: 'active' | 'unsubscribed'): Promise<void> {
  const searchRes = await fetch(
    `${STRAPI_URL}/api/subscribers?filters[email][$eq]=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, signal: AbortSignal.timeout(10_000) },
  );
  if (!searchRes.ok) {
    throw new Error(`Strapi search subscribers fallito: ${searchRes.status}`);
  }
  const searchData = await searchRes.json();
  const subscriber = searchData?.data?.[0];
  if (!subscriber) return;

  const updateData: Record<string, unknown> = { status };
  if (status === 'unsubscribed') {
    updateData.unsubscribed_at = new Date().toISOString();
  }

  const updateRes = await fetch(`${STRAPI_URL}/api/subscribers/${subscriber.documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify({ data: updateData }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!updateRes.ok) {
    throw new Error(`Strapi update subscriber fallito: ${updateRes.status}`);
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-sib-signature');

    // Fail-closed: se il secret non e configurato, rifiuta tutto
    if (!BREVO_WEBHOOK_SECRET) {
      return new Response('Webhook secret not configured', { status: 500 });
    }
    if (!validateSignature(rawBody, signature)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const email = event.email?.toLowerCase();
    if (!email) {
      return new Response('OK', { status: 200 });
    }

    switch (event.event) {
      case 'contact_updated':
        await updateSubscriberStatus(email, 'active');
        // Fallback: sincronizza SURFACE attribute su Brevo (safety net se DOI endpoint non salva attributes)
        if (BREVO_API_KEY) {
          try {
            const subRes = await fetch(
              `${STRAPI_URL}/api/subscribers?filters[email][$eq]=${encodeURIComponent(email)}&fields[0]=source`,
              { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, signal: AbortSignal.timeout(10_000) },
            );
            const subData = await subRes.json();
            const source = subData?.data?.[0]?.source;
            if (source) {
              await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
                body: JSON.stringify({ attributes: { SURFACE: source } }),
                signal: AbortSignal.timeout(10_000),
              });
            }
          } catch (surfaceErr) {
            captureError(surfaceErr, { context: 'brevo-webhook-surface-sync', email: '***' });
          }
        }
        break;
      case 'unsubscribed':
        await updateSubscriberStatus(email, 'unsubscribed');
        break;
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    captureError(err, { context: 'brevo-webhook' });
    return new Response('Internal Error', { status: 500 });
  }
};
