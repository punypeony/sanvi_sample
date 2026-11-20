import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api/client';
import PageReady from '../pages/PageReady';
import { ErrorText } from './ui';

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      const user = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: data.get('email'),
          password: data.get('password'),
        }),
      });
      if (user.role !== 'admin') {
        navigate('/admin', { replace: true });
        return;
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  }

  return (
    <>
      <PageReady
        title="Admin sign in — SANVI Audio"
        description="Sign in to the SANVI Audio admin."
      />
      <h1>Admin</h1>
      <p className="admin-lead">Sign in with the placeholder admin from the seed. Change that password before anyone else can reach this machine.</p>
      <form className="admin-form" onSubmit={onSubmit}>
        <ErrorText>{error}</ErrorText>
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit" disabled={pending}>{pending ? 'Signing in' : 'Sign in'}</button>
      </form>
    </>
  );
}
