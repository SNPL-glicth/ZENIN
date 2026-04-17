import { Navigate } from 'react-router-dom';
import { getRoutePath } from './routes';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute - Guards access to authenticated-only areas.
 *
 * Security layer that validates JWT token presence before rendering.
 * No token → redirect to /login (no exceptions).
 *
 * Authentication Rule: localStorage.getItem("token") must exist.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps): React.ReactElement {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to={getRoutePath('LOGIN')} replace />;
  }

  return <>{children}</>;
}
