import { useAudioDemo } from '../audio/useAudioDemo';

// Self-contained (styles live here), like ColorPicker.
const css = `
.nr-audio {
  position: absolute;
  left: 6.5%;
  bottom: 13%;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.nr-abtn,
.nr-seg button,
.nr-link {
  appearance: none;
  -webkit-appearance: none;
  font-family: inherit;
  cursor: pointer;
}

.nr-abtn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 22px;
  border-radius: 30px;
  background: transparent;
  border: 1px solid #aaa;
  color: #fff;
  font-size: 12px;
  transition: all 0.3s ease;
}
.nr-abtn:hover { background: #fff; color: #000; border-color: #fff; }
.nr-abtn.nr-on { border-color: #fff; }

.nr-seg {
  display: flex;
  align-items: center;
  border: 1px solid #aaa;
  border-radius: 30px;
  overflow: hidden;
}
.nr-seg button {
  background: transparent;
  border: none;
  color: #c7c7c7;
  font-size: 12px;
  padding: 12px 18px;
  transition: all 0.25s ease;
}
.nr-seg button:hover { color: #fff; }
.nr-seg button.nr-seg-on { background: #fff; color: #111; }
.nr-seg button.nr-seg-x {
  padding: 12px 14px;
  border-left: 1px solid rgba(255, 255, 255, 0.25);
}

.nr-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  font-size: 11px;
  color: #6b6b6b;
}
.nr-link {
  background: none;
  border: none;
  padding: 0;
  color: #8b8f98;
  font-size: 11px;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.nr-link:hover { color: #fff; }

.nr-eq { display: inline-flex; align-items: flex-end; gap: 2px; height: 12px; }
.nr-eq i {
  display: block;
  width: 2px;
  height: 12px;
  background: currentColor;
  transform-origin: bottom;
  animation: nr-eq 0.9s ease-in-out infinite;
}
.nr-eq i:nth-child(2) { animation-delay: -0.3s; }
.nr-eq i:nth-child(3) { animation-delay: -0.6s; }
@keyframes nr-eq {
  0%, 100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
}

@media (max-width: 650px) {
  .nr-audio {
    left: 50%;
    bottom: 27%;
    transform: translateX(-50%);
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
  }
  .nr-meta { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .nr-eq i { animation: none; transform: scaleY(0.7); }
}
`;

const PlayIcon = () => (
  <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
    <path d="M0 0l10 6-10 6z" fill="currentColor" />
  </svg>
);

export default function AudioControls() {
  const { playing, anc, uiSounds, togglePlay, setAnc, setUiSounds } = useAudioDemo();

  return (
    <>
      <style>{css}</style>
      <div className="nr-audio">
        <button
          type="button"
          className={`nr-abtn ${playing ? 'nr-on' : ''}`}
          aria-pressed={playing}
          onClick={togglePlay}
        >
          {playing ? (
            <span className="nr-eq" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          ) : (
            <PlayIcon />
          )}
          {playing ? 'Pause sample' : 'Play sample'}
        </button>

        {anc === 'off' ? (
          <button type="button" className="nr-abtn" onClick={() => setAnc('noisy')}>
            Try noise cancelling
          </button>
        ) : (
          <div className="nr-seg" role="group" aria-label="Noise cancelling demo">
            <button
              type="button"
              className={anc === 'noisy' ? 'nr-seg-on' : ''}
              onClick={() => setAnc('noisy')}
            >
              Noise
            </button>
            <button
              type="button"
              className={anc === 'cancelled' ? 'nr-seg-on' : ''}
              onClick={() => setAnc('cancelled')}
            >
              ANC on
            </button>
            <button
              type="button"
              className="nr-seg-x"
              aria-label="Stop noise demo"
              onClick={() => setAnc('off')}
            >
              ×
            </button>
          </div>
        )}

        <div className="nr-meta">
          <button type="button" className="nr-link" onClick={() => setUiSounds(!uiSounds)}>
            UI sounds: {uiSounds ? 'on' : 'off'}
          </button>
          <span>Best with headphones</span>
        </div>
      </div>
    </>
  );
}
