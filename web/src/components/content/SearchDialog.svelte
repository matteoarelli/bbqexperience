<!--
  SearchDialog.svelte — Dialog di ricerca con API Strapi e filtri per tipo contenuto
  Componente Svelte 5 (runes) con ricerca server-side via /api/search.
  Uso in Astro: <SearchDialog client:idle locale="en" translations={...} />
-->
<script lang="ts">
  // Props del componente
  let {
    locale = 'en',
    translations = {} as Record<string, string>,
  }: {
    locale?: string;
    translations?: Record<string, string>;
  } = $props();

  // Testi con fallback
  const t = (key: string, fallback: string) => translations[key] || fallback;

  // Tipi di contenuto per i filtri
  type ContentFilter = 'all' | 'reviews' | 'recipes' | 'tutorials' | 'blog';

  const filterLabels: Record<ContentFilter, string> = {
    all: 'All',
    reviews: 'Reviews',
    recipes: 'Recipes',
    tutorials: 'Tutorials',
    blog: 'Blog',
  };

  // Stato reattivo
  let isOpen = $state(false);
  let query = $state('');
  let activeFilter = $state<ContentFilter>('all');
  let results = $state<SearchResult[]>([]);
  let isSearching = $state(false);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let inputRef: HTMLInputElement | undefined = $state();

  interface SearchResult {
    url: string;
    title: string;
    excerpt: string;
    contentType: string;
  }

  // Esegui la ricerca tramite API proxy
  async function performSearch(searchQuery: string) {
    if (!searchQuery.trim()) {
      results = [];
      isSearching = false;
      return;
    }

    isSearching = true;

    try {
      const filterParam = activeFilter === 'all' ? 'all' : activeFilter;
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&locale=${locale}&filter=${filterParam}`
      );

      if (!response.ok) throw new Error(`Search error: ${response.status}`);

      const json = await response.json();
      results = json.results || [];
    } catch (e) {
      console.error('Errore durante la ricerca:', e);
      results = [];
    } finally {
      isSearching = false;
    }
  }

  // Risultati filtrati per tipo di contenuto (filtro gia applicato lato server,
  // ma manteniamo filtro client-side per cambio tab senza re-fetch)
  let filteredResults = $derived(
    activeFilter === 'all'
      ? results
      : results.filter((r) => r.contentType === activeFilter)
  );

  // Gestione input con debounce 300ms
  function onInput(e: Event) {
    const target = e.target as HTMLInputElement;
    query = target.value;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      performSearch(query);
    }, 300);
  }

  // Cambio filtro: ri-esegui la ricerca con tutti i tipi per avere risultati completi
  function setFilter(filter: ContentFilter) {
    activeFilter = filter;
    if (query.trim()) {
      performSearch(query);
    }
  }

  // Apertura dialog
  function openDialog() {
    isOpen = true;
    // Focus sull'input dopo il rendering
    setTimeout(() => inputRef?.focus(), 50);
  }

  // Chiusura dialog
  function closeDialog() {
    isOpen = false;
    query = '';
    results = [];
    activeFilter = 'all';
  }

  // Chiudi con Escape o click sul backdrop
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closeDialog();
  }

  function onBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('search-backdrop')) {
      closeDialog();
    }
  }

  // Badge per tipo contenuto
  function getBadgeLabel(type: string): string {
    return filterLabels[type as ContentFilter] || type;
  }
</script>

<!-- Pulsante trigger ricerca -->
<button
  class="search-trigger"
  onclick={openDialog}
  type="button"
  aria-label={t('searchPlaceholder', 'Search')}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
  <span>{t('searchPlaceholder', 'Search')}</span>
</button>

<!-- Dialog modale -->
{#if isOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="search-backdrop"
    onclick={onBackdropClick}
    onkeydown={onKeydown}
  >
    <div class="search-dialog" role="dialog" aria-modal="true" aria-label={t('searchPlaceholder', 'Search')}>
      <!-- Input di ricerca -->
      <div class="search-input-wrapper">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="search-input-icon"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          bind:this={inputRef}
          type="search"
          class="search-input"
          placeholder={t('searchPlaceholder', 'Search articles, recipes, reviews...')}
          aria-label={t('searchPlaceholder', 'Search articles, recipes, reviews...')}
          value={query}
          oninput={onInput}
          onkeydown={onKeydown}
        />
        <button class="search-close-btn" onclick={closeDialog} type="button" aria-label="Close">
          <kbd>ESC</kbd>
        </button>
      </div>

      <!-- Filtri per tipo di contenuto -->
      <div class="search-filters">
        {#each Object.entries(filterLabels) as [key, label] (key)}
          <button
            class="search-filter-btn"
            class:search-filter-btn--active={activeFilter === key}
            onclick={() => setFilter(key as ContentFilter)}
            type="button"
            aria-pressed={activeFilter === key}
          >
            {label}
          </button>
        {/each}
      </div>

      <!-- Area risultati -->
      <div class="search-results">
        {#if isSearching}
          <p class="search-status">{t('searching', 'Searching...')}</p>
        {:else if query && filteredResults.length === 0}
          <p class="search-status">{t('noArticles', 'No results found.')}</p>
        {:else if filteredResults.length > 0}
          <ul class="search-results-list">
            {#each filteredResults as result (result.url)}
              <li>
                <a href={result.url} class="search-result-item" onclick={closeDialog}>
                  <div class="search-result-header">
                    <span class="search-result-title">{result.title}</span>
                    <span class="search-result-badge">{getBadgeLabel(result.contentType)}</span>
                  </div>
                  <p class="search-result-excerpt">{@html result.excerpt}</p>
                </a>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="search-status search-status--hint">
            {t('searchHint', 'Type to search across all content.')}
          </p>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Pulsante trigger */
  .search-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    color: var(--color-text-muted);
    background: var(--color-border-subtle);
    border: 1px solid var(--color-border-subtle);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: color 150ms ease, border-color 150ms ease, background 150ms ease;
  }

  .search-trigger:hover {
    color: var(--color-text-primary);
    border-color: var(--color-border-default);
    background: var(--color-bg-tertiary);
  }

  /* Backdrop modale */
  .search-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 10vh;
    background: color-mix(in srgb, var(--color-bg-primary) 70%, transparent);
    backdrop-filter: blur(4px);
  }

  /* Dialog */
  .search-dialog {
    width: 100%;
    max-width: 600px;
    max-height: 70vh;
    margin: 0 1rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-default);
    border-radius: 0.75rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-lg);
  }

  /* Input wrapper */
  .search-input-wrapper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border-default);
  }

  .search-input-icon {
    flex-shrink: 0;
    color: var(--color-text-muted);
  }

  .search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-size: 1rem;
    color: var(--color-text-primary);
    font-family: inherit;
  }

  .search-input::placeholder {
    color: var(--color-text-muted);
  }

  .search-close-btn {
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .search-close-btn kbd {
    display: inline-block;
    padding: 0.15rem 0.4rem;
    font-size: 0.7rem;
    font-family: inherit;
    color: var(--color-text-muted);
    background: var(--color-border-subtle);
    border: 1px solid var(--color-border-default);
    border-radius: 0.25rem;
  }

  /* Filtri */
  .search-filters {
    display: flex;
    gap: 0.25rem;
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid var(--color-border-default);
    overflow-x: auto;
    scrollbar-width: none;
  }

  .search-filters::-webkit-scrollbar {
    display: none;
  }

  .search-filter-btn {
    flex-shrink: 0;
    padding: 0.35rem 0.75rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-text-muted);
    background: var(--color-border-subtle);
    border: 1px solid transparent;
    border-radius: 9999px;
    cursor: pointer;
    transition: all 150ms ease;
  }

  .search-filter-btn:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-tertiary);
  }

  .search-filter-btn--active {
    color: var(--color-accent-fire);
    background: color-mix(in srgb, var(--color-accent-fire) 10%, transparent);
    border-color: color-mix(in srgb, var(--color-accent-fire) 30%, transparent);
  }

  /* Risultati */
  .search-results {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem 0;
  }

  .search-status {
    text-align: center;
    padding: 2rem 1.25rem;
    color: var(--color-text-muted);
    font-size: 0.875rem;
  }

  .search-status--hint {
    color: var(--color-accent-smoke);
  }

  .search-results-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .search-result-item {
    display: block;
    padding: 0.75rem 1.25rem;
    text-decoration: none;
    color: inherit;
    transition: background 150ms ease;
  }

  .search-result-item:hover {
    background: var(--color-border-subtle);
  }

  .search-result-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.25rem;
  }

  .search-result-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text-primary);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .search-result-badge {
    flex-shrink: 0;
    padding: 0.15rem 0.5rem;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-accent-fire);
    background: color-mix(in srgb, var(--color-accent-fire) 10%, transparent);
    border-radius: 9999px;
  }

  .search-result-excerpt {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Evidenziazione negli excerpt */
  .search-result-excerpt :global(mark) {
    background: color-mix(in srgb, var(--color-accent-fire) 25%, transparent);
    color: var(--color-text-primary);
    border-radius: 2px;
    padding: 0 2px;
  }
</style>
