'use client';

import React, { useState, useEffect } from 'react';
import { contractsAPI } from '@/lib/api';
import { downloadBothFormats } from '@/lib/document-utils';
import { toast } from '@/lib/toast';

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

interface ContractViewerProps {
  filename: string;
  companyName: string;
  onClose: () => void;
  onSave?: () => void;
}

const ContractViewer: React.FC<ContractViewerProps> = ({
  filename,
  companyName,
  onClose,
  onSave
}) => {
  const [content, setContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableTables, setEditableTables] = useState<(string[][] | null)[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Função para renderizar tabela editável
  const renderEditableTable = (tableData: string[][], tableIndex: number) => {
    if (!Array.isArray(tableData) || tableData.length === 0) return null;

    const updateCell = (rowIndex: number, cellIndex: number, newValue: string) => {
      const newTables = [...editableTables];
      
      // Garantir que o array existe até o índice
      while (newTables.length <= tableIndex) {
        newTables.push(null);
      }
      
      // Criar cópia da tabela se ainda não existe
      if (!newTables[tableIndex]) {
        newTables[tableIndex] = tableData.map(row => [...row]);
      }
      
      // Atualizar a célula
      newTables[tableIndex][rowIndex][cellIndex] = newValue;
      setEditableTables(newTables);
      
      // Atualizar conteúdo editado
      updateEditedContent();
    };

    const currentTableData = editableTables[tableIndex] || tableData;

    return (
      <div key={`table-${tableIndex}`} className="my-6 overflow-x-auto">
        <div className="mb-2 flex items-center space-x-2">
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
            ✏️ Tabela Editável #{tableIndex + 1}
          </span>
          <span className="text-xs text-gray-600">
            Clique nas células para editar
          </span>
        </div>
        <table className="w-full border-collapse border-2 border-gray-600 bg-white shadow-sm">
          <tbody>
            {currentTableData.map((row: any[], rowIndex: number) => {
              const isHeader = rowIndex === 0 || rowIndex === 1;
              return (
                <tr key={rowIndex} className={isHeader ? 'bg-blue-100' : 'hover:bg-gray-50'}>
                  {row.map((cell: any, cellIndex: number) => (
                    <td
                      key={cellIndex}
                      className={`border border-gray-600 p-0 ${
                        isHeader ? 'font-bold text-blue-900' : ''
                      }`}
                      style={{ 
                        minWidth: cellIndex === 0 ? '300px' : '100px',
                        maxWidth: cellIndex === 0 ? '500px' : '150px',
                      }}
                    >
                      <input
                        type="text"
                        value={String(cell)}
                        onChange={(e) => updateCell(rowIndex, cellIndex, e.target.value)}
                        className={`w-full h-full px-3 py-2 border-none bg-transparent focus:outline-none focus:bg-yellow-100 focus:shadow-inner text-sm transition-colors ${
                          isHeader ? 'font-bold text-center' : ''
                        }`}
                        placeholder="Clique para editar..."
                        title={`Editar célula [${rowIndex + 1}, ${cellIndex + 1}]`}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Função para atualizar o conteúdo editado com as tabelas modificadas
  const updateEditedContent = () => {
    let newContent = content;
    let tableIndex = 0;
    
    newContent = newContent.replace(/\[TABELA_JSON\](.*?)\[\/TABELA_JSON\]/g, (match, jsonString) => {
      try {
        const originalData = JSON.parse(jsonString);
        const editedData = editableTables[tableIndex] || originalData;
        const updatedJson = JSON.stringify(editedData);
        tableIndex++;
        return `[TABELA_JSON]${updatedJson}[/TABELA_JSON]`;
      } catch (e) {
        console.error('Erro ao processar tabela:', e);
        return match;
      }
    });
    
    setEditedContent(newContent);
  };

  // Armazenar partes de texto separadamente
  const [textParts, setTextParts] = useState<{[key: string]: string}>({});
  
  // Função para atualizar uma parte de texto
  const updateTextPart = (key: string, value: string) => {
    const newTextParts = { ...textParts };
    newTextParts[key] = value;
    setTextParts(newTextParts);
    
    // Atualizar o conteúdo editado
    setTimeout(() => {
      updateFullEditedContent();
    }, 0);
  };
  
  // Função para atualizar todo o conteúdo editado (tabelas + texto)
  const updateFullEditedContent = () => {
    let newContent = content;
    
    // Primeiro substituir as tabelas
    let tableIndex = 0;
    newContent = newContent.replace(/\[TABELA_JSON\](.*?)\[\/TABELA_JSON\]/g, (match, jsonString) => {
      try {
        const originalData = JSON.parse(jsonString);
        const editedData = editableTables[tableIndex] || originalData;
        const updatedJson = JSON.stringify(editedData);
        tableIndex++;
        return `[TABELA_JSON]${updatedJson}[/TABELA_JSON]`;
      } catch (e) {
        console.error('Erro ao processar tabela:', e);
        return match;
      }
    });
    
    // Depois substituir as partes de texto
    Object.entries(textParts).forEach(([key, value]) => {
      const marker = `[TEXT_PART:${key}]`;
      const endMarker = `[/TEXT_PART:${key}]`;
      
      const startIdx = newContent.indexOf(marker);
      const endIdx = newContent.indexOf(endMarker);
      
      if (startIdx !== -1 && endIdx !== -1) {
        const before = newContent.substring(0, startIdx + marker.length);
        const after = newContent.substring(endIdx);
        newContent = before + value + after;
      }
    });
    
    setEditedContent(newContent);
  };
  
  // Função para processar conteúdo editável com tabelas e texto
  const processEditableContent = (content: string) => {
    // Adicionar marcadores especiais ao conteúdo para identificar partes de texto
    let processedContent = content;
    const parts: React.ReactNode[] = [];
    let currentText = '';
    let i = 0;
    let tableIndex = 0;
    let textPartIndex = 0;
    
    while (i < content.length) {
      const tableStart = content.indexOf('[TABELA_JSON]', i);
      
      if (tableStart === -1) {
        currentText += content.substring(i);
        break;
      }
      
      // Adicionar texto antes da tabela
      currentText += content.substring(i, tableStart);
      if (currentText.trim()) {
        const textKey = `text-${textPartIndex}`;
        textPartIndex++;
        
        // Inicializar o texto no estado se ainda não existir
        if (!textParts[textKey]) {
          setTextParts(prev => ({...prev, [textKey]: currentText}));
        }
        
        parts.push(
          <div key={textKey} className="whitespace-pre-wrap my-4 p-4 bg-white border border-gray-300 rounded-lg">
            <textarea
              value={textParts[textKey] || currentText}
              onChange={(e) => {
                updateTextPart(textKey, e.target.value);
              }}
              className="w-full min-h-[100px] border-none resize-none focus:outline-none bg-transparent focus:bg-yellow-50"
              placeholder="Editar texto..."
            />
            {/* Adicionar marcadores invisíveis no conteúdo */}
            <div style={{ display: 'none' }}>
              [TEXT_PART:{textKey}]{textParts[textKey] || currentText}[/TEXT_PART:{textKey}]
            </div>
          </div>
        );
        currentText = '';
      }
      
      const tableEnd = content.indexOf('[/TABELA_JSON]', tableStart);
      
      if (tableEnd === -1) {
        currentText += content.substring(tableStart);
        break;
      }
      
      const jsonStart = tableStart + '[TABELA_JSON]'.length;
      const jsonString = content.substring(jsonStart, tableEnd);
      
      try {
        const tableData = JSON.parse(jsonString);
        parts.push(renderEditableTable(tableData, tableIndex));
        tableIndex++;
      } catch (e) {
        console.error('Erro ao processar JSON da tabela:', e);
        currentText += content.substring(tableStart, tableEnd + '[/TABELA_JSON]'.length);
      }
      
      i = tableEnd + '[/TABELA_JSON]'.length;
    }
    
    // Adicionar texto final
    if (currentText.trim()) {
      const textKey = `text-final`;
      
      // Inicializar o texto no estado se ainda não existir
      if (!textParts[textKey]) {
        setTextParts(prev => ({...prev, [textKey]: currentText}));
      }
      
      parts.push(
        <div key={textKey} className="whitespace-pre-wrap my-4 p-4 bg-white border border-gray-300 rounded-lg">
          <textarea
            value={textParts[textKey] || currentText}
            onChange={(e) => {
              updateTextPart(textKey, e.target.value);
            }}
            className="w-full min-h-[100px] border-none resize-none focus:outline-none bg-transparent focus:bg-yellow-50"
            placeholder="Editar texto..."
          />
          {/* Adicionar marcadores invisíveis no conteúdo */}
          <div style={{ display: 'none' }}>
            [TEXT_PART:{textKey}]{textParts[textKey] || currentText}[/TEXT_PART:{textKey}]
          </div>
        </div>
      );
    }
    
    return parts;
    
    return parts;
  };

  // Função para processar tabelas no modo de visualização
  const processTableContent = (content: string) => {
    const parts: Array<{type: 'text' | 'table', content?: string, data?: any}> = [];
    let currentText = '';
    let i = 0;
    
    while (i < content.length) {
      const tableStart = content.indexOf('[TABELA_JSON]', i);
      
      if (tableStart === -1) {
        currentText += content.substring(i);
        break;
      }
      
      currentText += content.substring(i, tableStart);
      if (currentText.trim()) {
        parts.push({ type: 'text', content: currentText });
        currentText = '';
      }
      
      const tableEnd = content.indexOf('[/TABELA_JSON]', tableStart);
      
      if (tableEnd === -1) {
        currentText += content.substring(tableStart);
        break;
      }
      
      const jsonStart = tableStart + '[TABELA_JSON]'.length;
      const jsonString = content.substring(jsonStart, tableEnd);
      
      try {
        const tableData = JSON.parse(jsonString);
        parts.push({ type: 'table', data: tableData });
      } catch (e) {
        console.error('Erro ao processar JSON:', e);
        parts.push({ type: 'text', content: content.substring(tableStart, tableEnd + '[/TABELA_JSON]'.length) });
      }
      
      i = tableEnd + '[/TABELA_JSON]'.length;
    }
    
    if (currentText.trim()) {
      parts.push({ type: 'text', content: currentText });
    }
    
    return parts.map((part, index) => {
      if (part.type === 'table') {
        const tableData = part.data;
        
        if (!Array.isArray(tableData) || tableData.length === 0) {
          return null;
        }
        
        return (
          <div key={index} className="my-6 overflow-x-auto">
            <div className="mb-2">
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                📊 Tabela #{index + 1}
              </span>
            </div>
            <table className="w-full border-collapse border-2 border-gray-600 bg-white shadow-sm">
              <tbody>
                {tableData.map((row: string[], rowIndex: number) => {
                  const isHeader = rowIndex === 0 || rowIndex === 1;
                  return (
                    <tr key={rowIndex} className={isHeader ? 'bg-blue-100' : 'hover:bg-gray-50'}>
                      {row.map((cell: string, cellIndex: number) => (
                        <td
                          key={cellIndex}
                          className={`border border-gray-600 px-3 py-2 text-sm ${
                            isHeader ? 'font-bold text-center text-blue-900' : ''
                          }`}
                          style={{ 
                            minWidth: cellIndex === 0 ? '300px' : '100px',
                            maxWidth: cellIndex === 0 ? '500px' : '150px',
                            wordBreak: 'break-word'
                          }}
                        >
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      } else {
        return (
          <div key={index} className="whitespace-pre-wrap my-4">
            {part.content}
          </div>
        );
      }
    }).filter(Boolean);
  };

  useEffect(() => {
    loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filename]);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const response = await contractsAPI.getContent(filename);
      
      if (response.success) {
        setContent(response.content);
        setEditedContent(response.content);
        setEditableTables([]); // Reset editable tables
      } else {
        alert('Erro ao carregar conteúdo do contrato');
      }
    } catch (error) {
      console.error('Erro ao carregar contrato:', error);
      alert('Erro ao carregar contrato');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Atualizar o conteúdo editado com tabelas E texto antes de salvar
      updateFullEditedContent();
      
      // Garantir que as alterações foram atualizadas no estado
      // antes de chamar a API usando setTimeout
      setTimeout(async () => {
        try {
          const response = await contractsAPI.saveEdits(filename, editedContent);
          
          if (response.success) {
            await handleDownload();
            
            if (onSave) {
              onSave();
            }
          } else {
            alert('Erro ao salvar alterações');
          }
        } catch (error) {
          console.error('Erro ao salvar:', error);
          alert('Erro ao salvar alterações');
        } finally {
          setIsSaving(false);
        }
      }, 100);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar alterações');
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    try {
      // Mostrar toast informando o usuário
      setToastMessage('Iniciando downloads (DOCX e PDF)...');
      setShowToast(true);
      
      // Usar a função utilitária para baixar ambos os formatos
      await downloadBothFormats(filename, companyName);
      
      // Atualizar mensagem
      setToastMessage('DOCX e PDF disponibilizados com sucesso!');
      
      // Esconder toast após alguns segundos
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } catch (error) {
      console.error('Erro geral no processo de download:', error);
      setToastMessage('Erro ao processar downloads.');
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
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
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-fade-in-down">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p>{toastMessage}</p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? '✏️ Editar Contrato' : '📄 Visualizar Contrato'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Empresa: <span className="font-medium text-blue-600">{companyName}</span>
            </p>
            {isEditing && (
              <div className="text-xs text-green-600 mt-1 bg-green-50 px-2 py-1 rounded">
                <div>� Modo de Edição Avançado</div>
                <div>✅ Clique em qualquer célula da tabela para editá-la</div>
                <div>✅ As alterações são salvas automaticamente</div>
                <div>✅ Use Tab ou Enter para navegar entre células</div>
                <div>✅ Suas edições serão aplicadas ao documento final</div>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <>
                <button
                  onClick={() => {
                    setEditedContent(content);
                    setEditableTables([]);
                    setIsEditing(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  📥 Baixar (DOCX + PDF)
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setEditedContent(content);
                    setEditableTables([]);
                    setIsEditing(false);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  ↩️ Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
                >
                  {isSaving ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </div>
                  ) : (
                    '💾 Salvar e Baixar (DOCX + PDF)'
                  )}
                </button>
              </>
            )}
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              ✕ Fechar
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isEditing ? (
            <div className="h-full p-6">
              <div className="mb-4">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-green-700 mb-2">🚀 Modo de Edição Avançado</h3>
                  <ul className="text-xs text-green-600 space-y-1">
                    <li>✅ Clique em qualquer célula da tabela para editá-la</li>
                    <li>✅ As alterações são salvas automaticamente</li>
                    <li>✅ Use Tab ou Enter para navegar entre células</li>
                    <li>✅ Suas edições serão aplicadas ao documento final</li>
                  </ul>
                </div>
              </div>
              
              <div className="h-full overflow-y-auto">
                <div className="bg-gray-50 rounded-lg p-6 min-h-full">
                  <div className="font-serif text-sm leading-relaxed text-gray-800">
                    {editedContent.includes('[TABELA_JSON]') ? (
                      processEditableContent(editedContent)
                    ) : (
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full h-full min-h-[500px] p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono text-sm"
                        placeholder="Conteúdo do contrato..."
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="font-serif text-sm leading-relaxed text-gray-800">
                  {content.includes('[TABELA_JSON]') ? (
                    processTableContent(content)
                  ) : (
                    <div className="whitespace-pre-wrap">{content}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractViewer;
