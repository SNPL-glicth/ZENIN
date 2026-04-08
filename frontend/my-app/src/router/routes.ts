/**
 * Centralized route configuration for ZENIN.
 *
 * Single source of truth for all application routes.
 * Import this to navigate programmatically or reference paths.
 */

export interface RouteConfig {
  readonly path: string;
  readonly name: string;
  readonly exact?: boolean;
}

export const ROUTES = {
  HOME: {
    path: '/',
    name: 'Home',
    exact: true,
  } as RouteConfig,

  APP: {
    path: '/app',
    name: 'Dashboard',
  } as RouteConfig,

  LOGIN: {
    path: '/login',
    name: 'Login',
  } as RouteConfig,
} as const;

/**
 * Type-safe route path getter.
 * Use this for programmatic navigation to avoid hardcoded strings.
 */
export type RouteKey = keyof typeof ROUTES;

/**
 * Get route path by key.
 * @example getRoutePath('APP') // '/app'
 */
export const getRoutePath = (key: RouteKey): string => ROUTES[key].path;
