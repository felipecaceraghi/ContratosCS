import React from 'react';

const TableTestComponent = () => {
  const testContent = `Texto antes da tabela

[TABELA_JSON][["ÁREA CONTÁBIL", "ÁREA CONTÁBIL", "ÁREA CONTÁBIL"], ["ATIVIDADES", "PERIODICIDADE", "PRAZO"], ["Teste de atividade", "Mensal", "3º Dia"]][/TABELA_JSON]

Texto depois da tabela`;

  const processTableContent = (content: string) => {
    console.log('🔥 PROCESSANDO CONTEÚDO:', content.substring(0, 200));
    console.log('🔥 PROCURANDO TABELAS...');
    
    const parts = [];
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
        console.log('🎯 TABELA ENCONTRADA E PARSEADA:', tableData.length, 'linhas');
        parts.push({ type: 'table', data: tableData });
      } catch (e) {
        parts.push({ type: 'text', content: content.substring(tableStart, tableEnd + '[/TABELA_JSON]'.length) });
      }
      
      i = tableEnd + '[/TABELA_JSON]'.length;
    }
    
    if (currentText.trim()) {
      parts.push({ type: 'text', content: currentText });
    }
    
    console.log('🚀 TOTAL DE PARTES ENCONTRADAS:', parts.length);
    
    return parts.map((part, index) => {
      if (part.type === 'table') {
        console.log('📊 RENDERIZANDO TABELA COM', part.data?.length || 0, 'LINHAS');
        const tableData = part.data;
        
        if (!Array.isArray(tableData) || tableData.length === 0) {
          return null;
        }
        
        return (
          <div key={index} className="my-6 overflow-x-auto">
            <table className="w-full border-collapse border-2 border-gray-600 bg-white">
              <tbody>
                {tableData.map((row: any[], rowIndex: number) => {
                  const isHeader = rowIndex === 0 || rowIndex === 1;
                  return (
                    <tr key={rowIndex} className={isHeader ? 'bg-blue-100' : 'hover:bg-gray-50'}>
                      {row.map((cell: any, cellIndex: number) => (
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

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">TESTE DE TABELA</h2>
      <div className="border p-4">
        {processTableContent(testContent)}
      </div>
    </div>
  );
};

export default TableTestComponent;
