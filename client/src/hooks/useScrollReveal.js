import { useEffect } from 'react';

/**
 * useScrollReveal
 * Attaches a lightweight IntersectionObserver to elements matching the selector
 * (defaults to '.reveal-on-scroll, .reveal-stagger').
 * Unobserves immediately upon entering viewport to avoid repeated calculations.
 * Respects prefers-reduced-motion.
 */
export function useScrollReveal(dependencies = []) {
  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      // Reveal everything immediately
      document.querySelectorAll('.reveal-on-scroll, .reveal-stagger').forEach((el) => {
        el.classList.add('is-revealed');
      });
      return;
    }

    const observerCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');

          // If it's a staggered container, assign stagger indices to immediate children
          if (entry.target.classList.contains('reveal-stagger')) {
            const children = entry.target.children;
            for (let i = 0; i < children.length; i++) {
              children[i].style.setProperty('--stagger-i', i);
            }
          }

          observer.unobserve(entry.target);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.1
    });

    const elements = document.querySelectorAll('.reveal-on-scroll, .reveal-stagger');
    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, dependencies);
}
