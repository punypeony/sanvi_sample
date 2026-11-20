import { gsap, ScrollTrigger, useGSAP } from './gsap';
import { setVisible } from './scrollStore';

// Rendering pauses only once an opaque section covers the viewport by this
// much (fraction of viewport height) past both edges, and resumes as soon as
// it is back inside that margin. The canvas is still hidden at that point, so
// the first resumed frames (which snap to the current pose) are never seen.
export const COVER_MARGIN = 0.1;

// Pauses the 3D canvas while any [data-stage-cover] section fully covers it.
// Call once from App, after the sections, so pins above are measured first.
export function useStageCover() {
  useGSAP(() => {
    // start/end = the scroll range where the section fills the whole viewport.
    const ranges = gsap.utils.toArray('[data-stage-cover]').map((el) =>
      ScrollTrigger.create({ trigger: el, start: 'top top', end: 'bottom bottom', refreshPriority: -10 })
    );
    if (!ranges.length) return undefined;

    const check = () => {
      const y = window.scrollY;
      const max = ScrollTrigger.maxScroll(window);
      const m = window.innerHeight * COVER_MARGIN;
      let covered = false;
      for (let i = 0; i < ranges.length && !covered; i++) {
        const { start, end } = ranges[i];
        // No margin needed on a side the page can't scroll past (top / bottom of the document).
        // +1 absorbs a fractional scroll past the last pixel, which Lenis can report.
        covered = end > start && y >= start + Math.min(m, start) && y <= end - Math.min(m, Math.max(0, max - end)) + 1;
      }
      setVisible(!covered);
    };

    // Lower refreshPriority = refreshed after the ranges above.
    ScrollTrigger.create({ start: 0, end: 'max', refreshPriority: -11, onUpdate: check, onRefresh: check });

    return () => setVisible(true);
  });
}
