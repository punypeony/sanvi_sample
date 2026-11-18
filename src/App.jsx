import { useEffect, useState } from 'react';
import { ShoppingBag, ArrowUpRight } from 'lucide-react';
import ModelInspector from './three/ModelInspector';
import { COLORWAYS, COLORWAYS_BY_ID, DEFAULT_COLORWAY_ID } from './three/colorways';
import ColorPicker from './components/ColorPicker';
import AudioRings from './components/AudioRings';
import AudioControls from './components/AudioControls';
import './App.css';

const STORAGE_KEY = 'noir-color';

// Order of priority: ?color=sky in the URL, then the last saved choice, then the default.
function readInitialColor() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('color');
    if (fromUrl && COLORWAYS_BY_ID[fromUrl]) return fromUrl;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && COLORWAYS_BY_ID[saved]) return saved;
  } catch {
    /* storage can be blocked; fall through to the default */
  }
  return DEFAULT_COLORWAY_ID;
}

function App() {
  const [colorId, setColorId] = useState(readInitialColor);
  const colorway = COLORWAYS_BY_ID[colorId];

  // Remember the choice (and keep the URL shareable).
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, colorId);
      const url = new URL(window.location.href);
      url.searchParams.set('color', colorId);
      window.history.replaceState(null, '', url);
    } catch {
      /* ignore */
    }
  }, [colorId]);

  return (
    <main className="homepage">
      <nav className="navbar">
        <a href="#" className="logo">
          SANVI<span> AUDIO</span>
        </a>

        <div className="nav-links">
          <a href="#">Home</a>
          <a href="#pricing">Pricing</a>
          <a href="#products">Products</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>

        <a href="#products" className="shop-button">
          Shop <ShoppingBag size={15} />
        </a>
      </nav>

      <section className="hero">
        <div className="product-model">
          {/* Faint rings that pulse with the sample / noise demo (behind the 3D canvas) */}
          <AudioRings />

          {/* One glow per color, cross-faded, so the backdrop follows the headphones */}
          {COLORWAYS.map((c) => (
            <div
              key={c.id}
              className="model-light"
              style={{
                background: `radial-gradient(circle, ${c.glow[0]} 0%, ${c.glow[1]} 38%, transparent 72%)`,
                opacity: c.id === colorId ? 1 : 0,
                transition: 'opacity 0.8s ease',
                transform: 'translate(-50%, -50%) scale(calc(1 + var(--bass, 0) * 0.2))',
              }}
            />
          ))}
          <ModelInspector colorId={colorId} />
        </div>

        <ColorPicker value={colorId} onChange={setColorId} />
        <AudioControls />

        <div className="hero-actions">
          <a href="#products" className="outline-button">
            Buy Now
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: 0.7 }}>
              ·
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: colorway.swatch,
                  border: '1px solid rgba(255,255,255,0.4)',
                }}
              />
              {colorway.name}
            </span>
          </a>

          <a href="#about" className="light-button">
            Learn More <ArrowUpRight size={15} />
          </a>
        </div>
      </section>
    </main>
  );
}

export default App;