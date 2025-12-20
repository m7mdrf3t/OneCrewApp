import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Avoid re-fetching on every mount; keep data warm for smooth back/forward nav
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
    mutations: {
      retry: 0,
    },
  },
});







