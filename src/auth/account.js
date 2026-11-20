import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { adoptUser, releaseUser } from '../cart/useCart';

export function useAccount() {
  return useQuery({
    queryKey: ['account'],
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      try {
        return await api('/api/auth/me');
      } catch (error) {
        if (error.status === 401) return null;
        throw error;
      }
    },
  });
}

export function useAccountSync() {
  const account = useAccount();
  useEffect(() => {
    if (!account.isSuccess) return undefined;
    if (account.data) adoptUser(account.data).catch(() => {});
    else releaseUser();
    return undefined;
  }, [account.isSuccess, account.data]);
}

export function useSignOut() {
  const client = useQueryClient();
  return async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    releaseUser();
    client.setQueryData(['account'], null);
  };
}
