import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/client';
import PageReady from '../pages/PageReady';
import { money } from './format';
import { Banner, ErrorText } from './ui';

export default function Customers({ id }) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let live = true;
    const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
    api(`/api/admin/customers${suffix}`)
      .then((data) => {
        if (live) setCustomers(data.customers);
      })
      .catch((err) => {
        if (live) setError(err.message);
      });
    return () => {
      live = false;
    };
  }, [query, notice]);

  useEffect(() => {
    if (!id) return undefined;
    let live = true;
    api(`/api/admin/customers/${id}`)
      .then((data) => {
        if (live) setDetail(data);
      })
      .catch((err) => {
        if (live) setError(err.message);
      });
    return () => {
      live = false;
    };
  }, [id, notice]);

  async function setRole(role) {
    setError('');
    try {
      await api(`/api/admin/users/${id}/role`, { method: 'POST', body: JSON.stringify({ role }) });
      setNotice(role === 'admin' ? 'Promoted to admin.' : 'Demoted to customer.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function setActive(isActive) {
    setError('');
    try {
      await api(`/api/admin/customers/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
      setNotice(isActive ? 'Account activated.' : 'Account deactivated.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageReady title="Customers — SANVI Admin" description="Customers, roles, and account status." />
      <h1>Customers</h1>
      <p className="admin-lead">The last active admin cannot be demoted or deactivated.</p>
      <Banner>{notice}</Banner>
      <ErrorText>{error}</ErrorText>
      <form
        className="admin-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(String(new FormData(event.currentTarget).get('q') || '').trim());
        }}
      >
        <label>
          Search name or email
          <input name="q" defaultValue={query} />
        </label>
        <button type="submit">Search</button>
      </form>
      <div className="admin-split">
        <ul className="admin-list">
          {(customers || []).map((customer) => (
            <li key={customer.id} className="admin-card">
              <Link to={`/admin/customers/${customer.id}`}>{customer.name}</Link>
              <p className="admin-meta">
                {customer.email} · {customer.role}{customer.isActive ? '' : ' · inactive'}
              </p>
            </li>
          ))}
        </ul>
        {id && detail?.customer.id === id && (
          <article className="admin-card">
            <h2>{detail.customer.name}</h2>
            <p>{detail.customer.email}</p>
            <p className="admin-meta">{detail.customer.role}{detail.customer.isActive ? '' : ' · inactive'}</p>
            <div className="admin-actions">
              {detail.customer.role === 'admin' ? (
                <button type="button" className="secondary" onClick={() => setRole('customer')}>Demote</button>
              ) : (
                <button type="button" onClick={() => setRole('admin')}>Promote</button>
              )}
              {detail.customer.isActive ? (
                <button type="button" className="danger" onClick={() => setActive(false)}>Deactivate</button>
              ) : (
                <button type="button" onClick={() => setActive(true)}>Activate</button>
              )}
            </div>
            <h3>Orders</h3>
            <ul className="admin-list">
              {detail.orders.map((order) => (
                <li key={order.orderNumber}>
                  <Link to={`/admin/orders/${order.orderNumber}`}>{order.orderNumber}</Link>
                  <span className="admin-meta"> {order.status} · {money(order.total)}</span>
                </li>
              ))}
              {detail.orders.length === 0 && <li>No orders for this account.</li>}
            </ul>
          </article>
        )}
      </div>
    </>
  );
}
