import { useCallback, useRef } from 'react';
import { ShoppingBag } from 'lucide-react';
import CartDrawer from '../cart/CartDrawer';
import { setCartOpen, useCart, useCartOpen } from '../cart/useCart';
import { ScrollTrigger, prefersReducedMotion, useGSAP } from '../scroll/gsap';
import { subscribeScroll } from '../scroll/useSmoothScroll';

// Hide once the page has moved this far, and only after the scroll has
// committed to a direction by this many pixels (ignores trackpad jitter).
const HIDE_AFTER = 80;
const DIR_DELTA = 12;
// The pointer this close to the top of the screen brings the bar back.
const TOP_EDGE = 6;

const LINKS = [
  { href: '#top', label: 'Home' },
  { href: '#teardown', label: 'Products' },
  { href: '#buy', label: 'Pricing' },
  { href: '#sound', label: 'About' },
  { href: '#contact', label: 'Contact' },
];

export default function Navbar() {
  const ref = useRef(null);
  const { lines, count } = useCart();
  const open = useCartOpen();
  const closeCart = useCallback(() => setCartOpen(false), []);

  // Gets a backdrop once the page has moved, so links stay readable over content.
  // Hides on the way down, comes back on the way up, while focused, or when
  // the pointer sits on the top edge. Reduced motion leaves it in place.
  useGSAP(() => {
    const el = ref.current;
    ScrollTrigger.create({
      start: 8,
      end: 'max',
      onUpdate: (self) => el.classList.toggle('is-scrolled', self.progress > 0),
      onRefresh: (self) => el.classList.toggle('is-scrolled', self.progress > 0),
    });

    let hidden = false;
    let wantsHidden = false;
    let lastY = window.scrollY;
    let acc = 0;
    let focused = false;
    let pointerTop = false;

    const setHidden = (next) => {
      if (prefersReducedMotion()) next = false;
      if (next === hidden) return;
      hidden = next;
      el.classList.toggle('is-hidden', next);
    };

    const showForContext = () => focused || pointerTop || window.scrollY < HIDE_AFTER;
    const apply = () => setHidden(wantsHidden && !showForContext());

    const unsub = subscribeScroll((lenis, held, settled, net) => {
      const y = lenis.scroll;
      const dy = y - lastY;
      lastY = y;
      // A glide reports every in-between position, so don't hide on the way.
      // Do bring it back once that glide is above the threshold.
      if (held) {
        if (y < HIDE_AFTER) {
          acc = 0;
          wantsHidden = false;
          apply();
        }
        return;
      }
      if (settled) {
        wantsHidden = net > 0 && y >= HIDE_AFTER;
        acc = 0;
        apply();
        return;
      }
      if (y < HIDE_AFTER) {
        acc = 0;
        wantsHidden = false;
        apply();
        return;
      }
      if (dy === 0) return;
      if (Math.sign(dy) !== Math.sign(acc)) acc = 0;
      acc += dy;
      if (acc > DIR_DELTA) wantsHidden = true;
      else if (acc < -DIR_DELTA) wantsHidden = false;
      else return;
      acc = 0;
      apply();
    });

    const onFocusIn = () => {
      focused = true;
      setHidden(false);
    };
    const onFocusOut = (e) => {
      if (el.contains(e.relatedTarget)) return;
      focused = false;
      apply();
    };
    const onMove = (e) => {
      const atTop = e.clientY <= TOP_EDGE;
      if (atTop === pointerTop) return;
      pointerTop = atTop;
      apply();
    };

    el.addEventListener('focusin', onFocusIn);
    el.addEventListener('focusout', onFocusOut);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      unsub();
      el.removeEventListener('focusin', onFocusIn);
      el.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('pointermove', onMove);
    };
  });

  return (
    <header ref={ref} className="navbar">
      <a href="#top" className="logo" aria-label="SANVI Audio, back to top">
        SANVI<span> AUDIO</span>
      </a>

      <nav aria-label="Primary">
        <ul className="nav-links">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href}>{l.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="nav-actions">
        <button
          type="button"
          className="cart-button"
          aria-label={count === 0 ? 'Cart, empty' : `Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
          onClick={() => setCartOpen(true)}
        >
          <ShoppingBag size={15} aria-hidden="true" />
          {count > 0 && <span className="cart-badge">{count}</span>}
        </button>
        <a href="#buy" className="shop-button">
          Shop
        </a>
      </div>
      {open && <CartDrawer lines={lines} onClose={closeCart} />}
    </header>
  );
}
