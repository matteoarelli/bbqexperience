// Utilita per animazioni GSAP — BBQ Experience
// REGOLA: solo transform e opacity per performance (no layout properties)
//
// Lazy-load: gsap + ScrollTrigger (~113 KB) vengono importati DINAMICAMENTE
// e SOLO se la pagina contiene effettivamente elementi `[data-animate]`.
// Le pagine review (recensioni/resenas/reviews) non hanno data-animate
// e quindi pagano ZERO bundle JS GSAP — risolve `unused-javascript` Lighthouse.

/**
 * Inizializza animazioni scroll-triggered su elementi con data-animate.
 * Se nessun elemento ha data-animate, esce subito senza caricare GSAP.
 */
export async function initScrollAnimations(): Promise<void> {
  const elements = document.querySelectorAll<HTMLElement>('[data-animate]');
  if (elements.length === 0) {
    // Nessun elemento da animare: skip completo del download GSAP
    return;
  }

  // Import dinamici: GSAP e ScrollTrigger arrivano solo se servono
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);

  elements.forEach((el) => {
    const delay = parseFloat(el.getAttribute('data-animate-delay') || '0');
    const duration = parseFloat(el.getAttribute('data-animate-duration') || '0.8');

    gsap.from(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      y: 40,
      opacity: 0,
      duration,
      delay,
      ease: 'power3.out',
    });
  });
}

/**
 * Fade in dal basso — per singoli elementi.
 * Lazy-load: importa GSAP solo quando chiamata.
 */
export async function fadeInUp(
  selector: string,
  options?: { delay?: number; duration?: number; y?: number },
): Promise<void> {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);
  gsap.from(selector, {
    scrollTrigger: {
      trigger: selector,
      start: 'top 85%',
    },
    y: options?.y ?? 40,
    opacity: 0,
    duration: options?.duration ?? 0.8,
    delay: options?.delay ?? 0,
    ease: 'power3.out',
  });
}

/**
 * Reveal scaglionato — per liste di elementi.
 * Lazy-load: importa GSAP solo quando chiamata.
 */
export async function staggerReveal(
  parentSelector: string,
  childSelector: string,
  stagger: number = 0.1,
): Promise<void> {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);
  gsap.from(`${parentSelector} ${childSelector}`, {
    scrollTrigger: {
      trigger: parentSelector,
      start: 'top 80%',
    },
    y: 30,
    opacity: 0,
    duration: 0.6,
    stagger,
    ease: 'power2.out',
  });
}

/**
 * Animazione titolo con effetto di scrittura da sinistra.
 * Lazy-load: importa GSAP solo quando chiamata.
 */
export async function titleReveal(selector: string): Promise<void> {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);
  gsap.from(selector, {
    scrollTrigger: {
      trigger: selector,
      start: 'top 85%',
    },
    x: -60,
    opacity: 0,
    duration: 1,
    ease: 'power4.out',
  });
}
