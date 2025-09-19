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
      // Método confiável: usar um iframe temporário com token
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('Token de autenticação não encontrado');
        return;
      }
      
      // Criar um formulário temporário para enviar o token
      const form = document.createElement('form');
      form.method = 'POST';
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5004';
      form.action = `${baseUrl}/api/contracts/download-as-pdf/${filename}?t=${new Date().getTime()}`;
      form.target = '_blank';
      
      // Adicionar o token como um campo oculto
      const tokenField = document.createElement('input');
      tokenField.type = 'hidden';
      tokenField.name = 'token';
      tokenField.value = token;
      form.appendChild(tokenField);
      
      // Adicionar o formulário ao documento, enviar e remover
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
      
      console.log('Requisição de PDF enviada com autenticação');
    } catch (pdfError) {
      console.error('Erro ao abrir PDF:', pdfError);
    }
  }, 1000);
};

export default {
  downloadBothFormats
};