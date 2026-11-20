import { useRef } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { flagship, flagshipPath } from '../data/products';
import ColorPicker from '../components/ColorPicker';
import RevealText from './RevealText';
import { gsap, MQ, ScrollTrigger, useGSAP } from '../scroll/gsap';
import { scrollStore, setMode } from '../scroll/scrollStore';

// ---- Hero scroll tuning ----
// Once the hero is scrolled this far (0-1), the model stops being clickable
// and the scroll timeline takes over.
const HANDOFF_AT = 0.4;
// The model turns this much (radians) while the hero scrolls away.
// The next section should start from the same rotation.
export const HERO_EXIT_SPIN = 0.5;

// Not a stacking context on purpose: the title sits behind the 3D canvas
// (z 1) and the controls in front of it (z 5+). See App.css.
export default function Hero({ colorId, onColorChange }) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const hero = ref.current;

      // Driven by progress, not isActive: isActive turns false again at progress 1.
      const applyMode = (self) => setMode(self.progress > 0 ? 'scroll' : 'interactive');
      ScrollTrigger.create({
        trigger: hero,
        start: `${HANDOFF_AT * 100}% top`,
        end: 'bottom top',
        onUpdate: applyMode,
        onRefresh: applyMode,
      });

      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        ScrollTrigger.create({
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          onUpdate: (self) => {
            scrollStore.rotationY = self.progress * HERO_EXIT_SPIN;
          },
        });
        // Parallax on the copy only; the buttons scroll normally.
        gsap.to('.hero-title-wrap', {
          yPercent: -18,
          opacity: 0,
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
        });
        gsap.to('.scroll-cue', {
          opacity: 0,
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: '20% top', scrub: true },
        });
        return () => {
          scrollStore.rotationY = 0;
        };
      });

      return () => {
        mm.revert();
        setMode('interactive');
      };
    },
    { scope: ref }
  );

  return (
    <section id="top" ref={ref} className="hero" aria-label="Introduction">
      <div className="hero-title-wrap">
        <p className="hero-eyebrow">Over-ear · Active noise cancelling</p>
        <h1 className="hero-title">
          <RevealText as="span" className="hero-line hero-line--1" onLoad delay={0.2}>
            Every layer,
          </RevealText>{' '}
          <RevealText as="span" className="hero-line hero-line--2" onLoad delay={0.35}>
            engineered.
          </RevealText>
        </h1>
      </div>

      <ColorPicker value={colorId} onChange={onColorChange} />

      <div className="hero-actions">
        <Link to="/shop" className="light-button">
          Shop now
        </Link>
        <Link to={flagshipPath} className="outline-button">
          Explore {flagship.name} <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>

      <a href="#featured" className="scroll-cue">
        <span>Scroll to explore</span>
        <span className="scroll-cue-line" aria-hidden="true" />
      </a>
    </section>
  );
}
