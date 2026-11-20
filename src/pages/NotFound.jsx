import { Link } from 'react-router';
import PageReady from './PageReady';

export default function NotFound() {
  return (
    <article className="route-page">
      <p className="route-kicker">404</p>
      <h1>Page not found</h1>
      <p className="route-lead">That address is not a page on this shop.</p>
      <p>
        <Link to="/">Home</Link>
        {' · '}
        <Link to="/shop">Shop</Link>
      </p>
      <PageReady title="Page not found — SANVI Audio" description="That address is not a page on this shop." />
    </article>
  );
}
