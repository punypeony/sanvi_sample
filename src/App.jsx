import { useEffect, useState } from 'react';
import ModelInspector from './three/ModelInspector';
import { COLORWAYS_BY_ID, DEFAULT_COLORWAY_ID } from './three/colorways';
import Navbar from './sections/Navbar';
import Hero from './sections/Hero';
import Teardown from './sections/Teardown';
import Colorways from './sections/Colorways';
import Sound from './sections/Sound';
import Reviews from './sections/Reviews';
import Buy from './sections/Buy';
import Closer from './sections/Closer';
import { ScrollTrigger } from './scroll/gsap';
import { useSmoothScroll } from './scroll/useSmoothScroll';
import { useStageCover } from './scroll/useStageCover';
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

  useSmoothScroll();
  // After the sections: their pins must be measured before the cover ranges.
  useStageCover();

  // Web fonts change text heights, which moves every trigger below them.
  useEffect(() => {
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <ModelInspector colorId={colorId} />

      <main id="main" className="page">
        <Hero colorId={colorId} colorway={colorway} onColorChange={setColorId} />

        <Teardown />
        <Colorways />
        <Sound />
        <Reviews />
        <Buy colorId={colorId} onColorChange={setColorId} />
        <Closer />
      </main>
    </>
  );
}

export default App;
