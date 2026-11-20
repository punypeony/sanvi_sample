export function toPublicProduct(doc) {
  const product = doc.toObject ? doc.toObject() : doc;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? null,
    category: product.category,
    featured: Boolean(product.featured),
    flagship: Boolean(product.flagship),
    placeholder: Boolean(product.placeholder),
    features: product.features || [],
    specs: product.specs || [],
    images: product.images || [],
    relatedIds: product.relatedIds || [],
    fitsIds: product.fitsIds || [],
    rating: product.rating,
    reviewCount: product.reviewCount,
    colorways: (product.colorways || []).map((color) => ({
      id: color.id,
      name: color.name,
      price: color.price,
      stock: color.stock,
    })),
  };
}

export function collectColors(products) {
  const names = new Map();
  for (const product of products) {
    for (const color of product.colorways) {
      if (!names.has(color.id)) names.set(color.id, color.name);
    }
  }
  return [...names.entries()].map(([id, name]) => ({ id, name }));
}
