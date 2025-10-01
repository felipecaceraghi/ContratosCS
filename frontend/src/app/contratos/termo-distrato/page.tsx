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
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Logo size="sm" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Termo de Distrato sem Contrato</h1>
                <p className="text-sm text-gray-600">Sistema de Emissão de Contratos</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Olá, <span className="font-medium">{user?.name}</span>
              </span>
              <button
                onClick={() => router.push('/home')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Voltar ao início
              </button>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Companies Count Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">🏢</div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Empresas Cadastradas</div>
                <div className="text-2xl font-bold text-gray-900">
                  {companiesCount !== null ? companiesCount.toLocaleString() : '...'}
                </div>
              </div>
            </div>
          </div>

          {/* Contract Type Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">📄</div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Tipo de Contrato</div>
                <div className="text-lg font-bold text-gray-900">Termo de Distrato</div>
              </div>
            </div>
          </div>

          {/* SharePoint Status Card - Only for admins */}
          {user?.admin && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">☁️</div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-500">SharePoint</div>
                    <div className="text-lg font-bold text-gray-900">
                      {statusLoading ? '...' : sharePointStatus?.status === 'configured' ? 'Conectado' : 'Desconectado'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSync}
                  disabled={syncLoading}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {syncLoading ? 'Sincronizando...' : 'Sincronizar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sync Result Alert */}
        {syncResult && (
          <div className={`mb-6 p-4 rounded-md ${syncResult.status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="text-xl">{syncResult.status === 'success' ? '✅' : '❌'}</div>
              </div>
              <div className="ml-3">
                <div className={`text-sm font-medium ${syncResult.status === 'success' ? 'text-green-800' : 'text-red-800'}`}>
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
              <div className="ml-auto">
                <button
                  onClick={() => setSyncResult(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contract Generation Section */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Gerar Termo de Distrato</h2>
            <p className="text-sm text-gray-600 mt-1">
              Busque e selecione as empresas para gerar os termos de distrato automaticamente.
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Company Search */}
              <div>
                <GroupCompanySearch 
                  onCompaniesSelect={setSelectedCompanies}
                  selectedCompanies={selectedCompanies}
                />
              </div>

              {/* Contract Generator */}
              <div>
                <ContractGenerator 
                  selectedCompanies={selectedCompanies}
                  contractType="termo_distrato_sem_contrato"
                  onClearSelection={() => setSelectedCompanies([])}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table Test Component - Only for admins */}
        {user?.admin && (
          <div className="mt-8">
            <TableTestComponent />
          </div>
        )}
      </div>
    </div>
  );
}