import { useRef } from 'react';
import { gsap, MQ, SplitText, useGSAP } from '../scroll/gsap';

// ---- Text reveal tuning ----
const REVEAL = { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.08 };
const START = 'top 85%'; // when the reveal plays: element top hits 85% of the viewport

// Masked line (or word) reveal: each piece slides up out of its line mask.
// Plays on mount (onLoad) or when scrolled into view, and reverses when you
// scroll back above it. Reduced motion: a plain fade.
// Screen readers get the plain text; the split copy is aria-hidden.
export default function RevealText({
  as: Tag = 'p',
  children,
  className = '',
  split = 'lines', // 'lines' | 'words'
  delay = 0,
  onLoad = false,
  start = START,
}) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const el = ref.current;
      const trigger = () =>
        onLoad ? undefined : { trigger: el, start, toggleActions: 'play none none reverse' };

      const mm = gsap.matchMedia();
      // fromTo, not from: explicit end values survive the effect running twice.
      mm.add(MQ.reduce, () => {
        gsap.fromTo(
          el,
          { opacity: 0 },
          { opacity: 1, duration: 0.6, ease: 'power1.out', delay, scrollTrigger: trigger() }
        );
      });
      mm.add(MQ.motion, () => {
        const s = SplitText.create(el, {
          type: split === 'words' ? 'lines,words' : 'lines',
          tag: 'span',
          mask: 'lines',
          aria: 'none',
          autoSplit: true, // re-splits on resize / font load, keeping the tween's progress
          onSplit: (self) =>
            gsap.fromTo(
              split === 'words' ? self.words : self.lines,
              { yPercent: REVEAL.yPercent, opacity: 0 },
              {
                yPercent: 0,
                opacity: 1,
                duration: REVEAL.duration,
                ease: REVEAL.ease,
                stagger: REVEAL.stagger,
                delay,
                scrollTrigger: trigger(),
              }
            ),
        });
        return () => s.revert();
      });
      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <Tag className={`reveal ${className}`}>
      <span className="sr-only">{children}</span>
      <span ref={ref} className="reveal-inner" aria-hidden="true">
        {children}
      </span>
    </Tag>
  );
}
