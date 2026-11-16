import { useState } from 'react';
import { ShoppingBag, ArrowUpRight } from 'lucide-react';
import ModelInspector from './three/ModelInspector';
import { DEFAULT_COLORWAY_ID } from './three/colorways';
import ColorPicker from './components/ColorPicker';
import './App.css';

function App() {
  const [colorId, setColorId] = useState(DEFAULT_COLORWAY_ID);

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
          <div className="model-light" />
          <ModelInspector colorId={colorId} />
        </div>

        <ColorPicker value={colorId} onChange={setColorId} />

        <div className="hero-actions">
          <a href="#products" className="outline-button">
            Buy Now
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