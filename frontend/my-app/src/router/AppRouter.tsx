import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { AppPage } from '../pages/AppPage';
import { HomePage } from '../features/home/components/HomePage';
import { ROUTES } from './routes';

/**
 * Application Router component.
 *
 * Centralizes all routing logic. Routes are defined in routes.ts.
 * Wraps all pages with MainLayout for consistent structure.
 */
export function AppRouter(): React.ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path={ROUTES.HOME.path} element={<HomePage />} />
          <Route path={ROUTES.APP.path} element={<AppPage />} />
          <Route path={ROUTES.LOGIN.path} element={<LoginPlaceholder />} />
          <Route path="*" element={<Navigate to={ROUTES.HOME.path} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

/**
 * Login page placeholder - to be implemented.
 */
function LoginPlaceholder(): React.ReactElement {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-3xl font-bold text-white">Login</h1>
        <p className="text-gray-400">Authentication coming soon.</p>
      </div>
    </div>
  );
}
