<script lang="ts">
  /**
   * FlameGauge — Indicatore radiale SVG con tema fuoco per punteggio complessivo
   * Animazione GSAP ScrollTrigger su stroke-dashoffset
   */
  import { onMount } from 'svelte';
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';

  gsap.registerPlugin(ScrollTrigger);

  let { score = 0, size = 160, label = 'Overall Score' }: {
    score: number;
    size?: number;
    label?: string;
  } = $props();

  // ID unico per evitare collisioni SVG con piu istanze
  const uniqueId = Math.random().toString(36).slice(2, 9);

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - 16) / 2;
  const circumference = 2 * Math.PI * r;

  // Font sizes calcolate in base alla dimensione
  const scoreFontSize = size * 0.28;
  const unitFontSize = size * 0.12;

  onMount(() => {
    const circle = document.getElementById(`flame-progress-${uniqueId}`);
    if (!circle) return;

    gsap.fromTo(circle,
      { attr: { 'stroke-dashoffset': circumference } },
      {
        attr: { 'stroke-dashoffset': circumference * (1 - score / 10) },
        duration: 1.5,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: circle,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );
  });
</script>

<div class="flame-gauge" style="text-align: center;">
  <svg
    width={size}
    height={size}
    viewBox={`0 0 ${size} ${size}`}
    class="flame-gauge-svg"
  >
    <defs>
      <linearGradient id={`flame-grad-${uniqueId}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="var(--color-accent-ember)" />
        <stop offset="50%" stop-color="var(--color-accent-fire)" />
        <stop offset="100%" stop-color="var(--color-accent-amber)" />
      </linearGradient>
    </defs>

    <!-- Cerchio di sfondo -->
    <circle
      cx={cx}
      cy={cy}
      r={r}
      stroke="var(--color-bg-tertiary)"
      stroke-width="10"
      fill="none"
    />

    <!-- Cerchio di progresso con gradiente fuoco -->
    <circle
      id={`flame-progress-${uniqueId}`}
      cx={cx}
      cy={cy}
      r={r}
      stroke={`url(#flame-grad-${uniqueId})`}
      stroke-width="10"
      fill="none"
      stroke-linecap="round"
      stroke-dasharray={circumference}
      stroke-dashoffset={circumference}
      transform={`rotate(-90 ${cx} ${cy})`}
      class="flame-progress-circle"
    />

    <!-- Testo punteggio al centro -->
    <text
      x={cx}
      y={cy - 4}
      text-anchor="middle"
      dominant-baseline="central"
      fill="var(--color-accent-amber)"
      font-size={scoreFontSize}
      style={`font-family: var(--font-heading);`}
    >
      {score}
    </text>
    <text
      x={cx}
      y={cy + scoreFontSize * 0.55}
      text-anchor="middle"
      dominant-baseline="central"
      fill="var(--color-text-muted)"
      font-size={unitFontSize}
    >
      /10
    </text>
  </svg>

  <span class="flame-gauge-label">{label}</span>
</div>

<style>
  .flame-gauge {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .flame-progress-circle {
    filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.4));
  }

  .flame-gauge-label {
    font-family: var(--font-heading);
    text-transform: uppercase;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    letter-spacing: 0.05em;
  }
</style>
