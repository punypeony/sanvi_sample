import { useRef } from 'react';
import AudioControls from '../components/AudioControls';
import { stopPlayback } from '../audio/audioEngine';
import { gsap, MQ, ScrollTrigger, useGSAP } from '../scroll/gsap';
import { scrollStore } from '../scroll/scrollStore';
import { notifyHighlight } from '../three/modelFocus';
import { COLORWAYS_EXIT_SPIN } from './Colorways';

// ---- Sound tuning ----
// How far you scroll while the section stays pinned.
const PIN_VH = { desktop: 300, mobile: 220 };
const SOUND_SCRUB = 0.5;
// A change of word replaces the previous tween. It does not queue.
const WORD_DUR = 0.5;
const LINE_OUT = 0.22;
const LINE_IN = 0.42;
const DIM = 0.28;
// The stack sits to the side. Both ends of the pin are centered again.
const SHIFT_X = 0.18;
const SHIFT_Y = -0.16;
const SHIFT_EDGE = 0.1;
const LIST_SHIFT_X = 0.14;
const LIST_SHIFT_Y = -0.12;
const SNAP_PROGRESS = 0.06;

// Pose contract: progress 0 and progress 1 match the Colorways end pose
// (assembled, centered, COLORWAYS_EXIT_SPIN, the visitor's own color).

const WORDS = [
  { word: 'Bass', line: 'Weight you feel before you name it.' },
  { word: 'Clarity', line: 'Voices sit forward, and stay there.' },
  { word: 'Silence', line: 'The room drops out. The track does not.' },
  { word: 'Detail', line: 'The edge of a string, still in the mix.' },
];

function shiftAmount(p) {
  if (p <= 0 || p >= 1) return 0;
  return Math.min(1, p / SHIFT_EDGE, (1 - p) / SHIFT_EDGE);
}

function writePose(shiftX, shiftY) {
  scrollStore.explodeProgress = 0;
  scrollStore.activePartIndex = -1;
  scrollStore.framing = 'home';
  scrollStore.cameraDistance = 1;
  scrollStore.rotationY = COLORWAYS_EXIT_SPIN;
  scrollStore.shiftX = shiftX;
  scrollStore.shiftY = shiftY;
  scrollStore.colorId = null;
  scrollStore.rim = 0;
}

let soundOn = false;
function setSound(on) {
  if (on === soundOn) return;
  soundOn = on;
  scrollStore.sound = on ? 1 : 0;
  if (!on) stopPlayback();
  notifyHighlight();
}

function mountPin(section, mobile) {
  const words = gsap.utils.toArray('.sound-word', section);
  const inner = section.querySelector('.sound-line-inner');
  const controls = section.querySelector('.sound-controls');
  const n = WORDS.length;
  const pinVh = mobile ? PIN_VH.mobile : PIN_VH.desktop;

  let lastP = -1;
  let shown = -2;
  let lineTween = null;
  let live = false;

  gsap.set(words, { opacity: DIM, y: 0 });
  gsap.set(inner, { autoAlpha: 0 });
  controls.inert = true;

  const setLive = (on) => {
    if (on === live) return;
    live = on;
    controls.inert = !on;
    setSound(on);
  };

  // Time-based. A new index kills the line in flight. A jump, or a skip of
  // more than one word, writes the finished highlight.
  const showWord = (index, dir, instant) => {
    if (index === shown) return;
    shown = index;
    if (lineTween) {
      lineTween.kill();
      lineTween = null;
    }
    words.forEach((el, i) => {
      const on = i === index;
      el.classList.toggle('is-active', on);
      if (on) el.parentElement.setAttribute('aria-current', 'true');
      else el.parentElement.removeAttribute('aria-current');
      gsap.killTweensOf(el);
      if (instant || index < 0) {
        gsap.set(el, { opacity: on ? 1 : DIM, y: 0 });
        return;
      }
      gsap.fromTo(
        el,
        { opacity: on ? DIM : 1, y: on ? (dir >= 0 ? 28 : -28) : 0 },
        {
          opacity: on ? 1 : DIM,
          y: on ? 0 : dir >= 0 ? -16 : 16,
          duration: WORD_DUR,
          ease: 'power3.out',
          overwrite: true,
        }
      );
    });
    gsap.killTweensOf(inner);
    if (index < 0) {
      gsap.set(inner, { yPercent: 0, autoAlpha: 0 });
      return;
    }
    if (instant) {
      inner.textContent = WORDS[index].line;
      gsap.set(inner, { yPercent: 0, autoAlpha: 1 });
      return;
    }
    const out = dir >= 0 ? -120 : 120;
    lineTween = gsap.timeline();
    lineTween.to(inner, { yPercent: out, autoAlpha: 0, duration: LINE_OUT, ease: 'power3.in' });
    lineTween.call(() => {
      inner.textContent = WORDS[index].line;
    });
    lineTween.set(inner, { yPercent: -out });
    lineTween.to(inner, { yPercent: 0, autoAlpha: 1, duration: LINE_IN, ease: 'power3.out' });
  };

  const apply = (self) => {
    const p = self.progress;
    const dir = lastP < 0 || p >= lastP ? 1 : -1;
    const jumped = lastP >= 0 && Math.abs(p - lastP) > SNAP_PROGRESS;
    if (jumped) scrollStore.poseEpoch++;
    const instant = scrollStore.snap || jumped;
    lastP = p;

    // Above the pin. The start edge counts as live: GSAP reports the trigger
    // inactive on the exact pixel a navbar jump lands on. Further up, only
    // clear the shift while we're still in the gap under Colorways — a jump
    // into Teardown has to keep Teardown's pose, and this trigger sorts last.
    if (p <= 0) {
      const y = window.scrollY;
      const onEdge = Math.abs(y - self.start) <= 4;
      if (self.isActive || onEdge) {
        setLive(true);
        writePose(0, 0);
        showWord(0, dir, instant);
        return;
      }
      setLive(false);
      showWord(-1, dir, true);
      const colors = ScrollTrigger.getAll().find((t) => t.vars.pin && t.trigger && t.trigger.id === 'colors');
      if (colors && y >= colors.end - 4) writePose(0, 0);
      return;
    }

    if (p >= 1) {
      setLive(false);
      showWord(-1, dir, instant);
      writePose(0, 0);
      return;
    }

    setLive(true);
    const index = Math.min(n - 1, Math.floor(p * n));
    const amount = shiftAmount(p);
    writePose(mobile ? 0 : SHIFT_X * amount, mobile ? SHIFT_Y * amount : 0);
    const skipped = shown >= 0 && Math.abs(index - shown) > 1;
    showWord(index, dir, instant || skipped);
  };

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => '+=' + window.innerHeight * (pinVh / 100),
      pin: true,
      scrub: SOUND_SCRUB,
      anticipatePin: 0,
      invalidateOnRefresh: true,
      // After Colorways, so a refresh doesn't leave its centered pose on top of ours.
      refreshPriority: -1,
      onUpdate: apply,
      onRefresh: apply,
      onLeave: () => setLive(false),
      onLeaveBack: (st) => {
        if (Math.abs(window.scrollY - st.start) <= 4) return;
        setLive(false);
      },
    },
  });

  const clock = { t: 0 };
  tl.fromTo(clock, { t: 0 }, { t: 1, duration: 1, ease: 'none' }, 0);

  // Progress stays 0 from the top of the page all the way to the pin, so
  // onUpdate never fires for a jump that lands on the start. Scroll does.
  const onScroll = () => apply(tl.scrollTrigger);
  window.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', onScroll);
    if (lineTween) lineTween.kill();
    tl.kill();
    setLive(false);
    controls.inert = true;
  };
}

// No pin. The words stay a list, and the controls only work on screen.
function mountStatic(section) {
  const controls = section.querySelector('.sound-controls');
  const mobile = window.matchMedia(MQ.mobile).matches;
  controls.inert = true;
  gsap.set(section.querySelectorAll('.sound-word'), { opacity: 1, y: 0 });

  let live = false;
  const apply = (self) => {
    const on = self.isActive;
    controls.inert = !on;
    if (on !== live) {
      live = on;
      setSound(on);
    }
    if (on) writePose(mobile ? 0 : LIST_SHIFT_X, mobile ? LIST_SHIFT_Y : 0);
    else if (self.progress >= 1) writePose(0, 0);
  };

  ScrollTrigger.create({
    trigger: section,
    start: 'top 70%',
    end: 'bottom 30%',
    onToggle: apply,
    onUpdate: apply,
    onRefresh: apply,
  });

  return () => {
    setSound(false);
    controls.inert = true;
  };
}

export default function Sound() {
  const root = useRef(null);

  useGSAP(
    () => {
      const section = root.current;
      const mm = gsap.matchMedia();
      mm.add(`${MQ.motion} and ${MQ.desktop}`, () => mountPin(section, false));
      mm.add(`${MQ.motion} and ${MQ.mobile}`, () => mountPin(section, true));
      mm.add(MQ.reduce, () => mountStatic(section));
      return () => {
        mm.revert();
        setSound(false);
      };
    },
    { scope: root }
  );

  return (
    <section id="sound" ref={root} className="section sound">
      <h2 className="sr-only">Sound</h2>

      <div className="sound-stage">
        <p className="sound-eyebrow" aria-hidden="true">
          Sound
        </p>
        <div className="sound-copy">
          <ol className="sound-words">
            {WORDS.map((item) => (
              <li key={item.word}>
                <span className="sound-word">{item.word}</span>
                <p className="sound-static-line">{item.line}</p>
              </li>
            ))}
          </ol>
          <p className="sound-line" aria-hidden="true">
            <span className="sound-line-inner" />
          </p>
        </div>
        <div className="sound-controls">
          <AudioControls />
        </div>
      </div>
    </section>
  );
}
