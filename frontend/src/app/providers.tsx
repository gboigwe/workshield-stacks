// src/app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time - how long data is considered fresh
            staleTime: 15000, // 15 seconds
            // GC time - how long inactive data stays in cache (renamed from cacheTime in v5)
            gcTime: 300000, // 5 minutes
            // Retry configuration
            retry: (failureCount, error) => {
              // Don't retry on certain errors
              if (error && typeof error === 'object' && 'status' in error) {
                const status = (error as { status: number }).status;
                if (status === 404 || status === 403) return false;
              }
              return failureCount < 3;
            },
            retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Refetch on window focus for better UX
            refetchOnWindowFocus: true,
            // Refetch on reconnect
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry mutations on network errors
            retry: (failureCount, error) => {
              if (error && typeof error === 'object' && 'message' in error) {
                const message = (error as { message: string }).message;
                if (message.includes('User denied') || message.includes('cancelled')) {
                  return false;
                }
              }
              return failureCount < 2;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
