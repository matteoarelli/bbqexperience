<script lang="ts">
/**
 * Drawer bottom-sheet mobile per filtri recensioni — Svelte 5 island.
 * Riceve URL pre-costruiti dal genitore Astro, non duplica la logica di buildFilterUrl.
 * Accessibilita: focus trap, chiusura con Escape, role="dialog" + aria-modal="true".
 */

// Tipi per le props ricevute dal genitore Astro
interface FilterOption {
  slug: string;
  name: string;
  count: number;
  url: string;
}

interface PriceBucketOption {
  key: string;
  label: string;
  count: number;
  url: string;
}

interface ScoreOption {
  value: string;
  label: string;
  count: number;
  url: string;
}

interface ActiveFilters {
  brand: string | null;
  category: string | null;
  score: string | null;
  price: string | null;
}

interface Props {
  brands: FilterOption[];
  categories: FilterOption[];
  priceBuckets: PriceBucketOption[];
  scoreThresholds: ScoreOption[];
  activeFilters: ActiveFilters;
  basePath: string;
  clearUrl: string;
  applyLabel: string;
  clearLabel: string;
  closeLabel: string;
  brandLabel: string;
  categoryLabel: string;
  priceLabel: string;
  scoreLabel: string;
  openLabel: string;
  resultsLabel: string;
}

let {
  brands,
  categories,
  priceBuckets,
  scoreThresholds,
  activeFilters,
  basePath,
  clearUrl,
  applyLabel,
  clearLabel,
  closeLabel,
  brandLabel,
  categoryLabel,
  priceLabel,
  scoreLabel,
  openLabel,
  resultsLabel,
}: Props = $props();

// Stato locale del drawer
let isOpen = $state(false);
let pendingBrand: string | null = $state(activeFilters.brand);
let pendingCategory: string | null = $state(activeFilters.category);
let pendingScore: string | null = $state(activeFilters.score);
let pendingPrice: string | null = $state(activeFilters.price);

// Conteggio filtri pendenti selezionati
let pendingCount = $derived(
  [pendingBrand, pendingCategory, pendingScore, pendingPrice].filter((v) => v != null).length
);

// Conteggio filtri attivi correnti (per il badge sul trigger)
let activeCount = $derived(
  [activeFilters.brand, activeFilters.category, activeFilters.score, activeFilters.price].filter((v) => v != null).length
);

// URL costruito dallo stato pendente per il bottone Apply
let applyUrl = $derived(() => {
  const params = new URLSearchParams();
  if (pendingBrand) params.set('brand', pendingBrand);
  if (pendingCategory) params.set('category', pendingCategory);
  if (pendingScore) params.set('score', pendingScore);
  if (pendingPrice) params.set('price', pendingPrice);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
});

// Riferimento al pannello per il focus trap
let drawerRef: HTMLElement | undefined = $state(undefined);

function openDrawer() {
  // Reset stato pendente ai filtri attivi correnti
  pendingBrand = activeFilters.brand;
  pendingCategory = activeFilters.category;
  pendingScore = activeFilters.score;
  pendingPrice = activeFilters.price;
  isOpen = true;
  // Blocca scroll body
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  isOpen = false;
  document.body.style.overflow = '';
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeDrawer();
    return;
  }
  // Focus trap: Tab e Shift+Tab restano dentro il drawer
  if (e.key === 'Tab' && drawerRef) {
    const focusable = drawerRef.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

function toggleBrand(slug: string) {
  pendingBrand = pendingBrand === slug ? null : slug;
}

function toggleCategory(slug: string) {
  pendingCategory = pendingCategory === slug ? null : slug;
}

function togglePrice(key: string) {
  pendingPrice = pendingPrice === key ? null : key;
}

function toggleScore(value: string) {
  pendingScore = pendingScore === value ? null : value;
}

function applyFilters() {
  window.location.href = applyUrl();
}

function clearFilters() {
  window.location.href = clearUrl;
}
</script>

<!-- Trigger button: visibile solo su mobile -->
<button class="drawer-trigger" onclick={openDrawer} type="button">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="16" y2="12" />
    <line x1="4" y1="18" x2="12" y2="18" />
  </svg>
  {openLabel}
  {#if activeCount > 0}
    <span class="drawer-trigger-badge">{activeCount}</span>
  {/if}
</button>

{#if isOpen}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="drawer-backdrop" onclick={closeDrawer} onkeydown={handleKeydown}></div>

  <!-- Pannello drawer -->
  <div
    class="drawer-panel"
    role="dialog"
    aria-modal="true"
    aria-label={openLabel}
    bind:this={drawerRef}
    onkeydown={handleKeydown}
  >
    <!-- Header -->
    <div class="drawer-header">
      <h3 class="drawer-title">{openLabel}</h3>
      <button class="drawer-close" onclick={closeDrawer} type="button" aria-label={closeLabel}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Corpo con sezioni filtro -->
    <div class="drawer-body">
      {#if brands.length > 0}
        <div class="drawer-section">
          <h4 class="drawer-section-title">{brandLabel}</h4>
          <div class="drawer-pills">
            {#each brands as b}
              <button
                type="button"
                class="drawer-pill"
                class:drawer-pill--active={pendingBrand === b.slug}
                onclick={() => toggleBrand(b.slug)}
              >
                {b.name} <span class="drawer-pill-count">({b.count})</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      {#if categories.length > 0}
        <div class="drawer-section">
          <h4 class="drawer-section-title">{categoryLabel}</h4>
          <div class="drawer-pills">
            {#each categories as c}
              <button
                type="button"
                class="drawer-pill"
                class:drawer-pill--active={pendingCategory === c.slug}
                onclick={() => toggleCategory(c.slug)}
              >
                {c.name} <span class="drawer-pill-count">({c.count})</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      {#if priceBuckets.length > 0}
        <div class="drawer-section">
          <h4 class="drawer-section-title">{priceLabel}</h4>
          <div class="drawer-pills">
            {#each priceBuckets as pb}
              <button
                type="button"
                class="drawer-pill"
                class:drawer-pill--active={pendingPrice === pb.key}
                onclick={() => togglePrice(pb.key)}
              >
                {pb.label} <span class="drawer-pill-count">({pb.count})</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      {#if scoreThresholds.length > 0}
        <div class="drawer-section">
          <h4 class="drawer-section-title">{scoreLabel}</h4>
          <div class="drawer-pills">
            {#each scoreThresholds as st}
              <button
                type="button"
                class="drawer-pill"
                class:drawer-pill--active={pendingScore === st.value}
                onclick={() => toggleScore(st.value)}
              >
                {st.label} <span class="drawer-pill-count">({st.count})</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Footer sticky con Clear e Apply -->
    <div class="drawer-footer">
      <button type="button" class="drawer-clear-btn" onclick={clearFilters}>
        {clearLabel}
      </button>
      <button type="button" class="drawer-apply-btn" onclick={applyFilters}>
        {applyLabel}{pendingCount > 0 ? ` (${pendingCount})` : ''}
      </button>
    </div>
  </div>
{/if}

<style>
  /* Trigger button: visibile solo su mobile */
  .drawer-trigger {
    display: none;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    font-family: var(--font-heading);
    font-size: var(--text-sm);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-primary);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-full);
    cursor: pointer;
    margin-bottom: var(--space-4);
    transition: border-color var(--transition-fast);
  }

  .drawer-trigger:hover {
    border-color: var(--color-accent-fire);
  }

  @media (max-width: 768px) {
    .drawer-trigger {
      display: inline-flex;
    }
  }

  .drawer-trigger-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 var(--space-1);
    font-size: var(--text-xs);
    font-weight: 900;
    background-color: var(--color-accent-fire);
    color: white;
    border-radius: var(--radius-full);
  }

  /* Backdrop */
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 40;
  }

  /* Pannello drawer */
  .drawer-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 80vh;
    background: var(--color-bg-primary);
    border-top-left-radius: var(--radius-xl);
    border-top-right-radius: var(--radius-xl);
    z-index: 50;
    display: flex;
    flex-direction: column;
    animation: drawer-slide-up 300ms ease-out;
  }

  @keyframes drawer-slide-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-4) var(--space-2);
    border-bottom: 1px solid var(--color-border-subtle);
    flex-shrink: 0;
  }

  .drawer-title {
    font-family: var(--font-heading);
    font-size: var(--text-lg);
    font-weight: 900;
    text-transform: uppercase;
    color: var(--color-text-primary);
    margin: 0;
  }

  .drawer-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    border-radius: var(--radius-full);
    transition: background-color var(--transition-fast);
  }

  .drawer-close:hover {
    background-color: var(--color-bg-secondary);
  }

  /* Corpo scrollabile */
  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4);
  }

  .drawer-section {
    margin-bottom: var(--space-4);
  }

  .drawer-section:last-child {
    margin-bottom: 0;
  }

  .drawer-section-title {
    font-family: var(--font-heading);
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
    margin: 0 0 var(--space-2);
  }

  .drawer-pills {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .drawer-pill {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-heading);
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
    background: transparent;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .drawer-pill:hover {
    color: var(--color-text-primary);
    border-color: var(--color-text-secondary);
  }

  .drawer-pill--active {
    background-color: var(--color-accent-fire);
    color: white;
    border-color: var(--color-accent-fire);
  }

  .drawer-pill--active:hover {
    background-color: var(--color-accent-ember);
    border-color: var(--color-accent-ember);
  }

  .drawer-pill-count {
    font-weight: 400;
    opacity: 0.8;
  }

  /* Footer sticky */
  .drawer-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-top: 1px solid var(--color-border-subtle);
    flex-shrink: 0;
  }

  .drawer-clear-btn {
    font-family: var(--font-heading);
    font-size: var(--text-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-2) var(--space-3);
    transition: color var(--transition-fast);
  }

  .drawer-clear-btn:hover {
    color: var(--color-accent-fire);
  }

  .drawer-apply-btn {
    font-family: var(--font-heading);
    font-size: var(--text-sm);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: white;
    background-color: var(--color-accent-fire);
    border: none;
    border-radius: var(--radius-full);
    padding: var(--space-2) var(--space-6);
    cursor: pointer;
    transition: background-color var(--transition-fast);
  }

  .drawer-apply-btn:hover {
    background-color: var(--color-accent-ember);
  }
</style>
