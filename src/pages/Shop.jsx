import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { addToCart, setCartOpen } from '../cart/useCart';
import { useProducts } from '../data/useCatalog';
import {
  SORTS,
  activeFilterCount,
  parseShopQuery,
  serializeShopQuery,
} from '../shop/shopQuery';
import { FilterDrawer, ShopFilters } from '../shop/ShopFilters';
import ShopCard from '../shop/ShopCard';
import ShopSkeleton from '../shop/ShopSkeleton';
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
  const draft = useMemo(() => parseShopQuery(params), [params]);
  const result = useProducts(draft);
  const colors = result.data ? result.data.colors : undefined;
  const query = useMemo(() => parseShopQuery(params, colors), [params, colors]);
  const shown = result.data?.products || [];
  const active = activeFilterCount(query);
  const closePicker = useCallback(() => setPickerId(null), []);

  useEffect(() => {
    const clean = serializeShopQuery(query);
    if (clean.toString() !== params.toString()) setParams(clean, { replace: true });
  }, [query, params, setParams]);

  const update = (patch) => {
    const next = { ...query, ...patch };
    if (!Object.prototype.hasOwnProperty.call(patch, 'page')) next.page = 1;
    setParams(serializeShopQuery(next));
    setPickerId(null);
  };

  const clearFilters = () => {
    update({ category: null, color: null, min: null, max: null, q: '' });
  };

  const add = (product, colorId) => {
    addToCart(product.id, colorId, 1);
    const color = product.colorways.find((item) => item.id === colorId);
    setStatus(`Added 1 ${product.name}, ${color ? color.name : colorId}, to the cart.`);
    setPickerId(null);
    setCartOpen(true);
  };

  if (result.isPending && !result.data) return <ShopSkeleton />;

  if (result.isError && !result.data) {
    return (
      <article className="route-page shop-page">
        <p className="route-kicker">Shop</p>
        <h1>The line</h1>
        <p className="form-alert" role="alert">{result.error.message}</p>
        <button type="button" className="route-button" onClick={() => result.refetch()}>Try again</button>
        <PageReady title="Shop — SANVI Audio" description="Headphones, parts, and accessories." />
      </article>
    );
  }

  const total = result.data?.total ?? shown.length;
  const countLabel = `${total} ${total === 1 ? 'product' : 'products'}`;

  return (
    <article className="route-page shop-page">
      <p className="route-kicker">Shop</p>
      <h1>The line</h1>
      <p className="route-lead">Prices and photos are placeholders.</p>
      {result.isError ? <p className="form-alert" role="alert">{result.error.message}</p> : null}
      <div className="shop-layout">
        {narrow ? null : (
          <aside className="shop-filters-aside">
            <ShopFilters
              query={query}
              colors={colors || []}
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
            <label className="shop-search">
              <span className="sr-only">Search</span>
              <input
                type="search"
                value={query.q}
                placeholder="Search"
                onChange={(event) => update({ q: event.target.value })}
              />
            </label>
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
          {result.data && result.data.pages > 1 ? (
            <div className="shop-pager">
              <button type="button" disabled={query.page <= 1} onClick={() => update({ page: query.page - 1 })}>
                Previous
              </button>
              <p>Page {result.data.page} of {result.data.pages}</p>
              <button type="button" disabled={query.page >= result.data.pages} onClick={() => update({ page: query.page + 1 })}>
                Next
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {narrow && drawer ? (
        <FilterDrawer count={total} onClose={closeDrawer}>
          <ShopFilters
            query={query}
            colors={colors || []}
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
