import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, AuthResponse, RegisterData } from '../services/api';

interface User {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (userData: RegisterData) => Promise<AuthResponse>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps): React.ReactElement => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser && typeof currentUser === 'object') {
      setUser({
        userId: (currentUser.userId as string) || '',
        email: (currentUser.email as string) || '',
        firstName: currentUser.firstName as string,
        lastName: currentUser.lastName as string,
        role: currentUser.role as string,
      });
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const data = await authService.login(email, password);
    setUser({
      userId: String(data.userId ?? ''),
      email: String(data.email ?? ''),
      firstName: data.firstName as string | undefined,
      lastName: data.lastName as string | undefined,
      role: data.role as string | undefined,
    });
    return data;
  };

  const register = async (userData: RegisterData): Promise<AuthResponse> => {
    const data = await authService.register(userData);
    return data;
  };

  const logout = (): void => {
    authService.logout();
    setUser(null);
  };

  const value: AuthContextValue = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
