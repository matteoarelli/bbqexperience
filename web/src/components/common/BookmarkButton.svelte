<!--
  BookmarkButton — Componente Svelte 5 per salvare/rimuovere articoli dalla reading list
  Salva gli slug in localStorage con chiave "bbq-bookmarks"
-->
<script lang="ts">
  /* Props del componente */
  let {
    slug,
    title,
    contentType,
    locale,
    labelSave = 'Save to reading list',
    labelRemove = 'Remove from reading list',
  }: {
    slug: string;
    title: string;
    contentType: string;
    locale: string;
    labelSave?: string;
    labelRemove?: string;
  } = $props();

  /* Stato reattivo per il bookmark */
  let isBookmarked = $state(false);

  /* Chiave localStorage */
  const STORAGE_KEY = 'bbq-bookmarks';

  /* Tipo per un elemento salvato */
  interface BookmarkItem {
    slug: string;
    title: string;
    contentType: string;
    locale: string;
  }

  /* Legge i bookmark dal localStorage */
  function getBookmarks(): BookmarkItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /* Salva i bookmark nel localStorage */
  function saveBookmarks(items: BookmarkItem[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  /* Inizializzazione — controlla se l'articolo è già salvato */
  $effect(() => {
    const bookmarks = getBookmarks();
    isBookmarked = bookmarks.some((b) => b.slug === slug);
  });

  /* Toggle bookmark */
  function toggleBookmark() {
    const bookmarks = getBookmarks();
    const index = bookmarks.findIndex((b) => b.slug === slug);

    if (index >= 0) {
      bookmarks.splice(index, 1);
      isBookmarked = false;
    } else {
      bookmarks.push({ slug, title, contentType, locale });
      isBookmarked = true;
    }

    saveBookmarks(bookmarks);
  }
</script>

<button
  onclick={toggleBookmark}
  aria-label={isBookmarked ? labelRemove : labelSave}
  class="bookmark-btn"
  class:is-active={isBookmarked}
  type="button"
  title={isBookmarked ? labelRemove : labelSave}
>
  {#if isBookmarked}
    <!-- Icona cuore pieno — salvato -->
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="none" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  {:else}
    <!-- Icona cuore outline — non salvato -->
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  {/if}
</button>

<style>
  .bookmark-btn {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: var(--radius-md);
    transition: color var(--transition-fast), transform 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .bookmark-btn:hover {
    color: var(--color-accent-fire);
    transform: scale(1.1);
  }

  .bookmark-btn.is-active {
    color: var(--color-accent-fire);
  }

  .bookmark-btn:active {
    transform: scale(0.95);
  }
</style>
