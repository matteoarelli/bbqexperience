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

function validateSignature(body: string, signature: string | null): boolean {
  if (!BREVO_WEBHOOK_SECRET || !signature) return false;
  const expected = createHmac('sha256', BREVO_WEBHOOK_SECRET).update(body).digest('hex');
  return expected === signature;
}

async function updateSubscriberStatus(email: string, status: 'active' | 'unsubscribed'): Promise<void> {
  const searchRes = await fetch(
    `${STRAPI_URL}/api/subscribers?filters[email][$eq]=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } },
  );
  const searchData = await searchRes.json();
  const subscriber = searchData?.data?.[0];
  if (!subscriber) return;

  const updateData: Record<string, unknown> = { status };
  if (status === 'unsubscribed') {
    updateData.unsubscribed_at = new Date().toISOString();
  }

  await fetch(`${STRAPI_URL}/api/subscribers/${subscriber.documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify({ data: updateData }),
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-sib-signature');

    if (BREVO_WEBHOOK_SECRET && !validateSignature(rawBody, signature)) {
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
