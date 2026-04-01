// Endpoint API per attivare/disattivare la modalita anteprima — BBQ Experience
// GET: valida il segreto, imposta il cookie di preview e redirige alla pagina contenuto
// DELETE: rimuove il cookie di preview e redirige alla homepage
import type { APIRoute } from 'astro';
import { PREVIEW_COOKIE_NAME, PREVIEW_SECRET } from '@lib/preview';

export const prerender = false;

export const GET: APIRoute = ({ url, cookies, redirect }) => {
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
