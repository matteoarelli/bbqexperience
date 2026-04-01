<!--
  Regolatore porzioni — BBQ Experience
  Svelte 5 runes syntax. Bottoni +/- con conteggio porzioni al centro.
-->
<script lang="ts">
  interface Props {
    baseServings: number;
    currentServings: number;
    label?: string;
  }

  let {
    baseServings,
    currentServings = $bindable(baseServings),
    label = 'Servings',
  }: Props = $props();

  function decrement() {
    if (currentServings > 1) currentServings--;
  }

  function increment() {
    if (currentServings < 99) currentServings++;
  }
</script>

<div class="serving-adjuster">
  <span class="serving-adjuster__label">{label}</span>
  <div class="serving-adjuster__controls">
    <button
      type="button"
      class="serving-adjuster__btn"
      onclick={decrement}
      disabled={currentServings <= 1}
      aria-label="Decrease servings"
    >
      -
    </button>
    <span class="serving-adjuster__count">{currentServings}</span>
    <button
      type="button"
      class="serving-adjuster__btn"
      onclick={increment}
      disabled={currentServings >= 99}
      aria-label="Increase servings"
    >
      +
    </button>
  </div>
</div>

<style>
  .serving-adjuster {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .serving-adjuster__label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    font-family: var(--font-body);
  }

  .serving-adjuster__controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .serving-adjuster__btn {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: none;
    background-color: var(--color-accent-fire);
    color: white;
    font-size: 1.125rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 150ms ease;
    line-height: 1;
    font-family: var(--font-body);
  }

  .serving-adjuster__btn:hover:not(:disabled) {
    opacity: 0.85;
  }

  .serving-adjuster__btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .serving-adjuster__count {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text-primary);
    min-width: 2rem;
    text-align: center;
    font-family: var(--font-body);
  }
</style>
