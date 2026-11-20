import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap';
import { requestSnap } from './scrollStore';

// ---- Smooth scroll tuning ----
// lerp: lower = floatier, higher = snappier (0.05-0.2 is the useful range).
export const LENIS_OPTIONS = { lerp: 0.08, wheelMultiplier: 0.8 };
// In-page links (#buy etc.) glide instead of jumping.
const ANCHOR_DURATION = 1.4; // seconds
const easeOutQuart = (x) => 1 - Math.pow(1 - x, 4);
// Farther than this (in viewport heights) and the jump cuts instead of gliding.
const JUMP_GLIDE_MAX_VH = 1.5;
const VEIL_IN = 0.15;
const VEIL_OUT = 0.3;
// Lenis velocity is pixels per frame. Above this, the model snaps to the pose
// instead of damping through everything in between (scrollbar drags, hard flicks).
const FLICK_VELOCITY = 48;

let current = null;
export const getLenis = () => current;

// Navbar (and anything else) listens here instead of touching Lenis directly.
// `held` is true during a programmatic jump, so listeners can ignore the
// in-between scroll events and commit once at the end.
const scrollListeners = new Set();
let holds = 0;
let holdFrom = 0;

export function subscribeScroll(fn) {
  scrollListeners.add(fn);
  return () => scrollListeners.delete(fn);
}

// settled: the jump landed. net is how far it travelled (positive = downward).
function emitScroll(lenis, settled) {
  const held = holds > 0 && !settled;
  const net = settled ? lenis.scroll - holdFrom : 0;
  scrollListeners.forEach((fn) => fn(lenis, held, settled, net));
}

// Wrap a programmatic scroll so the navbar doesn't hide and show mid-jump.
export function holdScroll(run) {
  holds++;
  if (holds === 1) holdFrom = current ? current.scroll : window.scrollY;
  const release = (silent) => {
    holds = Math.max(0, holds - 1);
    if (holds === 0 && current && !silent) emitScroll(current, true);
  };
  try {
    run(release);
  } catch (err) {
    release();
    throw err;
  }
}

// Pinned sections stay at the top of their spacer, so the link should land
// on the pin's start. Everywhere else, the element's document position.
function scrollTarget(el, id) {
  if (!el || id === 'top') return 0;
  const pinned = ScrollTrigger.getAll().find((t) => t.pin && t.trigger === el);
  if (pinned) return pinned.start;
  return Math.max(0, el.getBoundingClientRect().top + window.scrollY);
}

// One programmatic scroll at a time. Starting another finishes the previous
// hold quietly, so a second click can't leave the navbar stuck mid-jump.
let releaseHold = null;

function takeHold() {
  if (releaseHold) releaseHold(true);
  let rel = null;
  holdScroll((release) => {
    rel = release;
  });
  let open = true;
  const done = (silent) => {
    if (!open) return;
    open = false;
    if (releaseHold === done) releaseHold = null;
    rel?.(silent);
  };
  releaseHold = done;
  return done;
}

function glideTo(lenis, y, el) {
  const done = takeHold();
  lenis.scrollTo(y, {
    duration: ANCHOR_DURATION,
    easing: easeOutQuart,
    force: true,
    onComplete: () => {
      if (el) focusTarget(el);
      done();
    },
  });
}

function cutTo(lenis, veil, y, el) {
  const done = takeHold();
  gsap.to(veil, {
    opacity: 1,
    duration: VEIL_IN,
    ease: 'none',
    overwrite: true,
    onInterrupt: () => done(true),
    onComplete: () => {
      try {
        requestSnap();
        lenis.scrollTo(y, {
          immediate: true,
          force: true,
          onComplete: () => {
            try {
              ScrollTrigger.update();
              if (el) focusTarget(el);
            } finally {
              done();
              gsap.to(veil, { opacity: 0, duration: VEIL_OUT, ease: 'power1.out', overwrite: true });
            }
          },
        });
      } catch (err) {
        done();
        gsap.to(veil, { opacity: 0, duration: VEIL_OUT, ease: 'power1.out', overwrite: true });
        throw err;
      }
    },
  });
}

function focusTarget(el) {
  if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) {
    el.setAttribute('tabindex', '-1');
  }
  el.focus({ preventScroll: true });
}

// Lenis drives the native scroll position, so ScrollTrigger reads window
// scroll as usual; both run on GSAP's ticker so they stay in the same frame.
// Reduced motion: no Lenis at all, plain native scrolling and anchor jumps.
export function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    const lenis = new Lenis({ ...LENIS_OPTIONS, autoRaf: false });
    current = lenis;
    lenis.on('scroll', (instance) => {
      if (Math.abs(instance.velocity) > FLICK_VELOCITY) requestSnap();
      ScrollTrigger.update();
      emitScroll(instance, false);
    });

    const veil = document.createElement('div');
    veil.className = 'jump-veil';
    veil.setAttribute('aria-hidden', 'true');
    document.body.appendChild(veil);

    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Handled here instead of Lenis' `anchors` option so keyboard focus still
    // moves to the target, like a native hash jump would.
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target.closest?.('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute('href').slice(1);
      const el = id ? document.getElementById(id) : null;
      if (id && !el) return;
      e.preventDefault();
      const y = scrollTarget(el, id);
      const distance = Math.abs(y - lenis.scroll);
      if (distance > window.innerHeight * JUMP_GLIDE_MAX_VH) cutTo(lenis, veil, y, el);
      else glideTo(lenis, y, el);
    };
    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('click', onClick);
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      veil.remove();
      lenis.destroy();
      if (current === lenis) current = null;
    };
  }, []);
}
