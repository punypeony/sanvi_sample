// The flagship, in the shape Buy and the cart drawer already read.
// The catalogue lives in shared/catalog.js and is re-exported by products.js.
// Prices and stock there are PLACEHOLDERS. `reviews` is one page of the reviews endpoint.

import { flagship } from './products';
import { placeholderReviews } from '../../shared/reviews.js';

export const product = {
  id: flagship.id,
  name: flagship.name,
  placeholder: true,
  currency: 'USD',
  specs: flagship.specs,
  colorways: flagship.colorways.map(({ id, stock, price }) => ({ id, stock, price })),
};

export const reviews = {
  average: 4.8,
  count: 2310,
  reviews: placeholderReviews,
};
