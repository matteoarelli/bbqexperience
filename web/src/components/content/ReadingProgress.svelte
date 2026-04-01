<!--
  ReadingProgress.svelte — Barra di progresso lettura e navigazione sezioni
  Componente Svelte 5 (runes) per pagine di contenuto lungo.
  Uso in Astro: <ReadingProgress client:idle locale="en" />
-->
<script lang="ts">
  // Props del componente
  let { locale = 'en' }: { locale?: string } = $props();

  // Stato reattivo (Svelte 5 runes)
  let progress = $state(0);
  let visible = $state(false);
  let sections = $state<{ id: string; text: string }[]>([]);
  let activeSection = $state('');

  $effect(() => {
    // Trova tutti i titoli h2 con id nella pagina
    const headings = document.querySelectorAll<HTMLHeadingElement>('h2[id]');
    sections = Array.from(headings).map((h) => ({
      id: h.id,
      text: h.textContent?.trim() || '',
    }));

    // Gestione scroll per calcolo progresso
    function onScroll() {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const maxScroll = docHeight - winHeight;

      if (maxScroll > 0) {
        progress = Math.min((scrollY / maxScroll) * 100, 100);
      }

      // Mostra solo dopo 100px di scroll, nascondi al 100%
      visible = scrollY > 100 && progress < 99.5;
    }

    // IntersectionObserver per rilevare la sezione attiva
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeSection = entry.target.id;
          }
        }
      },
      {
        rootMargin: '-80px 0px -70% 0px',
        threshold: 0,
      }
    );

    headings.forEach((h) => observer.observe(h));
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  });

  // Scroll alla sezione cliccata
  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
</script>

<div
  class="reading-progress"
  class:reading-progress--visible={visible}
  role="navigation"
  aria-label="Reading progress"
>
  <!-- Barra di progresso -->
  <div class="reading-progress__bar">
    <div
      class="reading-progress__fill"
      style:width="{progress}%"
    ></div>
  </div>

  <!-- Navigazione sezioni -->
  {#if sections.length > 0}
    <div class="reading-progress__sections">
      {#each sections as section (section.id)}
        <button
          class="reading-progress__section-btn"
          class:reading-progress__section-btn--active={activeSection === section.id}
          onclick={() => scrollToSection(section.id)}
          type="button"
        >
          {section.text}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .reading-progress {
    position: fixed;
    top: 4rem;
    left: 0;
    right: 0;
    z-index: 40;
    opacity: 0;
    transform: translateY(-4px);
    transition: opacity 250ms ease, transform 250ms ease;
    pointer-events: none;
  }

  @media (min-width: 1024px) {
    .reading-progress {
      top: 5rem;
    }
  }

  .reading-progress--visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  .reading-progress__bar {
    height: 3px;
    background: rgba(255, 255, 255, 0.08);
    width: 100%;
  }

  .reading-progress__fill {
    height: 100%;
    background: linear-gradient(90deg, #f97316, #f59e0b);
    transition: width 100ms linear;
  }

  .reading-progress__sections {
    display: flex;
    gap: 0;
    overflow-x: auto;
    background: rgba(13, 13, 13, 0.95);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0 1rem;
    scrollbar-width: none;
  }

  .reading-progress__sections::-webkit-scrollbar {
    display: none;
  }

  .reading-progress__section-btn {
    flex-shrink: 0;
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: #737373;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: color 150ms ease, border-color 150ms ease;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .reading-progress__section-btn:hover {
    color: #f5f5f5;
  }

  .reading-progress__section-btn--active {
    color: #f97316;
    border-bottom-color: #f97316;
  }
</style>
