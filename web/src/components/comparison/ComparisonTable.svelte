<script lang="ts">
  /**
   * Tabella comparativa — mostra recensioni fianco a fianco con evidenziazione del punteggio migliore
   * Svelte 5 con runes
   */

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
    reviews: ComparisonReview[];
    labels: Record<string, string>;
  }

  let { reviews, labels }: Props = $props();

  // Righe punteggio con chiave e label
  const scoreRows = $derived([
    { key: 'score_overall', label: labels.overallScore || 'Overall Score' },
    { key: 'score_build_quality', label: labels.buildQuality || 'Build Quality' },
    { key: 'score_performance', label: labels.performance || 'Performance' },
    { key: 'score_value', label: labels.value || 'Value' },
    { key: 'score_ease_of_use', label: labels.easeOfUse || 'Ease of Use' },
  ]);

  // Unione di tutte le chiavi specifiche da tutti i prodotti
  const specKeys = $derived(() => {
    const keys = new Set<string>();
    for (const review of reviews) {
      if (review.product?.specifications) {
        for (const key of Object.keys(review.product.specifications)) {
          keys.add(key);
        }
      }
    }
    return Array.from(keys).sort();
  });

  // Trova il valore massimo per una riga di punteggio
  function getMaxScore(key: string): number {
    let max = -Infinity;
    for (const review of reviews) {
      const val = (review as any)[key];
      if (typeof val === 'number' && val > max) {
        max = val;
      }
    }
    return max;
  }

  // Verifica se un punteggio e il migliore (per evidenziazione)
  function isWinner(key: string, value: number | null): boolean {
    if (value === null || value === undefined) return false;
    return value === getMaxScore(key);
  }

  // Costruisci URL immagine prodotto
  function getProductImageUrl(review: ComparisonReview): string | null {
    const img = review.product?.images?.[0];
    if (!img) return null;
    // Le immagini arrivano gia con URL assoluti dal proxy
    return img.url;
  }

  // Iniziale prodotto per placeholder
  function getProductInitial(review: ComparisonReview): string {
    return (review.product?.name || review.title || '?').charAt(0).toUpperCase();
  }

  // Formatta chiave specifica per visualizzazione
  function formatSpecKey(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  }
</script>

<div class="comparison-table-container">
  <div class="table-scroll">
    <table class="comparison-table">
      <!-- Header con nomi prodotti -->
      <thead>
        <tr class="header-row">
          <th class="label-cell sticky-left"></th>
          {#each reviews as review (review.documentId)}
            <th class="product-header">
              {review.product?.name || review.title}
            </th>
          {/each}
        </tr>
      </thead>

      <tbody>
        <!-- Immagine prodotto -->
        <tr>
          <td class="label-cell sticky-left"></td>
          {#each reviews as review (review.documentId)}
            <td class="data-cell image-cell">
              {#if getProductImageUrl(review)}
                <img
                  src={getProductImageUrl(review)}
                  alt={review.product?.images?.[0]?.alternativeText || review.product?.name || ''}
                  class="product-image"
                />
              {:else}
                <div class="product-placeholder">
                  {getProductInitial(review)}
                </div>
              {/if}
            </td>
          {/each}
        </tr>

        <!-- Brand -->
        <tr>
          <td class="label-cell sticky-left">{labels.brand || 'Brand'}</td>
          {#each reviews as review (review.documentId)}
            <td class="data-cell">{review.product?.brand || '—'}</td>
          {/each}
        </tr>

        <!-- Categoria -->
        <tr>
          <td class="label-cell sticky-left">{labels.category || 'Category'}</td>
          {#each reviews as review (review.documentId)}
            <td class="data-cell capitalize">{review.product?.category || '—'}</td>
          {/each}
        </tr>

        <!-- Fascia di prezzo -->
        <tr>
          <td class="label-cell sticky-left">{labels.priceRange || 'Price Range'}</td>
          {#each reviews as review (review.documentId)}
            <td class="data-cell capitalize">{review.product?.price_range || '—'}</td>
          {/each}
        </tr>

        <!-- Separatore sezione punteggi -->
        <tr class="section-header">
          <td colspan={reviews.length + 1}>
            {labels.scores || 'Scores'}
          </td>
        </tr>

        <!-- Righe punteggio -->
        {#each scoreRows as row (row.key)}
          <tr>
            <td class="label-cell sticky-left">{row.label}</td>
            {#each reviews as review (review.documentId)}
              {@const value = (review as any)[row.key]}
              {@const winner = isWinner(row.key, value)}
              <td
                class="data-cell score-cell"
                class:winner
              >
                {value !== null && value !== undefined ? value.toFixed(1) : '—'}
                {#if winner && reviews.length > 1}
                  <span class="winner-badge">{labels.winner || 'Best'}</span>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}

        <!-- Separatore sezione specifiche -->
        {#if specKeys().length > 0}
          <tr class="section-header">
            <td colspan={reviews.length + 1}>
              {labels.specs || 'Specifications'}
            </td>
          </tr>

          {#each specKeys() as specKey (specKey)}
            <tr>
              <td class="label-cell sticky-left">{formatSpecKey(specKey)}</td>
              {#each reviews as review (review.documentId)}
                <td class="data-cell">
                  {review.product?.specifications?.[specKey] != null
                    ? String(review.product.specifications[specKey])
                    : '—'}
                </td>
              {/each}
            </tr>
          {/each}
        {/if}

        <!-- Separatore sezione verdetto -->
        <tr class="section-header">
          <td colspan={reviews.length + 1}>
            {labels.verdict || 'Verdict'}
          </td>
        </tr>

        <!-- Pro -->
        <tr>
          <td class="label-cell sticky-left">{labels.pros || 'Pros'}</td>
          {#each reviews as review (review.documentId)}
            <td class="data-cell pros-cons-cell">
              {#if review.pros && review.pros.length > 0}
                <ul class="pros-list">
                  {#each review.pros as pro}
                    <li>{pro}</li>
                  {/each}
                </ul>
              {:else}
                <span class="no-data">—</span>
              {/if}
            </td>
          {/each}
        </tr>

        <!-- Contro -->
        <tr>
          <td class="label-cell sticky-left">{labels.cons || 'Cons'}</td>
          {#each reviews as review (review.documentId)}
            <td class="data-cell pros-cons-cell">
              {#if review.cons && review.cons.length > 0}
                <ul class="cons-list">
                  {#each review.cons as con}
                    <li>{con}</li>
                  {/each}
                </ul>
              {:else}
                <span class="no-data">—</span>
              {/if}
            </td>
          {/each}
        </tr>
      </tbody>
    </table>
  </div>
</div>

<style>
  .comparison-table-container {
    background: var(--color-bg-secondary);
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--color-border-subtle);
  }

  .table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .comparison-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 600px;
  }

  .header-row {
    background: var(--color-bg-tertiary);
  }

  .product-header {
    padding: 1rem;
    font-family: var(--font-heading);
    font-size: var(--text-sm);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-primary);
    text-align: center;
    min-width: 180px;
    position: sticky;
    top: 0;
    background: var(--color-bg-tertiary);
    z-index: 5;
  }

  .label-cell {
    padding: 0.75rem 1rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-align: left;
    min-width: 140px;
    font-size: var(--text-sm);
    border-bottom: 1px solid var(--color-border-subtle);
    white-space: nowrap;
  }

  .sticky-left {
    position: sticky;
    left: 0;
    background: var(--color-bg-secondary);
    z-index: 2;
  }

  .data-cell {
    padding: 0.75rem 1rem;
    text-align: center;
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    border-bottom: 1px solid var(--color-border-subtle);
    min-width: 150px;
    vertical-align: top;
  }

  .capitalize {
    text-transform: capitalize;
  }

  .score-cell {
    font-family: var(--font-heading);
    font-size: var(--text-lg);
    color: var(--color-text-primary);
    position: relative;
  }

  .score-cell.winner {
    background-color: color-mix(in srgb, var(--color-accent-fire) 15%, transparent);
    font-weight: bold;
    color: var(--color-accent-fire);
  }

  .winner-badge {
    display: block;
    font-size: var(--text-xs);
    font-family: var(--font-body);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.125rem;
    opacity: 0.8;
  }

  .section-header td {
    padding: 0.75rem 1rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-accent-fire);
    font-family: var(--font-heading);
    font-size: var(--text-sm);
    font-weight: 700;
    background: var(--color-bg-tertiary);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .image-cell {
    padding: 1rem;
  }

  .product-image {
    max-height: 120px;
    max-width: 100%;
    object-fit: contain;
    margin: 0 auto;
    display: block;
    border-radius: var(--radius-md);
  }

  .product-placeholder {
    width: 80px;
    height: 80px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    font-family: var(--font-heading);
    font-size: var(--text-2xl);
    color: var(--color-accent-fire);
    font-weight: 700;
  }

  .pros-cons-cell {
    text-align: left;
  }

  .pros-list, .cons-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .pros-list li, .cons-list li {
    padding: 0.25rem 0;
    font-size: var(--text-xs);
    line-height: 1.5;
  }

  .pros-list li::before {
    content: '+ ';
    color: var(--color-positive);
    font-weight: 700;
  }

  .cons-list li::before {
    content: '- ';
    color: var(--color-negative);
    font-weight: 700;
  }

  .no-data {
    color: var(--color-text-muted);
  }
</style>
