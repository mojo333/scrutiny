import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { queryClient } from './api/query';
import { routeTree } from './routes';
import { ThemeProvider } from './utils/theme';
import './index.css';

// Apply dark mode by default (will be updated by ThemeProvider)
document.documentElement.classList.add('dark');

// Create router instance with base path
const router = createRouter({
  routeTree,
  basepath: '/web',
  context: {
    queryClient,
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
        <Toaster richColors closeButton position="bottom-right" />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
