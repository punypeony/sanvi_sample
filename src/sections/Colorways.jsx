import { useRef } from 'react';
import { COLORWAYS } from '../three/colorways';
import { gsap, MQ, ScrollTrigger, SplitText, useGSAP } from '../scroll/gsap';
import { scrollStore } from '../scroll/scrollStore';
import { notifyHighlight } from '../three/modelFocus';
import { HERO_EXIT_SPIN } from './Hero';

// ---- Colorways tuning ----
// How far you scroll (in viewport heights) while the section stays pinned.
const PIN_VH = { desktop: 400, mobile: 300 };
// Small lag on the pin. The copy is not on this timeline.
const COLORWAYS_SCRUB = 0.5;
// One full turn across the pin. The Sound section must start at this angle:
// progress 0 is HERO_EXIT_SPIN (the teardown's end), progress 1 is one turn later.
export const COLORWAYS_EXIT_SPIN = HERO_EXIT_SPIN + Math.PI * 2;
// Time-based copy, same feel as the teardown part names.
const NAME_DUR = 0.7;
const EXIT_DUR = 0.38;
const DESC_AT = 0.24;
// Model steps aside for the copy, then returns to center at both ends.
const SHIFT_X = 0.2;
const SHIFT_Y = -0.16;
const SHIFT_EDGE = 0.1;
// Reduced-motion list keeps the copy on the left.
const LIST_SHIFT_X = 0.16;
const LIST_SHIFT_Y = -0.12;
// A scroll jump bigger than this (0-1) snaps the 3D instead of damping.
const SNAP_PROGRESS = 0.06;

// Pose contract:
//   progress 0 matches the teardown's end: assembled, centered, home framing,
//   rotationY = HERO_EXIT_SPIN, colorId null (the visitor's own color).
//   progress 1 is COLORWAYS_EXIT_SPIN, still assembled and centered, colorId null.
//   colorId is set only while the pin is strictly between those ends.

const COPY = {
  maroon: 'Lacquered red. A highlight on the shell, and nothing else.',
  sky: 'Clear, cool blue. Light on the shell, quiet on the ear.',
  noir: 'The original. Near-black, with a faint edge along the metal.',
  ivory: 'Warm white. Soft in the hand, bright against the room.',
};

const pad = (n) => String(n).padStart(2, '0');

function shiftAmount(p) {
  if (p <= 0 || p >= 1) return 0;
  return Math.min(1, p / SHIFT_EDGE, (1 - p) / SHIFT_EDGE);
}

let rimOn = false;
function setRim(on) {
  if (on === rimOn) return;
  rimOn = on;
  scrollStore.rim = on ? 1 : 0;
  document.querySelector('.stage-backdrop')?.classList.toggle('is-colorways', on);
}

function releaseColor() {
  scrollStore.colorId = null;
  setRim(false);
}

// Assembled, centered, no part pulled out and no part glowing.
function writePose(rotationY, shiftX, shiftY) {
  scrollStore.explodeProgress = 0;
  scrollStore.activePartIndex = -1;
  scrollStore.framing = 'home';
  scrollStore.cameraDistance = 1;
  scrollStore.rotationY = rotationY;
  scrollStore.shiftX = shiftX;
  scrollStore.shiftY = shiftY;
}

function prepareCard(el) {
  const split = SplitText.create(el.querySelector('.colorways-name'), {
    type: 'lines',
    mask: 'lines',
    aria: 'none',
  });
  el._split = split;
  el._lines = split.lines;
  gsap.set(el, { autoAlpha: 0 });
}

function setFinal(el, on) {
  const targets = [el, el.querySelector('.colorways-desc')];
  if (el._lines) targets.push(...el._lines);
  gsap.killTweensOf(targets);
  if (!on) {
    gsap.set(el, { autoAlpha: 0 });
    return;
  }
  gsap.set(el, { autoAlpha: 1 });
  gsap.set(el._lines, { yPercent: 0 });
  gsap.set(el.querySelector('.colorways-desc'), { autoAlpha: 1 });
}

function exitCard(el, dir) {
  const y = dir >= 0 ? -120 : 120;
  const tl = gsap.timeline();
  tl.to(el._lines, { yPercent: y, duration: EXIT_DUR, ease: 'power3.in', stagger: 0.04 }, 0);
  tl.to(el.querySelector('.colorways-desc'), { autoAlpha: 0, duration: 0.2 }, 0);
  tl.set(el, { autoAlpha: 0 });
  return tl;
}

function enterCard(el) {
  const desc = el.querySelector('.colorways-desc');
  gsap.set(el, { autoAlpha: 1 });
  gsap.set(el._lines, { yPercent: 110 });
  gsap.set(desc, { autoAlpha: 0 });
  const tl = gsap.timeline();
  tl.to(el._lines, { yPercent: 0, duration: NAME_DUR, ease: 'power3.out', stagger: 0.06 }, 0);
  tl.to(desc, { autoAlpha: 1, duration: 0.45, ease: 'power1.out' }, DESC_AT);
  return tl;
}

function mountPin(section, mobile) {
  const stage = section.querySelector('.colorways-stage');
  const cards = gsap.utils.toArray('.colorways-card', stage);
  const dots = gsap.utils.toArray('.colorways-dot', stage);
  const counter = stage.querySelector('.colorways-count');
  const n = COLORWAYS.length;
  const pinVh = mobile ? PIN_VH.mobile : PIN_VH.desktop;

  let lastP = -1;
  let shown = -2;
  let active = null;

  cards.forEach(prepareCard);

  const setDots = (index) => {
    for (let i = 0; i < dots.length; i++) dots[i].classList.toggle('is-active', i === index);
    if (counter) counter.textContent = index >= 0 ? `${pad(index + 1)} / ${pad(n)}` : '';
  };

  // Time-based. A new index kills whatever is playing. A jump, or a skip of
  // more than one color, writes the finished state instead of replaying.
  const show = (index, dir, instant) => {
    if (index === shown) return;
    const prev = shown;
    shown = index;
    if (active) {
      active.kill();
      active = null;
    }
    for (let i = 0; i < cards.length; i++) {
      const leaving = i === prev && prev !== index && !instant;
      if (i !== index && !leaving) setFinal(cards[i], false);
      cards[i].setAttribute('aria-hidden', i === index ? 'false' : 'true');
    }
    section.dataset.color = index >= 0 ? COLORWAYS[index].id : '';
    setDots(index);
    notifyHighlight();
    if (index < 0) {
      if (prev >= 0) {
        if (instant) setFinal(cards[prev], false);
        else active = exitCard(cards[prev], dir);
      }
      return;
    }
    if (instant) {
      if (prev >= 0) setFinal(cards[prev], false);
      setFinal(cards[index], true);
      return;
    }
    const entering = enterCard(cards[index]);
    if (prev >= 0) {
      active = gsap.timeline();
      active.add(exitCard(cards[prev], dir), 0);
      active.add(entering, 0);
    } else active = entering;
  };

  const apply = (self) => {
    const p = self.progress;
    const dir = lastP < 0 || p >= lastP ? 1 : -1;
    const jumped = lastP >= 0 && Math.abs(p - lastP) > SNAP_PROGRESS;
    if (jumped) scrollStore.poseEpoch++;
    const instant = scrollStore.snap || jumped;
    lastP = p;

    // Above the pin. Only clear the override when we're actually at this
    // section's top — a jump into the teardown must keep the teardown's pose.
    if (p <= 0) {
      releaseColor();
      show(-1, dir, true);
      if (Math.abs(window.scrollY - self.start) <= 4) writePose(HERO_EXIT_SPIN, 0, 0);
      return;
    }

    // Past the pin: the pose Sound has to match, and the visitor's own color.
    if (p >= 1) {
      releaseColor();
      show(-1, dir, instant);
      writePose(COLORWAYS_EXIT_SPIN, 0, 0);
      return;
    }

    const index = Math.min(n - 1, Math.floor(p * n));
    const amount = shiftAmount(p);
    writePose(
      HERO_EXIT_SPIN + p * Math.PI * 2,
      mobile ? 0 : SHIFT_X * amount,
      mobile ? SHIFT_Y * amount : 0
    );
    scrollStore.colorId = COLORWAYS[index].id;
    setRim(true);
    const skipped = shown >= 0 && Math.abs(index - shown) > 1;
    show(index, dir, instant || skipped);
  };

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => '+=' + window.innerHeight * (pinVh / 100),
      pin: true,
      scrub: COLORWAYS_SCRUB,
      anticipatePin: 0,
      invalidateOnRefresh: true,
      onUpdate: apply,
      onRefresh: apply,
    },
  });

  const clock = { t: 0 };
  tl.fromTo(clock, { t: 0 }, { t: 1, duration: 1, ease: 'none' }, 0);
  const eyebrow = stage.querySelector('.colorways-eyebrow');
  if (eyebrow) gsap.set(eyebrow, { autoAlpha: 1 });

  return () => {
    if (active) active.kill();
    tl.kill();
    cards.forEach((el) => el._split?.revert());
    releaseColor();
  };
}

// No pin. Each color fades in, and the model snaps to it (reduced motion
// already skips damping in the frame loops).
function mountList(section) {
  const list = section.querySelector('.colorways-list');
  const items = gsap.utils.toArray('li', list);
  const mobile = window.matchMedia(MQ.mobile).matches;
  const n = COLORWAYS.length;
  let current = -2;

  items.forEach((li) => {
    gsap.fromTo(
      li,
      { autoAlpha: 0 },
      {
        autoAlpha: 1,
        duration: 0.6,
        ease: 'power1.out',
        scrollTrigger: { trigger: li, start: 'top 80%', toggleActions: 'play none none reverse' },
      }
    );
  });

  const apply = () => {
    if (window.scrollY < section.offsetTop - 2) {
      if (current !== -1) {
        current = -1;
        releaseColor();
        notifyHighlight();
      }
      return;
    }

    const mid = window.innerHeight * 0.5;
    let best = -1;
    if (list.getBoundingClientRect().bottom >= mid) {
      let bestD = Infinity;
      for (let i = 0; i < items.length; i++) {
        const r = items[i].getBoundingClientRect();
        if (r.bottom < mid || r.top > mid) continue;
        const d = Math.abs(r.top + r.height * 0.5 - mid);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    }

    if (best === current) return;
    current = best;
    scrollStore.poseEpoch++;
    notifyHighlight();
    if (best < 0) {
      releaseColor();
      writePose(COLORWAYS_EXIT_SPIN, 0, 0);
      section.dataset.color = '';
      return;
    }
    const u = n === 1 ? 1 : best / (n - 1);
    writePose(
      HERO_EXIT_SPIN + u * Math.PI * 2,
      mobile ? 0 : LIST_SHIFT_X,
      mobile ? LIST_SHIFT_Y : 0
    );
    scrollStore.colorId = COLORWAYS[best].id;
    setRim(true);
    section.dataset.color = COLORWAYS[best].id;
  };

  ScrollTrigger.create({
    trigger: list,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: apply,
    onRefresh: apply,
  });

  return () => releaseColor();
}

export default function Colorways() {
  const root = useRef(null);

  useGSAP(
    () => {
      const section = root.current;
      const mm = gsap.matchMedia();
      mm.add(`${MQ.motion} and ${MQ.desktop}`, () => mountPin(section, false));
      mm.add(`${MQ.motion} and ${MQ.mobile}`, () => mountPin(section, true));
      mm.add(MQ.reduce, () => mountList(section));
      return () => {
        mm.revert();
        releaseColor();
      };
    },
    { scope: root }
  );

  return (
    <section id="colors" ref={root} className="section colorways" aria-labelledby="colorways-title">
      <h2 id="colorways-title" className="sr-only">
        Colorways
      </h2>

      <div className="colorways-stage">
        <p className="colorways-eyebrow" aria-hidden="true">
          Colorways
        </p>
        <div className="colorways-meta">
          <p className="colorways-count" aria-hidden="true" />
          <div className="colorways-dots" aria-hidden="true">
            {COLORWAYS.map((color) => (
              <span key={color.id} className="colorways-dot" style={{ background: color.swatch }} />
            ))}
          </div>
        </div>
        {COLORWAYS.map((color, i) => (
          <article key={color.id} className="colorways-card" aria-hidden="true">
            <p className="sr-only">
              {pad(i + 1)} / {pad(COLORWAYS.length)}. {color.name}. {COPY[color.id]}
            </p>
            <h3 className="colorways-name">{color.name}</h3>
            <p className="colorways-desc">{COPY[color.id]}</p>
          </article>
        ))}
      </div>

      <ol className="colorways-list">
        {COLORWAYS.map((color, i) => (
          <li key={color.id}>
            <article className="colorways-static">
              <p className="colorways-kicker">
                {pad(i + 1)} / {pad(COLORWAYS.length)}
              </p>
              <h3 className="colorways-name">{color.name}</h3>
              <p className="colorways-desc">{COPY[color.id]}</p>
              <span className="colorways-swatch" style={{ background: color.swatch }} aria-hidden="true" />
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
