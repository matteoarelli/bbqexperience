<script lang="ts">
  /**
   * Selettore prodotti per confronto — permette di cercare e aggiungere recensioni (max 5)
   * Svelte 5 con runes ($state, $effect)
   */

  interface Props {
    locale: string;
    selectedIds: string[];
    maxProducts?: number;
    labels: Record<string, string>;
  }

  interface SearchResult {
    documentId: string;
    title: string;
    productName: string;
    score: number;
  }

  let {
    locale,
    selectedIds,
    maxProducts = 5,
    labels,
    onselect,
    onremove,
  }: Props & {
    onselect?: (id: string) => void;
    onremove?: (id: string) => void;
  } = $props();

  // Stato interno della ricerca
  let query = $state('');
  let results = $state<SearchResult[]>([]);
  let isSearching = $state(false);
  let showDropdown = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Effetto per la ricerca con debounce
  $effect(() => {
    if (debounceTimer) clearTimeout(debounceTimer);

    if (query.length < 2) {
      results = [];
      showDropdown = false;
      return;
    }

    debounceTimer = setTimeout(async () => {
      isSearching = true;
      try {
        const encodedQuery = encodeURIComponent(query);
        const response = await fetch(`/api/reviews?search=${encodedQuery}&locale=${locale}`);
        if (!response.ok) throw new Error('Errore ricerca');
        const json = await response.json();

        results = (json.data || []).map((item: any) => ({
          documentId: item.documentId,
          title: item.title,
          productName: item.product?.name || item.title,
          score: item.score_overall || 0,
        }));
        showDropdown = true;
      } catch (err) {
        console.error('Errore nella ricerca prodotti:', err);
        results = [];
      } finally {
        isSearching = false;
      }
    }, 300);
  });

  // Gestione selezione prodotto
  function handleSelect(documentId: string) {
    if (selectedIds.length >= maxProducts || selectedIds.includes(documentId)) return;
    onselect?.(documentId);
    query = '';
    results = [];
    showDropdown = false;
  }

  // Gestione rimozione prodotto
  function handleRemove(documentId: string) {
    onremove?.(documentId);
  }

  // Chiudi dropdown su click fuori
  function handleBlur() {
    // Ritardo per permettere il click sugli elementi del dropdown
    setTimeout(() => {
      showDropdown = false;
    }, 200);
  }
</script>

<div class="product-selector">
  <!-- Input di ricerca -->
  <div class="search-wrapper">
    <input
      type="text"
      placeholder={labels.searchPlaceholder || 'Search reviews to compare...'}
      bind:value={query}
      onblur={handleBlur}
      onfocus={() => { if (results.length > 0 && query.length >= 2) showDropdown = true; }}
      class="search-input"
    />
    {#if isSearching}
      <span class="search-spinner"></span>
    {/if}

    <!-- Dropdown risultati -->
    {#if showDropdown && results.length > 0}
      <div class="results-dropdown">
        {#each results as result (result.documentId)}
          {@const isSelected = selectedIds.includes(result.documentId)}
          {@const isFull = selectedIds.length >= maxProducts}
          <button
            type="button"
            class="result-item"
            disabled={isSelected || isFull}
            onclick={() => handleSelect(result.documentId)}
          >
            <div class="result-info">
              <span class="result-name">{result.productName}</span>
              <span class="result-score">{result.score.toFixed(1)}</span>
            </div>
            <span class="result-action">
              {isSelected ? '✓' : (labels.addProduct || 'Add')}
            </span>
          </button>
        {/each}
      </div>
    {:else if showDropdown && query.length >= 2 && !isSearching}
      <div class="results-dropdown">
        <div class="no-results">{labels.noResults || 'No reviews found'}</div>
      </div>
    {/if}
  </div>

  <!-- Prodotti selezionati come pill -->
  {#if selectedIds.length > 0}
    <div class="selected-pills">
      {#each selectedIds as id (id)}
        <span class="pill">
          <span class="pill-text">{id.substring(0, 8)}...</span>
          <button
            type="button"
            class="pill-remove"
            onclick={() => handleRemove(id)}
            aria-label={labels.removeProduct || 'Remove'}
          >
            &times;
          </button>
        </span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .product-selector {
    width: 100%;
  }

  .search-wrapper {
    position: relative;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    outline: none;
    transition: border-color var(--transition-fast);
  }

  .search-input:focus {
    border-color: var(--color-accent-fire);
  }

  .search-input::placeholder {
    color: var(--color-text-muted);
  }

  .search-spinner {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1rem;
    height: 1rem;
    border: 2px solid var(--color-border-default);
    border-top-color: var(--color-accent-fire);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: translateY(-50%) rotate(360deg); }
  }

  .results-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 0.25rem;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    max-height: 300px;
    overflow-y: auto;
    z-index: 50;
  }

  .result-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--color-border-subtle);
    color: var(--color-text-primary);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: var(--text-sm);
    text-align: left;
    transition: background-color var(--transition-fast);
  }

  .result-item:last-child {
    border-bottom: none;
  }

  .result-item:hover:not(:disabled) {
    background: var(--color-bg-tertiary);
  }

  .result-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .result-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
  }

  .result-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-score {
    flex-shrink: 0;
    padding: 0.125rem 0.5rem;
    background: var(--color-accent-fire);
    color: var(--color-text-inverse);
    border-radius: var(--radius-full);
    font-family: var(--font-heading);
    font-size: var(--text-xs);
    font-weight: 700;
  }

  .result-action {
    flex-shrink: 0;
    margin-left: 0.5rem;
    color: var(--color-accent-fire);
    font-weight: 600;
    font-size: var(--text-xs);
    text-transform: uppercase;
  }

  .no-results {
    padding: 1rem;
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .selected-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.75rem;
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-full);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .pill-text {
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pill-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 50%;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    transition: color var(--transition-fast), background-color var(--transition-fast);
  }

  .pill-remove:hover {
    color: var(--color-accent-fire);
    background: var(--color-bg-elevated);
  }
</style>
