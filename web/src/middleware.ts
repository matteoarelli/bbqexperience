// Middleware Astro — BBQ Experience
// Legge il cookie di anteprima e inietta lo stato preview nel contesto
import { defineMiddleware } from 'astro:middleware';
import { isPreviewMode } from '@lib/preview';

export const onRequest = defineMiddleware((context, next) => {
  // Imposta lo stato di anteprima nei locals per tutte le pagine
  context.locals.isPreview = isPreviewMode(context.cookies);

  return next();
});
