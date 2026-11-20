import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAccount } from '../auth/account';
import { adoptUser } from '../cart/useCart';
import PageReady from './PageReady';

function safeNext(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/account';
  return value;
}

export default function Login() {
  const account = useAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const client = useQueryClient();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  if (account.data) return <Navigate to="/account" replace />;

  async function onSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError('');
    setPending(true);
    try {
      const user = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
      });
      client.setQueryData(['account'], user);
      await adoptUser(user);
      navigate(safeNext(location.state?.from), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="route-page">
      <p className="route-kicker">Account</p>
      <h1>Sign in</h1>
      <form className="checkout-form" onSubmit={onSubmit}>
        <p className="route-lead">Use the email and password for your SANVI account.</p>
        {error ? <p className="form-alert" role="alert">{error}</p> : null}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit" className="route-button" disabled={pending}>
          {pending ? 'Signing in' : 'Sign in'}
        </button>
      </form>
      <p><Link to="/register">Create an account</Link></p>
      <p><Link to="/forgot">Forgot password</Link></p>
      <p><Link to="/orders">Look up an order</Link></p>
      <PageReady title="Sign in — SANVI Audio" description="Sign in to your SANVI Audio account." />
    </article>
  );
}
