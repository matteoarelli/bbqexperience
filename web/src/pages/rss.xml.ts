// Feed RSS globale — redirige alla versione inglese
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ redirect }) => {
  return redirect('/en/rss.xml', 301);
};
