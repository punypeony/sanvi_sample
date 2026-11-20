import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { api } from '../api/client';
import { useAccount } from '../auth/account';
import OrderView from '../orders/OrderView';
import PageReady from './PageReady';

export default function OrderStatus() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const account = useAccount();
  const seeded = location.state?.order?.orderNumber === orderNumber ? location.state.order : null;
  const [lookedUp, setLookedUp] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const owned = useQuery({
    queryKey: ['order', orderNumber, account.data?.id || 'guest'],
    enabled: Boolean(orderNumber) && !seeded && account.isSuccess && Boolean(account.data),
    retry: false,
    queryFn: async () => {
      try {
        return await api(`/api/account/orders/${encodeURIComponent(orderNumber)}`);
      } catch (err) {
        if (err.status === 404) return null;
        throw err;
      }
    },
  });

  const order = seeded || lookedUp || owned.data || null;
  const waiting = Boolean(orderNumber) && !order && (account.isPending || owned.isPending);

  async function lookup(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const number = String(data.get('orderNumber') || orderNumber || '').trim();
    setError('');
    setPending(true);
    try {
      const found = await api('/api/orders/lookup', {
        method: 'POST',
        body: JSON.stringify({ orderNumber: number, email: data.get('email') }),
      });
      setLookedUp(found);
      if (number !== orderNumber) {
        navigate(`/orders/${encodeURIComponent(number)}`, { replace: true, state: { order: found } });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="route-page">
      <p className="route-kicker">Order</p>
      <h1>{order ? order.orderNumber : 'Find an order'}</h1>
      {waiting ? <p>Checking the order.</p> : null}
      {order ? <OrderView order={order} /> : null}
      {!waiting && !order ? (
        <form className="checkout-form" onSubmit={lookup}>
          <p className="route-lead">Guests can open an order with its number and the email used at checkout.</p>
          {error ? <p className="form-alert" role="alert">{error}</p> : null}
          <label>
            Order number
            <input name="orderNumber" defaultValue={orderNumber || ''} required />
          </label>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <button type="submit" className="route-button" disabled={pending}>
            {pending ? 'Looking up' : 'Look up'}
          </button>
        </form>
      ) : null}
      {owned.isError ? <p className="form-alert" role="alert">{owned.error.message}</p> : null}
      <p><Link to="/shop">Back to the shop</Link></p>
      <PageReady
        title={order ? `${order.orderNumber} — SANVI Audio` : 'Find an order — SANVI Audio'}
        description="Order status for a SANVI Audio purchase."
      />
    </article>
  );
}
