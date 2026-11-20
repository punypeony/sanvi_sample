import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAccount } from '../auth/account';
import { adoptUser } from '../cart/useCart';
import PageReady from './PageReady';

export default function Register() {
  const account = useAccount();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  if (account.data) return <Navigate to="/account" replace />;

  async function onSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password') || '');
    if (password !== data.get('confirm')) {
      setError('Those passwords do not match.');
      return;
    }
    setError('');
    setPending(true);
    try {
      const user = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          password,
        }),
      });
      client.setQueryData(['account'], user);
      await adoptUser(user);
      navigate('/account', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="route-page">
      <p className="route-kicker">Account</p>
      <h1>Create an account</h1>
      <form className="checkout-form" onSubmit={onSubmit}>
        <p className="route-lead">
          Guest orders placed with the same email can be attached after you sign up.
        </p>
        {error ? <p className="form-alert" role="alert">{error}</p> : null}
        <label>
          Name
          <input name="name" type="text" autoComplete="name" required />
        </label>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="new-password" minLength={12} required />
        </label>
        <label>
          Confirm password
          <input name="confirm" type="password" autoComplete="new-password" minLength={12} required />
        </label>
        <button type="submit" className="route-button" disabled={pending}>
          {pending ? 'Creating the account' : 'Create account'}
        </button>
      </form>
      <p><Link to="/login">Already have an account</Link></p>
      <PageReady title="Create an account — SANVI Audio" description="Create a SANVI Audio account." />
    </article>
  );
}
