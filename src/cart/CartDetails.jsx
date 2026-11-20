import { useState } from 'react';
import ProductImage from '../components/ProductImage';
import { swatchColor } from '../shop/swatches';
import {
  FREE_SHIPPING_AT,
  QTY_CAP,
  describeLine,
  summarize,
  useCart,
} from './useCart';

const PROMO_MAX = 24;

function CartLine({ line, onQuantity, onRemove }) {
  const view = describeLine(line);
  const label = `${view.name}, ${view.colorName}`;

  return (
    <li className="cart-line">
      <ProductImage name={view.name} image={view.image} category={view.category} decorative />
      <div className="cart-line-copy">
        <p className="cart-line-name">{view.name}</p>
        <p className="cart-line-color">
          <span className="product-swatch" style={{ background: swatchColor(line.colorId) }} />
          {view.colorName}
        </p>
        <div className="buy-stepper">
          <button
            type="button"
            aria-label={`Decrease quantity of ${label}`}
            disabled={line.quantity <= 1}
            onClick={() => onQuantity(line, line.quantity - 1)}
          >
            −
          </button>
          <span className="buy-qty">{line.quantity}</span>
          <button
            type="button"
            aria-label={`Increase quantity of ${label}`}
            disabled={line.quantity >= QTY_CAP}
            onClick={() => onQuantity(line, line.quantity + 1)}
          >
            +
          </button>
        </div>
        <button type="button" className="cart-remove" onClick={() => onRemove(line)}>
          Remove <span className="sr-only">{label}</span>
        </button>
      </div>
      <p className="cart-line-price">${view.total}</p>
    </li>
  );
}

export function CartTotals({ lines }) {
  const { subtotal, shipping, total } = summarize(lines);
  const free = shipping === 0;

  return (
    <dl className="cart-totals">
      <div>
        <dt>Subtotal</dt>
        <dd>${subtotal}</dd>
      </div>
      <div>
        <dt>Shipping</dt>
        <dd>
          ${shipping}
          <span className="cart-placeholder">
            {free
              ? ` Placeholder, free over $${FREE_SHIPPING_AT}.`
              : ' Placeholder estimate.'}
          </span>
        </dd>
      </div>
      <div className="cart-total">
        <dt>Total</dt>
        <dd>${total}</dd>
      </div>
    </dl>
  );
}

function CartPromo() {
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');

  const apply = (event) => {
    event.preventDefault();
    setNote(
      code.trim()
        ? 'Promo codes are a placeholder. Nothing was discounted.'
        : 'Enter a code. Promo codes are a placeholder.',
    );
  };

  return (
    <form className="cart-promo" onSubmit={apply}>
      <label>
        <span className="sr-only">Promo code</span>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Promo code"
          autoComplete="off"
          maxLength={PROMO_MAX}
        />
      </label>
      <button type="submit">Apply</button>
      <p className="cart-note" aria-live="polite">
        {note}
      </p>
    </form>
  );
}

export default function CartDetails({ variant = 'drawer' }) {
  const { lines, setLineQuantity, removeLine } = useCart();
  const [note, setNote] = useState('');

  const change = (line, quantity) => {
    const view = describeLine(line);
    const next = Math.min(QTY_CAP, Math.max(1, quantity));
    setLineQuantity(line.productId, line.colorId, next);
    setNote(`${view.name}, ${view.colorName}, quantity ${next}.`);
  };

  const remove = (line) => {
    const view = describeLine(line);
    removeLine(line.productId, line.colorId);
    setNote(`Removed ${view.name}, ${view.colorName}.`);
  };

  return (
    <div className={`cart-details cart-details--${variant}`}>
      {lines.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <ul className="cart-lines">
            {lines.map((line) => (
              <CartLine
                key={`${line.productId}:${line.colorId}`}
                line={line}
                onQuantity={change}
                onRemove={remove}
              />
            ))}
          </ul>
          <CartTotals lines={lines} />
          <p className="cart-fine">Shipping is a placeholder. Nothing is charged on this page.</p>
          <CartPromo />
        </>
      )}
      <p className="cart-note" aria-live="polite">
        {note}
      </p>
    </div>
  );
}
