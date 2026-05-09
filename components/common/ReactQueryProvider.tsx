'use client';

import { ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createPersister } from '@/components/common/createIDBPersister';
import { AUTH_SESSION_EXPIRED_EVENT } from '@/utils/authSession';

const HASH_ID_STRICT_BUSTER = 'hash-id-strict-v1';

export default function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 30,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  useEffect(() => {
    const persister = createPersister();
    const [unsubscribe, restorePromise] = persistQueryClient({
      queryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 24 * 3,
      buster: HASH_ID_STRICT_BUSTER,

      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          const key = query.queryKey;
          const head = key[0];

          if (query.state.status !== 'success') return false;
          if (query.meta?.optimistic) return false;

          const isBoardsList =
            key.length === 1 && head === 'boards';

          const isBoardColumns =
            key.length === 3 &&
            head === 'board' &&
            key[2] === 'columns';

          const isBoardMeta =
            key.length === 3 &&
            head === 'board' &&
            key[2] === 'meta';

          return isBoardsList || isBoardColumns || isBoardMeta;
        },
      },
    });

    void Promise.resolve(restorePromise).catch(() => {});

    const handleSessionExpired = () => {
      queryClient.clear();
      void Promise.resolve(persister.removeClient()).catch(() => {});
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      unsubscribe();
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
