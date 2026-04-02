<!--
  BookmarksList — Componente Svelte 5 per rendering client-side dei bookmark salvati
  Legge i dati da localStorage e mostra una griglia di elementi salvati
-->
<script lang="ts">
  /* Props del componente */
  let {
    locale,
    labels,
  }: {
    locale: string;
    labels: {
      title: string;
      empty: string;
      clearAll: string;
      review: string;
      recipe: string;
      tutorial: string;
      blog: string;
    };
  } = $props();

  const STORAGE_KEY = 'bbq-bookmarks';

  interface BookmarkItem {
    slug: string;
    title: string;
    contentType: string;
    locale: string;
  }

  /* Stato reattivo dei bookmark */
  let bookmarks = $state<BookmarkItem[]>([]);

  /* Mappa tipo contenuto → route localizzate */
  const routeMap: Record<string, Record<string, string>> = {
    review: { en: 'reviews', it: 'recensioni', es: 'resenas' },
    recipe: { en: 'recipes', it: 'ricette', es: 'recetas' },
    tutorial: { en: 'tutorials', it: 'guide', es: 'tutoriales' },
    blog: { en: 'blog', it: 'blog', es: 'blog' },
  };

  /* Mappa colori badge per tipo */
  const badgeColors: Record<string, { bg: string; text: string; border: string }> = {
    review: { bg: 'rgba(249, 115, 22, 0.12)', text: '#f97316', border: 'rgba(249, 115, 22, 0.25)' },
    recipe: { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.25)' },
    tutorial: { bg: 'rgba(156, 163, 175, 0.12)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.25)' },
    blog: { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.25)' },
  };

  /* Label tipo tradotta */
  const typeLabels: Record<string, string> = {
    review: labels.review,
    recipe: labels.recipe,
    tutorial: labels.tutorial,
    blog: labels.blog,
  };

  /* Carica bookmark dal localStorage */
  $effect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      bookmarks = raw ? JSON.parse(raw) : [];
    } catch {
      bookmarks = [];
    }
  });

  /* Genera URL per un bookmark */
  function getHref(item: BookmarkItem): string {
    const route = routeMap[item.contentType]?.[locale] || item.contentType;
    return `/${locale}/${route}/${item.slug}/`;
  }

  /* Rimuovi un singolo bookmark */
  function removeBookmark(slug: string) {
    bookmarks = bookmarks.filter((b) => b.slug !== slug);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  }

  /* Cancella tutti i bookmark */
  function clearAll() {
    bookmarks = [];
    localStorage.removeItem(STORAGE_KEY);
  }
</script>

<div class="bookmarks-container">
  {#if bookmarks.length === 0}
    <!-- Stato vuoto -->
    <div class="empty-state">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
      <p class="empty-text">{labels.empty}</p>
    </div>
  {:else}
    <!-- Header con conteggio e pulsante cancella tutto -->
    <div class="bookmarks-header">
      <span class="bookmarks-count">{bookmarks.length} {bookmarks.length === 1 ? 'item' : 'items'}</span>
      <button onclick={clearAll} class="clear-btn" type="button">
        {labels.clearAll}
      </button>
    </div>

    <!-- Griglia bookmark -->
    <div class="bookmarks-grid">
      {#each bookmarks as item (item.slug)}
        {@const colors = badgeColors[item.contentType] || badgeColors.blog}
        <div class="bookmark-card">
          <div class="bookmark-card-header">
            <span
              class="type-badge"
              style="background: {colors.bg}; color: {colors.text}; border-color: {colors.border};"
            >
              {typeLabels[item.contentType] || item.contentType}
            </span>
            <button
              onclick={() => removeBookmark(item.slug)}
              class="remove-btn"
              type="button"
              aria-label="Remove"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <a href={getHref(item)} class="bookmark-link">
            {item.title}
          </a>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .bookmarks-container {
    min-height: 300px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    color: var(--color-text-muted);
    text-align: center;
    gap: 1rem;
  }

  .empty-text {
    font-size: var(--text-lg);
    color: var(--color-text-muted);
    margin: 0;
  }

  .bookmarks-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-6);
  }

  .bookmarks-count {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-family: var(--font-heading);
  }

  .clear-btn {
    background: none;
    border: 1px solid var(--color-border-subtle);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    padding: 0.35rem 0.75rem;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-family: var(--font-body);
    transition: color var(--transition-fast), border-color var(--transition-fast);
  }

  .clear-btn:hover {
    color: #ef4444;
    border-color: #ef4444;
  }

  .bookmarks-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }

  @media (min-width: 640px) {
    .bookmarks-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .bookmarks-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .bookmark-card {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    transition: border-color var(--transition-fast);
  }

  .bookmark-card:hover {
    border-color: var(--color-border-default);
  }

  .bookmark-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .type-badge {
    display: inline-flex;
    align-items: center;
    font-family: var(--font-heading);
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.15rem 0.5rem;
    border-radius: 9999px;
    border: 1px solid;
    line-height: 1.4;
    white-space: nowrap;
  }

  .remove-btn {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color var(--transition-fast);
  }

  .remove-btn:hover {
    color: #ef4444;
  }

  .bookmark-link {
    font-family: var(--font-heading);
    font-size: var(--text-base);
    font-weight: 600;
    color: var(--color-text-primary);
    text-decoration: none;
    line-height: 1.3;
    transition: color var(--transition-fast);
  }

  .bookmark-link:hover {
    color: var(--color-accent-fire);
  }
</style>
