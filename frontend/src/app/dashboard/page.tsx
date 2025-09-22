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

export default function DashboardPage() {
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
      const result = await companiesAPI.getCount();
      if (result.status === 'success') {
        setCompaniesCount(result.total_companies);
      }
    } catch (error) {
      console.error('Erro ao carregar contagem:', error);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    
    try {
      const result = await sharepointAPI.sync();
      setSyncResult(result);
      // Recarregar contagem após sincronização
      loadCompaniesCount();
    } catch (error: any) {
      setSyncResult({
        status: 'error',
        message: error.response?.data?.message || 'Erro na sincronização',
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
  };  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
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
            <div className="flex items-center">
              <Logo size="md" className="mr-3" />
              <h1 className="text-xl font-bold text-gray-900">ContratosCS</h1>
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
                className="text-gray-400 hover:text-gray-600 transition-colors"
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
          {/* Welcome Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {user?.admin ? 'Dashboard Administrativo' : 'Buscar Empresas'}
            </h2>
            <p className="text-gray-600">
              {user?.admin 
                ? 'Sistema de emissão automatizada de contratos integrado ao SharePoint'
                : 'Encontre informações sobre empresas cadastradas no sistema'
              }
            </p>
            {companiesCount !== null && (
              <div className="mt-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  {companiesCount.toLocaleString()} empresas cadastradas
                </span>
              </div>
            )}
          </div>

          {/* Company Search for Regular Users */}
          {!user?.admin && (
            <div className="space-y-6">
              {/* Busca de Empresas */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
              />
            </div>
          )}

          {/* Admin Section - Only for admins */}
          {user?.admin && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Administração</h3>
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    Apenas Admins
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={() => router.push('/admin/users')}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200 text-left group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Gerenciar Usuários</h4>
                        <p className="text-sm text-gray-500">Criar e gerenciar contas de usuário</p>
                      </div>
                    </div>
                  </button>

                  <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-left opacity-60">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
                        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-500">Relatórios</h4>
                        <p className="text-sm text-gray-400">Em breve...</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-left opacity-60">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
                        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-500">Configurações</h4>
                        <p className="text-sm text-gray-400">Em breve...</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SharePoint Status Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status do SharePoint</h3>
                
                {statusLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : sharePointStatus ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className={`h-3 w-3 rounded-full ${
                        sharePointStatus.status === 'configured' ? 'bg-green-400' :
                        sharePointStatus.status === 'incomplete' ? 'bg-yellow-400' : 'bg-red-400'
                      }`} />
                      <span className="font-medium">
                        {sharePointStatus.status === 'configured' ? 'Configurado' :
                         sharePointStatus.status === 'incomplete' ? 'Configuração Incompleta' : 'Erro'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className={`h-2 w-2 rounded-full ${sharePointStatus.configuration.file_url_configured ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span>URL do Arquivo</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`h-2 w-2 rounded-full ${sharePointStatus.configuration.client_id_configured ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span>Client ID</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`h-2 w-2 rounded-full ${sharePointStatus.configuration.tenant_id_configured ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span>Tenant ID</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-red-600">Erro ao carregar status</p>
                )}
              </div>

              {/* Sync Actions Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sincronização</h3>
                
                <div className="flex items-center space-x-4 mb-4">
                  <button
                    onClick={handleSync}
                    disabled={syncLoading || sharePointStatus?.status !== 'configured'}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    {syncLoading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span>Sincronizando...</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Sincronizar com SharePoint</span>
                      </>
                    )}
                  </button>
                </div>

                {syncResult && (
                  <div className={`p-4 rounded-lg border ${
                    syncResult.status === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className={`flex items-start space-x-2 ${
                      syncResult.status === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      <svg className="h-5 w-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {syncResult.status === 'success' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                      </svg>
                      <div>
                        <p className="font-medium">{syncResult.message}</p>
                        {syncResult.status === 'success' && syncResult.processed_count && (
                          <div className="mt-2 text-sm space-y-1">
                            <p>Empresas processadas: {syncResult.processed_count}</p>
                            {syncResult.companies && (
                              <p>Companies: {syncResult.companies.new} novas, {syncResult.companies.updated} atualizadas</p>
                            )}
                            {syncResult.companies_data && (
                              <p>Companies Data: {syncResult.companies_data.new} novas, {syncResult.companies_data.updated} atualizadas</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* COMPONENTE DE TESTE - REMOVER DEPOIS */}
              <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 mt-4">
                <h3 className="text-lg font-bold text-yellow-800 mb-2">🧪 TESTE DE TABELAS</h3>
                <TableTestComponent />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
