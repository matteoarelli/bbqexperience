// Middleware Astro — BBQ Experience
// Preview mode + Sentry error tracking + Security headers
import { defineMiddleware } from 'astro:middleware';
import { isPreviewMode } from '@lib/preview';
import { initSentry, captureError } from '@lib/sentry';

initSentry();

// Content Security Policy — report-only per non rompere nulla
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' cms.bbq-experience.com data: https://api.qrserver.com",
  "connect-src 'self' cms.bbq-experience.com *.sentry.io",
  "frame-src youtube-nocookie.com www.youtube-nocookie.com instagram.com www.instagram.com",
  "font-src 'self'",
  "media-src 'self' cms.bbq-experience.com",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.isPreview = isPreviewMode(context.cookies);

  try {
    const response = await next();

    // Aggiungi CSP in report-only mode
    response.headers.set('Content-Security-Policy-Report-Only', CSP);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
  } catch (error) {
    captureError(error, {
      url: context.url.pathname,
      method: context.request.method,
    });
    throw error;
  }
});
