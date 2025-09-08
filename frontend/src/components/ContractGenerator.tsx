'use client';

import React, { useState } from 'react';
import { contractsAPI } from '@/lib/api';
import ContractViewer from './ContractViewer';

interface ContractGeneratorProps {
  selectedCompanies: Array<{
    cod: string;
    name: string;
    cnpj?: string;
  }>;
  onClearSelection?: () => void;
}

interface ContractData {
  razao_social: string;
  cnpj: string;
  endereco: string;
}

interface ViewerState {
  isOpen: boolean;
  filename: string;
  companyName: string;
}

const ContractGenerator: React.FC<ContractGeneratorProps> = ({ 
  selectedCompanies, 
  onClearSelection 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResults, setGenerationResults] = useState<Array<{
    company: string;
    success: boolean;
    message: string;
    downloadUrl?: string;
    filename?: string;
  }>>([]);
  const [viewer, setViewer] = useState<ViewerState>({
    isOpen: false,
    filename: '',
    companyName: ''
  });

  const handleGenerateContracts = async () => {
    if (selectedCompanies.length === 0) {
      return;
    }

    setIsGenerating(true);
    setGenerationResults([]);
    
    const results = [];

    for (const company of selectedCompanies) {
      try {
        // Usar CNPJ se disponível, senão usar código
        const identifier = company.cnpj || company.cod;
        
        console.log(`Gerando contrato para: ${company.name} (${identifier})`);
        
        const response = await contractsAPI.generate(identifier);
        
        if (response.success) {
          results.push({
            company: company.name,
            success: true,
            message: 'Contrato gerado com sucesso',
            downloadUrl: response.download_url,
            filename: response.contract_file
          });
        } else {
          results.push({
            company: company.name,
            success: false,
            message: response.error || 'Erro desconhecido'
          });
        }
      } catch (error: any) {
        console.error(`Erro ao gerar contrato para ${company.name}:`, error);
        results.push({
          company: company.name,
          success: false,
          message: error.response?.data?.error || 'Erro na comunicação com o servidor'
        });
      }
    }

    setGenerationResults(results);
    setIsGenerating(false);
  };

  const handleViewContract = (filename: string, companyName: string) => {
    setViewer({
      isOpen: true,
      filename,
      companyName
    });
  };

  const handleDownload = async (filename: string, companyName: string) => {
    try {
      console.log(`Fazendo download de: ${filename}`);
      
      const response = await contractsAPI.download(filename);
      
      // Criar blob e URL para download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contrato_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      
      console.log('Download concluído');
    } catch (error) {
      console.error('Erro no download:', error);
      alert('Erro ao fazer download do contrato');
    }
  };

  const handleCloseViewer = () => {
    setViewer({
      isOpen: false,
      filename: '',
      companyName: ''
    });
  };

  const successfulGenerations = generationResults.filter(r => r.success);
  const failedGenerations = generationResults.filter(r => !r.success);

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
            Selecione empresas acima para gerar contratos
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Lista de empresas selecionadas */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Empresas selecionadas ({selectedCompanies.length}):
            </h4>
            <div className="space-y-1">
              {selectedCompanies.map((company, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 bg-blue-50 rounded text-sm"
                >
                  <span className="text-gray-700">{company.name}</span>
                  <span className="text-gray-500 text-xs">
                    {company.cnpj || company.cod}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Botão de gerar */}
          <div>
            <button
              onClick={handleGenerateContracts}
              disabled={isGenerating}
              className={`w-full py-2 px-4 rounded-lg font-medium ${
                isGenerating
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Gerando contratos...
                </div>
              ) : (
                `Gerar ${selectedCompanies.length} contrato${selectedCompanies.length > 1 ? 's' : ''}`
              )}
            </button>
          </div>

          {/* Resultados */}
          {generationResults.length > 0 && (
            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-medium text-gray-700">
                Resultados da geração:
              </h4>

              {/* Sucessos */}
              {successfulGenerations.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-green-700">
                    ✅ Contratos gerados com sucesso ({successfulGenerations.length}):
                  </h5>
                  {successfulGenerations.map((result, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 bg-green-50 rounded-lg"
                    >
                      <div>
                        <div className="text-sm font-medium text-green-800">
                          {result.company}
                        </div>
                        <div className="text-xs text-green-600">
                          {result.message}
                        </div>
                      </div>
                      {result.filename && (
                        <button
                          onClick={() => handleViewContract(result.filename!, result.company)}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          Visualizar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Falhas */}
              {failedGenerations.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-red-700">
                    ❌ Falhas na geração ({failedGenerations.length}):
                  </h5>
                  {failedGenerations.map((result, index) => (
                    <div
                      key={index}
                      className="p-3 bg-red-50 rounded-lg"
                    >
                      <div className="text-sm font-medium text-red-800">
                        {result.company}
                      </div>
                      <div className="text-xs text-red-600">
                        {result.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Contract Viewer Modal */}
      {viewer.isOpen && (
        <ContractViewer
          filename={viewer.filename}
          companyName={viewer.companyName}
          onClose={handleCloseViewer}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
};

export default ContractGenerator;
