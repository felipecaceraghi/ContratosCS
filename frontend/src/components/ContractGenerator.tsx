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
  contractType?: string;
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

interface GroupProgress {
  groupName: string;
  steps: GenerationStep[];
  isComplete: boolean;
  hasErrors: boolean;
}

const ContractGenerator: React.FC<ContractGeneratorProps> = ({ 
  selectedCompanies, 
  onClearSelection,
  contractType = "bpo_contabil_completo" // default para backward compatibility
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [groupsProgress, setGroupsProgress] = useState<GroupProgress[]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [viewerState, setViewerState] = useState<{
    filename: string;
    companyName: string;
    stepIndex: number;
    groupIndex: number;
  } | null>(null);

  const handleGenerateContracts = async () => {
    if (selectedCompanies.length === 0) return;

    // Obter lista de grupos únicos selecionados
    const selectedGroups = Array.from(new Set(selectedCompanies.map(company => company.group_name).filter(Boolean))) as string[];
    
    if (selectedGroups.length === 0) return;

    // Inicializar progresso dos grupos
    const initialGroupsProgress: GroupProgress[] = selectedGroups.map(groupName => ({
      groupName,
      steps: [],
      isComplete: false,
      hasErrors: false
    }));

    setGroupsProgress(initialGroupsProgress);
    setCurrentGroupIndex(0);
    setShowModal(true);
    setIsProcessing(true);

    // Começar geração do primeiro grupo
    await generateGroup(0, initialGroupsProgress);
  };

  const generateGroup = async (groupIndex: number, currentProgress: GroupProgress[]) => {
    if (groupIndex >= currentProgress.length) {
      setIsProcessing(false);
      return;
    }

    const group = currentProgress[groupIndex];
    
    try {
      // Buscar empresas do grupo
      const groupResponse = await contractsAPI.generateByGroup(group.groupName);
      
      if (groupResponse.success && groupResponse.type === 'group') {
        // Inicializar steps para este grupo
        const initialSteps: GenerationStep[] = groupResponse.companies.map((company: any) => ({
          company: {
            cod: company.cod,
            name: company.name || company.cod,
            cnpj: company.cnpj
          },
          status: 'pending'
        }));

        // Atualizar progresso do grupo
        const updatedProgress = [...currentProgress];
        updatedProgress[groupIndex] = {
          ...group,
          steps: initialSteps
        };
        setGroupsProgress(updatedProgress);

        // Gerar contratos para todas as empresas deste grupo
        await generateGroupContracts(groupIndex, updatedProgress, 0);
      } else {
        console.error(`Erro ao buscar empresas do grupo ${group.groupName}:`, groupResponse.error);
        // Marcar grupo como erro
        const updatedProgress = [...currentProgress];
        updatedProgress[groupIndex] = {
          ...group,
          isComplete: true,
          hasErrors: true
        };
        setGroupsProgress(updatedProgress);
      }
    } catch (error) {
      console.error('Erro ao buscar grupo:', error);
      // Marcar grupo como erro
      const updatedProgress = [...currentProgress];
      updatedProgress[groupIndex] = {
        ...group,
        isComplete: true,
        hasErrors: true
      };
      setGroupsProgress(updatedProgress);
    }
  };

  const generateGroupContracts = async (groupIndex: number, currentProgress: GroupProgress[], stepIndex: number) => {
    const group = currentProgress[groupIndex];
    
    if (stepIndex >= group.steps.length) {
      // Grupo completo
      const updatedProgress = [...currentProgress];
      updatedProgress[groupIndex] = {
        ...group,
        isComplete: true,
        hasErrors: group.steps.some(s => s.status === 'error')
      };
      setGroupsProgress(updatedProgress);
      setIsProcessing(false);
      return;
    }

    const step = group.steps[stepIndex];
    
    // Atualizar status para "generating"
    const updatedProgress = [...currentProgress];
    updatedProgress[groupIndex].steps[stepIndex] = { ...step, status: 'generating' };
    setGroupsProgress(updatedProgress);

    try {
      // Gerar contrato para empresa individual
      const response = await contractsAPI.generateIndividual(step.company.cod, contractType);
      
      if (response.success) {
        // Contrato gerado
        updatedProgress[groupIndex].steps[stepIndex] = { 
          ...step, 
          status: 'generated',
          filename: response.contract_file
        };
        setGroupsProgress(updatedProgress);
      } else {
        // Erro na geração
        updatedProgress[groupIndex].steps[stepIndex] = { 
          ...step, 
          status: 'error',
          error: response.error
        };
        setGroupsProgress(updatedProgress);
      }
    } catch (error: any) {
      // Erro na comunicação
      updatedProgress[groupIndex].steps[stepIndex] = { 
        ...step, 
        status: 'error',
        error: error.response?.data?.error || 'Erro na comunicação'
      };
      setGroupsProgress(updatedProgress);
    }

    // Continuar para próxima empresa
    setTimeout(() => {
      generateGroupContracts(groupIndex, updatedProgress, stepIndex + 1);
    }, 500);
  };

  const handleNextGroup = () => {
    if (currentGroupIndex < groupsProgress.length - 1) {
      const nextIndex = currentGroupIndex + 1;
      setCurrentGroupIndex(nextIndex);
      
      // Se o próximo grupo ainda não foi processado, processar
      if (!groupsProgress[nextIndex].isComplete && groupsProgress[nextIndex].steps.length === 0) {
        setIsProcessing(true);
        generateGroup(nextIndex, groupsProgress);
      }
    }
  };

  const handlePreviousGroup = () => {
    if (currentGroupIndex > 0) {
      setCurrentGroupIndex(currentGroupIndex - 1);
    }
  };

  const handleEditContract = (stepIndex: number) => {
    const currentGroup = groupsProgress[currentGroupIndex];
    const step = currentGroup.steps[stepIndex];
    if (step.filename) {
      setViewerState({
        filename: step.filename,
        companyName: step.company.name,
        stepIndex: stepIndex,
        groupIndex: currentGroupIndex
      });
    }
  };

  const handleContractSaved = () => {
    if (viewerState) {
      // Marcar step como completado
      const updatedProgress = [...groupsProgress];
      updatedProgress[viewerState.groupIndex].steps[viewerState.stepIndex] = { 
        ...updatedProgress[viewerState.groupIndex].steps[viewerState.stepIndex], 
        status: 'completed' 
      };
      setGroupsProgress(updatedProgress);
      
      // Fechar viewer
      setViewerState(null);
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

  const currentGroup = groupsProgress[currentGroupIndex];
  const completedSteps = currentGroup?.steps.filter(s => s.status === 'completed').length || 0;
  const generatedSteps = currentGroup?.steps.filter(s => s.status === 'generated' || s.status === 'completed').length || 0;
  const totalSteps = currentGroup?.steps.length || 0;
  const hasErrors = currentGroup?.steps.some(s => s.status === 'error') || false;

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Gerar Contratos
          </h3>
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
            <div>
              <button
                onClick={handleGenerateContracts}
                disabled={isProcessing}
                className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                  isProcessing
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-400 text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 shadow-sm hover:shadow-md'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                    Gerando contratos...
                  </div>
                ) : (
                  'Gerar Contratos'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Progresso */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Cabeçalho do Modal */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Geração de Contratos - {currentGroup?.groupName || 'Carregando...'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Navegação entre grupos */}
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={handlePreviousGroup}
                  disabled={currentGroupIndex === 0}
                  className={`px-4 py-2 text-sm rounded-lg ${
                    currentGroupIndex === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  ← Grupo Anterior
                </button>

                <span className="text-sm text-gray-600">
                  Grupo {currentGroupIndex + 1} de {groupsProgress.length}
                </span>

                <button
                  onClick={handleNextGroup}
                  disabled={currentGroupIndex === groupsProgress.length - 1}
                  className={`px-4 py-2 text-sm rounded-lg ${
                    currentGroupIndex === groupsProgress.length - 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  Próximo Grupo →
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6">
              {currentGroup && (
                <div className="space-y-4">
                  {/* Progresso geral do grupo */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-black">
                        Progresso: {generatedSteps}/{totalSteps} contratos gerados
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
                        style={{ width: `${totalSteps > 0 ? (generatedSteps / totalSteps) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Lista de empresas */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {/* Loading durante geração */}
                    {isProcessing && currentGroup.steps.length === 0 && (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                          <p className="text-gray-600 font-medium">Carregando empresas do grupo...</p>
                          <p className="text-gray-500 text-sm mt-1">Aguarde enquanto buscamos os dados</p>
                        </div>
                      </div>
                    )}
                    
                    {currentGroup.steps.map((step, index) => (
                      <div 
                        key={index} 
                        className={`group relative overflow-hidden rounded-xl border transition-all duration-200 hover:shadow-md ${
                          step.status === 'error' 
                            ? 'border-red-200 bg-gradient-to-r from-red-50 to-red-100' 
                            : step.status === 'completed'
                            ? 'border-green-200 bg-gradient-to-r from-green-50 to-green-100'
                            : step.status === 'generating'
                            ? 'border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 animate-pulse'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center space-x-4">
                            {/* Status Icon com animação */}
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                              step.status === 'generating' ? 'bg-blue-100' : 
                              step.status === 'error' ? 'bg-red-100' :
                              step.status === 'completed' ? 'bg-green-100' :
                              'bg-gray-100'
                            }`}>
                              {step.status === 'generating' ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                              ) : (
                                <span className="text-lg">{getStatusIcon(step.status)}</span>
                              )}
                            </div>
                            
                            {/* Company Info */}
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                                {step.company.name}
                              </div>
                              <div className="text-xs text-gray-500 font-medium">
                                Código: {step.company.cod}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            {/* Status Badge */}
                            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              step.status === 'pending' ? 'bg-gray-100 text-gray-700' :
                              step.status === 'generating' ? 'bg-blue-100 text-blue-700' :
                              step.status === 'generated' ? 'bg-yellow-100 text-yellow-700' :
                              step.status === 'completed' ? 'bg-green-100 text-green-700' :
                              step.status === 'error' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {getStatusText(step.status)}
                            </div>
                            
                            {/* Action Button */}
                            {step.status === 'generated' && (
                              <button
                                onClick={() => handleEditContract(index)}
                                className="mt-2 inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 transition-all duration-200"
                              >
                                <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Editar
                              </button>
                            )}
                            
                            {/* Error Message */}
                            {step.status === 'error' && step.error && (
                              <div className="mt-2 max-w-xs">
                                <div className="text-xs text-red-600 bg-red-50 rounded-md px-2 py-1 border border-red-200">
                                  {step.error}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Progress line for generating status */}
                        {step.status === 'generating' && (
                          <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-200">
                            <div className="h-full bg-blue-600 animate-pulse"></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Status de conclusão */}
                  {currentGroup.isComplete && !isProcessing && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                      <div className="flex items-center">
                        <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mr-4">
                          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-green-900 mb-1">
                            Grupo Concluído! 🎉
                          </h4>
                          <p className="text-sm text-green-700">
                            {generatedSteps} contratos gerados com sucesso
                            {completedSteps > 0 && (
                              <span className="text-blue-600">
                                {' • '}{completedSteps} já editados/baixados
                              </span>
                            )}
                            {hasErrors && (
                              <span className="text-red-600">
                                {' • '}{currentGroup.steps.filter(s => s.status === 'error').length} com erro
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Viewer de Contrato */}
      {viewerState && (
        <ContractViewer
          filename={viewerState.filename}
          companyName={viewerState.companyName}
          onSave={handleContractSaved}
          onClose={() => setViewerState(null)}
        />
      )}
    </>
  );
};

export default ContractGenerator;