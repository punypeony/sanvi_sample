import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/client';
import PageReady from './PageReady';

export default function Forgot() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError('');
    setPending(true);
    try {
      const result = await api('/api/auth/forgot', {
        method: 'POST',
        body: JSON.stringify({ email: data.get('email') }),
      });
      setMessage(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="route-page">
      <p className="route-kicker">Account</p>
      <h1>Reset password</h1>
      <form className="checkout-form" onSubmit={onSubmit}>
        <p className="route-lead">
          If the email is registered, the API logs a reset link. A real email provider is not connected yet.
        </p>
        {error ? <p className="form-alert" role="alert">{error}</p> : null}
        {message ? <p role="status">{message}</p> : null}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <button type="submit" className="route-button" disabled={pending}>
          {pending ? 'Sending' : 'Send reset link'}
        </button>
      </form>
      <p><Link to="/login">Back to sign in</Link></p>
      <PageReady title="Reset password — SANVI Audio" description="Request a password reset link." />
    </article>
  );
}
