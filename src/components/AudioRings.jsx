import { useEffect, useRef } from 'react';
import { getLevels, getSnapshot } from '../audio/audioEngine';

// Draws behind the 3D canvas:
//  - while the sample plays: faint rings that swell with the bass
//  - noise demo, ANC off: a wobbly ring plus its mirror image (anti-phase)
//  - noise demo, ANC on: the wobble collapses into one calm ring (they cancel)
// It also publishes --bass on its parent so the backdrop glow can pulse.
export default function AudioRings() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas.parentElement;
    const g = canvas.getContext('2d');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    const resize = () => {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let bass = 0;
    let wobble = 0;
    let raf;

    const ring = (cx, cy, r0, amp, sign, t, alpha) => {
      g.beginPath();
      for (let k = 0; k <= 120; k++) {
        const a = (k / 120) * Math.PI * 2;
        const n = Math.sin(a * 7 + t * 3.1) * 0.6 + Math.sin(a * 13 - t * 4.3) * 0.4;
        const r = r0 + sign * amp * n;
        const x = cx + Math.cos(a) * r * 1.1;
        const y = cy + Math.sin(a) * r * 0.92;
        if (k) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.closePath();
      g.strokeStyle = `rgba(255,255,255,${alpha})`;
      g.lineWidth = 1.2;
      g.stroke();
    };

    const loop = (ms) => {
      const t = ms / 1000;
      const snap = getSnapshot();
      const lv = getLevels();

      bass += (lv.bass - bass) * 0.35;
      wobble += ((snap.anc === 'noisy' ? 1 : 0) - wobble) * 0.04;
      host.style.setProperty('--bass', reduce ? '0' : bass.toFixed(3));

      g.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h * 0.5;
      const base = Math.min(w * 0.34, h * 0.5);

      if (bass > 0.01) {
        for (let i = 0; i < 3; i++) {
          const rr = base * (1 + i * 0.14) + bass * (26 - i * 6);
          g.beginPath();
          g.ellipse(cx, cy, rr * 1.1, rr * 0.92, 0, 0, Math.PI * 2);
          g.strokeStyle = `rgba(255,255,255,${(0.05 + 0.2 * bass) * (1 - i * 0.28)})`;
          g.lineWidth = 1.2;
          g.stroke();
        }
      }

      if (wobble > 0.01) {
        const r0 = base * 1.34;
        const amp = 14 * wobble;
        ring(cx, cy, r0, amp, 1, t, 0.32);
        ring(cx, cy, r0, amp, -1, t, 0.16);
      }
      if (snap.anc === 'cancelled') {
        ring(cx, cy, base * 1.34, 0, 1, t, 0.26 * (1 - wobble));
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
