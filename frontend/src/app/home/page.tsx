'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import ContractCard from '@/components/ContractCard';
import Logo from '@/components/Logo';

export default function HomePage() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const contractTypes = [
    {
      title: "BPO Contábil Completo",
      description: "",
      icon: "📊",
      href: "/contratos/bpo-contabil",
      isAvailable: true
    },
    {
      title: "BPO Contábil Completo - Bicolunado",
      description: "",
      icon: "📋",
      href: "/contratos/bpo-contabil-bicolunado",
      isAvailable: true
    },
    {
      title: "Termo de Distrato sem Contrato",
      description: "",
      icon: "📄",
      href: "/contratos/termo-distrato",
      isAvailable: true
    },
    {
      title: "Termo de Distrato",
      description: "",
      icon: "📜",
      href: "/contratos/termo-distrato-completo",
      isAvailable: true
    },
    {
      title: "BPO Financeiro",
      description: "",
      icon: "💰",
      href: "/contratos/bpo-financeiro",
      isAvailable: true
    },
    {
      title: "BPO Folha de Pagamento",
      description: "",
      icon: "💼",
      href: "/contratos/bpo-folha",
      isAvailable: true
    },
    {
      title: "BPO Recursos Humanos",
      description: "",
      icon: "👥",
      href: "/contratos/bpo-rh",
      isAvailable: true
    },
    // Aqui você pode adicionar outros tipos de contratos no futuro
    // {
    //   title: "Consultoria Fiscal",
    //   description: "Contrato para serviços de consultoria e assessoria fiscal especializada.",
    //   icon: "🧾",
    //   href: "/contratos/consultoria-fiscal",
    //   isAvailable: false
    // },
    // {
    //   title: "Auditoria Externa",
    //   description: "Contrato para serviços de auditoria externa e revisão de demonstrações financeiras.",
    //   icon: "🔍",
    //   href: "/contratos/auditoria-externa",
    //   isAvailable: false
    // }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Logo size="sm" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ContratosCS</h1>
                <p className="text-sm text-gray-600">Sistema de Emissão de Contratos</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Olá, <span className="font-medium">{user?.name}</span>
              </span>
              
              {user?.admin && (
                <button
                  onClick={() => router.push('/admin/users')}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                >
                  Admin
                </button>
              )}
              
              <button
                onClick={logout}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Tipos de Contratos
          </h2>
          <p className="text-gray-600">
            Selecione o tipo de contrato que deseja gerar para seus clientes.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contractTypes.map((contract, index) => (
            <div key={index} className="h-full">
              <ContractCard
                title={contract.title}
                description={contract.description}
                icon={contract.icon}
                href={contract.href}
                isAvailable={contract.isAvailable}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}