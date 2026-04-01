<!--
  Modalita Cottura — BBQ Experience
  Overlay a schermo intero con navigazione passo-passo, Wake Lock API,
  gesture swipe e navigazione da tastiera. Svelte 5 runes.
-->
<script lang="ts">
  interface Instruction {
    step: number;
    text: string;
    imageUrl?: string;
  }

  interface Props {
    instructions: Instruction[];
    recipeName: string;
    labels: {
      cookMode: string;
      step: string;
      of: string;
      prev: string;
      next: string;
      finish: string;
      exit: string;
    };
  }

  let { instructions, recipeName, labels }: Props = $props();

  let isActive = $state(false);
  let currentStep = $state(0);
  let wakeLock: WakeLockSentinel | null = $state(null);

  // Variabili per gesture swipe
  let touchStartX = $state(0);
  let touchStartY = $state(0);

  const totalSteps = instructions.length;

  // Gestione Wake Lock e overflow body
  $effect(() => {
    if (isActive) {
      currentStep = 0;
      document.body.style.overflow = 'hidden';

      // Richiedi Wake Lock se disponibile
      if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen')
          .then((lock) => { wakeLock = lock; })
          .catch(() => { /* Wake Lock non supportato o rifiutato */ });
      }
    }

    return () => {
      document.body.style.overflow = '';
      if (wakeLock) {
        wakeLock.release().catch(() => {});
        wakeLock = null;
      }
    };
  });

  // Navigazione da tastiera
  $effect(() => {
    if (!isActive) return;

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') deactivate();
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  function activate() {
    isActive = true;
    // Focus sull'overlay dopo il rendering
    setTimeout(() => {
      document.querySelector<HTMLElement>('.cook-mode-overlay')?.focus();
    }, 50);
  }

  function deactivate() {
    isActive = false;
  }

  function goNext() {
    if (currentStep < totalSteps - 1) {
      currentStep++;
    } else {
      deactivate();
    }
  }

  function goPrev() {
    if (currentStep > 0) {
      currentStep--;
    }
  }

  function goToStep(index: number) {
    currentStep = index;
  }

  // Gestione swipe touch
  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function handleTouchEnd(e: TouchEvent) {
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;

    // Soglia 50px, e solo se il movimento orizzontale e maggiore di quello verticale
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) goNext();   // Swipe sinistra = avanti
      else goPrev();              // Swipe destra = indietro
    }
  }
</script>

{#if !isActive}
  <!-- Bottone Cook Mode -->
  <button
    type="button"
    class="cook-mode-btn"
    onclick={activate}
  >
    <!-- Icona fiamma -->
    <svg class="cook-mode-btn__icon" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
      <path d="M12 23c-3.866 0-7-3.134-7-7 0-3.5 2.5-6.5 4-8 .5 2 2 3 2 3s-.5-2.5 1-5c1.5 2.5 2 4 2 4s1-1.5 1.5-3c2 3 3.5 5.5 3.5 9 0 3.866-3.134 7-7 7zm0-2c2.76 0 5-2.24 5-5 0-2.5-1.5-4.5-2.5-6-.5 1-1 1.5-1.5 2-.5-1-1-2.5-1.5-3.5C10 10.5 9 12 9 16c0 2.76 2.24 5 5 5h-2z"/>
    </svg>
    {labels.cookMode}
  </button>
{:else}
  <!-- Overlay a schermo intero -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="cook-mode-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Cook Mode"
    tabindex="-1"
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
  >
    <!-- Barra superiore -->
    <header class="cook-mode-overlay__header">
      <span class="cook-mode-overlay__recipe-name">{recipeName}</span>
      <span class="cook-mode-overlay__counter">
        {currentStep + 1} / {totalSteps}
      </span>
      <button
        type="button"
        class="cook-mode-overlay__exit"
        onclick={deactivate}
        aria-label={labels.exit}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </header>

    <!-- Area contenuto principale -->
    <main class="cook-mode-overlay__main">
      <p class="cook-mode-overlay__step-label">
        {labels.step} {instructions[currentStep].step}
      </p>
      <p class="cook-mode-overlay__text">
        {instructions[currentStep].text}
      </p>
      {#if instructions[currentStep].imageUrl}
        <img
          class="cook-mode-overlay__image"
          src={instructions[currentStep].imageUrl}
          alt="{labels.step} {instructions[currentStep].step}"
          loading="lazy"
        />
      {/if}
    </main>

    <!-- Navigazione inferiore -->
    <footer class="cook-mode-overlay__footer">
      <button
        type="button"
        class="cook-mode-overlay__nav-btn"
        onclick={goPrev}
        disabled={currentStep === 0}
      >
        {labels.prev}
      </button>

      <!-- Indicatore a punti -->
      <div class="cook-mode-overlay__dots">
        {#each instructions as _, i}
          <button
            type="button"
            class="cook-mode-overlay__dot"
            class:active={i === currentStep}
            onclick={() => goToStep(i)}
            aria-label="{labels.step} {i + 1}"
            aria-current={i === currentStep ? 'step' : undefined}
          ></button>
        {/each}
      </div>

      <button
        type="button"
        class="cook-mode-overlay__nav-btn cook-mode-overlay__nav-btn--primary"
        onclick={goNext}
      >
        {currentStep < totalSteps - 1 ? labels.next : labels.finish}
      </button>
    </footer>
  </div>
{/if}

<style>
  /* Bottone Cook Mode */
  .cook-mode-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background-color: var(--color-accent-fire);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-family: var(--font-heading);
    font-size: 1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: opacity 150ms ease;
    margin-top: 1.5rem;
  }

  .cook-mode-btn:hover {
    opacity: 0.9;
  }

  .cook-mode-btn__icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  /* Overlay a schermo intero */
  .cook-mode-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    background-color: var(--color-bg-primary);
    color: var(--color-text-primary);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Header */
  .cook-mode-overlay__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border-subtle);
    flex-shrink: 0;
  }

  .cook-mode-overlay__recipe-name {
    font-family: var(--font-heading);
    font-size: 1rem;
    font-weight: 700;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 50%;
  }

  .cook-mode-overlay__counter {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--color-accent-amber);
    font-weight: 600;
  }

  .cook-mode-overlay__exit {
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.375rem;
    transition: color 150ms ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cook-mode-overlay__exit:hover {
    color: var(--color-text-primary);
  }

  /* Contenuto principale */
  .cook-mode-overlay__main {
    flex: 1;
    overflow-y: auto;
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  .cook-mode-overlay__step-label {
    font-family: var(--font-heading);
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-accent-fire);
    margin: 0;
  }

  .cook-mode-overlay__text {
    font-family: var(--font-body);
    font-size: clamp(1.25rem, 1rem + 1vw, 1.625rem);
    line-height: 1.6;
    text-align: center;
    max-width: 40rem;
    margin: 0;
    color: var(--color-text-primary);
  }

  .cook-mode-overlay__image {
    max-height: 40vh;
    max-width: 100%;
    object-fit: contain;
    border-radius: 0.5rem;
  }

  /* Footer navigazione */
  .cook-mode-overlay__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--color-border-subtle);
    flex-shrink: 0;
    gap: 0.75rem;
  }

  .cook-mode-overlay__nav-btn {
    min-width: 5rem;
    min-height: 3rem;
    padding: 0.75rem 1.25rem;
    border: 1px solid var(--color-border-default);
    border-radius: 0.5rem;
    background: transparent;
    color: var(--color-text-secondary);
    font-family: var(--font-body);
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 150ms ease;
  }

  .cook-mode-overlay__nav-btn:hover:not(:disabled) {
    border-color: var(--color-text-primary);
    color: var(--color-text-primary);
  }

  .cook-mode-overlay__nav-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .cook-mode-overlay__nav-btn--primary {
    background-color: var(--color-accent-fire);
    border-color: var(--color-accent-fire);
    color: white;
  }

  .cook-mode-overlay__nav-btn--primary:hover:not(:disabled) {
    background-color: var(--color-accent-ember);
    border-color: var(--color-accent-ember);
    color: white;
  }

  /* Indicatore punti */
  .cook-mode-overlay__dots {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    overflow-x: auto;
    max-width: 50%;
    flex-shrink: 1;
  }

  .cook-mode-overlay__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    border: none;
    padding: 0;
    background-color: var(--color-bg-tertiary);
    cursor: pointer;
    transition: background-color 150ms ease;
    flex-shrink: 0;
  }

  .cook-mode-overlay__dot.active {
    background-color: var(--color-accent-fire);
  }
</style>
