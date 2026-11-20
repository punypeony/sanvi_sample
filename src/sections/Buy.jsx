import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { product } from '../data/product';
import { addToCart, setCartOpen } from '../cart/useCart';
import { gsap, MQ, ScrollTrigger, prefersReducedMotion, useGSAP } from '../scroll/gsap';
import { scrollStore } from '../scroll/scrollStore';
import { COLORWAYS_BY_ID } from '../three/colorways';
import { SOUND_EXIT_SPIN } from './Sound';

// ---- Buy tuning ----
// Not pinned. The shift eases in across this fraction of the section's travel
// and is fully on while the panel is the thing on screen.
const SHIFT_X = 0.22;
const SHIFT_Y = -0.42;
// Phone only. Pulls the camera back while the shift is on, so the model
// fits in the band above the panel. 1 at both edges, so the hand-off
// matches the Sound exit pose.
const CAMERA_MOBILE = 1.45;
const SHIFT_EDGE = 0.12;
const SNAP_PROGRESS = 0.06;
// Masked price / color name. Time-based, killed if the color changes again.
const MASK_OUT = 0.16;
const MASK_IN = 0.28;
const ADDED_MS = 900;
const PRESS_SCALE = 0.97;
const QTY_MIN = 1;
const QTY_MAX = 5;

const OFFERS = product.colorways
  .filter((item) => COLORWAYS_BY_ID[item.id])
  .map((item) => ({ ...item, color: COLORWAYS_BY_ID[item.id] }));

function shiftAmount(p) {
  if (p <= 0 || p >= 1) return 0;
  return Math.min(1, p / SHIFT_EDGE, (1 - p) / SHIFT_EDGE);
}

function writePose(shiftX, shiftY, camera = 1) {
  scrollStore.explodeProgress = 0;
  scrollStore.activePartIndex = -1;
  scrollStore.framing = 'home';
  scrollStore.cameraDistance = camera;
  scrollStore.rotationY = SOUND_EXIT_SPIN;
  scrollStore.shiftX = shiftX;
  scrollStore.shiftY = shiftY;
  // The visitor's color lives in React state. This override stays empty
  // so Colorways' temporary color can't fight the purchase panel.
  scrollStore.colorId = null;
  scrollStore.rim = 0;
  scrollStore.sound = 0;
}

function money(amount) {
  return `$${amount}`;
}

function MaskedValue({ value }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const prev = el.textContent;
    if (!prev || prev === value || prefersReducedMotion()) {
      el.textContent = value;
      gsap.killTweensOf(el);
      gsap.set(el, { yPercent: 0 });
      return undefined;
    }
    const tween = gsap.timeline({ overwrite: true });
    tween.to(el, { yPercent: -120, duration: MASK_OUT, ease: 'power3.in' });
    tween.call(() => {
      el.textContent = value;
    });
    tween.set(el, { yPercent: 120 });
    tween.to(el, { yPercent: 0, duration: MASK_IN, ease: 'power3.out' });
    return () => tween.kill();
  }, [value]);

  return (
    <span className="buy-mask">
      <span ref={ref} className="buy-mask-inner" />
    </span>
  );
}

export default function Buy({ colorId, onColorChange }) {
  const root = useRef(null);
  const addRef = useRef(null);
  const addedTimer = useRef(0);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [added, setAdded] = useState(false);

  const offer = OFFERS.find((item) => item.id === colorId) || OFFERS[0];
  const inStock = offer.stock === 'in_stock';

  useEffect(() => () => window.clearTimeout(addedTimer.current), []);

  useGSAP(
    () => {
      const section = root.current;
      let lastP = -1;

      const apply = (self, mobile) => {
        const p = self.progress;
        const jumped = lastP >= 0 && Math.abs(p - lastP) > SNAP_PROGRESS;
        if (jumped) scrollStore.poseEpoch++;
        lastP = p;
        const amount = shiftAmount(p);
        const pose = () =>
          writePose(
            mobile ? 0 : SHIFT_X * amount,
            mobile ? SHIFT_Y * amount : 0,
            mobile ? 1 + (CAMERA_MOBILE - 1) * amount : 1,
          );

        if (p <= 0) {
          const onEdge = Math.abs(window.scrollY - self.start) <= 4;
          if (self.isActive || onEdge) writePose(0, 0);
          return;
        }
        if (p >= 1) {
          writePose(0, 0);
          return;
        }
        pose();
      };

      const mm = gsap.matchMedia();
      const mount = (mobile) => {
        lastP = -1;
        const trigger = ScrollTrigger.create({
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          refreshPriority: -2,
          onUpdate: (self) => apply(self, mobile),
          onRefresh: (self) => apply(self, mobile),
        });
        return () => trigger.kill();
      };
      mm.add(`${MQ.motion} and ${MQ.desktop}`, () => mount(false));
      mm.add(`${MQ.motion} and ${MQ.mobile}`, () => mount(true));
      mm.add(`${MQ.reduce} and ${MQ.desktop}`, () => mount(false));
      mm.add(`${MQ.reduce} and ${MQ.mobile}`, () => mount(true));
      return () => mm.revert();
    },
    { scope: root }
  );

  const pick = (id) => {
    setNote('');
    setAdded(false);
    onColorChange(id);
  };

  const changeQty = (next) => {
    setQty(Math.min(QTY_MAX, Math.max(QTY_MIN, next)));
  };

  const onStepperKey = (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      changeQty(qty + 1);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      changeQty(qty - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      changeQty(QTY_MIN);
    } else if (e.key === 'End') {
      e.preventDefault();
      changeQty(QTY_MAX);
    }
  };

  const press = (down) => {
    const el = addRef.current;
    if (!el || prefersReducedMotion()) return;
    gsap.to(el, { scale: down ? PRESS_SCALE : 1, duration: down ? 0.08 : 0.16, ease: 'power2.out', overwrite: true });
  };

  const add = () => {
    if (!inStock) return;
    press(false);
    addToCart(offer.id, qty);
    setCartOpen(true);
    setAdded(true);
    setNote(`Added ${qty} ${offer.color.name} to the cart.`);
    window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAdded(false), prefersReducedMotion() ? 0 : ADDED_MS);
  };

  const notify = () => {
    setNote(`Notify me for ${offer.color.name} is a placeholder. Nothing was sent.`);
  };

  const status = `${offer.color.name}. ${inStock ? 'In stock.' : 'Out of stock.'}${note ? ` ${note}` : ''}`;

  return (
    <section id="buy" ref={root} className="section buy" aria-labelledby="buy-title">
      <div className="buy-panel">
        <p className="buy-eyebrow">Pricing</p>
        <h2 id="buy-title" className="buy-name">
          {product.name}
        </h2>
        <p className="buy-price">
          <MaskedValue value={money(offer.price)} />
        </p>
        <p className="buy-color">
          <MaskedValue value={offer.color.name} />
        </p>

        <div className="buy-colors" role="radiogroup" aria-label="Color">
          {OFFERS.map((item) => {
            const unavailable = item.stock !== 'in_stock';
            return (
              <label key={item.id} className={`buy-swatch${unavailable ? ' is-unavailable' : ''}`}>
                <input
                  type="radio"
                  name="buy-color"
                  value={item.id}
                  checked={item.id === offer.id}
                  onChange={() => pick(item.id)}
                  style={{ background: item.color.swatch }}
                />
                <span className="sr-only">
                  {item.color.name}
                  {unavailable ? ', out of stock' : ''}
                </span>
              </label>
            );
          })}
        </div>

        <p className="buy-status" aria-live="polite">
          {status}
        </p>

        <div className="buy-stepper" role="group" aria-label="Quantity" onKeyDown={onStepperKey}>
          <button type="button" onClick={() => changeQty(qty - 1)} aria-label="Decrease quantity" disabled={qty <= QTY_MIN}>
            −
          </button>
          <span className="buy-qty">{qty}</span>
          <button type="button" onClick={() => changeQty(qty + 1)} aria-label="Increase quantity" disabled={qty >= QTY_MAX}>
            +
          </button>
        </div>

        <div className="buy-actions">
          <button
            ref={addRef}
            type="button"
            className={`buy-add${added ? ' is-added' : ''}`}
            onClick={add}
            onPointerDown={() => press(true)}
            onPointerUp={() => press(false)}
            onPointerLeave={() => press(false)}
            disabled={!inStock}
          >
            {added && inStock ? 'Added' : 'Add to cart'}
          </button>
          {!inStock && (
            <button type="button" className="buy-notify" onClick={notify}>
              Notify me
            </button>
          )}
        </div>

        <dl className="buy-specs">
          {product.specs.map((spec) => (
            <div key={spec.id}>
              <dt>{spec.label}</dt>
              <dd>{spec.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
