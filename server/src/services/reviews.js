import { HttpError } from '../utils/httpError.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { recordAudit } from './audit.js';
import { loadActive } from './products.js';
import { newToken } from '../utils/session.js';

function present(review, names) {
  return {
    id: review.id,
    rating: review.rating,
    text: review.text,
    colorway: review.colorway || '',
    authorName: names.get(String(review.userId)) || 'Customer',
    createdAt: review.createdAt,
  };
}

async function authorNames(reviews) {
  const users = await User.find({ _id: { $in: reviews.map((review) => review.userId) } }).select('name');
  return new Map(users.map((user) => [String(user._id), user.name]));
}

export async function listApprovedReviews(slug) {
  const product = await loadActive(slug);
  const reviews = await Review.find({ productId: product.id, status: 'approved' })
    .sort({ createdAt: -1 })
    .limit(50);
  const names = await authorNames(reviews);
  return { reviews: reviews.map((review) => present(review, names)) };
}

export async function createReview({ slug, userId, rating, text, colorway }) {
  const product = await loadActive(slug);
  if (colorway && !product.colorways.some((color) => color.id === colorway)) {
    throw new HttpError(400, 'That color is not on this product.');
  }
  try {
    const review = await Review.create({
      id: `rv-${newToken().slice(0, 12).toLowerCase()}`,
      productId: product.id,
      userId,
      rating,
      text,
      colorway: colorway || '',
      status: 'pending',
      placeholder: false,
    });
    return { id: review.id, status: review.status };
  } catch (error) {
    if (error?.code === 11000 || error?.cause?.code === 11000) {
      throw new HttpError(409, 'You already reviewed this product.');
    }
    throw error;
  }
}

export async function listAdminReviews(status) {
  const filter = {};
  if (status) filter.status = status;
  const reviews = await Review.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  const users = await User.find({ _id: { $in: reviews.map((review) => review.userId) } }).lean();
  const names = new Map(users.map((user) => [String(user._id), user.name]));
  return {
    reviews: reviews.map((review) => ({
      id: review.id,
      productId: review.productId,
      rating: review.rating,
      text: review.text,
      colorway: review.colorway,
      status: review.status,
      authorName: names.get(String(review.userId)) || 'Customer',
      createdAt: review.createdAt,
    })),
  };
}

export async function setReviewStatus({ id, status, actorId }) {
  const review = await Review.findOne({ id });
  if (!review) throw new HttpError(404, 'Review not found.');
  const before = review.status;
  review.status = status;
  await review.save();
  await recordAudit({
    actorId,
    action: 'review.status',
    target: review.id,
    before,
    after: review.status,
  });
  return { id: review.id, status: review.status };
}
