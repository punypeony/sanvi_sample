import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

// Mobile browsers resize the viewport when the address bar shows/hides;
// re-measuring every pin on that would make the page jump.
ScrollTrigger.config({ ignoreMobileResize: true });

// Shared media queries for gsap.matchMedia().
export const MQ = {
  motion: '(prefers-reduced-motion: no-preference)',
  reduce: '(prefers-reduced-motion: reduce)',
  desktop: '(min-width: 701px)',
  mobile: '(max-width: 700px)',
};

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.(MQ.reduce).matches;
}

export { gsap, ScrollTrigger, SplitText, useGSAP };
