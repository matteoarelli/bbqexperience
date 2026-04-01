// Utilita per animazioni GSAP — BBQ Experience
// REGOLA: solo transform e opacity per performance (no layout properties)
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Inizializza animazioni scroll-triggered su elementi con data-animate
 * Ogni elemento con data-animate viene animato con fadeInUp al scroll
 */
export function initScrollAnimations(): void {
  const elements = document.querySelectorAll('[data-animate]');

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
 * Fade in dal basso — per singoli elementi
 */
export function fadeInUp(selector: string, options?: { delay?: number; duration?: number; y?: number }): void {
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
 * Reveal scaglionato — per liste di elementi
 */
export function staggerReveal(parentSelector: string, childSelector: string, stagger: number = 0.1): void {
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
 * Animazione titolo con effetto di scrittura da sinistra
 */
export function titleReveal(selector: string): void {
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
