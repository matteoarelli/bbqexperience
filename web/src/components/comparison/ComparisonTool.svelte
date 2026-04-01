<script lang="ts">
  /**
   * Strumento confronto prodotti — orchestratore che gestisce selezione, URL sync e visualizzazione
   * Svelte 5 con runes ($state, $effect, $derived)
   */
  import ProductSelector from './ProductSelector.svelte';
  import ComparisonTable from './ComparisonTable.svelte';

  // Interfaccia locale per i dati delle recensioni (duplicata per isolamento island)
  interface ComparisonReview {
    documentId: string;
    title: string;
    score_overall: number;
    score_build_quality: number | null;
    score_performance: number | null;
    score_value: number | null;
    score_ease_of_use: number | null;
    pros: string[] | null;
    cons: string[] | null;
    product: {
      name: string;
      brand: string | null;
      category: string | null;
      price_range: string | null;
      specifications: Record<string, unknown> | null;
      images: Array<{ url: string; alternativeText: string | null }> | null;
    } | null;
  }

  interface Props {
    strapiUrl: string;
    locale: string;
    labels: Record<string, string>;
    initialIds?: string[];
  }

  let { strapiUrl, locale, labels, initialIds = [] }: Props = $props();

  // Stato principale
  let selectedIds = $state<string[]>([]);
  let reviews = $state<ComparisonReview[]>([]);
  let isLoading = $state(false);
  let linkCopied = $state(false);

  // Mappa nomi prodotti per le pill (aggiornata con i fetch)
  let productNames = $state<Record<string, string>>({});

  // Contatore selezionati con template
  const selectedCountText = $derived(
    (labels.selectedCount || '{count} of {max} products selected')
      .replace('{count}', String(selectedIds.length))
      .replace('{max}', '5')
  );

  // Inizializzazione: leggi IDs da URL o usa initialIds
  $effect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const idsParam = urlParams.get('ids');
      if (idsParam) {
        selectedIds = idsParam.split(',').filter(Boolean);
      } else if (initialIds.length > 0) {
        selectedIds = [...initialIds];
      }
    }
    // Effetto di init, eseguito una sola volta — usiamo return vuoto
  });

  // Sincronizza URL quando cambiano gli IDs selezionati
  $effect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (selectedIds.length > 0) {
      params.set('ids', selectedIds.join(','));
    } else {
      params.delete('ids');
    }
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  });

  // Fetch recensioni quando cambiano gli IDs selezionati (minimo 2)
  $effect(() => {
    const ids = selectedIds;
    if (ids.length < 2) {
      reviews = [];
      return;
    }

    isLoading = true;
    const promises = ids.map(id =>
      fetch(`${strapiUrl}/api/reviews/${id}?populate=product&locale=${locale}&status=published`)
        .then(r => {
          if (!r.ok) throw new Error(`Errore fetch review ${id}`);
          return r.json();
        })
        .then(json => json.data as ComparisonReview)
    );

    Promise.all(promises)
      .then(data => {
        reviews = data.filter(Boolean);
        // Aggiorna mappa nomi prodotti per le pill
        const names: Record<string, string> = {};
        for (const review of data) {
          if (review) {
            names[review.documentId] = review.product?.name || review.title;
          }
        }
        productNames = { ...productNames, ...names };
      })
      .catch(err => {
        console.error('Errore nel caricamento delle recensioni:', err);
        reviews = [];
      })
      .finally(() => {
        isLoading = false;
      });
  });

  // Gestione aggiunta prodotto
  function handleSelect(documentId: string) {
    if (selectedIds.length >= 5 || selectedIds.includes(documentId)) return;
    selectedIds = [...selectedIds, documentId];
  }

  // Gestione rimozione prodotto
  function handleRemove(documentId: string) {
    selectedIds = selectedIds.filter(id => id !== documentId);
  }

  // Copia link negli appunti
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      linkCopied = true;
      setTimeout(() => { linkCopied = false; }, 2000);
    } catch {
      // Fallback per browser senza clipboard API
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      linkCopied = true;
      setTimeout(() => { linkCopied = false; }, 2000);
    }
  }
</script>

<div class="comparison-tool">
  <!-- Selettore prodotti -->
  <ProductSelector
    {strapiUrl}
    {locale}
    {selectedIds}
    maxProducts={5}
    {labels}
    onselect={handleSelect}
    onremove={handleRemove}
  />

  <!-- Contatore prodotti selezionati -->
  <p class="selected-count">
    {selectedCountText}
  </p>

  <!-- Stato di caricamento -->
  {#if isLoading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>{labels.loading || 'Loading...'}</p>
    </div>
  {:else if reviews.length >= 2}
    <!-- Tabella comparativa -->
    <ComparisonTable {reviews} {labels} {strapiUrl} />

    <!-- Pulsante copia link -->
    <div class="share-section">
      <button
        type="button"
        class="copy-link-btn"
        onclick={copyLink}
      >
        {linkCopied
          ? (labels.linkCopied || 'Link copied!')
          : (labels.copyLink || 'Copy comparison link')}
      </button>
    </div>
  {:else if selectedIds.length > 0 && selectedIds.length < 2}
    <!-- Messaggio minimo 2 prodotti -->
    <div class="empty-state">
      <p>{labels.minProducts || 'Select at least 2 products to compare'}</p>
    </div>
  {:else}
    <!-- Stato vuoto iniziale -->
    <div class="empty-state">
      <p>{labels.minProducts || 'Select at least 2 products to compare'}</p>
    </div>
  {/if}
</div>

<style>
  .comparison-tool {
    width: 100%;
  }

  .selected-count {
    margin-top: 0.75rem;
    margin-bottom: 1.5rem;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    gap: 1rem;
    color: var(--color-text-muted);
  }

  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid var(--color-border-default);
    border-top-color: var(--color-accent-fire);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .empty-state {
    padding: 3rem 1rem;
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--text-base);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-lg);
    border: 1px dashed var(--color-border-default);
  }

  .share-section {
    margin-top: 1.5rem;
    display: flex;
    justify-content: center;
  }

  .copy-link-btn {
    padding: 0.625rem 1.5rem;
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .copy-link-btn:hover {
    border-color: var(--color-accent-fire);
    color: var(--color-accent-fire);
  }
</style>
