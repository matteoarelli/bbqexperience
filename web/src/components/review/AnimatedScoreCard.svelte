<script lang="ts">
  /**
   * AnimatedScoreCard — Card punteggi con barre radiali animate
   * Sostituisce ScoreCard.astro con visualizzazioni SVG animate via GSAP
   */
  import { onMount } from 'svelte';
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import FlameGauge from './FlameGauge.svelte';

  gsap.registerPlugin(ScrollTrigger);

  let {
    overall,
    buildQuality = null,
    performance = null,
    value = null,
    easeOfUse = null,
    labels,
  }: {
    overall: number;
    buildQuality: number | null;
    performance: number | null;
    value: number | null;
    easeOfUse: number | null;
    labels: {
      overall: string;
      buildQuality: string;
      performance: string;
      value: string;
      easeOfUse: string;
    };
  } = $props();

  // ID unico per selettori CSS isolati
  const uniqueId = Math.random().toString(36).slice(2, 9);

  // Parametri cerchio categoria
  const catSize = 80;
  const catCx = catSize / 2;
  const catCy = catSize / 2;
  const catR = 34;
  const catCircumference = 2 * Math.PI * catR;

  // Filtra categorie nulle (stessa logica di ScoreCard.astro)
  interface Category {
    key: string;
    score: number;
    label: string;
  }

  const categories: Category[] = $derived(
    [
      { key: 'buildQuality', score: buildQuality, label: labels.buildQuality },
      { key: 'performance', score: performance, label: labels.performance },
      { key: 'value', score: value, label: labels.value },
      { key: 'easeOfUse', score: easeOfUse, label: labels.easeOfUse },
    ].filter((c): c is Category => c.score !== null && c.score !== undefined)
  );

  let containerRef: HTMLElement | undefined = $state(undefined);

  onMount(() => {
    if (!containerRef || categories.length === 0) return;

    // Seleziona solo i cerchi di progresso dentro questo componente
    const progressCircles = containerRef.querySelectorAll(`.cat-progress-${uniqueId}`);
    if (progressCircles.length === 0) return;

    gsap.fromTo(progressCircles,
      { attr: { 'stroke-dashoffset': catCircumference } },
      {
        attr: {
          'stroke-dashoffset': (i: number) =>
            catCircumference * (1 - categories[i].score / 10),
        },
        duration: 1.2,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: containerRef,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      }
    );
  });
</script>

<section
  bind:this={containerRef}
  class="animated-score-card bg-[var(--color-bg-secondary)] rounded-[var(--radius-lg)] p-6 md:p-8"
>
  <!-- Punteggio complessivo con gauge fiamma -->
  <div class="flex flex-col items-center mb-8">
    <FlameGauge score={overall} size={160} label={labels.overall} />
  </div>

  <!-- Griglia punteggi per categoria -->
  {#if categories.length > 0}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      {#each categories as cat, i (cat.key)}
        <div class="flex flex-col items-center gap-2">
          <svg
            width={catSize}
            height={catSize}
            viewBox={`0 0 ${catSize} ${catSize}`}
          >
            <!-- Cerchio sfondo -->
            <circle
              cx={catCx}
              cy={catCy}
              r={catR}
              stroke="var(--color-bg-tertiary)"
              stroke-width="6"
              fill="none"
            />
            <!-- Cerchio progresso categoria -->
            <circle
              class={`cat-progress-${uniqueId}`}
              cx={catCx}
              cy={catCy}
              r={catR}
              stroke="var(--color-accent-fire)"
              stroke-width="6"
              fill="none"
              stroke-linecap="round"
              stroke-dasharray={catCircumference}
              stroke-dashoffset={catCircumference}
              transform={`rotate(-90 ${catCx} ${catCy})`}
            />
            <!-- Punteggio al centro -->
            <text
              x={catCx}
              y={catCy}
              text-anchor="middle"
              dominant-baseline="central"
              fill="var(--color-text-primary)"
              font-size="20"
              style="font-family: var(--font-heading);"
            >
              {cat.score}
            </text>
          </svg>
          <span class="category-label">{cat.label}</span>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .category-label {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-align: center;
    font-family: var(--font-body);
  }
</style>
