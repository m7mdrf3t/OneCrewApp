import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60_000,   // 3 minutes — reduces mount-time refetches for navigated-back screens
      gcTime: 15 * 60_000,     // 15 minutes — keep unused data longer to reduce cold fetches
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {
      retry: 0,
    },
  },
});














