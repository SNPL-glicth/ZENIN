const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface BackendLoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthResponse {
  token: string;
  username: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * AuthService - Handles authentication API calls.
 *
 * Delegates ALL authentication logic to the backend.
 * Frontend only sends credentials and handles the response.
 */
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Authentication failed');
    }

    const data: BackendLoginResponse = await response.json();
    localStorage.setItem('token', data.accessToken);
    localStorage.setItem('username', data.email);
    return { token: data.accessToken, username: data.email };
  },

  async register(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Registration failed');
    }

    // Auto-login after successful registration
    await response.json();
    return this.login(credentials);
  },

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
