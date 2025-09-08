'use client';

import React, { useState, useEffect } from 'react';
import { contractsAPI } from '@/lib/api';

interface ContractViewerProps {
  filename: string;
  companyName: string;
  onClose: () => void;
  onDownload: (filename: string, companyName: string) => void;
}

const ContractViewer: React.FC<ContractViewerProps> = ({
  filename,
  companyName,
  onClose,
  onDownload
}) => {
  const [contractContent, setContractContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    loadContractContent();
  }, [filename]);

  const loadContractContent = async () => {
    try {
      setIsLoading(true);
      
      // Buscar conteúdo do contrato via API
      const response = await contractsAPI.getContent(filename);
      
      if (response.success) {
        setContractContent(response.content);
        setEditedContent(response.content);
      } else {
        console.error('Erro ao carregar conteúdo:', response.error);
      }
    } catch (error) {
      console.error('Erro ao carregar contrato:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const response = await contractsAPI.updateContract(filename, editedContent);
      
      if (response.success) {
        setContractContent(editedContent);
        setIsEditing(false);
        alert('Contrato atualizado com sucesso!');
      } else {
        alert('Erro ao salvar alterações: ' + response.error);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(contractContent);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Carregando contrato...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Visualizar Contrato
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {companyName}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => onDownload(filename, companyName)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center space-x-2"
                >
                  {isSaving && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>Salvar</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-full min-h-[500px] p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Conteúdo do contrato..."
            />
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-6 min-h-[500px]">
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-gray-800">
                  {contractContent}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 rounded-b-lg">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Arquivo: {filename}</span>
            <span>
              {isEditing ? 'Modo de edição ativo' : 'Modo de visualização'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractViewer;
