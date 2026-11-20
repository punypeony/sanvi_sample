import { useState } from 'react';
import { Link } from 'react-router';
import { getProductById } from '../data/products';
import { addToCart, setCartOpen } from '../cart/useCart';
import ProductGallery from '../components/ProductGallery';
import ProductImage from '../components/ProductImage';
import PageReady from './PageReady';

const QTY_MIN = 1;
const QTY_MAX = 9;

const SWATCH = {
  black: '#1c1c1c',
  sand: '#c4b39a',
  bone: '#e4ddd2',
  graphite: '#3c4046',
  fog: '#b7c0c7',
  clay: '#a78468',
  oat: '#d7c7b2',
  ink: '#16181d',
  noir: '#111111',
};

function reviewsFor(product) {
  return [
    {
      id: `${product.id}-r1`,
      name: 'Alex Kim',
      rating: Math.min(5, Math.round(product.rating)),
      text: `Placeholder review of ${product.name}. Not a real customer.`,
    },
    {
      id: `${product.id}-r2`,
      name: 'Jordan Ellis',
      rating: Math.max(1, Math.round(product.rating) - 1),
      text: 'Placeholder. The star count on this page is a stand-in too.',
    },
  ];
}

function defaultColor(product) {
  return product.colorways.find((item) => item.stock === 'in_stock') || product.colorways[0];
}

export default function Standard({ product }) {
  const [colorId, setColorId] = useState(() => defaultColor(product).id);
  const [qty, setQty] = useState(QTY_MIN);
  const [note, setNote] = useState('');
  const offer = product.colorways.find((item) => item.id === colorId) || defaultColor(product);
  const inStock = offer.stock === 'in_stock';
  const fits = product.fitsIds.map(getProductById).filter(Boolean);
  const related = product.relatedIds.map(getProductById).filter(Boolean);
  const showCompare = product.compareAtPrice && offer.price < product.compareAtPrice;

  const add = () => {
    if (!inStock) return;
    addToCart(product.id, offer.id, qty);
    setCartOpen(true);
    setNote(`Added ${qty} ${product.name}, ${offer.name}, to the cart.`);
  };

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
      price: offer.price,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    },
  };

  return (
    <article className="route-page product-page">
      <div className="product-buy">
        <ProductGallery product={product} />
        <div className="product-summary">
          <p className="route-kicker">{product.category}</p>
          <h1>{product.name}</h1>
          <p className="flagship-rating">
            <a href="#reviews">
              {product.rating} / 5 · {product.reviewCount.toLocaleString('en-US')} reviews
            </a>
          </p>
          <p className="product-price">
            {showCompare ? <s>${product.compareAtPrice}</s> : null} ${offer.price}
          </p>
          {fits.length > 0 && (
            <p className="route-fits">
              Fits:{' '}
              {fits.map((item, i) => (
                <span key={item.id}>
                  {i > 0 ? ', ' : ''}
                  <Link to={`/products/${item.slug}`}>{item.name}</Link>
                </span>
              ))}
            </p>
          )}
          <div className="product-colors" role="radiogroup" aria-label="Color">
            {product.colorways.map((color) => {
              const unavailable = color.stock !== 'in_stock';
              return (
                <label key={color.id} className={unavailable ? 'is-unavailable' : undefined}>
                  <input
                    type="radio"
                    name={`color-${product.id}`}
                    value={color.id}
                    checked={color.id === offer.id}
                    onChange={() => {
                      setColorId(color.id);
                      setNote('');
                    }}
                  />
                  <span className="product-swatch" style={{ background: SWATCH[color.id] || '#888' }} aria-hidden="true" />
                  <span>{color.name}</span>
                  <span className="product-stock">{unavailable ? 'Out of stock' : 'In stock'}</span>
                </label>
              );
            })}
          </div>
          <div className="buy-stepper" role="group" aria-label="Quantity">
            <button type="button" onClick={() => setQty((n) => Math.max(QTY_MIN, n - 1))} aria-label="Decrease quantity" disabled={qty <= QTY_MIN}>
              −
            </button>
            <span className="buy-qty">{qty}</span>
            <button type="button" onClick={() => setQty((n) => Math.min(QTY_MAX, n + 1))} aria-label="Increase quantity" disabled={qty >= QTY_MAX}>
              +
            </button>
          </div>
          <p className="buy-status" aria-live="polite">
            {offer.name}. {inStock ? 'In stock.' : 'Out of stock.'}
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
                onClick={() => setNote(`Notify me for ${product.name} in ${offer.name} is a placeholder. Nothing was sent.`)}
              >
                Notify me
              </button>
            )}
          </div>
        </div>
      </div>

      <section id="description" className="product-section" aria-labelledby="description-title">
        <h2 id="description-title">Description</h2>
        <p className="route-lead">{product.tagline}</p>
        <ul className="product-features">
          {product.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>

      <section id="specs" className="product-section" aria-labelledby="specs-title">
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

      <section id="reviews" className="product-section" aria-labelledby="reviews-title">
        <h2 id="reviews-title">Reviews</h2>
        <p>
          {product.rating} / 5 from {product.reviewCount.toLocaleString('en-US')} reviews. The notes below are placeholders.
        </p>
        <ul className="product-reviews">
          {reviewsFor(product).map((review) => (
            <li key={review.id}>
              <p>
                {review.rating} / 5 · {review.name}
              </p>
              <p>{review.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <section className="product-section" aria-labelledby="related-title">
          <h2 id="related-title">Related</h2>
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
      )}

      <p>
        <Link to="/shop">Back to the shop</Link>
      </p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <PageReady
        title={`${product.name} — SANVI Audio`}
        description={`${product.tagline} $${offer.price}. Placeholder product page.`}
      />
    </article>
  );
}
