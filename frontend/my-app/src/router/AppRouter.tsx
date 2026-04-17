import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { HomePage } from '../features/home/components/HomePage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { AdminDashboard } from '../features/admin/pages/AdminDashboard';
import { AdminHome } from '../features/admin/pages/AdminHome';
import { PredictionsPage } from '../features/admin/pages/PredictionsPage';
import { AdminLayout } from '../features/admin/components/AdminLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { ROUTES } from './routes';

/**
 * ProtectedLayout - Wraps protected routes with authentication guard.
 *
 * All children routes require valid JWT token.
 * No token → redirect to /login.
 */
function ProtectedLayout(): React.ReactElement {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  );
}

/**
 * Application Router component.
 *
 * Routing structure:
 *   /                        → Home (public) - with MainLayout/Footer
 *   /login                   → Login (public) - no layout
 *   /register                → Register (public) - no layout
 *   /app/*                   → Protected area (requires auth) - no Footer
 *     /app                   → Redirects to /app/admin (Home)
 *     /app/admin             → Home/Landing page (within AdminLayout)
 *     /app/admin/chat        → Chat interface (within AdminLayout)
 *     /app/admin/predictions → Predictions dashboard (within AdminLayout)
 *
 * Admin section uses shared AdminLayout with:
 *   - Persistent sidebar navigation
 *   - Consistent styling
 *   - Dynamic content via Outlet
 *
 * Security: All /app routes wrapped in ProtectedRoute.
 * Footer only appears on public pages (/).
 */
export function AppRouter(): React.ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes with MainLayout (includes Footer) */}
        <Route element={<MainLayout />}>
          <Route path={ROUTES.HOME.path} element={<HomePage />} />
        </Route>

        {/* Auth routes - no layout */}
        <Route path={ROUTES.LOGIN.path} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER.path} element={<RegisterPage />} />

        {/* Protected routes - no MainLayout/Footer */}
        <Route element={<ProtectedLayout />}>
          {/* Redirect /app to /app/admin (Home) */}
          <Route path="/app" element={<Navigate to="/app/admin" replace />} />
          
          {/* Admin section with shared layout */}
          <Route path="/app/admin" element={<AdminLayout />}>
            {/* Home/Landing page */}
            <Route index element={<AdminHome />} />
            
            {/* Chat interface */}
            <Route path="chat" element={<AdminDashboard />} />
            
            {/* Predictions dashboard */}
            <Route path="predictions" element={<PredictionsPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to={ROUTES.HOME.path} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
