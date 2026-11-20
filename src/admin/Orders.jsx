import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../api/client';
import PageReady from '../pages/PageReady';
import { money } from './format';
import { Banner, ErrorText } from './ui';

const STATUSES = ['', 'pending', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'];

export default function Orders({ orderNumber }) {
  if (orderNumber) return <OrderDetail orderNumber={orderNumber} />;
  return <OrderList />;
}

function OrderList() {
  const [params, setParams] = useSearchParams();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const status = params.get('status') || '';
  const q = params.get('q') || '';

  useEffect(() => {
    let live = true;
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (q) query.set('q', q);
    const suffix = query.toString() ? `?${query}` : '';
    api(`/api/admin/orders${suffix}`)
      .then((data) => {
        if (live) setOrders(data.orders);
      })
      .catch((err) => {
        if (live) setError(err.message);
      });
    return () => {
      live = false;
    };
  }, [status, q]);

  return (
    <>
      <PageReady title="Orders — SANVI Admin" description="Filter and open orders." />
      <h1>Orders</h1>
      <form
        className="admin-filters"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const next = new URLSearchParams();
          const nextStatus = String(data.get('status') || '');
          const nextQuery = String(data.get('q') || '').trim();
          if (nextStatus) next.set('status', nextStatus);
          if (nextQuery) next.set('q', nextQuery);
          setParams(next);
        }}
      >
        <label>
          Status
          <select name="status" defaultValue={status}>
            {STATUSES.map((item) => <option key={item || 'any'} value={item}>{item || 'Any status'}</option>)}
          </select>
        </label>
        <label>
          Search order number or email
          <input name="q" defaultValue={q} />
        </label>
        <button type="submit">Apply</button>
      </form>
      <ErrorText>{error}</ErrorText>
      <ul className="admin-list">
        {(orders || []).map((order) => (
          <li key={order.orderNumber} className="admin-card">
            <Link to={`/admin/orders/${order.orderNumber}`}>{order.orderNumber}</Link>
            <p className="admin-meta">{order.email} · {order.status} · {money(order.total)}</p>
          </li>
        ))}
      </ul>
      {orders && orders.length === 0 && <p>No orders match.</p>}
    </>
  );
}

function OrderDetail({ orderNumber }) {
  const [order, setOrder] = useState(null);
  const [transitions, setTransitions] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function apply(data) {
    setOrder(data.order);
    setTransitions(data.transitions || []);
  }

  useEffect(() => {
    let live = true;
    api(`/api/admin/orders/${orderNumber}`)
      .then((data) => {
        if (live) apply(data);
      })
      .catch((err) => {
        if (live) setError(err.message);
      });
    return () => {
      live = false;
    };
  }, [orderNumber]);

  async function move(status) {
    setError('');
    setNotice('');
    try {
      const data = await api(`/api/admin/orders/${orderNumber}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      apply(data);
      const restored = status === 'cancelled' || status === 'refunded';
      setNotice(restored ? 'Status updated. Reserved stock was put back when this order had reserved it.' : `Marked ${status}.`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function addNote(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError('');
    try {
      const result = await api(`/api/admin/orders/${orderNumber}/notes`, {
        method: 'POST',
        body: JSON.stringify({ text: data.get('text') }),
      });
      setOrder(result.order);
      form.reset();
      setNotice('Note added.');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!order && !error) return <p>Loading the order.</p>;
  if (!order) return <ErrorText>{error}</ErrorText>;

  return (
    <>
      <PageReady title={`${order.orderNumber} — SANVI Admin`} description="Order detail, status, and notes." />
      <p><Link to="/admin/orders">All orders</Link></p>
      <h1>{order.orderNumber}</h1>
      <p className="admin-lead">{order.email} · {order.status} · {money(order.total)}</p>
      <Banner>{notice}</Banner>
      <ErrorText>{error}</ErrorText>
      <div className="admin-actions">
        {transitions.map((status) => (
          <button key={status} type="button" onClick={() => move(status)}>
            Mark {status}
          </button>
        ))}
      </div>
      <h2>Items</h2>
      <ul className="admin-list">
        {order.items.map((item) => (
          <li key={`${item.productId}-${item.colorId}`} className="admin-card">
            {item.name}, {item.colorName} × {item.quantity}
            <p className="admin-meta">{money(item.unitPrice)} each</p>
          </li>
        ))}
      </ul>
      <h2>Ship to</h2>
      <p>
        {order.shippingAddress.name}<br />
        {order.shippingAddress.line1}<br />
        {order.shippingAddress.city}, {order.shippingAddress.region} {order.shippingAddress.postal}<br />
        {order.shippingAddress.country}
      </p>
      <p className="admin-meta">Payment {order.payment.provider} · {order.payment.reference} · {order.payment.status}</p>
      <h2>Internal notes</h2>
      <ul className="admin-list">
        {(order.notes || []).map((note, index) => (
          <li key={`${note.createdAt}-${index}`} className="admin-card">
            {note.text}
            <p className="admin-meta">{note.authorName}</p>
          </li>
        ))}
      </ul>
      <form className="admin-form" onSubmit={addNote}>
        <label>
          Add a note
          <textarea name="text" required maxLength={500} />
        </label>
        <button type="submit">Save note</button>
      </form>
    </>
  );
}
