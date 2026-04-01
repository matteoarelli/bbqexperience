<!--
  Toggle per sistema di unita (metrico/imperiale) — BBQ Experience
  Svelte 5 runes syntax. Pill toggle con segmento attivo evidenziato.
-->
<script lang="ts">
  interface Props {
    unitSystem: 'metric' | 'imperial';
    labels: { metric: string; imperial: string };
  }

  let { unitSystem = $bindable('metric'), labels }: Props = $props();
</script>

<div
  class="unit-toggle"
  role="radiogroup"
  aria-label="Unit system"
>
  <button
    type="button"
    role="radio"
    aria-checked={unitSystem === 'metric'}
    class="unit-toggle__option"
    class:active={unitSystem === 'metric'}
    onclick={() => unitSystem = 'metric'}
  >
    {labels.metric}
  </button>
  <button
    type="button"
    role="radio"
    aria-checked={unitSystem === 'imperial'}
    class="unit-toggle__option"
    class:active={unitSystem === 'imperial'}
    onclick={() => unitSystem = 'imperial'}
  >
    {labels.imperial}
  </button>
</div>

<style>
  .unit-toggle {
    display: inline-flex;
    border-radius: 9999px;
    background-color: var(--color-bg-tertiary);
    padding: 3px;
    gap: 2px;
  }

  .unit-toggle__option {
    padding: 0.375rem 0.875rem;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 600;
    font-family: var(--font-body);
    color: var(--color-text-muted);
    background: transparent;
    transition: all 150ms ease;
    line-height: 1.2;
  }

  .unit-toggle__option:hover {
    color: var(--color-text-primary);
  }

  .unit-toggle__option.active {
    background-color: var(--color-accent-fire);
    color: white;
  }
</style>
