export interface User {
  name: string;
  email: string;
  admin: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface Company {
  cod: string;
  name: string;
  group_name: string;
  cnpj?: string;
}

export interface CompanyDetails extends Company {
  details?: Record<string, unknown>;
}

export interface CompanySearchResult {
  status: 'success' | 'error';
  companies: Company[];
  total: number;
  message?: string;
}

export interface SharePointStatus {
  status: 'configured' | 'incomplete' | 'error';
  configuration: {
    file_url_configured: boolean;
    client_id_configured: boolean;
    tenant_id_configured: boolean;
  };
  file_url?: string;
}

export interface SyncResult {
  status: 'success' | 'error';
  message: string;
  processed_count?: number;
  companies?: {
    new: number;
    updated: number;
  };
  companies_data?: {
    new: number;
    updated: number;
  };
  timestamp?: string;
}
