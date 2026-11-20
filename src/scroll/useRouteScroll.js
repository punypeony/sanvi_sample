import { useLayoutEffect } from 'react';
import { ScrollTrigger } from './gsap';
import { getLenis, holdScroll } from './useSmoothScroll';
import { resetPose } from './scrollStore';

function scrollToTop() {
  const lenis = getLenis();
  if (!lenis) window.scrollTo(0, 0);
  else {
    // immediate, inside a hold, so the navbar doesn't hide on the way to 0
    // and Lenis doesn't glide there after the new page has mounted.
    holdScroll((release) => {
      lenis.scrollTo(0, { immediate: true, force: true });
      release();
    });
  }
  // After the jump. A page that mounts later (a lazy route) refreshes again
  // once its own triggers exist.
  ScrollTrigger.refresh();
}

// Pathname changes only. A hash jump stays on the page and keeps the
// existing anchor glide / veil. Cleanup runs after the old page's triggers
// have been killed, then puts the model back on the hero pose.
export function useRouteScroll(pathname) {
  useLayoutEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    scrollToTop();
    return () => resetPose();
  }, [pathname]);
}
