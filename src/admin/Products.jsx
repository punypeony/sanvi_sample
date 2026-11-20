import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../api/client';
import PageReady from '../pages/PageReady';
import { money } from './format';
import { Banner, ErrorText } from './ui';

const EMPTY = {
  id: '',
  slug: '',
  name: '',
  tagline: '',
  price: 0,
  compareAtPrice: '',
  category: 'accessories',
  featured: false,
  flagship: false,
  active: true,
  features: '',
  specs: [],
  colorways: [{ id: 'black', name: 'Black', price: 0, stockCount: 0 }],
};

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

export default function Products({ id }) {
  if (!id) return <ProductList />;
  return <ProductEditor id={id} />;
}

function ProductList() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    api('/api/admin/products')
      .then((data) => {
        if (live) setProducts(data.products);
      })
      .catch((err) => {
        if (live) setError(err.message);
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <>
      <PageReady title="Products — SANVI Admin" description="Create, edit, and archive products." />
      <h1>Products</h1>
      <p className="admin-lead">Archiving hides a product by marking it inactive. Stock is a count per color.</p>
      <p><Link className="admin-button" to="/admin/products/new">New product</Link></p>
      <ErrorText>{error}</ErrorText>
      <ul className="admin-list">
        {(products || []).map((product) => (
          <li key={product.id} className="admin-card">
            <Link to={`/admin/products/${product.id}`}>{product.name}</Link>
            <p className="admin-meta">
              {money(product.price)}
              {product.flagship ? ' · Flagship' : ''}
              {product.active ? '' : ' · Archived'}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

function ProductEditor({ id }) {
  const navigate = useNavigate();
  const creating = id === 'new';
  const [form, setForm] = useState(EMPTY);
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(creating);

  useEffect(() => {
    if (creating) return undefined;
    let live = true;
    api(`/api/admin/products/${id}`)
      .then(({ product }) => {
        if (!live) return;
        setForm({
          id: product.id,
          slug: product.slug,
          name: product.name,
          tagline: product.tagline,
          price: product.price,
          compareAtPrice: product.compareAtPrice ?? '',
          category: product.category,
          featured: product.featured,
          flagship: product.flagship,
          active: product.active,
          features: (product.features || []).join('\n'),
          specs: product.specs || [],
          colorways: product.colorways.map(({ id: colorId, name, price, stockCount }) => ({
            id: colorId,
            name,
            price,
            stockCount,
          })),
        });
        setImages(product.images || []);
        setReady(true);
      })
      .catch((err) => {
        if (live) setError(err.message);
      });
    return () => {
      live = false;
    };
  }, [creating, id]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setColor(index, key, value) {
    setForm((current) => ({
      ...current,
      colorways: current.colorways.map((color, colorIndex) => (
        colorIndex === index ? { ...color, [key]: value } : color
      )),
    }));
  }

  function payload() {
    return {
      id: form.id.trim(),
      slug: form.slug.trim(),
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice === '' ? null : Number(form.compareAtPrice),
      category: form.category,
      featured: form.featured,
      flagship: form.flagship,
      active: form.active,
      features: form.features.split('\n').map((line) => line.trim()).filter(Boolean),
      specs: form.specs,
      colorways: form.colorways.map((color) => ({
        id: color.id.trim(),
        name: color.name.trim(),
        price: Number(color.price),
        stockCount: Number(color.stockCount),
      })),
    };
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const body = JSON.stringify(payload());
      if (creating) {
        const { product } = await api('/api/admin/products', { method: 'POST', body });
        navigate(`/admin/products/${product.id}`, { replace: true });
        return;
      }
      const { product } = await api(`/api/admin/products/${id}`, { method: 'PATCH', body });
      setImages(product.images || []);
      setNotice('Saved.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const body = new FormData();
    body.set('image', file);
    setError('');
    try {
      const { product } = await api(`/api/admin/products/${id}/images`, { method: 'POST', body });
      setImages(product.images || []);
      setNotice('Image added.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeImage(imageId) {
    setError('');
    try {
      const { product } = await api(`/api/admin/products/${id}/images/${imageId}`, { method: 'DELETE' });
      setImages(product.images || []);
      setNotice('Image removed.');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!ready && !error) return <p>Loading the product.</p>;

  return (
    <>
      <PageReady
        title={creating ? 'New product — SANVI Admin' : `${form.name || 'Product'} — SANVI Admin`}
        description="Edit a product, its colors, and its stock."
      />
      <h1>{creating ? 'New product' : form.name}</h1>
      <p className="admin-lead">Marking this the flagship clears the flag on every other product. Only one stays the flagship.</p>
      <Banner>{notice}</Banner>
      <ErrorText>{error}</ErrorText>
      <form className="admin-form" onSubmit={onSubmit}>
        <label>
          Name
          <input
            value={form.name}
            required
            onChange={(event) => {
              const name = event.target.value;
              setForm((current) => ({
                ...current,
                name,
                slug: creating ? slugify(name) : current.slug,
                id: creating ? slugify(name) : current.id,
              }));
            }}
          />
        </label>
        <label>
          Public id
          <input value={form.id} required pattern="[a-z0-9-]{2,60}" disabled={!creating} onChange={(event) => setField('id', event.target.value)} />
        </label>
        <label>
          Slug
          <input value={form.slug} required pattern="[a-z0-9-]{2,60}" onChange={(event) => setField('slug', event.target.value)} />
        </label>
        <label>
          Tagline
          <input value={form.tagline} required maxLength={200} onChange={(event) => setField('tagline', event.target.value)} />
        </label>
        <label>
          Price
          <input type="number" min="0" step="1" required value={form.price} onChange={(event) => setField('price', event.target.value)} />
        </label>
        <label>
          Compare-at price
          <input type="number" min="0" step="1" value={form.compareAtPrice} onChange={(event) => setField('compareAtPrice', event.target.value)} />
        </label>
        <label>
          Category
          <select value={form.category} onChange={(event) => setField('category', event.target.value)}>
            <option value="headphones">Headphones</option>
            <option value="parts">Parts</option>
            <option value="accessories">Accessories</option>
            <option value="bundles">Bundles</option>
          </select>
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={form.featured} onChange={(event) => setField('featured', event.target.checked)} />
          Featured
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={form.flagship} onChange={(event) => setField('flagship', event.target.checked)} />
          Flagship
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={form.active} onChange={(event) => setField('active', event.target.checked)} />
          Active
        </label>
        <label>
          Features, one per line
          <textarea value={form.features} onChange={(event) => setField('features', event.target.value)} />
        </label>
        <fieldset>
          <legend>Colors and stock</legend>
          {form.colorways.map((color, index) => (
            <div className="admin-colorway" key={`${color.id}-${index}`}>
              <label>
                Color id
                <input value={color.id} required pattern="[a-z0-9-]{1,40}" onChange={(event) => setColor(index, 'id', event.target.value)} />
              </label>
              <label>
                Name
                <input value={color.name} required onChange={(event) => setColor(index, 'name', event.target.value)} />
              </label>
              <label>
                Price
                <input type="number" min="0" required value={color.price} onChange={(event) => setColor(index, 'price', event.target.value)} />
              </label>
              <label>
                Stock
                <input type="number" min="0" required value={color.stockCount} onChange={(event) => setColor(index, 'stockCount', event.target.value)} />
              </label>
              <button
                type="button"
                className="secondary"
                disabled={form.colorways.length === 1}
                onClick={() => setForm((current) => ({
                  ...current,
                  colorways: current.colorways.filter((_, colorIndex) => colorIndex !== index),
                }))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() => setForm((current) => ({
              ...current,
              colorways: [...current.colorways, { id: '', name: '', price: 0, stockCount: 0 }],
            }))}
          >
            Add color
          </button>
        </fieldset>
        <div className="admin-actions">
          <button type="submit">{creating ? 'Create product' : 'Save'}</button>
          {!creating && form.active && (
            <button type="button" className="danger" onClick={() => { setField('active', false); setNotice('Turned off. Save to archive it.'); }}>
              Archive
            </button>
          )}
        </div>
      </form>
      {!creating && (
        <section>
          <h2>Images</h2>
          <p className="admin-meta">JPEG, PNG, or WebP, up to 2 MB. Files stay on this machine.</p>
          <ul className="admin-list">
            {images.map((image) => (
              <li key={image.id} className="admin-card">
                {image.src && <img src={image.src} alt={image.alt} width="160" height="120" />}
                <button type="button" className="secondary" onClick={() => removeImage(image.id)}>Remove image</button>
              </li>
            ))}
          </ul>
          <label>
            Add an image
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} />
          </label>
        </section>
      )}
    </>
  );
}
