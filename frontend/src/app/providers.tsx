'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border2)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
          },
          success: { iconTheme: { primary: 'var(--teal)', secondary: '#060A12' } },
          error: { iconTheme: { primary: 'var(--red)', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}
