import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import ProductImage from '../components/ProductImage';
import { swatchColor } from './swatches';

function framesFor(product) {
  const images = product.images.length ? product.images : [{ id: product.id, alt: product.name, src: '' }];
  if (images.length > 1) return images.slice(0, 2);
  const first = images[0];
  return [first, { id: `${first.id}-alt`, alt: `${product.name}, detail`, src: '' }];
}

function firstInStock(product) {
  return product.colorways.find((color) => color.stock === 'in_stock') || null;
}

export default function ShopCard({ product, open, onToggle, onClose, onAdd }) {
  const [primary, alt] = framesFor(product);
  const multiple = product.colorways.length > 1;
  const available = firstInStock(product);
  const wrapRef = useRef(null);
  const [colorId, setColorId] = useState(() => available?.id || product.colorways[0].id);
  const offer = product.colorways.find((color) => color.id === colorId) || product.colorways[0];
  const pickerId = `picker-${product.id}`;

  useEffect(() => {
    if (!open) return undefined;
    const root = wrapRef.current;
    const picker = root?.querySelector('.shop-picker');
    const previously = document.activeElement;
    picker?.querySelector('input:not(:disabled), button')?.focus();

    const onKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !picker) return;
      const items = [...picker.querySelectorAll('button, input')].filter((el) => !el.disabled);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onPointer = (event) => {
      if (!root?.contains(event.target)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      if (previously instanceof HTMLElement) previously.focus();
    };
  }, [open, onClose]);

  const quick = () => {
    if (!available) return;
    if (multiple) onToggle();
    else onAdd(product, available.id);
  };

  return (
    <li className="shop-card">
      <Link to={`/products/${product.slug}`} className="shop-card-link">
        <span className="shop-photo">
          <ProductImage name={product.name} image={primary} category={product.category} decorative lazy />
          <span className="shop-photo-alt">
            <ProductImage
              name={product.name}
              image={alt}
              category={product.category}
              decorative
              lazy
              flip={!alt.src}
            />
          </span>
        </span>
        <span className="catalog-name">{product.name}</span>
        <span className="catalog-meta">
          {product.category}
          {product.flagship ? ' · flagship' : ''}
        </span>
        <span className="shop-rating">
          <span aria-label={`Rated ${product.rating} out of 5`}>{product.rating}</span>
          <span aria-hidden="true"> · </span>
          <span className="sr-only">from </span>
          {product.reviewCount.toLocaleString('en-US')}
          <span className="sr-only"> reviews</span>
        </span>
        <span className="catalog-price">
          {product.compareAtPrice && product.price < product.compareAtPrice ? (
            <s>${product.compareAtPrice}</s>
          ) : null}{' '}
          ${product.price}
        </span>
      </Link>
      <ul className="shop-swatches" aria-label="Colors">
        {product.colorways.map((color) => (
          <li key={color.id}>
            <span
              className={`product-swatch${color.stock === 'in_stock' ? '' : ' is-out'}`}
              style={{ background: swatchColor(color.id) }}
            />
            <span className="sr-only">
              {color.name}
              {color.stock === 'in_stock' ? '' : ', out of stock'}
            </span>
          </li>
        ))}
      </ul>
      <div className="shop-buy" ref={wrapRef}>
        <button
          type="button"
          className="buy-add shop-quick"
          disabled={!available}
          aria-expanded={multiple ? open : undefined}
          aria-controls={open ? pickerId : undefined}
          aria-haspopup={multiple ? 'dialog' : undefined}
          onClick={quick}
        >
          {available ? 'Add to cart' : 'Out of stock'}
        </button>
        {open ? (
          <div id={pickerId} className="shop-picker" role="dialog" aria-label={`Color for ${product.name}`}>
            <div className="product-colors" role="radiogroup" aria-label={`Color for ${product.name}`}>
              {product.colorways.map((color) => {
                const inStock = color.stock === 'in_stock';
                return (
                  <label key={color.id} className={inStock ? undefined : 'is-unavailable'}>
                    <input
                      type="radio"
                      name={`quick-${product.id}`}
                      value={color.id}
                      checked={offer.id === color.id}
                      disabled={!inStock}
                      onChange={() => setColorId(color.id)}
                    />
                    <span className="product-swatch" style={{ background: swatchColor(color.id) }} />
                    <span>{color.name}</span>
                    <span className="product-stock">{inStock ? 'In stock' : 'Out of stock'}</span>
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              className="buy-add"
              disabled={offer.stock !== 'in_stock'}
              onClick={() => onAdd(product, offer.id)}
            >
              Add to cart
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
