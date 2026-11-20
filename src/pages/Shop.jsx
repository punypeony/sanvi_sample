import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { products } from '../data/products';
import { addToCart, setCartOpen } from '../cart/useCart';
import {
  SORTS,
  activeFilterCount,
  collectColors,
  filterProducts,
  parseShopQuery,
  serializeShopQuery,
} from '../shop/shopQuery';
import { FilterDrawer, ShopFilters } from '../shop/ShopFilters';
import ShopCard from '../shop/ShopCard';
import PageReady from './PageReady';

const NARROW_QUERY = '(max-width: 700px)';

function useNarrow(onWide) {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(NARROW_QUERY);
    const onChange = () => {
      const next = media.matches;
      setNarrow(next);
      if (!next) onWide();
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [onWide]);

  return narrow;
}

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [drawer, setDrawer] = useState(false);
  const [pickerId, setPickerId] = useState(null);
  const [status, setStatus] = useState('');
  const closeDrawer = useCallback(() => setDrawer(false), []);
  const narrow = useNarrow(closeDrawer);
  const query = useMemo(() => parseShopQuery(params, products), [params]);
  const colors = useMemo(() => collectColors(products), []);
  const shown = useMemo(() => filterProducts(products, query), [query]);
  const active = activeFilterCount(query);
  const closePicker = useCallback(() => setPickerId(null), []);

  useEffect(() => {
    const clean = serializeShopQuery(query);
    if (clean.toString() !== params.toString()) setParams(clean, { replace: true });
  }, [query, params, setParams]);

  const update = (patch) => {
    const next = serializeShopQuery({ ...query, ...patch });
    setParams(next);
    setPickerId(null);
  };

  const clearFilters = () => {
    update({ category: null, color: null, min: null, max: null });
  };

  const add = (product, colorId) => {
    addToCart(product.id, colorId, 1);
    const color = product.colorways.find((item) => item.id === colorId);
    setStatus(`Added 1 ${product.name}, ${color ? color.name : colorId}, to the cart.`);
    setPickerId(null);
    setCartOpen(true);
  };

  const countLabel = `${shown.length} ${shown.length === 1 ? 'product' : 'products'}`;

  return (
    <article className="route-page shop-page">
      <p className="route-kicker">Shop</p>
      <h1>The line</h1>
      <p className="route-lead">Prices and photos are placeholders.</p>
      <div className="shop-layout">
        {narrow ? null : (
          <aside className="shop-filters-aside">
            <ShopFilters
              query={query}
              colors={colors}
              headingId="shop-filter-heading"
              active={active}
              onChange={update}
              onClear={clearFilters}
            />
          </aside>
        )}
        <div className="shop-results">
          <div className="shop-toolbar">
            {narrow ? (
              <button
                type="button"
                className="shop-filter-open"
                aria-expanded={drawer}
                aria-haspopup="dialog"
                aria-controls={drawer ? 'shop-filters-dialog' : undefined}
                onClick={() => setDrawer(true)}
              >
                Filters{active ? ` (${active})` : ''}
              </button>
            ) : null}
            <p className="shop-count" aria-live="polite" aria-atomic="true">
              {countLabel}
            </p>
            <label className="shop-sort">
              Sort
              <select value={query.sort} onChange={(event) => update({ sort: event.target.value })}>
                {SORTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="sr-only" aria-live="polite">
            {status}
          </p>
          {shown.length === 0 ? (
            <div className="shop-empty">
              <p>Nothing matches these filters.</p>
              <button type="button" className="shop-clear" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="shop-grid">
              {shown.map((item) => (
                <ShopCard
                  key={item.id}
                  product={item}
                  open={pickerId === item.id}
                  onToggle={() => setPickerId((current) => (current === item.id ? null : item.id))}
                  onClose={closePicker}
                  onAdd={add}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
      {narrow && drawer ? (
        <FilterDrawer count={shown.length} onClose={closeDrawer}>
          <ShopFilters
            query={query}
            colors={colors}
            active={active}
            onChange={update}
            onClear={clearFilters}
          />
        </FilterDrawer>
      ) : null}
      <PageReady
        title="Shop — SANVI Audio"
        description="Headphones, parts, and accessories. Placeholder catalogue."
      />
    </article>
  );
}
