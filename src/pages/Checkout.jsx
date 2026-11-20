import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/client';
import { useAccount } from '../auth/account';
import { CartTotals } from '../cart/CartDetails';
import { clearCart, describeLine, useCart } from '../cart/useCart';
import ProductImage from '../components/ProductImage';
import OrderView from '../orders/OrderView';
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
        Order {order.orderNumber}. The server set the prices. No card number was sent.
      </p>
      <OrderView order={order} />
      <p className="route-note">
        A confirmation was written to the API log until a real email provider is connected.
      </p>
      <p>
        <Link to={`/orders/${order.orderNumber}`} state={{ order }}>View order status</Link>
      </p>
      <p>
        <Link to="/shop" className="route-button">Back to the shop</Link>
      </p>
      <PageReady
        title="Order received — SANVI Audio"
        description={`Order ${order.orderNumber}. No card number was sent.`}
      />
    </article>
  );
}

export default function Checkout() {
  const { lines } = useCart();
  const account = useAccount();
  const user = account.data;
  const [pick, setPick] = useState(0);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  if (order) return <Confirmation order={order} />;

  const address = user?.addresses?.[pick];

  async function place(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError('');
    setPending(true);
    try {
      const placed = await api('/api/orders', {
        method: 'POST',
        headers: { 'idempotency-key': idempotencyKey },
        body: JSON.stringify({
          email: data.get('email'),
          outcome: data.get('decline') ? 'decline' : 'success',
          lines: lines.map((line) => ({
            productId: line.productId,
            colorId: line.colorId,
            quantity: line.quantity,
          })),
          shippingAddress: {
            name: data.get('name'),
            line1: data.get('line1'),
            city: data.get('city'),
            region: data.get('region'),
            postal: data.get('postal'),
            country: data.get('country'),
          },
        }),
      });
      clearCart();
      setOrder(placed);
    } catch (err) {
      if (err.status === 402) setIdempotencyKey(crypto.randomUUID());
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

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
          <form className="checkout-form" key={`${user?.id || 'guest'}-${pick}`} onSubmit={place}>
            <p className="route-lead">
              The server recalculates every price. This form has no card field.
            </p>
            {user?.addresses?.length > 0 ? (
              <label>
                Saved address
                <select value={pick} onChange={(event) => setPick(Number(event.target.value))}>
                  {user.addresses.map((item, index) => (
                    <option key={`${item.label}-${index}`} value={index}>{item.label}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {error ? <p className="form-alert" role="alert">{error}</p> : null}
            <fieldset>
              <legend>Contact</legend>
              <label>
                Name
                <input name="name" type="text" autoComplete="name" defaultValue={user?.name || ''} required />
              </label>
              <label>
                Email
                <input name="email" type="email" autoComplete="email" defaultValue={user?.email || ''} required />
              </label>
            </fieldset>
            <fieldset>
              <legend>Shipping</legend>
              <label>
                Address
                <input name="line1" type="text" autoComplete="address-line1" defaultValue={address?.line1 || ''} required />
              </label>
              <label>
                City
                <input name="city" type="text" autoComplete="address-level2" defaultValue={address?.city || ''} required />
              </label>
              <label>
                Region
                <input name="region" type="text" autoComplete="address-level1" defaultValue={address?.region || ''} required />
              </label>
              <label>
                Postal code
                <input name="postal" type="text" autoComplete="postal-code" defaultValue={address?.postal || ''} required />
              </label>
              <label>
                Country
                <input name="country" type="text" autoComplete="country-name" defaultValue={address?.country || user?.addresses?.[0]?.country || 'United States'} required />
              </label>
            </fieldset>
            <fieldset>
              <legend>Payment</legend>
              <p className="checkout-payment">
                A payment provider plugs in here. This form does not accept a card number, an expiry, or a security code.
              </p>
              {import.meta.env.DEV ? (
                <label className="checkout-check">
                  <input type="checkbox" name="decline" />
                  Simulate a declined payment
                </label>
              ) : null}
            </fieldset>
            <button type="submit" className="route-button" disabled={pending}>
              {pending ? 'Placing order' : 'Place order'}
            </button>
          </form>
          <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
            <h2 id="checkout-summary-title">Order summary</h2>
            <OrderLines lines={lines} />
            <CartTotals lines={lines} />
            <p>The server confirms this total when you place the order.</p>
            <p>
              <Link to="/cart">Edit cart</Link>
            </p>
          </aside>
        </div>
      )}
      <PageReady title="Checkout — SANVI Audio" description="Checkout. Prices are confirmed by the server." />
    </article>
  );
}
