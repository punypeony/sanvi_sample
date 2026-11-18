import { PARTS_BY_ID } from './headphoneParts';

const ui = {
  tip: {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
    padding: '8px 14px',
    borderRadius: 999,
    background: 'rgba(10,11,13,0.82)',
    border: '1px solid rgba(255,255,255,0.14)',
    backdropFilter: 'blur(8px)',
    color: '#f2f2f2',
    fontSize: 13,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    transition: 'opacity 160ms ease',
    zIndex: 5,
  },
  panel: {
    position: 'absolute',
    right: 32,
    top: '50%',
    width: 300,
    padding: 22,
    borderRadius: 18,
    background: 'rgba(12,13,15,0.88)',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(12px)',
    color: '#f2f2f2',
    transition: 'opacity 220ms ease, transform 220ms ease',
    zIndex: 6,
  },
  pill: {
    padding: '10px 20px',
    borderRadius: 999,
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.35)',
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
  },
  round: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.35)',
    color: '#fff',
    fontSize: 20,
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
};

export const calloutCss = `
.nr-callout {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
  z-index: 4;
  will-change: transform;
}
.nr-cbtn {
  position: absolute;
  top: 0;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: #d8dbe0;
  font-family: inherit;
  font-size: 11px;
  letter-spacing: 0.04em;
  white-space: nowrap;
  pointer-events: inherit;
}
.nr-cbtn.nr-right { left: 0; }
.nr-cbtn.nr-left { right: 0; flex-direction: row-reverse; }
.nr-cdot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.18);
}
.nr-cline {
  flex: none;
  width: 44px;
  height: 1px;
  background: rgba(255, 255, 255, 0.45);
}
.nr-clabel {
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  background: rgba(10, 11, 13, 0.7);
  backdrop-filter: blur(6px);
  transition: background 0.2s ease;
}
.nr-cbtn:hover .nr-clabel { background: rgba(255, 255, 255, 0.14); }
@media (max-width: 650px) {
  .nr-callout { display: none !important; }
}
`;

export function SpecPanel({ part, open, onClose }) {
  if (!part) return null;
  return (
    <div
      style={{
        ...ui.panel,
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transform: `translateY(-50%) translateX(${open ? 0 : 16}px)`,
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: 12,
          right: 14,
          background: 'none',
          border: 'none',
          color: '#9a9ea6',
          fontSize: 20,
          cursor: 'pointer',
        }}
      >
        ×
      </button>
      <div style={{ fontSize: 11, letterSpacing: '0.14em', color: '#8b8f98', textTransform: 'uppercase' }}>
        Specifications
      </div>
      <h3 style={{ margin: '6px 0 8px', fontSize: 22, fontWeight: 600 }}>{part.name}</h3>
      <p style={{ margin: '0 0 16px', fontSize: 13, lineHeight: 1.5, color: '#b4b8c0' }}>
        {part.description}
      </p>
      <div>
        {part.specs.map((s) => (
          <div
            key={s.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              padding: '10px 0',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              fontSize: 13,
            }}
          >
            <span style={{ color: '#8b8f98' }}>{s.label}</span>
            <span style={{ textAlign: 'right' }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadingBar({ progress, ready }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 180,
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        opacity: ready ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: 'none',
      }}
    >
      <div style={{ height: 2, background: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: '#fff',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div style={{ marginTop: 10, fontSize: 11, letterSpacing: '0.18em', color: '#8b8f98', textTransform: 'uppercase' }}>
        Loading {Math.round(progress)}%
      </div>
    </div>
  );
}

export function HoverTip({ tipRef, title, sub }) {
  return (
    <div ref={tipRef} style={{ ...ui.tip, opacity: title ? 1 : 0 }}>
      <div style={{ fontWeight: 600 }}>{title || '\u00A0'}</div>
      {sub && <div style={{ fontSize: 11, color: '#9a9ea6' }}>{sub}</div>}
    </div>
  );
}

export function PartCallouts({ sides, calloutEls, onToggle, onHover, onLeave }) {
  return Object.entries(sides).map(([id, side]) => (
    <div
      key={id}
      className="nr-callout"
      ref={(el) => {
        calloutEls.current[id] = el;
      }}
    >
      <button
        type="button"
        className={`nr-cbtn ${side === 'left' ? 'nr-left' : 'nr-right'}`}
        onClick={() => onToggle(id)}
        onMouseEnter={() => onHover(id)}
        onMouseLeave={onLeave}
      >
        <span className="nr-cdot" />
        <span className="nr-cline" />
        <span className="nr-clabel">{PARTS_BY_ID[id].name}</span>
      </button>
    </div>
  ));
}

export function TourBar({ tourIndex, partCount, onStep, onReassemble }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 28,
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        zIndex: 5,
      }}
    >
      <button style={ui.round} aria-label="Previous part" onClick={() => onStep(-1)}>
        ‹
      </button>
      <span style={{ fontSize: 13, color: '#9a9ea6', minWidth: 84, textAlign: 'center' }}>
        {tourIndex >= 0 ? `${tourIndex + 1} / ${partCount}` : 'Part tour'}
      </span>
      <button style={ui.round} aria-label="Next part" onClick={() => onStep(1)}>
        ›
      </button>
      <button style={{ ...ui.pill, marginLeft: 10 }} onClick={onReassemble}>
        Reassemble
      </button>
    </div>
  );
}
