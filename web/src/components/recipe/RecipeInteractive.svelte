<!--
  Isola interattiva ricetta — BBQ Experience
  Componente Svelte 5 principale: regolatore porzioni, toggle unita, lista ingredienti.
  Montato come Astro island con client:visible.
-->
<script lang="ts">
  import ServingAdjuster from './ServingAdjuster.svelte';
  import UnitToggle from './UnitToggle.svelte';

  interface RecipeIngredient {
    name: string;
    quantity: string;
    unit: string;
  }

  interface Props {
    ingredients: RecipeIngredient[];
    baseServings: number;
    labels: {
      servings: string;
      metric: string;
      imperial: string;
      ingredients: string;
    };
  }

  let { ingredients, baseServings, labels }: Props = $props();

  let currentServings = $state(baseServings);
  let unitSystem = $state<'metric' | 'imperial'>('metric');

  // Mappa conversioni unita metriche -> imperiali
  const UNIT_CONVERSIONS: Record<string, { imperial: string; factor: number }> = {
    'g': { imperial: 'oz', factor: 0.03527 },
    'kg': { imperial: 'lb', factor: 2.20462 },
    'ml': { imperial: 'fl oz', factor: 0.03381 },
    'l': { imperial: 'qt', factor: 1.05669 },
  };

  /**
   * Parsa una stringa quantita in numero.
   * Gestisce frazioni ("1/2" -> 0.5) e range ("2-3" -> 2).
   */
  function parseQuantity(qty: string): number | null {
    if (!qty || qty.trim() === '') return null;
    const trimmed = qty.trim();

    // Gestisci range: prendi il primo numero
    const rangeParts = trimmed.split('-');
    const toParse = rangeParts[0].trim();

    // Gestisci frazioni miste: "1 1/2" -> 1.5
    const mixedMatch = toParse.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixedMatch) {
      return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
    }

    // Gestisci frazioni semplici: "1/2" -> 0.5
    const fractionMatch = toParse.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
    }

    // Numero semplice
    const num = parseFloat(toParse);
    return isNaN(num) ? null : num;
  }

  /**
   * Formatta un numero in stringa leggibile.
   * Arrotonda a 1 decimale, rimuove .0 finale.
   */
  function formatNumber(n: number): string {
    const rounded = Math.round(n * 10) / 10;
    return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
  }

  // Ingredienti calcolati con porzioni e unita regolate
  let adjustedIngredients = $derived(
    ingredients.map((ing) => {
      const parsed = parseQuantity(ing.quantity);
      if (parsed === null) {
        // Quantita non numerica — mostra cosi com'e
        return { name: ing.name, quantity: ing.quantity, unit: ing.unit };
      }

      // Scala per rapporto porzioni
      let scaled = parsed * (currentServings / baseServings);
      let displayUnit = ing.unit;

      // Converti unita se imperiale
      if (unitSystem === 'imperial') {
        const unitLower = ing.unit.toLowerCase();
        const conversion = UNIT_CONVERSIONS[unitLower];
        if (conversion) {
          scaled = scaled * conversion.factor;
          displayUnit = conversion.imperial;
        }
      }

      return {
        name: ing.name,
        quantity: formatNumber(scaled),
        unit: displayUnit,
      };
    })
  );
</script>

<section class="recipe-interactive">
  <!-- Barra controlli: porzioni a sinistra, toggle unita a destra -->
  <div class="recipe-interactive__controls">
    <ServingAdjuster
      {baseServings}
      bind:currentServings
      label={labels.servings}
    />
    <UnitToggle
      bind:unitSystem
      labels={{ metric: labels.metric, imperial: labels.imperial }}
    />
  </div>

  <!-- Titolo ingredienti -->
  <h2 class="recipe-interactive__title">
    {labels.ingredients}
  </h2>

  <!-- Lista ingredienti -->
  <ul class="recipe-interactive__list">
    {#each adjustedIngredients as ing}
      <li class="recipe-interactive__item">
        <span class="recipe-interactive__bullet"></span>
        <span class="recipe-interactive__ingredient">
          {#if ing.quantity}
            <span class="recipe-interactive__qty">{ing.quantity}</span>
          {/if}
          {#if ing.unit}
            <span class="recipe-interactive__unit">{ing.unit}</span>
          {/if}
          <span class="recipe-interactive__name">{ing.name}</span>
        </span>
      </li>
    {/each}
  </ul>
</section>

<style>
  .recipe-interactive__controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .recipe-interactive__title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-family: var(--font-heading);
    color: var(--color-accent-amber);
  }

  .recipe-interactive__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .recipe-interactive__item {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    color: var(--color-text-primary);
  }

  .recipe-interactive__bullet {
    width: 0.375rem;
    height: 0.375rem;
    border-radius: 50%;
    background-color: var(--color-accent-fire);
    flex-shrink: 0;
    margin-top: 0.5rem;
  }

  .recipe-interactive__ingredient {
    display: inline;
  }

  .recipe-interactive__qty {
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--color-accent-amber);
  }

  .recipe-interactive__unit {
    font-family: var(--font-mono);
    color: var(--color-accent-amber);
    margin-left: 0.25rem;
  }

  .recipe-interactive__name {
    margin-left: 0.25rem;
  }
</style>
