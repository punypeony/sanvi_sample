import { useRef } from 'react';
import { PARTS } from '../three/headphoneParts';
import { gsap, MQ, ScrollTrigger, SplitText, useGSAP } from '../scroll/gsap';
import { scrollStore } from '../scroll/scrollStore';
import { notifyHighlight } from '../three/modelFocus';
import { HERO_EXIT_SPIN } from './Hero';

// ---- Teardown tuning ----
// How far you scroll (in viewport heights) while the section stays pinned.
// One constant for both breakpoints. Phase split below stays in proportion.
const PIN_VH = { desktop: 1100, mobile: 700 };
// Small lag on the pin so the pose eases instead of sticking to the scrollbar.
const TEARDOWN_SCRUB = 0.6;
// Shares of the scrubbed timeline. The 9 part slots are equal, in PARTS order.
const PHASE = { explode: 1.15, part: 1, reassemble: 1.15 };
// Fraction of a part slot spent blending the model from the previous side.
const TEXT_FADE = 0.28;
// Time-based copy. Played when the part index changes, never scrubbed.
const NAME_DUR = 0.7;
const EXIT_DUR = 0.38;
// Shift the model (fraction of the viewport) so it never sits under the copy.
// Desktop alternates sides; mobile keeps the copy at the bottom.
const SHIFT_X = 0.2;
const SHIFT_Y = -0.18;
// Reduced-motion list keeps the copy on the left and the model to the right.
const LIST_SHIFT_X = 0.16;
// A scroll jump bigger than this (0-1) snaps the 3D instead of damping.
const SNAP_PROGRESS = 0.06;

// Pose contract, so the sections on either side don't jump:
//   progress 0 matches the end of the hero hand-off: assembled, centered,
//   framing "home", rotationY = HERO_EXIT_SPIN (the hero owns rotation there).
//   progress 1 is the same pose again. The next section must start from it.

const pad = (n) => String(n).padStart(2, '0');

// "38 g", "20,000+", "-22 dB passive" count. "Stepped, 12 positions" does not.
function leadingNumber(value) {
  const m = /^([+-]?)(\d[\d,]*)(\.\d+)?/.exec(value.trim());
  if (!m) return null;
  return {
    num: parseFloat((m[2] + (m[3] || '')).replace(/,/g, '')),
    suffix: value.trim().slice(m[0].length),
    sign: m[1] === '-' ? '-' : '',
    grouped: m[2].includes(','),
    decimals: m[3] ? m[3].length - 1 : 0,
  };
}

function formatNum(n, spec) {
  const abs = Math.abs(n);
  const rounded = spec.decimals ? abs.toFixed(spec.decimals) : String(Math.round(abs));
  const [int, frac] = rounded.split('.');
  const body = (spec.grouped ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : int) + (frac ? '.' + frac : '');
  return spec.sign + body + spec.suffix;
}

function prepareCard(el) {
  const split = SplitText.create(el.querySelector('.teardown-name'), {
    type: 'lines',
    mask: 'lines',
    aria: 'none',
  });
  el._split = split;
  el._lines = split.lines;
  el.querySelectorAll('.spec-value').forEach((node) => {
    node.dataset.full = node.textContent;
    node._num = leadingNumber(node.textContent);
    node._counter = { n: 0 };
  });
  gsap.set(el, { autoAlpha: 0 });
}

function setFinal(el, on) {
  const targets = [el, ...el.querySelectorAll('.teardown-ghost, .teardown-desc, .teardown-rule, .spec-slide')];
  if (el._lines) targets.push(...el._lines);
  gsap.killTweensOf(targets);
  if (!on) {
    gsap.set(el, { autoAlpha: 0 });
    return;
  }
  gsap.set(el, { autoAlpha: 1 });
  gsap.set(el._lines, { yPercent: 0 });
  gsap.set(el.querySelectorAll('.spec-slide'), { yPercent: 0 });
  gsap.set(el.querySelectorAll('.teardown-rule'), { scaleX: 1 });
  gsap.set(el.querySelector('.teardown-ghost'), { autoAlpha: 1, yPercent: 0 });
  gsap.set(el.querySelector('.teardown-desc'), { autoAlpha: 1 });
  el.querySelectorAll('.spec-value').forEach((node) => {
    node.textContent = node.dataset.full;
  });
}

// dir > 0 means the page is moving downward, so the copy leaves upward.
function exitCard(el, dir) {
  const y = dir >= 0 ? -120 : 120;
  const tl = gsap.timeline();
  tl.to(el._lines, { yPercent: y, duration: EXIT_DUR, ease: 'power3.in', stagger: 0.02 }, 0);
  tl.to(el.querySelectorAll('.spec-slide'), { yPercent: y, duration: EXIT_DUR, ease: 'power3.in', stagger: 0.015 }, 0);
  tl.to(el.querySelector('.teardown-ghost'), { autoAlpha: 0, duration: 0.2 }, 0);
  tl.to(el.querySelector('.teardown-desc'), { autoAlpha: 0, duration: 0.2 }, 0);
  tl.to(el.querySelectorAll('.teardown-rule'), { scaleX: 0, duration: 0.22, ease: 'power2.in' }, 0);
  tl.set(el, { autoAlpha: 0 });
  return tl;
}

function enterCard(el) {
  const desc = el.querySelector('.teardown-desc');
  const rules = el.querySelectorAll('.teardown-rule');
  const slides = el.querySelectorAll('.spec-slide');
  gsap.set(el, { autoAlpha: 1 });
  gsap.set(el._lines, { yPercent: 110 });
  gsap.set(slides, { yPercent: 110 });
  gsap.set(rules, { scaleX: 0 });
  gsap.set(desc, { autoAlpha: 0 });
  gsap.set(el.querySelector('.teardown-ghost'), { autoAlpha: 0, yPercent: 0 });

  const tl = gsap.timeline();
  tl.to(el.querySelector('.teardown-ghost'), { autoAlpha: 1, duration: 0.45, ease: 'power2.out' }, 0);
  tl.to(el._lines, { yPercent: 0, duration: NAME_DUR, ease: 'power3.out', stagger: 0.06 }, 0);
  tl.to(desc, { autoAlpha: 1, duration: 0.45, ease: 'power1.out' }, 0.24);
  rules.forEach((rule, i) => {
    const at = 0.32 + i * 0.08;
    tl.to(rule, { scaleX: 1, duration: 0.36, ease: 'power2.inOut' }, at);
    tl.to([slides[i * 2], slides[i * 2 + 1]], { yPercent: 0, duration: 0.42, ease: 'power2.out' }, at + 0.1);
  });
  el.querySelectorAll('.spec-value').forEach((node) => {
    const spec = node._num;
    if (!spec) return;
    node._counter.n = 0;
    node.textContent = formatNum(0, spec);
    tl.to(node._counter, {
      n: spec.num,
      duration: 0.55,
      ease: 'power2.out',
      onUpdate: () => {
        node.textContent = formatNum(node._counter.n, spec);
      },
    }, 0.42);
  });
  return tl;
}

function clearPose() {
  scrollStore.explodeProgress = 0;
  scrollStore.activePartIndex = -1;
  scrollStore.framing = 'home';
  scrollStore.cameraDistance = 1;
  scrollStore.shiftX = 0;
  scrollStore.shiftY = 0;
}

// Even parts: copy on the right, model shifts left. Odd parts: the reverse.
function shiftXFor(index) {
  return (index % 2 === 0 ? -1 : 1) * SHIFT_X;
}

function writeShift(index, mobile, amount) {
  scrollStore.shiftX = mobile ? 0 : shiftXFor(index) * amount;
  scrollStore.shiftY = mobile ? SHIFT_Y * amount : 0;
}

function writeShiftBlend(from, to, mobile, u) {
  if (mobile) {
    scrollStore.shiftX = 0;
    scrollStore.shiftY = SHIFT_Y;
    return;
  }
  scrollStore.shiftX = shiftXFor(from) + (shiftXFor(to) - shiftXFor(from)) * u;
  scrollStore.shiftY = 0;
}

function mountPin(section, mobile) {
  clearPose();
  const stage = section.querySelector('.teardown-stage');
  const cards = gsap.utils.toArray('.teardown-card', stage);
  const eyebrow = stage.querySelector('.teardown-eyebrow');
  const n = PARTS.length;
  const total = PHASE.explode + n * PHASE.part + PHASE.reassemble;
  const pinVh = mobile ? PIN_VH.mobile : PIN_VH.desktop;

  let lastP = -1;
  let shown = -2;
  let active = null;
  const ticks = gsap.utils.toArray('.teardown-tick', stage);

  cards.forEach(prepareCard);

  const setRail = (index) => {
    for (let i = 0; i < ticks.length; i++) ticks[i].classList.toggle('is-active', i === index);
  };

  // Time-based. A new index kills whatever is playing and starts that part;
  // skipped parts are never queued. `instant` (a jump, or a skip of more than
  // one part) writes the finished state instead of replaying the reveal.
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
    section.dataset.part = String(index);
    notifyHighlight();
    setRail(index);
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
    } else {
      active = entering;
    }
  };

  const apply = (self) => {
    const p = self.progress;
    const dir = lastP < 0 || p >= lastP ? 1 : -1;
    if (lastP >= 0 && Math.abs(p - lastP) > SNAP_PROGRESS) scrollStore.poseEpoch++;
    lastP = p;

    // At and before the pin, the hero still owns the rotation. The start
    // edge is the exception: a jump onto it must not keep a later section's spin.
    if (p <= 0) {
      clearPose();
      if (Math.abs(window.scrollY - self.start) <= 4) scrollStore.rotationY = HERO_EXIT_SPIN;
      show(-1, dir, scrollStore.snap);
      return;
    }

    scrollStore.rotationY = HERO_EXIT_SPIN;
    scrollStore.cameraDistance = 1;
    const explodeEnd = PHASE.explode / total;
    const reassembleStart = (PHASE.explode + n * PHASE.part) / total;

    if (p < explodeEnd) {
      const e = p / explodeEnd;
      scrollStore.explodeProgress = e;
      scrollStore.activePartIndex = -1;
      scrollStore.framing = 'exploded';
      writeShift(0, mobile, e);
      show(-1, dir, scrollStore.snap);
      return;
    }

    if (p >= reassembleStart) {
      const e = (p - reassembleStart) / (1 - reassembleStart);
      scrollStore.explodeProgress = 1 - e;
      scrollStore.activePartIndex = -1;
      // Back to the home framing late, so the end pose matches the next section.
      scrollStore.framing = e > 0.85 ? 'home' : 'exploded';
      writeShift(n - 1, mobile, 1 - e);
      show(-1, dir, scrollStore.snap);
      return;
    }

    const span = reassembleStart - explodeEnd;
    const partF = ((p - explodeEnd) / span) * n;
    const index = Math.min(n - 1, Math.floor(partF));
    const frac = partF - index;
    scrollStore.explodeProgress = 1;
    scrollStore.activePartIndex = index;
    scrollStore.framing = 'exploded';
    const u = index > 0 && frac < TEXT_FADE ? frac / TEXT_FADE : 1;
    writeShiftBlend(index > 0 ? index - 1 : index, index, mobile, u);
    const skipped = shown >= 0 && Math.abs(index - shown) > 1;
    show(index, dir, scrollStore.snap || skipped);
  };

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => '+=' + window.innerHeight * (pinVh / 100),
      pin: true,
      scrub: TEARDOWN_SCRUB,
      anticipatePin: 0,
      invalidateOnRefresh: true,
      onUpdate: apply,
      onRefresh: apply,
    },
  });

  // Gives the timeline a length of exactly `total`, which is the same clock
  // the pose math uses. The copy is not on this timeline; it plays on its own
  // clock when the part index changes.
  const clock = { t: 0 };
  tl.fromTo(clock, { t: 0 }, { t: 1, duration: total, ease: 'none' }, 0);
  if (eyebrow) gsap.set(eyebrow, { autoAlpha: 1 });

  return () => {
    if (active) active.kill();
    tl.kill();
    cards.forEach((el) => el._split?.revert());
  };
}

// No pin: a list that fades in as it scrolls. The model snaps to whichever
// part is crossing the middle of the screen.
function mountList(section) {
  clearPose();
  const list = section.querySelector('.teardown-list');
  const items = gsap.utils.toArray('li', list);
  const mobile = window.matchMedia(MQ.mobile).matches;
  let current = -1;

  const apply = () => {
    // Still over the hero: it owns the pose.
    if (window.scrollY < section.offsetTop - 2) {
      if (current !== -1) {
        current = -1;
        clearPose();
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
    if (best < 0) {
      clearPose();
      scrollStore.rotationY = HERO_EXIT_SPIN;
    } else {
      scrollStore.explodeProgress = 1;
      scrollStore.activePartIndex = best;
      scrollStore.framing = 'exploded';
      scrollStore.cameraDistance = 1;
      scrollStore.rotationY = HERO_EXIT_SPIN;
      scrollStore.shiftX = mobile ? 0 : LIST_SHIFT_X;
      scrollStore.shiftY = mobile ? SHIFT_Y : 0;
    }
    notifyHighlight();
  };

  ScrollTrigger.create({
    trigger: list,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: apply,
    onRefresh: apply,
  });
}

function PartBody({ part, index }) {
  return (
    <div className="teardown-copy">
      <p className="sr-only">
        {pad(index + 1)} / {pad(PARTS.length)}. {part.name}
      </p>
      <span className="teardown-ghost" aria-hidden="true">
        {pad(index + 1)}
      </span>
      <h3 className="teardown-name">{part.name}</h3>
      <p className="teardown-desc">{part.description}</p>
      <dl className="teardown-specs">
        {part.specs.map((spec) => (
          <div className="spec-row" key={spec.label}>
            <span className="teardown-rule" aria-hidden="true" />
            <div className="spec-line">
              <dt>
                <span className="mask">
                  <span className="spec-slide">{spec.label}</span>
                </span>
              </dt>
              <dd>
                <span className="mask">
                  <span className="spec-slide spec-value">{spec.value}</span>
                </span>
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function Teardown() {
  const root = useRef(null);

  useGSAP(
    () => {
      const section = root.current;
      const mm = gsap.matchMedia();
      mm.add(`${MQ.motion} and ${MQ.desktop}`, () => mountPin(section, false));
      mm.add(`${MQ.motion} and ${MQ.mobile}`, () => mountPin(section, true));
      mm.add(MQ.reduce, () => mountList(section));
    },
    { scope: root }
  );

  return (
    <section id="teardown" ref={root} className="section teardown" aria-labelledby="teardown-title">
      <h2 id="teardown-title" className="sr-only">
        Teardown
      </h2>

      <div className="teardown-stage">
        <p className="teardown-eyebrow" aria-hidden="true">
          Teardown
        </p>
        <div className="teardown-rail" aria-hidden="true">
          {PARTS.map((part) => (
            <span key={part.id} className="teardown-tick" />
          ))}
        </div>
        {PARTS.map((part, i) => (
          <article
            key={part.id}
            className={`teardown-card teardown-card--${i % 2 === 0 ? 'right' : 'left'}`}
            aria-hidden="true"
          >
            <PartBody part={part} index={i} />
          </article>
        ))}
      </div>

      <ol className="teardown-list">
        {PARTS.map((part, i) => (
          <li key={part.id}>
            <article className="teardown-static">
              <PartBody part={part} index={i} />
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
