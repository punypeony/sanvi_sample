import { useParams } from 'react-router';
import { getProductBySlug } from '../data/products';
import NotFound from './NotFound';
import Flagship from './Flagship';
import Standard from './Standard';

export default function Product() {
  const { slug } = useParams();
  const product = getProductBySlug(slug);
  if (!product) return <NotFound />;
  if (product.flagship) return <Flagship product={product} />;
  return <Standard key={product.id} product={product} />;
}
