<script lang="ts">
  /**
   * AnimatedCounter — Contatore animato con IntersectionObserver
   * Svelte 5 island. Conta da 0 al valore target con easing.
   */

  let {
    target,
    suffix = '',
    duration = 1500,
  }: {
    target: number;
    suffix?: string;
    duration?: number;
  } = $props();

  let current = $state(0);
  let hasAnimated = $state(false);
  let el: HTMLElement | undefined = $state();

  // Funzione easing (ease-out cubic)
  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  // Avvia animazione conteggio
  function animate() {
    if (hasAnimated) return;
    hasAnimated = true;

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      current = Math.round(eased * target);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        current = target;
      }
    }

    requestAnimationFrame(tick);
  }

  // Osserva quando l'elemento entra nel viewport
  $effect(() => {
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);

    return () => observer.disconnect();
  });
</script>

<span bind:this={el} class="animated-counter">
  {current.toLocaleString()}{suffix}
</span>

<style>
  .animated-counter {
    font-variant-numeric: tabular-nums;
  }
</style>
