import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../api/client';
import { catalogParams } from '../shop/shopQuery';
import { rememberProducts } from './catalogCache';

export function useCatalogCache() {
  useQuery({
    queryKey: ['catalog-cache'],
    staleTime: 30_000,
    queryFn: async () => {
      const data = await api('/api/products?limit=48');
      rememberProducts(data.products);
      return data.products.length;
    },
  });
}

export function useProducts(query) {
  return useQuery({
    queryKey: ['products', query],
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const data = await api(`/api/products?${catalogParams(query)}`);
      rememberProducts(data.products);
      return data;
    },
  });
}

export function useProduct(slug) {
  return useQuery({
    queryKey: ['product', slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const data = await api(`/api/products/${encodeURIComponent(slug)}`);
      rememberProducts([data.product, ...(data.related || []), ...(data.fits || [])]);
      return data;
    },
  });
}
