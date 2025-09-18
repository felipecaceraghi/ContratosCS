'use client';

import React, { useState } from 'react';
import { contractsAPI } from '@/lib/api';
import dynamic from 'next/dynamic';

const ContractViewer = dynamic(() => import('./ContractViewer'), {
  ssr: false
});

interface ContractGeneratorProps {
  selectedCompanies: Array<{
    cod: string;
    name: string;
    cnpj?: string;
    group_name?: string;
  }>;
  onClearSelection?: () => void;
}

interface GenerationStep {
  company: {
    cod: string;
    name: string;
    cnpj?: string;
  };
  status: 'pending' | 'generating' | 'generated' | 'editing' | 'completed' | 'error';
  filename?: string;
  error?: string;
}

const ContractGenerator: React.FC<ContractGeneratorProps> = ({ 
  selectedCompanies, 
  onClearSelection 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [steps, setSteps] = useState<GenerationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [viewerState, setViewerState] = useState<{
    filename: string;
    companyName: string;
    stepIndex: number;
  } | null>(null);

  const handleGenerateContracts = async () => {
    if (selectedCompanies.length === 0) return;

    setIsProcessing(true);
    
    // Se há apenas uma empresa e um grupo, usar o nome do grupo para buscar todas as empresas
    if (selectedCompanies.length > 0 && selectedCompanies[0].group_name) {
      const groupName = selectedCompanies[0].group_name;
      
      try {
        // Buscar todas as empresas do grupo
        const groupResponse = await contractsAPI.generateByGroup(groupName);
        
        if (groupResponse.success && groupResponse.type === 'group') {
          // Inicializar steps com todas as empresas do grupo
          const initialSteps: GenerationStep[] = groupResponse.companies.map((company: any) => ({
            company: {
              cod: company.cod,
              name: company.name || company.cod,
              cnpj: company.cnpj
            },
            status: 'pending'
          }));
          
          setSteps(initialSteps);
          setCurrentStepIndex(0);
          
          // Iniciar geração da primeira empresa
          await generateNextContract(initialSteps, 0);
        } else {
          console.error('Erro ao buscar empresas do grupo:', groupResponse.error);
        }
      } catch (error) {
        console.error('Erro ao buscar grupo:', error);
      }
    } else {
      // Comportamento original para empresas individuais
      const initialSteps: GenerationStep[] = selectedCompanies.map(company => ({
        company: {
          cod: company.cod,
          name: company.name,
          cnpj: company.cnpj
        },
        status: 'pending'
      }));
      
      setSteps(initialSteps);
      setCurrentStepIndex(0);
      
      await generateNextContract(initialSteps, 0);
    }
  };

  const generateNextContract = async (currentSteps: GenerationStep[], stepIndex: number) => {
    if (stepIndex >= currentSteps.length) {
      setIsProcessing(false);
      return;
    }

    const step = currentSteps[stepIndex];
    
    // Atualizar status para "generating"
    const updatedSteps = [...currentSteps];
    updatedSteps[stepIndex] = { ...step, status: 'generating' };
    setSteps(updatedSteps);

    try {
      // Gerar contrato para empresa individual
      const response = await contractsAPI.generateIndividual(step.company.cod);
      
      if (response.success) {
        // Contrato gerado - disponível para edição
        updatedSteps[stepIndex] = { 
          ...step, 
          status: 'generated',
          filename: response.contract_file
        };
        setSteps(updatedSteps);
        
        // Continuar para próxima empresa automaticamente
        setTimeout(() => {
          setCurrentStepIndex(stepIndex + 1);
          generateNextContract(updatedSteps, stepIndex + 1);
        }, 500);
      } else {
        // Erro na geração
        updatedSteps[stepIndex] = { 
          ...step, 
          status: 'error',
          error: response.error
        };
        setSteps(updatedSteps);
        
        // Continuar para próxima empresa automaticamente
        setTimeout(() => {
          setCurrentStepIndex(stepIndex + 1);
          generateNextContract(updatedSteps, stepIndex + 1);
        }, 1000);
      }
    } catch (error: any) {
      // Erro na comunicação
      updatedSteps[stepIndex] = { 
        ...step, 
        status: 'error',
        error: error.response?.data?.error || 'Erro na comunicação'
      };
      setSteps(updatedSteps);
      
      // Continuar para próxima empresa
      setTimeout(() => {
        setCurrentStepIndex(stepIndex + 1);
        generateNextContract(updatedSteps, stepIndex + 1);
      }, 1000);
    }
  };

  const handleContractSaved = () => {
    if (viewerState) {
      // Marcar step como completado
      const updatedSteps = [...steps];
      updatedSteps[viewerState.stepIndex] = { 
        ...updatedSteps[viewerState.stepIndex], 
        status: 'completed' 
      };
      setSteps(updatedSteps);
      
      // Fechar viewer
      setViewerState(null);
    }
  };

  const handleEditContract = (stepIndex: number) => {
    const step = steps[stepIndex];
    if (step.filename) {
      setViewerState({
        filename: step.filename,
        companyName: step.company.name,
        stepIndex: stepIndex
      });
    }
  };

  const getStatusIcon = (status: GenerationStep['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'generating': return '🔄';
      case 'generated': return '📝';
      case 'editing': return '✏️';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  const getStatusText = (status: GenerationStep['status']) => {
    switch (status) {
      case 'pending': return 'Aguardando';
      case 'generating': return 'Gerando...';
      case 'generated': return 'Pronto';
      case 'editing': return 'Editando';
      case 'completed': return 'Concluído';
      case 'error': return 'Erro';
      default: return 'Aguardando';
    }
  };

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const hasErrors = steps.some(s => s.status === 'error');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Gerar Contratos
        </h3>
        {selectedCompanies.length > 0 && onClearSelection && (
          <button
            onClick={onClearSelection}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Limpar seleção
          </button>
        )}
      </div>

      {selectedCompanies.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">📄</div>
          <p className="text-gray-500">
            Selecione um grupo acima para gerar contratos
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Botão de gerar ou progresso */}
          {steps.length === 0 ? (
            <div>
              <button
                onClick={handleGenerateContracts}
                disabled={isProcessing}
                className={`w-full py-2 px-4 rounded-lg font-medium ${
                  isProcessing
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Iniciando geração...
                  </div>
                ) : (
                  'Gerar contratos'
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Progresso geral */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium" style={{ color: '#000000' }}>
                    Progresso: {completedSteps}/{steps.length} contratos
                  </span>
                  {hasErrors && (
                    <span className="text-xs text-red-600">
                      Alguns contratos falharam
                    </span>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(completedSteps / steps.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Lista de steps */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded border ${
                      index === currentStepIndex 
                        ? 'border-blue-300 bg-blue-50' 
                        : step.status === 'completed'
                        ? 'border-green-300 bg-green-50'
                        : step.status === 'error'
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-lg mr-3">{getStatusIcon(step.status)}</span>
                      <div>
                        <div className="text-sm font-medium" style={{ color: '#000000' }}>
                          {step.company.name}
                        </div>
                        <div className="text-xs" style={{ color: '#000000', opacity: 0.7 }}>
                          {step.company.cod}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs" style={{ color: '#000000' }}>
                        {getStatusText(step.status)}
                      </div>
                      {step.error && (
                        <div className="text-xs text-red-600 mt-1">
                          {step.error}
                        </div>
                      )}
                      {(step.status === 'generated' || step.status === 'completed') && step.filename && (
                        <button
                          onClick={() => handleEditContract(index)}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 mt-1"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Ações finais */}
              {completedSteps === steps.length && !isProcessing && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-green-800 font-medium">
                    ✅ Todos os contratos foram processados!
                  </div>
                  <div className="text-green-600 text-sm mt-1">
                    {completedSteps} contratos concluídos{hasErrors && `, ${steps.filter(s => s.status === 'error').length} com erro`}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Contract Viewer Modal */}
      {viewerState && (
        <ContractViewer
          filename={viewerState.filename}
          companyName={viewerState.companyName}
          onClose={() => setViewerState(null)}
          onSave={handleContractSaved}
        />
      )}
    </div>
  );
};

export default ContractGenerator;
