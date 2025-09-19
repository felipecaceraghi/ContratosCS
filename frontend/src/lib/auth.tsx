'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '@/types';
import { authAPI, LoginRequest } from '@/lib/api';

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Verificar se existe token salvo ao carregar a página
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        // Limpar dados corrompidos
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authAPI.login(credentials);
      
      // Salvar no localStorage
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Atualizar estado
      setAuthState({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: unknown) {
      // Extraindo a mensagem de erro de forma segura
      let errorMessage = 'Erro ao fazer login';
      if (error && typeof error === 'object' && 'response' in error) {
        const responseError = error.response as {data?: {error?: string}};
        if (responseError?.data?.error) {
          errorMessage = responseError.data.error;
        }
      }
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    // Limpar localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    
    // Limpar estado
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
