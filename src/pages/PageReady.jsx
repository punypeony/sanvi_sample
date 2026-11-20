import { useLayoutEffect } from 'react';
import { ScrollTrigger } from '../scroll/gsap';

let booted = false;

function setMeta(content) {
  let el = document.querySelector('meta[name="description"]');
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'description');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

// Runs after the page's sections exist, so ScrollTrigger measures the new
// tree rather than the one that just unmounted. Focus moves to the h1 on
// every visit after the first, which is what a route change should do.
export default function PageReady({ title, description }) {
  useLayoutEffect(() => {
    document.title = title;
    setMeta(description);
    ScrollTrigger.refresh();

    const h1 = document.querySelector('#main h1');
    if (!h1) return undefined;
    if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');

    const timer = window.setTimeout(() => {
      if (!booted) {
        booted = true;
        return;
      }
      h1.focus({ preventScroll: true });
      const live = document.getElementById('route-announcer');
      if (live) live.textContent = h1.textContent;
    }, 0);

    return () => window.clearTimeout(timer);
  }, [title, description]);

  return null;
}
