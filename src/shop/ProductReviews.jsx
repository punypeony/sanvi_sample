import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAccount } from '../auth/account';

export default function ProductReviews({ product }) {
  const account = useAccount();
  const client = useQueryClient();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const reviews = useQuery({
    queryKey: ['reviews', product.slug],
    queryFn: () => api(`/api/products/${encodeURIComponent(product.slug)}/reviews`),
  });

  async function onSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError('');
    setPending(true);
    try {
      await api(`/api/products/${encodeURIComponent(product.slug)}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating: Number(data.get('rating')),
          text: data.get('text'),
          colorway: data.get('colorway') || undefined,
        }),
      });
      form.reset();
      setNotice('Your review is waiting for approval.');
      client.invalidateQueries({ queryKey: ['reviews', product.slug] });
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  const list = reviews.data?.reviews || [];

  return (
    <section id="reviews" className="product-section" aria-labelledby="reviews-title">
      <h2 id="reviews-title">Reviews</h2>
      <p>
        {product.rating} / 5 from {product.reviewCount.toLocaleString('en-US')} reviews.
      </p>
      {reviews.isPending ? <p>Loading reviews.</p> : null}
      {reviews.isError ? <p className="form-alert" role="alert">{reviews.error.message}</p> : null}
      {list.length === 0 && reviews.data ? <p>No approved reviews yet.</p> : null}
      <ul className="product-reviews">
        {list.map((review) => (
          <li key={review.id}>
            <p>
              {review.rating} / 5 · {review.authorName}
              {review.colorway ? ` · ${review.colorway}` : ''}
            </p>
            <p>{review.text}</p>
          </li>
        ))}
      </ul>
      {account.data ? (
        <form className="checkout-form" onSubmit={onSubmit}>
          <h3>Write a review</h3>
          {error ? <p className="form-alert" role="alert">{error}</p> : null}
          {notice ? <p role="status">{notice}</p> : null}
          <label>
            Rating
            <select name="rating" defaultValue="5" required>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Color
            <select name="colorway" defaultValue="">
              <option value="">No color</option>
              {product.colorways.map((color) => (
                <option key={color.id} value={color.id}>{color.name}</option>
              ))}
            </select>
          </label>
          <label>
            Review
            <textarea name="text" required maxLength={2000} />
          </label>
          <button type="submit" className="route-button" disabled={pending}>
            {pending ? 'Sending' : 'Submit review'}
          </button>
        </form>
      ) : (
        <p><Link to="/login">Sign in to review this product</Link></p>
      )}
    </section>
  );
}
