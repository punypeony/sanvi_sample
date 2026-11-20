import { useRef } from 'react';
import { reviews } from '../data/product';
import { COLORWAYS_BY_ID } from '../three/colorways';
import { gsap, MQ, ScrollTrigger, useGSAP } from '../scroll/gsap';

// Pixels per second. Both rows use it; one runs the other way.
const MARQUEE_PPS = 72;

const colorName = (id) => COLORWAYS_BY_ID[id]?.name ?? id;

function stars(rating) {
  const n = Math.round(rating);
  return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
}

function Card({ review }) {
  return (
    <article className="review-card" tabIndex={0}>
      <p className="review-stars" aria-label={`${review.rating} out of 5`}>
        {stars(review.rating)}
      </p>
      <p className="review-text">{review.text}</p>
      <p className="review-by">
        <span>{review.name}</span>
        <span aria-hidden="true"> · </span>
        <span>{colorName(review.colorway)}</span>
      </p>
    </article>
  );
}

function Row({ items, reverse }) {
  return (
    <div className="marquee" data-reverse={reverse ? 'true' : 'false'}>
      <div className="marquee-track">
        {items.map((review) => (
          <Card key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}

// Repeat the real cards until a row can cover a wide screen, then duplicate
// that whole run once so a -50% slide lands on an identical frame.
function fillTrack(track) {
  track.querySelectorAll('[data-clone]').forEach((node) => node.remove());
  const base = [...track.children];
  let guard = 0;
  while (track.scrollWidth < window.innerWidth * 2 && guard < 8) {
    base.forEach((node) => track.appendChild(markClone(node)));
    guard += 1;
  }
  [...track.children].forEach((node) => track.appendChild(markClone(node)));
}

function markClone(node) {
  const copy = node.cloneNode(true);
  copy.dataset.clone = 'true';
  copy.setAttribute('aria-hidden', 'true');
  copy.tabIndex = -1;
  return copy;
}

function mountMarquees(section) {
  const rows = [...section.querySelectorAll('.marquee')];
  const tweens = [];
  let hovering = false;
  let focused = false;
  let seen = false;

  const sync = () => {
    const paused = hovering || focused || !seen;
    tweens.forEach((tween) => {
      if (paused) tween.pause();
      else tween.play();
    });
  };

  const build = () => {
    tweens.forEach((tween) => tween.kill());
    tweens.length = 0;
    rows.forEach((row) => {
      const track = row.querySelector('.marquee-track');
      gsap.set(track, { x: 0 });
      fillTrack(track);
      const distance = track.scrollWidth / 2;
      if (distance < 1) return;
      const reverse = row.dataset.reverse === 'true';
      tweens.push(
        gsap.fromTo(
          track,
          { x: reverse ? -distance : 0 },
          {
            x: reverse ? 0 : -distance,
            duration: distance / MARQUEE_PPS,
            ease: 'none',
            repeat: -1,
          }
        )
      );
    });
    sync();
  };

  build();

  const onPointerEnter = () => {
    hovering = true;
    sync();
  };
  const onPointerLeave = () => {
    hovering = rows.some((row) => row.matches(':hover'));
    sync();
  };
  const onFocusIn = () => {
    focused = true;
    sync();
  };
  const onFocusOut = (event) => {
    if (section.contains(event.relatedTarget)) return;
    focused = false;
    sync();
  };
  rows.forEach((row) => {
    row.addEventListener('pointerenter', onPointerEnter);
    row.addEventListener('pointerleave', onPointerLeave);
    row.addEventListener('focusin', onFocusIn);
    row.addEventListener('focusout', onFocusOut);
  });

  const onResize = () => build();
  window.addEventListener('resize', onResize);

  const view = ScrollTrigger.create({
    trigger: section,
    start: 'top bottom',
    end: 'bottom top',
    // After the pins above, or this range is short by their pin distance and
    // the rows stay paused while the section is actually on screen.
    refreshPriority: -1,
    onToggle: (self) => {
      seen = self.isActive;
      sync();
    },
  });

  // onToggle is skipped during ScrollTrigger.refresh, so a resize can leave
  // `seen` stale. Read the trigger again once refresh (and every scroll) settles.
  const syncSeen = () => {
    const active = view.isActive;
    if (active === seen) return;
    seen = active;
    sync();
  };
  ScrollTrigger.addEventListener('scroll', syncSeen);
  ScrollTrigger.addEventListener('refresh', syncSeen);
  syncSeen();

  return () => {
    window.removeEventListener('resize', onResize);
    ScrollTrigger.removeEventListener('scroll', syncSeen);
    ScrollTrigger.removeEventListener('refresh', syncSeen);
    rows.forEach((row) => {
      row.removeEventListener('pointerenter', onPointerEnter);
      row.removeEventListener('pointerleave', onPointerLeave);
      row.removeEventListener('focusin', onFocusIn);
      row.removeEventListener('focusout', onFocusOut);
    });
    tweens.forEach((tween) => tween.kill());
    rows.forEach((row) => {
      const track = row.querySelector('.marquee-track');
      track.querySelectorAll('[data-clone]').forEach((node) => node.remove());
      gsap.set(track, { clearProps: 'transform' });
    });
    view.kill();
  };
}

export default function Reviews() {
  const root = useRef(null);
  const even = reviews.reviews.filter((_, i) => i % 2 === 0);
  const odd = reviews.reviews.filter((_, i) => i % 2 === 1);

  useGSAP(
    () => {
      const section = root.current;
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => mountMarquees(section));
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section
      id="reviews"
      ref={root}
      className="section section--opaque reviews"
      data-stage-cover
      aria-labelledby="reviews-title"
    >
      <header className="reviews-head">
        <h2 id="reviews-title">Reviews</h2>
        <p className="reviews-score">
          <strong>{reviews.average.toFixed(1)}</strong>
          <span> / 5 from {reviews.count.toLocaleString('en-US')} reviews</span>
        </p>
      </header>

      <Row items={even} reverse={false} />
      <Row items={odd} reverse />
    </section>
  );
}
