// Middleware Astro — BBQ Experience
// Preview mode + Sentry error tracking
import { defineMiddleware } from 'astro:middleware';
import { isPreviewMode } from '@lib/preview';
import { initSentry, captureError } from '@lib/sentry';

// Inizializza Sentry al primo request
initSentry();

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.isPreview = isPreviewMode(context.cookies);

  try {
    return await next();
  } catch (error) {
    captureError(error, {
      url: context.url.pathname,
      method: context.request.method,
    });
    throw error;
  }
});
