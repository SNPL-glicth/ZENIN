import { useState } from 'react';

interface TerminalFormProps {
  mode: 'login' | 'register';
  onSubmit: (email: string, password: string) => Promise<void>;
  error: string | null;
  loading: boolean;
}

/**
 * TerminalForm - Terminal-style authentication form.
 *
 * Linux terminal aesthetic with:
 * - Monospace typography
 * - Prompt-style inputs
 * - Blinking cursor effect
 * - Green/violet focus highlights
 */
export function TerminalForm({
  mode,
  onSubmit,
  error,
  loading,
}: TerminalFormProps): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!email || !password) return;
    await onSubmit(email, password);
  };

  const promptSymbol = '>';

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
      {/* Terminal Header */}
      <div className="border-b border-gray-800 pb-4">
        <div className="font-[family-name:var(--font-mono)] text-xs text-gray-500">
          <span className="text-emerald-500">●</span> {mode === 'login' ? 'zenin_login' : 'zenin_register'} — bash — 80x24
        </div>
      </div>

      {/* Email/Username Input */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-sm text-gray-400">
          <span className={focusedField === 'email' ? 'text-emerald-500' : 'text-gray-600'}>
            {promptSymbol}
          </span>
          <span>email:</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            disabled={loading}
            className="w-full border-b-2 border-gray-800 bg-transparent py-2 pl-6 font-[family-name:var(--font-mono)] text-gray-200 transition-colors focus:border-emerald-500/50 focus:outline-none disabled:opacity-50"
            placeholder="enter_username"
            autoComplete="username"
          />
          {focusedField === 'email' && (
            <span className="absolute bottom-2 right-0 animate-pulse text-emerald-500">_</span>
          )}
        </div>
      </div>

      {/* Password Input */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-sm text-gray-400">
          <span className={focusedField === 'password' ? 'text-violet-500' : 'text-gray-600'}>
            {promptSymbol}
          </span>
          <span>password:</span>
        </label>
        <div className="relative">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            disabled={loading}
            className="w-full border-b-2 border-gray-800 bg-transparent py-2 pl-6 font-[family-name:var(--font-mono)] text-gray-200 transition-colors focus:border-violet-500/50 focus:outline-none disabled:opacity-50"
            placeholder="••••••••"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          {focusedField === 'password' && (
            <span className="absolute bottom-2 right-0 animate-pulse text-violet-500">_</span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="font-[family-name:var(--font-mono)] text-sm text-red-400">
          <span className="text-red-500">!</span> {error}
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={loading || !email || !password}
          className="group relative w-full rounded-md border border-gray-700 bg-[#0f0f0f] py-3 font-[family-name:var(--font-mono)] text-sm text-gray-300 transition-all duration-200 hover:border-emerald-500/30 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="mr-2 text-gray-500">$</span>
          {loading ? 'authenticating...' : mode === 'login' ? 'login' : 'register'}
          <span className="ml-1 animate-pulse text-emerald-500">_</span>
        </button>
      </div>

      {/* Help Text */}
      <div className="border-t border-gray-800 pt-4 text-center">
        <p className="font-[family-name:var(--font-mono)] text-xs text-gray-600">
          {mode === 'login' ? 'accepts email or username' : 'create new system access'}
        </p>
      </div>
    </form>
  );
}
