import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/client';
import PageReady from '../pages/PageReady';
import { money } from './format';
import { ErrorText } from './ui';

const STATUSES = ['pending', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    api('/api/admin/dashboard')
      .then((next) => {
        if (live) setData(next);
      })
      .catch((err) => {
        if (live) setError(err.message);
      });
    return () => {
      live = false;
    };
  }, []);

  const max = data ? Math.max(1, ...STATUSES.map((status) => data.byStatus[status] || 0)) : 1;

  return (
    <>
      <PageReady title="Dashboard — SANVI Admin" description="Placeholder revenue, orders, and low stock." />
      <h1>Dashboard</h1>
      <p className="admin-lead">Revenue counts paid, packed, shipped, and delivered orders. The figures are placeholders.</p>
      <ErrorText>{error}</ErrorText>
      {data && (
        <>
          <div className="admin-grid">
            <article className="admin-stat">
              <span>Placeholder revenue</span>
              <strong>{money(data.revenue)}</strong>
            </article>
            <article className="admin-stat">
              <span>Orders</span>
              <strong>{data.orderCount}</strong>
            </article>
            <article className="admin-stat">
              <span>Reviews waiting</span>
              <strong>{data.pendingReviews}</strong>
            </article>
          </div>
          <h2>Orders by status</h2>
          <ul className="admin-bars">
            {STATUSES.map((status) => {
              const count = data.byStatus[status] || 0;
              return (
                <li key={status}>
                  <span>{status}</span>
                  <span className="bar" style={{ width: `${(count / max) * 100}%` }} />
                  <span>{count}</span>
                </li>
              );
            })}
          </ul>
          <h2>Low stock</h2>
          {data.lowStock.length === 0 ? <p>Every active colorway is above 5.</p> : (
            <ul className="admin-list">
              {data.lowStock.map((item) => (
                <li key={`${item.productId}-${item.colorId}`} className="admin-card">
                  <Link to={`/admin/products/${item.productId}`}>{item.name}, {item.colorName}</Link>
                  <p className="admin-meta">{item.stockCount === 0 ? 'Out of stock' : `${item.stockCount} left`}</p>
                </li>
              ))}
            </ul>
          )}
          <h2>Recent orders</h2>
          <ul className="admin-list">
            {data.recent.map((order) => (
              <li key={order.orderNumber} className="admin-card">
                <Link to={`/admin/orders/${order.orderNumber}`}>{order.orderNumber}</Link>
                <p className="admin-meta">{order.email} · {order.status} · {money(order.total)}</p>
              </li>
            ))}
          </ul>
          {data.flagshipCount !== 1 && <p>There should be one active flagship. This database has {data.flagshipCount}.</p>}
        </>
      )}
    </>
  );
}
