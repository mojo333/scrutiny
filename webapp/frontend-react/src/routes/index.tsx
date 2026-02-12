import { lazy } from 'react';
import { createRootRoute, createRoute } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';

const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const DeviceDetail = lazy(() => import('@/pages/DeviceDetail').then(m => ({ default: m.DeviceDetail })));
const ZFSPools = lazy(() => import('@/pages/ZFSPools').then(m => ({ default: m.ZFSPools })));
const ZFSPoolDetail = lazy(() => import('@/pages/ZFSPoolDetail').then(m => ({ default: m.ZFSPoolDetail })));

// Root route uses MainLayout directly
export const rootRoute = createRootRoute({
  component: MainLayout,
});

// Dashboard route
export const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: Dashboard,
});

// Device detail route
export const deviceDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/device/$wwn',
  component: DeviceDetail,
});

// ZFS pools route
export const zfsPoolsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zfs-pools',
  component: ZFSPools,
});

// ZFS pool detail route
export const zfsPoolDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/zfs-pool/$guid',
  component: ZFSPoolDetail,
});

// Index route redirects to dashboard
export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/web/dashboard';
    }
    return null;
  },
});

// Create route tree
export const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  deviceDetailRoute,
  zfsPoolsRoute,
  zfsPoolDetailRoute,
]);

// Type for router context
export interface RouterContext {
  queryClient: QueryClient;
}
