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
  
  // 2. Baixar PDF usando o método direto (após pequeno delay)
  setTimeout(async () => {
    try {
      console.log('Iniciando download do PDF para:', filename);
      const pdfResponse = await contractsAPI.downloadAsPdf(filename);
      
      if (pdfResponse && pdfResponse.data) {
        // Criar blob e URL para download
        const pdfBlob = new Blob([pdfResponse.data], { type: 'application/pdf' });
        const pdfUrl = window.URL.createObjectURL(pdfBlob);
        
        // Criar elemento para download
        const pdfLink = document.createElement('a');
        pdfLink.href = pdfUrl;
        pdfLink.download = `contrato_${safeCompanyName}.pdf`;
        
        // Executar download
        document.body.appendChild(pdfLink);
        pdfLink.click();
        
        // Limpar recursos
        setTimeout(() => {
          pdfLink.remove();
          window.URL.revokeObjectURL(pdfUrl);
        }, 500);
        
        console.log('Download do PDF concluído');
      }
    } catch (pdfError) {
      console.error('Erro ao baixar PDF:', pdfError);
      alert('Ocorreu um erro ao gerar o PDF. O arquivo DOCX foi baixado com sucesso.');
    }
  }, 1000);
};

const documentUtils = {
  downloadBothFormats
};

export default documentUtils;