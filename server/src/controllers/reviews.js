import { createReview, listApprovedReviews } from '../services/reviews.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  res.json(await listApprovedReviews(req.validated.params.slug));
});

export const create = asyncHandler(async (req, res) => {
  const review = await createReview({
    slug: req.validated.params.slug,
    userId: req.user._id,
    ...req.validated.body,
  });
  res.status(201).json(review);
});
