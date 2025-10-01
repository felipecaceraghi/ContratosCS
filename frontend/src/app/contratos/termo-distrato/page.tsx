'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import GroupCompanySearch from '@/components/GroupCompanySearch';
import ContractGenerator from '@/components/ContractGenerator';
import TableTestComponent from '@/components/TableTestComponent';
import { sharepointAPI, companiesAPI } from '@/lib/api';
import { SharePointStatus, SyncResult, Company } from '@/types';
import Logo from '@/components/Logo';

export default function TermoDistratoPage() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [sharePointStatus, setSharePointStatus] = useState<SharePointStatus | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [companiesCount, setCompaniesCount] = useState<number | null>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<Company[]>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.admin) {
        loadSharePointStatus();
      }
      loadCompaniesCount();
    }
  }, [isAuthenticated, user]);

  const loadSharePointStatus = async () => {
    try {
      const status = await sharepointAPI.status();
      setSharePointStatus(status);
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const loadCompaniesCount = async () => {
    try {
      const count = await companiesAPI.getCount();
      setCompaniesCount(count);
    } catch (error) {
      console.error('Erro ao carregar contagem de empresas:', error);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      const result = await sharepointAPI.sync();
      setSyncResult(result);
      
      // Recarregar status e contagem após sync
      if (user?.admin) {
        await loadSharePointStatus();
      }
      await loadCompaniesCount();
    } catch (error) {
      console.error('Erro durante sincronização:', error);
      setSyncResult({
        status: 'error',
        message: 'Erro durante a sincronização',
        processed_count: 0,
        companies: {
          new: 0,
          updated: 0
        }
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleCompaniesSelect = (companies: Company[]) => {
    setSelectedCompanies(companies);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/home')}
                className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar
              </button>
              <div className="flex items-center">
                <Logo size="md" className="mr-3" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Termo de Distrato sem Contrato</h1>
                  <p className="text-sm text-gray-600">Geração de termos de distrato para empresas</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Bem-vindo, <span className="font-semibold">{user?.name}</span>
                {user?.admin && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Admin
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200"
                title="Sair"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Contract Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">📄</div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900">
                  Termo de Distrato sem Contrato
                </h3>
                <p className="text-blue-800">
                  Gere termos de distrato para empresas que necessitam rescindir contratos 
                  sem a necessidade de um contrato original existente.
                </p>
              </div>
            </div>
          </div>

          {/* Company Search for Regular Users */}
          {!user?.admin && (
            <div className="space-y-6">
              {/* Busca de Empresas */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Buscar Empresas por Grupo</h3>
                <GroupCompanySearch 
                  onCompaniesSelect={handleCompaniesSelect}
                  placeholder="Digite o nome do grupo (mín. 3 caracteres)"
                  selectedCompanies={selectedCompanies}
                />
              </div>

              {/* Gerador de Contratos */}
              <ContractGenerator 
                selectedCompanies={selectedCompanies}
                onClearSelection={() => setSelectedCompanies([])}
                contractType="termo_distrato_sem_contrato"
              />
            </div>
          )}

          {/* Admin Section - Only for admins */}
          {user?.admin && (
            <>
              {/* Admin Tools */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Ferramentas Administrativas</h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                    ✨ Apenas Admins
                  </span>
                </div>
                
                {/* SharePoint Statistics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">{companiesCount !== null ? companiesCount.toLocaleString() : '...'}</div>
                    <div className="text-sm text-blue-800">Empresas Cadastradas</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {sharePointStatus?.status === 'configured' ? 'Conectado' : 'Desconectado'}
                    </div>
                    <div className="text-sm text-green-800">Status SharePoint</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-600">📄</div>
                    <div className="text-sm text-purple-800">Termo de Distrato</div>
                  </div>
                </div>

                {/* SharePoint Sync Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 rounded-full p-2">
                        <div className="text-xl">☁️</div>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-blue-900">Sincronização SharePoint</h4>
                        <p className="text-blue-700 text-sm">
                          Importe empresas do SharePoint para o sistema
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleSync}
                      disabled={syncLoading}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {syncLoading && (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      <span>{syncLoading ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                    </button>
                  </div>
                </div>

                {/* Sync Result Alert */}
                {syncResult && (
                  <div className={`mb-6 p-4 rounded-lg border ${syncResult.status === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex">
                        <div className="text-xl mr-3">{syncResult.status === 'success' ? '✅' : '❌'}</div>
                        <div>
                          <div className={`font-medium ${syncResult.status === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                            {syncResult.message}
                          </div>
                          {syncResult.status === 'success' && (
                            <div className="text-sm text-green-700 mt-1">
                              Processadas: {syncResult.processed_count || 0} |
                              Novas: {syncResult.companies?.new || 0} |
                              Atualizadas: {syncResult.companies?.updated || 0}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setSyncResult(null)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* Admin Contract Generation */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Geração de Termos de Distrato</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <GroupCompanySearch 
                        onCompaniesSelect={setSelectedCompanies}
                        selectedCompanies={selectedCompanies}
                        placeholder="Digite o nome do grupo para buscar empresas..."
                      />
                    </div>
                    <div>
                      <ContractGenerator 
                        selectedCompanies={selectedCompanies}
                        contractType="termo_distrato_sem_contrato"
                        onClearSelection={() => setSelectedCompanies([])}
                      />
                    </div>
                  </div>
                </div>

                {/* Table Test Component */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Teste de Tabelas</h4>
                  <TableTestComponent />
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}