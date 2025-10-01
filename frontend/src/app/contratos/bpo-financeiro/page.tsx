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

export default function BpoFinanceiroPage() {
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
      const response = await companiesAPI.getCount();
      setCompaniesCount(response.count);
    } catch (error) {
      console.error('Erro ao carregar contagem de empresas:', error);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    
    try {
      const result = await sharepointAPI.sync();
      setSyncResult(result);
      
      // Recarregar status após sync
      if (user?.admin) {
        await loadSharePointStatus();
      }
      await loadCompaniesCount();
    } catch (error) {
      console.error('Erro durante sincronização:', error);
      setSyncResult({
        status: 'error',
        message: 'Erro durante sincronização'
      });
    } finally {
      setSyncLoading(false);
    }
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
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Logo className="h-8 w-auto" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">BPO Financeiro</h1>
                <p className="text-sm text-gray-600">Gerar contratos de BPO Financeiro</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Olá, {user?.name}
              </span>
              <button
                onClick={logout}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Navegação de volta */}
          <div>
            <button
              onClick={() => router.push('/home')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Voltar para início</span>
            </button>
          </div>

          {/* Status da Base de Dados */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Base de Dados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className={`w-3 h-3 rounded-full ${companiesCount !== null && companiesCount > 0 ? 'bg-green-400' : 'bg-red-400'}`}></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Empresas cadastradas</p>
                  <p className="text-sm text-gray-500">
                    {companiesCount !== null ? `${companiesCount} empresas` : 'Carregando...'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Contract Generation */}
          {(companiesCount !== null && companiesCount > 0) && (
            <div className="space-y-6">
              {/* Company Search */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Buscar Empresas</h2>
                <GroupCompanySearch
                  onCompaniesSelect={setSelectedCompanies}
                  selectedCompanies={selectedCompanies}
                />
              </div>

              {/* Gerador de Contratos */}
              <ContractGenerator 
                selectedCompanies={selectedCompanies}
                onClearSelection={() => setSelectedCompanies([])}
                contractType="bpo_financeiro"
              />
            </div>
          )}

          {/* Admin Section - Only for admins */}
          {user?.admin && (
            <>
              {/* Admin Tools */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Ferramentas Administrativas</h2>
                
                {/* SharePoint Status */}
                <div className="mb-6">
                  <h3 className="text-md font-medium text-gray-900 mb-3">Status do SharePoint</h3>
                  {statusLoading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span className="text-sm text-gray-600">Carregando status...</span>
                    </div>
                  ) : sharePointStatus ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Status</p>
                          <p className="text-sm text-gray-500">Conectado</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Erro ao carregar status</p>
                  )}
                </div>

                {/* Sync Button */}
                <div className="space-y-4">
                  <button
                    onClick={handleSync}
                    disabled={syncLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncLoading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Sincronizar com SharePoint
                      </>
                    )}
                  </button>

                  {/* Sync Result */}
                  {syncResult && (
                    <div className="p-4 rounded-md bg-blue-50">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">
                            {syncResult.message}
                          </h3>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Debug Component */}
                <div className="mt-8">
                  <h3 className="text-md font-medium text-gray-900 mb-3">Teste de Componentes</h3>
                  <TableTestComponent />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}