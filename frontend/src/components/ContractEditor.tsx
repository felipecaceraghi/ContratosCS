'use client';

import React, { useState, useEffect } from 'react';
import { contractsAPI } from '@/lib/api';
import { downloadBothFormats } from '@/lib/document-utils';

// Estilos para animação do toast
const styles = {
  '@keyframes fadeInDown': {
    '0%': {
      opacity: 0,
      transform: 'translateY(-20px)'
    },
    '100%': {
      opacity: 1,
      transform: 'translateY(0)'
    }
  },
  '.animate-fade-in-down': {
    animation: 'fadeInDown 0.5s ease-out forwards'
  }
};

interface ContractEditorProps {
  filename: string;
  companyName: string;
  onSave: (editedFilename: string) => void;
  onCancel: () => void;
}

interface ContractFields {
  razao_social: string;
  cnpj: string;
  endereco: string;
}

const ContractEditor: React.FC<ContractEditorProps> = ({
  filename,
  companyName,
  onSave,
  onCancel
}) => {
  const [fields, setFields] = useState<ContractFields>({
    razao_social: '',
    cnpj: '',
    endereco: ''
  });
  const [originalContent, setOriginalContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadContractContent();
  }, [filename]);

  const loadContractContent = async () => {
    try {
      setIsLoading(true);
      const response = await contractsAPI.getContent(filename);
      
      if (response.success) {
        setOriginalContent(response.content);
        
        // Extrair campos do conteúdo usando regex
        const content = response.content;
        
        // Buscar razão social, CNPJ e endereço do padrão do contrato
        const contractanteMatch = content.match(/([^,\n]+?),\s*inscrita no CNPJ sob o nº ([0-9/.,-]+),\s*com sede à ([^,]+(?:,[^,]+)*),\s*neste ato representada/);
        
        if (contractanteMatch) {
          setFields({
            razao_social: contractanteMatch[1].trim(),
            cnpj: contractanteMatch[2].trim(),
            endereco: contractanteMatch[3].trim()
          });
        } else {
          // Se não conseguir extrair, usar valores padrão
          setFields({
            razao_social: '[RAZÃO SOCIAL]',
            cnpj: '[CNPJ]',
            endereco: '[ENDEREÇO]'
          });
        }
      } else {
        setError(response.error || 'Erro ao carregar conteúdo');
      }
    } catch (error: any) {
      console.error('Erro ao carregar conteúdo:', error);
      setError('Erro ao carregar conteúdo do contrato');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (field: keyof ContractFields, value: string) => {
    setFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      console.log('Aplicando edições:', fields);

      const response = await contractsAPI.applyEdits(filename, fields);

      if (response.success) {
        console.log('Edições aplicadas com sucesso:', response.filename);
        
        // Mostrar toast informando o usuário
        setToastMessage('Iniciando downloads (DOCX e PDF)...');
        setShowToast(true);
        
        // Usar a nova utilidade para download de ambos os formatos
        try {
          await downloadBothFormats(response.filename, companyName);
          
          // Atualizar mensagem do toast
          setToastMessage('DOCX baixado e PDF aberto em nova aba!');
          
          // Esconder toast após alguns segundos
          setTimeout(() => {
            setShowToast(false);
          }, 3000);
        } catch (downloadError) {
          console.error('Erro ao fazer download dos arquivos:', downloadError);
          setToastMessage('Erro ao fazer download dos arquivos.');
          setTimeout(() => {
            setShowToast(false);
          }, 3000);
        }
        
        // Continuar o fluxo normal
        onSave(response.filename);
      } else {
        setError(response.error || 'Erro ao salvar edições');
      }
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setError(error.response?.data?.error || 'Erro ao salvar edições');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span>Carregando contrato...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* Toast de notificação */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p>{toastMessage}</p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Editar Contrato
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {companyName}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                📝 Instruções
              </h3>
              <p className="text-blue-800 text-sm">
                Edite os campos abaixo para personalizar o contrato. As alterações serão aplicadas mantendo a formatação original do documento.
              </p>
            </div>

            {/* Campos editáveis */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Razão Social da Empresa
                </label>
                <input
                  type="text"
                  value={fields.razao_social}
                  onChange={(e) => handleFieldChange('razao_social', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome completo da empresa contratante"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={fields.cnpj}
                  onChange={(e) => handleFieldChange('cnpj', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço Completo
                </label>
                <textarea
                  value={fields.endereco}
                  onChange={(e) => handleFieldChange('endereco', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[150px]"
                  placeholder="Endereço completo da sede da empresa"
                />
              </div>
            </div>

            {/* Prévia do texto */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                👀 Prévia do texto que será inserido no contrato:
              </h4>
              <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                <strong>{fields.razao_social}</strong>, inscrita no CNPJ sob o nº <strong>{fields.cnpj}</strong>, com sede à <strong>{fields.endereco}</strong>, neste ato representada na forma de seus atos constitutivos, doravante denominada simplesmente como CONTRATANTE.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              'Salvar e Baixar (DOCX + PDF)'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContractEditor;
