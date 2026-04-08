/**
 * GET /api/preview — Attiva modalita anteprima (draft content)
 *
 * @param {string} secret - Segreto di preview (required, deve corrispondere a PREVIEW_SECRET)
 * @param {string} slug - Slug del contenuto da visualizzare (required)
 * @param {string} type - Tipo di contenuto (reviews|recipes|tutorials|blog-posts, default: reviews)
 * @param {string} locale - Lingua (en|it|es, default: en)
 * @param {string} action - Se "exit", rimuove il cookie di preview e redirige
 *
 * Imposta un cookie httpOnly (1h) e redirige alla pagina del contenuto.
 *
 * DELETE /api/preview — Disattiva modalita anteprima
 * Rimuove il cookie di preview e redirige alla homepage.
 *
 * @returns {Response} Redirect 302 o JSON error (401/400)
 */
import type { APIRoute } from 'astro';
import { PREVIEW_COOKIE_NAME, PREVIEW_SECRET } from '@lib/preview';

export const prerender = false;

export const GET: APIRoute = ({ url, cookies, redirect }) => {
  const action = url.searchParams.get('action');

  // Gestione uscita dalla preview via GET ?action=exit
  if (action === 'exit') {
    cookies.delete(PREVIEW_COOKIE_NAME, { path: '/' });
    let redirectTo = url.searchParams.get('redirect') || '/en/';
    // Previeni open redirect: solo path locali, no URL assoluti
    if (!redirectTo.startsWith('/') || redirectTo.startsWith('//')) {
      redirectTo = '/en/';
    }
    return redirect(redirectTo, 302);
  }

  const secret = url.searchParams.get('secret');
  const slug = url.searchParams.get('slug');
  const type = url.searchParams.get('type') || 'reviews';
  const locale = url.searchParams.get('locale') || 'en';

  // Validazione segreto
  if (!secret || secret !== PREVIEW_SECRET) {
    return new Response(JSON.stringify({ error: 'Invalid preview secret' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validazione slug
  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing slug parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Imposta il cookie di anteprima (valido 1 ora)
  cookies.set(PREVIEW_COOKIE_NAME, PREVIEW_SECRET, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 3600,
    secure: true,
  });

  // Redirige alla pagina del contenuto
  return redirect(`/${locale}/${type}/${slug}/`, 302);
};

export const DELETE: APIRoute = ({ cookies, redirect }) => {
  // Rimuove il cookie di anteprima
  cookies.delete(PREVIEW_COOKIE_NAME, { path: '/' });

  // Redirige alla homepage
  return redirect('/en/', 302);
};
