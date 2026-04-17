/**
 * Helper per aggiornamento localizzato Strapi v5.
 *
 * Pattern: PUT /api/{contentType}/{documentId}?locale=xx
 * con slug sempre incluso nel body (convenzione CLAUDE.md).
 *
 * Usato da script CMS-side e future fasi (Phase 14+).
 */

/** Opzioni per l'aggiornamento localizzato */
interface UpdateLocalizedOptions {
  /** Tipo di contenuto Strapi (es. "recipe-collections") */
  contentType: string;
  /** Document ID dell'entry da aggiornare */
  documentId: string;
  /** Locale target (es. "it", "es") */
  locale: string;
  /** Dati da aggiornare — DEVE contenere "slug" per convenzione */
  data: Record<string, unknown> & { slug: string };
}

/** Risposta standard Strapi v5 */
interface StrapiResponse<T = Record<string, unknown>> {
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Esegue un PUT localizzato verso Strapi v5.
 *
 * Costruisce l'URL con ?locale=xx e invia il body con { data } wrapping.
 * Il campo slug e obbligatorio nel body per garantire coerenza cross-locale.
 *
 * @param options - Configurazione della richiesta (contentType, documentId, locale, data)
 * @param config - Configurazione opzionale (baseUrl, token) — fallback su env vars
 * @returns Risposta Strapi parsata
 * @throws Error se la risposta non e ok (status != 2xx)
 */
export async function updateLocalized(
  options: UpdateLocalizedOptions,
  config?: { baseUrl?: string; token?: string },
): Promise<StrapiResponse> {
  // Recupera configurazione da parametri o variabili d'ambiente
  const baseUrl =
    config?.baseUrl || process.env.STRAPI_URL || "http://localhost:1337";
  const token = config?.token || process.env.STRAPI_API_TOKEN || "";

  // Costruisce URL con locale nel query param
  const url = `${baseUrl}/api/${options.contentType}/${options.documentId}?locale=${options.locale}`;

  // Esegue PUT con timeout 10s (convenzione CLAUDE.md)
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: options.data }),
    signal: AbortSignal.timeout(10_000),
  });

  // Gestione errori con dettagli
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `updateLocalized ${options.contentType}/${options.documentId}?locale=${options.locale} -> ${response.status}: ${errorBody}`,
    );
  }

  // Parsa e ritorna risposta JSON
  return (await response.json()) as StrapiResponse;
}
