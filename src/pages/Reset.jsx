import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api } from '../api/client';
import PageReady from './PageReady';

export default function Reset() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

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
      await api('/api/auth/reset', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="route-page">
      <p className="route-kicker">Account</p>
      <h1>Choose a new password</h1>
      {token ? (
        <form className="checkout-form" onSubmit={onSubmit}>
          {error ? <p className="form-alert" role="alert">{error}</p> : null}
          <label>
            New password
            <input name="password" type="password" autoComplete="new-password" minLength={12} required />
          </label>
          <label>
            Confirm password
            <input name="confirm" type="password" autoComplete="new-password" minLength={12} required />
          </label>
          <button type="submit" className="route-button" disabled={pending}>
            {pending ? 'Saving' : 'Save password'}
          </button>
        </form>
      ) : (
        <p className="route-lead">This reset link is missing its token.</p>
      )}
      <p><Link to="/forgot">Request a new link</Link></p>
      <PageReady title="Choose a new password — SANVI Audio" description="Set a new SANVI Audio password." />
    </article>
  );
}
