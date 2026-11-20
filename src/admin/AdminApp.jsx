import { useEffect, useState } from 'react';
import { NavLink, Navigate, useLocation, useNavigate } from 'react-router';
import { api } from '../api/client';
import PageReady from '../pages/PageReady';
import './admin.css';
import Audit from './Audit';
import Customers from './Customers';
import Dashboard from './Dashboard';
import Login from './Login';
import Orders from './Orders';
import Products from './Products';
import Reviews from './Reviews';

function usePaper() {
  useEffect(() => {
    const html = document.documentElement;
    const previous = {
      html: html.style.background,
      body: document.body.style.background,
      color: document.body.style.color,
    };
    html.style.background = '#f4f1ea';
    document.body.style.background = '#f4f1ea';
    document.body.style.color = '#1c1917';
    return () => {
      html.style.background = previous.html;
      document.body.style.background = previous.body;
      document.body.style.color = previous.color;
    };
  }, []);
}

function Gate({ children }) {
  const [user, setUser] = useState(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    let live = true;
    api('/api/auth/me')
      .then((next) => {
        if (live) setUser(next);
      })
      .catch(() => {
        if (live) setUser(null);
      });
    return () => {
      live = false;
    };
  }, []);

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    navigate('/admin/login', { replace: true });
  }

  if (user === undefined) return <p>Checking the session.</p>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'admin') {
    return (
      <>
        <PageReady
          title="Not an admin — SANVI Audio"
          description="This account cannot open the SANVI admin area."
        />
        <h1>This account is not an admin.</h1>
        <p className="admin-lead">{user.email} can shop, and cannot open this area.</p>
        <button type="button" onClick={logout}>Sign out</button>
      </>
    );
  }

  return (
    <>
      <nav className="admin-nav" aria-label="Admin">
        <NavLink to="/admin" end>Dashboard</NavLink>
        <NavLink to="/admin/products">Products</NavLink>
        <NavLink to="/admin/orders">Orders</NavLink>
        <NavLink to="/admin/customers">Customers</NavLink>
        <NavLink to="/admin/reviews">Reviews</NavLink>
        <NavLink to="/admin/audit">Audit</NavLink>
        <span className="admin-spacer" />
        <NavLink to="/shop">View shop</NavLink>
        <button type="button" onClick={logout}>Sign out</button>
      </nav>
      {children}
    </>
  );
}

function AdminScreen() {
  const { pathname } = useLocation();
  const splat = pathname.replace(/^\/admin\/?/, '').replace(/\/$/, '');
  if (splat === 'login') return <Login />;

  const [head, ...rest] = splat.split('/').filter(Boolean);
  const tail = decodeURIComponent(rest.join('/'));
  let page = <Dashboard />;
  if (head === 'products') page = <Products id={tail} />;
  else if (head === 'orders') page = <Orders orderNumber={tail} />;
  else if (head === 'customers') page = <Customers id={tail} />;
  else if (head === 'reviews') page = <Reviews />;
  else if (head === 'audit') page = <Audit />;
  else if (head) page = <p>That admin page is not here.</p>;

  return <Gate>{page}</Gate>;
}

export default function AdminApp() {
  usePaper();
  return (
    <div className="admin">
      <a href="#main" className="skip-link">Skip to content</a>
      <p id="route-announcer" className="sr-only" aria-live="polite" />
      <main id="main" className="admin-main">
        <AdminScreen />
      </main>
    </div>
  );
}
