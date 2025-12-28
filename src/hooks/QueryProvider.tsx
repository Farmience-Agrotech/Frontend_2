// =============================================================================
// REACT QUERY PROVIDER
// =============================================================================

import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// -----------------------------------------------------------------------------
// QUERY CLIENT CONFIGURATION
// -----------------------------------------------------------------------------

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30 * 1000, // Data is fresh for 30 seconds
            gcTime: 5 * 60 * 1000, // Cache for 5 minutes
            retry: 1, // Retry failed requests once
            refetchOnWindowFocus: false, // Don't refetch on window focus
        },
    },
});

// -----------------------------------------------------------------------------
// PROVIDER COMPONENT
// -----------------------------------------------------------------------------

interface QueryProviderProps {
    children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {/* DevTools - only shows in development */}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}

export { queryClient };
export default QueryProvider;