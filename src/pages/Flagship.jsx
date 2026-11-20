import { useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { getProductById } from '../data/products';
import { addToCart, setCartOpen } from '../cart/useCart';
import ProductImage from '../components/ProductImage';
import Teardown from '../sections/Teardown';
import Colorways from '../sections/Colorways';
import Sound from '../sections/Sound';
import Buy from '../sections/Buy';
import Reviews from '../sections/Reviews';
import Closer from '../sections/Closer';
import { HERO_EXIT_SPIN } from '../sections/Hero';
import PageReady from './PageReady';
import StageCover from './StageCover';
import { gsap, MQ, ScrollTrigger, useGSAP } from '../scroll/gsap';
import { scrollStore, setMode } from '../scroll/scrollStore';
import { COLORWAYS_BY_ID } from '../three/colorways';

// Same hand-off as the home hero, so the teardown still starts at that spin.
const HANDOFF_AT = 0.4;

const FAQ = [
  {
    q: 'When does it ship?',
    a: 'Shipping is a placeholder. Nothing leaves the building yet.',
  },
  {
    q: 'Can I return them?',
    a: '30 days is the placeholder window. There is no returns desk yet.',
  },
  {
    q: 'What does the warranty cover?',
    a: 'Two years is the placeholder. No claims are accepted yet.',
  },
  {
    q: 'Are the cushions replaceable?',
    a: 'The ear cushions and the headband cushion each have their own page. The buttons in the teardown go there.',
  },
];

function money(amount) {
  return `$${amount}`;
}

function FlagshipHeader({ product, colorId, onColorChange }) {
  const ref = useRef(null);
  const offer = product.colorways.find((item) => item.id === colorId) || product.colorways[0];
  const swatch = COLORWAYS_BY_ID[offer.id];
  const inStock = offer.stock === 'in_stock';
  const [note, setNote] = useState('');

  useGSAP(
    () => {
      const header = ref.current;
      const applyMode = (self) => setMode(self.progress > 0 ? 'scroll' : 'interactive');
      ScrollTrigger.create({
        trigger: header,
        start: `${HANDOFF_AT * 100}% top`,
        end: 'bottom top',
        onUpdate: applyMode,
        onRefresh: applyMode,
      });

      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        ScrollTrigger.create({
          trigger: header,
          start: 'top top',
          end: 'bottom top',
          onUpdate: (self) => {
            scrollStore.rotationY = self.progress * HERO_EXIT_SPIN;
          },
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

  const add = () => {
    if (!inStock) return;
    addToCart(product.id, offer.id, 1);
    setCartOpen(true);
    setNote(`Added 1 ${swatch?.name || offer.name} to the cart.`);
  };

  return (
    <section id="top" ref={ref} className="flagship-header" aria-labelledby="flagship-name">
      <div className="flagship-header-copy">
        <p className="route-kicker">Flagship</p>
        <h1 id="flagship-name">{product.name}</h1>
        <p className="flagship-rating">
          <a href="#reviews">
            {product.rating} / 5 · {product.reviewCount.toLocaleString('en-US')} reviews
          </a>
        </p>
        <p className="flagship-price">{money(offer.price)}</p>
        <div className="buy-colors" role="radiogroup" aria-label="Color">
          {product.colorways.map((item) => {
            const color = COLORWAYS_BY_ID[item.id];
            if (!color) return null;
            const unavailable = item.stock !== 'in_stock';
            return (
              <label key={item.id} className={`buy-swatch${unavailable ? ' is-unavailable' : ''}`}>
                <input
                  type="radio"
                  name="flagship-color"
                  value={item.id}
                  checked={item.id === offer.id}
                  onChange={() => {
                    setNote('');
                    onColorChange(item.id);
                  }}
                  style={{ background: color.swatch }}
                />
                <span className="sr-only">
                  {color.name}
                  {unavailable ? ', out of stock' : ''}
                </span>
              </label>
            );
          })}
        </div>
        <p className="buy-status" aria-live="polite">
          {swatch?.name || offer.name}. {inStock ? 'In stock.' : 'Out of stock.'}
          {note ? ` ${note}` : ''}
        </p>
        <div className="buy-actions">
          <button type="button" className="buy-add" onClick={add} disabled={!inStock}>
            Add to cart
          </button>
          {!inStock && (
            <button
              type="button"
              className="buy-notify"
              onClick={() => setNote(`Notify me for ${swatch?.name || offer.name} is a placeholder. Nothing was sent.`)}
            >
              Notify me
            </button>
          )}
        </div>
        <a href="#teardown" className="flagship-more">
          See the teardown
        </a>
      </div>
    </section>
  );
}

function BuyBar({ product, colorId }) {
  const offer = product.colorways.find((item) => item.id === colorId) || product.colorways[0];
  const swatch = COLORWAYS_BY_ID[offer.id];
  const inStock = offer.stock === 'in_stock';
  const [note, setNote] = useState('');

  useGSAP(() => {
    const bar = document.querySelector('.buy-bar');
    const header = document.getElementById('top');
    const cover = document.querySelector('.flagship-after');
    const nav = document.querySelector('.navbar');
    if (!bar || !header || !cover) return undefined;

    const syncNav = () => bar.classList.toggle('is-raised', nav?.classList.contains('is-hidden'));
    const obs = nav ? new MutationObserver(syncNav) : null;
    obs?.observe(nav, { attributes: true, attributeFilter: ['class'] });
    syncNav();

    // A from-to range whose end sits on a later element was collapsing to a
    // short span, so the bar measures the two edges itself.
    const apply = () => {
      const y = window.scrollY;
      const start = header.getBoundingClientRect().top + y + header.offsetHeight;
      const end = cover.getBoundingClientRect().top + y;
      const on = y >= start - 1 && y < end - 1;
      bar.classList.toggle('is-shown', on);
      bar.inert = !on;
    };
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: apply, onRefresh: apply });
    apply();

    return () => obs?.disconnect();
  });

  const add = () => {
    if (!inStock) return;
    addToCart(product.id, offer.id, 1);
    setCartOpen(true);
    setNote(`Added 1 ${swatch?.name || offer.name} to the cart.`);
  };

  return (
    <div className="buy-bar" role="region" inert aria-label={`Buy ${product.name}`}>
      <p className="buy-bar-name">{product.name}</p>
      <p className="buy-bar-meta">
        <span className="buy-bar-swatch" style={{ background: swatch?.swatch || '#fff' }} aria-hidden="true" />
        {swatch?.name || offer.name} · {money(offer.price)}
      </p>
      <button type="button" className="buy-add" onClick={add} disabled={!inStock}>
        Add to cart
      </button>
      <p className="sr-only" aria-live="polite">
        {note}
      </p>
    </div>
  );
}

export default function Flagship({ product }) {
  const { colorId, onColorChange } = useOutletContext();
  const related = product.relatedIds.map(getProductById).filter(Boolean);
  const inStock = product.colorways.some((item) => item.stock === 'in_stock');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.tagline,
    sku: product.id,
    brand: { '@type': 'Brand', name: 'SANVI Audio' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: product.price,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    },
  };

  return (
    <div className="flagship-story">
      <FlagshipHeader product={product} colorId={colorId} onColorChange={onColorChange} />
      <Teardown />
      <Colorways />
      <Sound />
      <Buy colorId={colorId} onColorChange={onColorChange} />

      <div className="section section--opaque flagship-after" data-stage-cover>
        <section id="specs" className="flagship-block" aria-labelledby="specs-title">
          <h2 id="specs-title">Specifications</h2>
          <table className="spec-table">
            <tbody>
              {product.specs.map((spec) => (
                <tr key={spec.id}>
                  <th scope="row">{spec.label}</th>
                  <td>{spec.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <Reviews />

        <section id="pairs" className="flagship-block" aria-labelledby="pairs-title">
          <h2 id="pairs-title">Pairs well with</h2>
          <ul className="catalog-list">
            {related.map((item) => (
              <li key={item.id}>
                <Link to={`/products/${item.slug}`}>
                  <ProductImage name={item.name} image={item.images[0]} category={item.category} decorative />
                  <span className="catalog-name">{item.name}</span>
                  <span className="catalog-meta">{item.category}</span>
                  <span className="catalog-price">${item.price}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section id="faq" className="flagship-block" aria-labelledby="faq-title">
          <h2 id="faq-title">Questions</h2>
          <div className="faq-list">
            {FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <Closer />
      </div>

      <BuyBar product={product} colorId={colorId} />
      <StageCover />
      <PageReady
        title={`${product.name} — SANVI Audio`}
        description={`${product.tagline} From $${Math.min(...product.colorways.map((item) => item.price))}. Placeholder catalogue.`}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </div>
  );
}
