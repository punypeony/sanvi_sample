import { useEffect, useState } from 'react';
import { api } from '../api/client';
import PageReady from '../pages/PageReady';
import { Banner, ErrorText } from './ui';

const FILTERS = [
  ['pending', 'Waiting'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['', 'All'],
];

export default function Reviews() {
  const [status, setStatus] = useState('pending');
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let live = true;
    const suffix = status ? `?status=${status}` : '';
    api(`/api/admin/reviews${suffix}`)
      .then((data) => {
        if (live) setReviews(data.reviews);
      })
      .catch((err) => {
        if (live) setError(err.message);
      });
    return () => {
      live = false;
    };
  }, [status, notice]);

  async function moderate(id, next) {
    setError('');
    try {
      await api(`/api/admin/reviews/${id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      setNotice(next === 'approved' ? 'Review approved.' : 'Review rejected.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageReady title="Reviews — SANVI Admin" description="Approve or reject product reviews." />
      <h1>Reviews</h1>
      <div className="admin-actions">
        {FILTERS.map(([value, label]) => (
          <button
            key={label}
            type="button"
            className={status === value ? '' : 'secondary'}
            aria-pressed={status === value}
            onClick={() => setStatus(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <Banner>{notice}</Banner>
      <ErrorText>{error}</ErrorText>
      <ul className="admin-list">
        {(reviews || []).map((review) => (
          <li key={review.id} className="admin-card">
            <h2>{review.authorName}</h2>
            <p>{review.text}</p>
            <p className="admin-meta">{review.productId} · {review.rating} / 5 · {review.status}</p>
            <div className="admin-actions">
              {review.status !== 'approved' && (
                <button type="button" onClick={() => moderate(review.id, 'approved')}>Approve</button>
              )}
              {review.status !== 'rejected' && (
                <button type="button" className="secondary" onClick={() => moderate(review.id, 'rejected')}>Reject</button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {reviews && reviews.length === 0 && <p>Nothing in this list.</p>}
    </>
  );
}
