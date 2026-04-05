// Tipos para AuthContext

import { ReactNode } from 'react';

export interface User {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

export interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
  [key: string]: unknown;
}

export interface AuthProviderProps {
  children: ReactNode;
}

export interface AuthResponse {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  accessToken: string;
  refreshToken: string;
}
