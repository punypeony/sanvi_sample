import { COLORWAYS } from '../three/colorways';

// Self-contained: its styles live in this file, so it doesn't depend on
// anything in App.css (and can't be broken by old leftover CSS).
const css = `
.nr-picker {
  position: absolute;
  left: min(24%, calc(50% - 300px));
  top: 30%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 22px;
  z-index: 6;
}

.nr-dot {
  appearance: none;
  -webkit-appearance: none;
  flex: 0 0 auto;
  box-sizing: border-box;
  display: block;
  width: 24px;
  height: 24px;
  min-width: 24px;
  aspect-ratio: 1 / 1;
  padding: 0;
  margin: 0;
  border-radius: 50%;
  background: var(--dot);
  border: 1px solid rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.nr-dot:hover { transform: scale(1.18); }

.nr-dot:focus-visible {
  outline: 1px solid #fff;
  outline-offset: 4px;
}

.nr-dot.nr-active {
  box-shadow: 0 0 0 4px #0a0a0a, 0 0 0 5px rgba(255, 255, 255, 0.9);
}

/* a few gentle pulses on load so people notice the dots are clickable */
.nr-dot:not(.nr-active) { animation: nr-pulse 2s ease-out 3; }

@keyframes nr-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
  100% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
}

@media (max-width: 650px) {
  .nr-picker {
    left: 50%;
    top: auto;
    bottom: 19%;
    transform: translateX(-50%);
    flex-direction: row;
    align-items: center;
    gap: 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nr-dot { animation: none !important; }
}
`;

export default function ColorPicker({ value, onChange }) {
  return (
    <>
      <style>{css}</style>
      <div className="nr-picker" role="radiogroup" aria-label="Headphone color">
        {COLORWAYS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={value === c.id}
            aria-label={`${c.name} headphones`}
            title={c.name}
            className={`nr-dot ${value === c.id ? 'nr-active' : ''}`}
            style={{ '--dot': c.swatch }}
            onClick={() => onChange(c.id)}
          />
        ))}
      </div>
    </>
  );
}