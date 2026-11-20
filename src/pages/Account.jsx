import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAccount, useSignOut } from '../auth/account';
import PageReady from './PageReady';

export default function Account() {
  const account = useAccount();
  const signOut = useSignOut();
  const client = useQueryClient();
  const user = account.data;
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);

  const orders = useQuery({
    queryKey: ['my-orders', user?.id],
    enabled: Boolean(user),
    queryFn: () => api('/api/account/orders'),
  });

  if (!user) return <p className="sr-only">Loading</p>;

  async function saveProfile(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await save({
      name: data.get('name'),
      addresses: user.addresses,
    }, 'Profile saved.');
  }

  async function addAddress(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = {
      label: String(data.get('label') || ''),
      line1: String(data.get('line1') || ''),
      city: String(data.get('city') || ''),
      region: String(data.get('region') || ''),
      postal: String(data.get('postal') || ''),
      country: String(data.get('country') || ''),
    };
    await save({ name: user.name, addresses: [...user.addresses, next] }, 'Address saved.');
    event.currentTarget.reset();
  }

  async function removeAddress(index) {
    await save({
      name: user.name,
      addresses: user.addresses.filter((_, item) => item !== index),
    }, 'Address removed.');
  }

  async function save(body, message) {
    setError('');
    setPending(true);
    try {
      const next = await api('/api/account', { method: 'PATCH', body: JSON.stringify(body) });
      client.setQueryData(['account'], next);
      setNotice(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get('next') !== data.get('confirm')) {
      setError('Those passwords do not match.');
      return;
    }
    setError('');
    setPending(true);
    try {
      await api('/api/auth/password', {
        method: 'POST',
        body: JSON.stringify({ current: data.get('current'), next: data.get('next') }),
      });
      form.reset();
      setNotice('Password changed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function attach() {
    setError('');
    setPending(true);
    try {
      await api('/api/account/orders/attach', { method: 'POST', body: JSON.stringify({}) });
      await client.invalidateQueries({ queryKey: ['account'] });
      await client.invalidateQueries({ queryKey: ['my-orders'] });
      setNotice('Guest orders are now on this account.');
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="route-page">
      <p className="route-kicker">Account</p>
      <h1>{user.name}</h1>
      <p className="route-lead">{user.email}</p>
      {error ? <p className="form-alert" role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}
      {user.guestOrderCount > 0 ? (
        <p>
          {user.guestOrderCount} guest {user.guestOrderCount === 1 ? 'order was' : 'orders were'} placed with this email.
          {' '}
          <button type="button" className="route-button" onClick={attach} disabled={pending}>Attach them</button>
        </p>
      ) : null}

      <section className="product-section" aria-labelledby="profile-title">
        <h2 id="profile-title">Profile</h2>
        <form className="checkout-form" onSubmit={saveProfile}>
          <label>
            Name
            <input name="name" defaultValue={user.name} required />
          </label>
          <button type="submit" className="route-button" disabled={pending}>Save name</button>
        </form>
      </section>

      <section className="product-section" aria-labelledby="address-title">
        <h2 id="address-title">Addresses</h2>
        <ul className="account-orders">
          {user.addresses.length === 0 ? <li>No saved addresses yet.</li> : null}
          {user.addresses.map((item, index) => (
            <li key={`${item.label}-${item.line1}`}>
              <p>{item.label}</p>
              <p>{item.line1}, {item.city}, {item.region} {item.postal}, {item.country}</p>
              <button type="button" onClick={() => removeAddress(index)} disabled={pending}>Remove</button>
            </li>
          ))}
        </ul>
        <form className="checkout-form" onSubmit={addAddress}>
          {[
            ['label', 'Label', 'Home'],
            ['line1', 'Address', ''],
            ['city', 'City', ''],
            ['region', 'Region', ''],
            ['postal', 'Postal code', ''],
            ['country', 'Country', 'United States'],
          ].map(([name, label, value]) => (
            <label key={name}>
              {label}
              <input name={name} defaultValue={value} required />
            </label>
          ))}
          <button type="submit" className="route-button" disabled={pending || user.addresses.length >= 5}>
            Add address
          </button>
        </form>
      </section>

      <section className="product-section" aria-labelledby="password-title">
        <h2 id="password-title">Password</h2>
        <form className="checkout-form" onSubmit={changePassword}>
          <label>
            Current password
            <input name="current" type="password" autoComplete="current-password" required />
          </label>
          <label>
            New password
            <input name="next" type="password" autoComplete="new-password" minLength={12} required />
          </label>
          <label>
            Confirm password
            <input name="confirm" type="password" autoComplete="new-password" minLength={12} required />
          </label>
          <button type="submit" className="route-button" disabled={pending}>Change password</button>
        </form>
      </section>

      <section className="product-section" aria-labelledby="orders-title">
        <h2 id="orders-title">Orders</h2>
        {orders.isPending ? <p>Loading orders.</p> : null}
        {orders.isError ? <p className="form-alert" role="alert">{orders.error.message}</p> : null}
        <ul className="account-orders">
          {(orders.data?.orders || []).map((item) => (
            <li key={item.orderNumber}>
              <Link to={`/orders/${item.orderNumber}`}>
                {item.orderNumber} · {item.status} · ${item.total}
              </Link>
            </li>
          ))}
          {orders.data && orders.data.orders.length === 0 ? <li>No orders yet.</li> : null}
        </ul>
      </section>

      <p>
        <button type="button" className="route-button" onClick={signOut}>Sign out</button>
      </p>
      <p><Link to="/orders">Look up a guest order</Link></p>
      <PageReady title="Account — SANVI Audio" description="Your SANVI Audio profile, addresses, and orders." />
    </article>
  );
}
