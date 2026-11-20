import { useEffect, useRef, useState } from 'react';
import ProductImage from './ProductImage';

// A catalog with one photo still gets a second frame so the thumbnails
// and the arrow keys have somewhere to go. Both are stand-in art until
// a real src is set on the product.
function framesFor(product) {
  const images = product.images.length ? product.images : [{ id: product.id, alt: product.name, src: '' }];
  if (images.length > 1) return images;
  const first = images[0];
  return [first, { id: `${first.id}-detail`, alt: `${product.name}, detail`, src: '' }];
}

export default function ProductGallery({ product }) {
  const frames = framesFor(product);
  const thumbsRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const current = frames[Math.min(index, frames.length - 1)];

  const pick = (next) => {
    const count = frames.length;
    const wrapped = (next + count) % count;
    setIndex(wrapped);
    setZoomed(false);
  };

  useEffect(() => {
    const root = thumbsRef.current;
    if (!root?.contains(document.activeElement)) return;
    root.querySelector('[aria-selected="true"]')?.focus();
  }, [index]);

  const onThumbsKey = (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      pick(index + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      pick(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      pick(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      pick(frames.length - 1);
    }
  };

  return (
    <div className="product-gallery">
      <div className={`gallery-stage${zoomed ? ' is-zoomed' : ''}`}>
        <button
          type="button"
          className="gallery-zoom"
          aria-pressed={zoomed}
          aria-label={zoomed ? `Zoom out ${current.alt || product.name}` : `Zoom ${current.alt || product.name}`}
          onClick={() => setZoomed((on) => !on)}
        >
          <ProductImage name={product.name} image={current} category={product.category} />
        </button>
      </div>
      <div ref={thumbsRef} className="gallery-thumbs" role="tablist" aria-label="Photos" onKeyDown={onThumbsKey}>
        {frames.map((image, i) => (
          <button
            key={image.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={image.alt || `${product.name} photo ${i + 1}`}
            tabIndex={i === index ? 0 : -1}
            onClick={() => pick(i)}
          >
            <ProductImage name={product.name} image={image} category={product.category} decorative />
          </button>
        ))}
      </div>
    </div>
  );
}
