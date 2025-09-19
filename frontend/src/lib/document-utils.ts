/**
 * Utilidades para download de documentos
 */

import { contractsAPI } from './api';

/**
 * Função para baixar DOCX e PDF simultaneamente
 * @param filename Nome do arquivo no servidor
 * @param companyName Nome da empresa para o nome do arquivo
 */
export const downloadBothFormats = async (filename: string, companyName: string) => {
  const safeCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '_');
  
  // 1. Baixar DOCX
  try {
    console.log('Iniciando download do DOCX:', filename);
    const docxResponse = await contractsAPI.download(filename);
    
    if (docxResponse.data) {
      const docxBlob = new Blob([docxResponse.data], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      const docxUrl = window.URL.createObjectURL(docxBlob);
      const docxLink = document.createElement('a');
      docxLink.href = docxUrl;
      docxLink.download = `contrato_${safeCompanyName}.docx`;
      document.body.appendChild(docxLink);
      docxLink.click();
      docxLink.remove();
      window.URL.revokeObjectURL(docxUrl);
    }
  } catch (docxError) {
    console.error('Erro ao baixar DOCX:', docxError);
  }
  
  // 2. Baixar PDF (após pequeno delay)
  setTimeout(() => {
    try {
      // Método confiável: abrir em nova aba
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5004';
      const pdfUrl = `${baseUrl}/api/contracts/download-as-pdf/${filename}?t=${new Date().getTime()}`;
      
      console.log('Abrindo PDF em nova aba:', pdfUrl);
      window.open(pdfUrl, '_blank');
    } catch (pdfError) {
      console.error('Erro ao abrir PDF:', pdfError);
    }
  }, 1000);
};

export default {
  downloadBothFormats
};