import { useEffect, useRef } from 'react';
import { CATEGORIES, PRICE_RANGES, matchingPriceRange } from './shopQuery';
import { swatchColor } from './swatches';

function priceLabel(min, max) {
  if (min == null && max == null) return 'Any price';
  if (min == null) return `Under $${max}`;
  if (max == null) return `$${min} and up`;
  return `$${min} to $${max}`;
}

export function ShopFilters({ query, colors, headingId, onChange, onClear, active }) {
  const preset = matchingPriceRange(query);
  const custom = !preset && (query.min != null || query.max != null);

  return (
    <div className="shop-filters">
      {headingId ? (
        <h2 id={headingId} className="sr-only">
          Filters
        </h2>
      ) : null}
      {active > 0 ? (
        <button type="button" className="shop-clear" onClick={onClear}>
          Clear filters
        </button>
      ) : null}

      <fieldset>
        <legend>Category</legend>
        <label>
          <input
            type="radio"
            name="shop-category"
            checked={!query.category}
            onChange={() => onChange({ category: null })}
          />
          All
        </label>
        {CATEGORIES.map((item) => (
          <label key={item.id}>
            <input
              type="radio"
              name="shop-category"
              checked={query.category === item.id}
              onChange={() => onChange({ category: item.id })}
            />
            {item.label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Price</legend>
        {PRICE_RANGES.map((range) => (
          <label key={range.id}>
            <input
              type="radio"
              name="shop-price"
              checked={preset?.id === range.id}
              onChange={() => onChange({ min: range.min, max: range.max })}
            />
            {range.label}
          </label>
        ))}
        {custom ? (
          <label>
            <input type="radio" name="shop-price" checked onChange={() => {}} />
            {priceLabel(query.min, query.max)}
          </label>
        ) : null}
      </fieldset>

      <fieldset>
        <legend>Color</legend>
        <label>
          <input
            type="radio"
            name="shop-color"
            checked={!query.color}
            onChange={() => onChange({ color: null })}
          />
          All
        </label>
        {colors.map((color) => (
          <label key={color.id}>
            <input
              type="radio"
              name="shop-color"
              checked={query.color === color.id}
              onChange={() => onChange({ color: color.id })}
            />
            <span className="product-swatch" style={{ background: swatchColor(color.id) }} />
            {color.name}
          </label>
        ))}
      </fieldset>
    </div>
  );
}

export function FilterDrawer({ count, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    const previously = document.activeElement;
    const focusable = () =>
      [...root.querySelectorAll('button, a, input, select')].filter((el) => !el.disabled);
    focusable()[0]?.focus();

    const onKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
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

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previously instanceof HTMLElement) previously.focus();
    };
  }, [onClose]);

  return (
    <>
      <button type="button" className="shop-filter-backdrop" aria-label="Close filters" onClick={onClose} />
      <div
        ref={ref}
        id="shop-filters-dialog"
        className="shop-filter-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-filter-heading"
      >
        <div className="shop-filter-head">
          <h2 id="shop-filter-heading">Filters</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="shop-filters-scroll">{children}</div>
        <button type="button" className="buy-add shop-show" onClick={onClose}>
          Show {count} {count === 1 ? 'product' : 'products'}
        </button>
      </div>
    </>
  );
}
