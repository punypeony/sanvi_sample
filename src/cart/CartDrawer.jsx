import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useCart } from './useCart';
import CartDetails from './CartDetails';

export default function CartDrawer({ onClose }) {
  const ref = useRef(null);
  const { lines } = useCart();

  useEffect(() => {
    const root = ref.current;
    const previously = document.activeElement;
    const focusable = () =>
      [...root.querySelectorAll('button, a[href], input')].filter((el) => !el.disabled);
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
      <button type="button" className="cart-backdrop" aria-label="Close cart" onClick={onClose} />
      <div ref={ref} className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div className="cart-drawer-head">
          <h2 id="cart-title">Cart</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <CartDetails />
        <Link to="/cart" className="cart-more" onClick={onClose}>
          View cart
        </Link>
        {lines.length === 0 ? (
          <button type="button" className="cart-checkout" disabled>
            Checkout
          </button>
        ) : (
          <Link to="/checkout" className="cart-checkout" onClick={onClose}>
            Checkout
          </Link>
        )}
      </div>
    </>
  );
}
