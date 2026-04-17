import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TerminalForm } from '../components/TerminalForm';
import { authService } from '../services/authService';
import { getRoutePath } from '../../../router/routes';

/**
 * RegisterPage - Terminal-style account creation.
 *
 * Creates new system access with cyber-terminal interface.
 * Redirects to /app on successful registration.
 */
export function RegisterPage(): React.ReactElement {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (email: string, password: string): Promise<void> => {
    setError(null);
    setLoading(true);

    try {
      await authService.register({ email, password });
      localStorage.setItem('username', email.split('@')[0] || email);
      navigate(getRoutePath('ADMIN'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4 py-12">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg">
        {/* System Header */}
        <div className="mb-8 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            <span className="font-[family-name:var(--font-mono)] text-xs text-violet-500">
              NEW ACCESS
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">ZENIN</h1>
          <p className="mt-1 font-[family-name:var(--font-mono)] text-sm text-gray-500">
            {'>'} initialize new credentials
          </p>
        </div>

        {/* Terminal Form */}
        <div className="rounded-lg border border-gray-800 bg-[#0a0a0a]/90 p-8 backdrop-blur-sm">
          <TerminalForm
            mode="register"
            onSubmit={handleRegister}
            error={error}
            loading={loading}
          />
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate(getRoutePath('HOME'))}
            className="font-[family-name:var(--font-mono)] text-xs text-gray-600 transition-colors hover:text-gray-400"
          >
            {'<'} return_to_system
          </button>
        </div>
      </div>
    </div>
  );
}
