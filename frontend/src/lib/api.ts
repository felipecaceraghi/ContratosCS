import axios, { AxiosResponse } from 'axios';

// Configuração base da API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5004';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token JWT nas requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para lidar com respostas de erro
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Tipos para autenticação
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  access_token: string;
  user: {
    name: string;
    email: string;
    admin: boolean;
  };
}

export interface ApiError {
  error: string;
}

// Funções de autenticação
export const authAPI = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response: AxiosResponse<LoginResponse> = await api.post('/login', credentials);
    return response.data;
  },

  getUserByEmail: async (email: string) => {
    const response = await api.get(`/users/${email}`);
    return response.data;
  },
};

// Funções do SharePoint
export const sharepointAPI = {
  sync: async () => {
    const response = await api.get('/sharepoint/sync');
    return response.data;
  },

  status: async () => {
    const response = await api.get('/sharepoint/status');
    return response.data;
  },

  init: async () => {
    const response = await api.get('/sharepoint/init');
    return response.data;
  },
};

// Funções das Empresas
export const companiesAPI = {
  search: async (query: string) => {
    const response = await api.get(`/companies/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  getCompaniesByGroup: async (groupName: string) => {
    const response = await api.get(`/companies/group/${encodeURIComponent(groupName)}/companies`);
    return response.data;
  },

  getDetails: async (cod: string) => {
    const response = await api.get(`/companies/${cod}`);
    return response.data;
  },

  getCount: async () => {
    const response = await api.get('/companies/count');
    return response.data;
  },

  generateContract: async (cod_emp: string) => {
    const response = await api.get(`/companies/generate?cod_emp=${encodeURIComponent(cod_emp)}`);
    return response.data;
  },
};

// Funções de Contratos
export const contractsAPI = {
  generate: async (cnpj: string) => {
    const response = await api.post('/api/contracts/generate', { cnpj });
    return response.data;
  },

  generateByGroup: async (groupName: string) => {
    const response = await api.post('/api/contracts/generate', { group_name: groupName });
    return response.data;
  },

  generateIndividual: async (cod: string) => {
    const response = await api.post('/api/contracts/generate-individual', { cod });
    return response.data;
  },

  generateAndDownloadIndividual: async (cod: string, format: 'docx' | 'pdf') => {
    const response = await api.post('/api/contracts/generate-individual', 
      { cod, format },
      { responseType: 'blob' }
    );
    return response;
  },

  preview: async (cnpj: string) => {
    const response = await api.post('/api/contracts/preview', { cnpj });
    return response.data;
  },

  download: async (filename: string) => {
    const response = await api.get(`/api/contracts/download/${filename}`, {
      responseType: 'blob'
    });
    return response;
  },

  getContent: async (filename: string) => {
    const response = await api.get(`/api/contracts/content/${filename}`);
    return response.data;
  },

  saveEdits: async (filename: string, content: string) => {
    const response = await api.post(`/api/contracts/save-edits/${filename}`, { content });
    return response.data;
  },

  getTemplateInfo: async () => {
    const response = await api.get('/api/contracts/template/info');
    return response.data;
  },

  applyEdits: async (filename: string, fields: { razao_social: string; cnpj: string; endereco: string }) => {
    // Envia os campos editados para o backend
    const response = await api.post(`/api/contracts/apply-edits/${filename}`, fields);
    return response.data;
  },
};

export default api;
