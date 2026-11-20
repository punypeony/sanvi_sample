import { useParams } from 'react-router';
import { flagship, getProductBySlug } from '../data/products';
import { useProduct } from '../data/useCatalog';
import NotFound from './NotFound';
import Flagship from './Flagship';
import Standard from './Standard';

function CatalogProduct({ slug }) {
  const query = useProduct(slug);
  if (query.isPending) return <p className="sr-only">Loading</p>;
  if (query.error?.status === 404) return <NotFound />;
  if (query.isError) {
    return <p className="form-alert" role="alert">{query.error.message}</p>;
  }
  const { product, related, fits } = query.data;
  return <Standard key={product.id} product={{ ...product, related, fits }} />;
}

export default function Product() {
  const { slug } = useParams();
  if (slug === flagship.slug) {
    const product = getProductBySlug(slug);
    if (!product) return <NotFound />;
    return <Flagship product={product} />;
  }
  return <CatalogProduct slug={slug} />;
}
