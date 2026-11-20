import { useState } from 'react';
import { Link } from 'react-router';
import ProductImage from '../components/ProductImage';
import { CartTotals } from '../cart/CartDetails';
import { checkout, describeLine, useCart } from '../cart/useCart';
import PageReady from './PageReady';

function OrderLines({ lines }) {
  return (
    <ul className="cart-lines cart-lines--readonly">
      {lines.map((line) => {
        const view = describeLine(line);
        return (
          <li key={`${line.productId}:${line.colorId}`} className="cart-line">
            <ProductImage name={view.name} image={view.image} category={view.category} decorative />
            <div className="cart-line-copy">
              <p className="cart-line-name">{view.name}</p>
              <p className="cart-line-color">
                {view.colorName} · × {line.quantity}
              </p>
            </div>
            <p className="cart-line-price">${view.total}</p>
          </li>
        );
      })}
    </ul>
  );
}

function Confirmation({ order }) {
  return (
    <article className="route-page">
      <p className="route-kicker">Checkout</p>
      <h1>Order received</h1>
      <p className="route-lead">
        Reference {order.id}. Nothing was charged, and no payment details were sent.
      </p>
      <OrderLines lines={order.lines} />
      <CartTotals lines={order.lines} />
      <p className="route-note">This reference is a placeholder. A payment provider would return its own.</p>
      <p>
        <Link to="/shop" className="route-button">
          Back to the shop
        </Link>
      </p>
      <PageReady
        title="Order received — SANVI Audio"
        description="Placeholder order. Nothing was charged."
      />
    </article>
  );
}

export default function Checkout() {
  const { lines } = useCart();
  const [order, setOrder] = useState(null);

  if (order?.ok) return <Confirmation order={order} />;

  const place = (event) => {
    event.preventDefault();
    const result = checkout();
    if (result.ok) setOrder(result);
  };

  return (
    <article className="route-page">
      <p className="route-kicker">Checkout</p>
      <h1>Checkout</h1>
      {lines.length === 0 ? (
        <p className="route-lead">
          Your cart is empty. <Link to="/shop">Browse the shop</Link>.
        </p>
      ) : (
        <div className="checkout-layout">
          <form className="checkout-form" onSubmit={place}>
            <p className="route-lead">
              This checkout is a placeholder. It has no card field, and Place order sends nothing.
            </p>
            <fieldset>
              <legend>Contact</legend>
              <label>
                Name
                <input name="name" type="text" autoComplete="name" required />
              </label>
              <label>
                Email
                <input name="email" type="email" autoComplete="email" required />
              </label>
            </fieldset>
            <fieldset>
              <legend>Shipping</legend>
              <label>
                Address
                <input name="address" type="text" autoComplete="address-line1" required />
              </label>
              <label>
                City
                <input name="city" type="text" autoComplete="address-level2" required />
              </label>
              <label>
                Region
                <input name="region" type="text" autoComplete="address-level1" />
              </label>
              <label>
                Postal code
                <input name="postal" type="text" autoComplete="postal-code" required />
              </label>
              <label>
                Country
                <input name="country" type="text" autoComplete="country-name" defaultValue="United States" required />
              </label>
            </fieldset>
            <fieldset>
              <legend>Payment</legend>
              <p className="checkout-payment">
                A payment provider plugs in here. This form does not accept a card number, an expiry, or a security code.
              </p>
            </fieldset>
            <button type="submit" className="route-button">
              Place order
            </button>
          </form>
          <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
            <h2 id="checkout-summary-title">Order summary</h2>
            <OrderLines lines={lines} />
            <CartTotals lines={lines} />
            <p>
              <Link to="/cart">Edit cart</Link>
            </p>
          </aside>
        </div>
      )}
      <PageReady title="Checkout — SANVI Audio" description="Placeholder checkout. No payment is processed." />
    </article>
  );
}
