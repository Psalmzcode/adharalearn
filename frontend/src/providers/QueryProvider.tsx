'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (count, err: any) => {
              if (err?.response?.status === 401 || err?.response?.status === 403) return false;
              return count < 2;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface2)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
          },
          success: { iconTheme: { primary: 'var(--teal)', secondary: 'var(--bg)' } },
          error: { iconTheme: { primary: 'var(--red)', secondary: 'var(--bg)' } },
        }}
      />
    </QueryClientProvider>
  );
}
