import { Link } from 'react-router';
import CartDetails from '../cart/CartDetails';
import { useCart } from '../cart/useCart';
import PageReady from './PageReady';

export default function Cart() {
  const { lines, count } = useCart();

  return (
    <article className="route-page">
      <p className="route-kicker">Cart</p>
      <h1>Cart</h1>
      {lines.length === 0 ? null : (
        <p className="route-lead">
          {count} {count === 1 ? 'item' : 'items'}.
        </p>
      )}
      <CartDetails variant="page" />
      {lines.length === 0 ? (
        <p className="route-lead">
          <Link to="/shop">Browse the shop</Link>.
        </p>
      ) : (
        <p>
          <Link to="/checkout" className="route-button">
            Checkout
          </Link>
        </p>
      )}
      <PageReady title="Cart — SANVI Audio" description="Your cart. Checkout is a placeholder." />
    </article>
  );
}
