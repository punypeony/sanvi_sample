import { useEffect, useRef, useState } from 'react';
import { product } from '../data/product';
import { COLORWAYS_BY_ID } from '../three/colorways';
import { checkout } from './useCart';

export default function CartDrawer({ lines, onClose }) {
  const ref = useRef(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const root = ref.current;
    const previously = document.activeElement;
    const focusable = () =>
      [...root.querySelectorAll('button, a')].filter((el) => !el.disabled);
    focusable()[0]?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previously instanceof HTMLElement) previously.focus();
    };
  }, [onClose]);

  const pay = () => {
    checkout();
    setMessage('Checkout is a placeholder. Nothing was charged.');
  };

  return (
    <>
      <button type="button" className="cart-backdrop" aria-label="Close cart" onClick={onClose} />
      <div ref={ref} className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div className="cart-drawer-head">
          <h2 id="cart-title">Cart</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        {lines.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <ul className="cart-lines">
            {lines.map((line) => {
              const color = COLORWAYS_BY_ID[line.colorId];
              const offer = product.colorways.find((item) => item.id === line.colorId);
              return (
                <li key={line.colorId}>
                  <span>{color ? color.name : line.colorId}</span>
                  <span>
                    × {line.quantity}
                    {offer ? ` · $${offer.price * line.quantity}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="cart-note" aria-live="polite">
          {message}
        </p>
        <button type="button" className="cart-checkout" onClick={pay} disabled={lines.length === 0}>
          Checkout
        </button>
      </div>
    </>
  );
}
