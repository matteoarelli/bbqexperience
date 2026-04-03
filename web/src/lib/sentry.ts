// Inizializzazione Sentry — error tracking per BBQ Experience
import * as Sentry from '@sentry/node';

const SENTRY_DSN = import.meta.env.SENTRY_DSN || '';

let initialized = false;

export function initSentry(): void {
  if (initialized || !SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE || 'production',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });

  initialized = true;
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!SENTRY_DSN) {
    console.error('Errore non tracciato (Sentry non configurato):', error);
    return;
  }

  if (!initialized) initSentry();

  if (context) {
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}
