<!--
  ThemeToggle — Componente Svelte 5 per switch dark/light mode
  Persiste la preferenza in localStorage con chiave "bbq-theme"
-->
<script lang="ts">
  /* Props accessibilita */
  let { label = 'Toggle theme' }: { label?: string } = $props();

  /* Stato reattivo del tema corrente */
  let theme = $state('dark');

  /* Inizializzazione e sincronizzazione con DOM */
  $effect(() => {
    const saved = localStorage.getItem('bbq-theme');
    if (saved === 'light' || saved === 'dark') {
      theme = saved;
    } else {
      /* Se nessuna preferenza salvata, controlla lo stato attuale del DOM */
      theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    }
  });

  /* Alterna il tema e persiste la scelta */
  function toggle() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme === 'light' ? 'light' : '';
    if (theme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('bbq-theme', theme);
  }
</script>

<button
  onclick={toggle}
  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
  class="theme-toggle"
  type="button"
>
  {#if theme === 'dark'}
    <!-- Icona sole — cliccando si passa a light -->
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <circle cx="12" cy="12" r="5"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  {:else}
    <!-- Icona luna — cliccando si passa a dark -->
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  {/if}
</button>

<style>
  .theme-toggle {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: var(--radius-md);
    transition: color var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .theme-toggle:hover {
    color: var(--color-accent-fire);
  }
</style>
