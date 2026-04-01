// Configurazione server Strapi con header webhook per rebuild automatico
export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', 'http://localhost:1337'),
  app: {
    keys: env.array('APP_KEYS'),
  },
  webhooks: {
    // Header personalizzato inviato con ogni webhook Strapi
    // Usato per autenticare le richieste di rebuild verso adnanh/webhook
    defaultHeaders: {
      'X-Rebuild-Secret': env('REBUILD_SECRET_TOKEN', ''),
    },
  },
});
