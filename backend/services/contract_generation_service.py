"""
Serviço para geração de contratos a partir de template Word
"""
import os
import tempfile
from docx import Document
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class ContractGenerationService:
    """Serviço responsável pela geração de contratos usando template Word"""
    
    def __init__(self, template_path: str = None):
        """
        Inicializa o serviço com o caminho do template
        
        Args:
            template_path: Caminho para o arquivo template .docx
        """
        if template_path is None:
            # Caminho padrão para o template
            template_path = os.path.join(os.path.dirname(__file__), '..', 'utils', 'contrato.docx')
        
        self.template_path = os.path.abspath(template_path)
        
        if not os.path.exists(self.template_path):
            raise FileNotFoundError(f"Template não encontrado: {self.template_path}")
    
    def generate_contract(self, company_data: Dict[str, Any]) -> str:
        """
        Gera um contrato preenchido com os dados da empresa
        
        Args:
            company_data: Dados da empresa contendo as informações necessárias
            
        Returns:
            Caminho para o arquivo temporário gerado
            
        Raises:
            ValueError: Se dados obrigatórios estiverem ausentes
            FileNotFoundError: Se template não existir
        """
        try:
            logger.info(f"Iniciando geração de contrato para empresa: {company_data.get('razao_social', 'N/A')}")
            
            # Validar dados obrigatórios
            required_fields = ['razao_social', 'cnpj', 'endereco']
            missing_fields = []
            
            for field in required_fields:
                if not company_data.get(field):
                    missing_fields.append(field)
            
            if missing_fields:
                raise ValueError(f"Campos obrigatórios ausentes: {', '.join(missing_fields)}")
            
            # Carregar template
            doc = Document(self.template_path)
            
            # Mapeamento de campos
            field_mapping = {
                '[RAZÃO SOCIAL]': company_data['razao_social'],
                '[CNPJ]': company_data['cnpj'],
                '[ENDEREÇO]': company_data['endereco']
            }
            
            # Substituir campos nos parágrafos
            total_replacements = 0
            for paragraph in doc.paragraphs:
                if paragraph.text:
                    original_text = paragraph.text
                    new_text = original_text
                    
                    for placeholder, value in field_mapping.items():
                        if placeholder in new_text:
                            new_text = new_text.replace(placeholder, str(value))
                            total_replacements += 1
                            logger.debug(f"Substituído '{placeholder}' por '{value}' no parágrafo")
                    
                    # Se houve alterações, atualizar o parágrafo
                    if new_text != original_text:
                        paragraph.text = new_text
            
            # Verificar se também há campos em tabelas
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        if cell.text:
                            original_text = cell.text
                            new_text = original_text
                            
                            for placeholder, value in field_mapping.items():
                                if placeholder in new_text:
                                    new_text = new_text.replace(placeholder, str(value))
                                    total_replacements += 1
                                    logger.debug(f"Substituído '{placeholder}' por '{value}' na tabela")
                            
                            if new_text != original_text:
                                cell.text = new_text
            
            logger.info(f"Total de substituições realizadas: {total_replacements}")
            
            # Gerar nome único para arquivo temporário
            temp_filename = f"contrato_{company_data['cnpj'].replace('.', '').replace('/', '').replace('-', '')}_{hash(company_data['razao_social']) % 10000}.docx"
            temp_filepath = os.path.join(tempfile.gettempdir(), temp_filename)
            
            # Salvar documento preenchido
            doc.save(temp_filepath)
            
            logger.info(f"Contrato gerado com sucesso: {temp_filepath}")
            return temp_filepath
            
        except Exception as e:
            logger.error(f"Erro ao gerar contrato: {str(e)}")
            raise
    
    def get_template_fields(self) -> list:
        """
        Extrai os campos do template que precisam ser preenchidos
        
        Returns:
            Lista de placeholders encontrados no template
        """
        try:
            doc = Document(self.template_path)
            placeholders = set()
            
            # Buscar em parágrafos
            for paragraph in doc.paragraphs:
                text = paragraph.text
                # Buscar padrão [CAMPO]
                import re
                matches = re.findall(r'\[([^\]]+)\]', text)
                placeholders.update(matches)
            
            # Buscar em tabelas
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        text = cell.text
                        matches = re.findall(r'\[([^\]]+)\]', text)
                        placeholders.update(matches)
            
            return sorted(list(placeholders))
            
        except Exception as e:
            logger.error(f"Erro ao extrair campos do template: {str(e)}")
            return []
    
    def extract_text_content(self, file_path: str) -> str:
        """
        Extrai o conteúdo textual de um documento Word
        
        Args:
            file_path: Caminho para o arquivo .docx
            
        Returns:
            Conteúdo textual do documento
        """
        try:
            doc = Document(file_path)
            content_lines = []
            
            for paragraph in doc.paragraphs:
                content_lines.append(paragraph.text)
            
            return '\n'.join(content_lines)
            
        except Exception as e:
            logger.error(f"Erro ao extrair texto: {str(e)}")
            return ""
    
    def update_document_content(self, file_path: str, new_content: str) -> bool:
        """
        Atualiza um documento Word preservando a formatação
        
        Args:
            file_path: Caminho para o arquivo .docx
            new_content: Novo conteúdo textual editado
            
        Returns:
            True se atualizado com sucesso, False caso contrário
        """
        try:
            # Para preservar a formatação, vamos recriar o documento
            # usando o template original e aplicando as mudanças do texto editado
            
            # Carregar template original
            template_doc = Document(self.template_path)
            
            # Extrair o texto original do template para comparação
            original_content = self.extract_text_content(self.template_path)
            
            # Identificar mudanças nos campos específicos
            changes = self._identify_field_changes(original_content, new_content)
            
            # Aplicar mudanças no template
            for placeholder, new_value in changes.items():
                for paragraph in template_doc.paragraphs:
                    if placeholder in paragraph.text:
                        # Substituir o placeholder mantendo a formatação
                        for run in paragraph.runs:
                            if placeholder in run.text:
                                run.text = run.text.replace(placeholder, new_value)
            
            # Verificar tabelas também
            for table in template_doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        for placeholder, new_value in changes.items():
                            if placeholder in cell.text:
                                cell.text = cell.text.replace(placeholder, new_value)
            
            # Salvar documento atualizado
            template_doc.save(file_path)
            logger.info(f"Documento atualizado preservando formatação: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao atualizar documento: {str(e)}")
            return False
    
    def _identify_field_changes(self, original_content: str, edited_content: str) -> Dict[str, str]:
        """
        Identifica mudanças nos campos específicos do contrato
        
        Args:
            original_content: Conteúdo original
            edited_content: Conteúdo editado
            
        Returns:
            Dicionário com as mudanças identificadas
        """
        changes = {}
        
        # Campos que queremos monitorar
        field_patterns = {
            r'([^,\n]*?),\s*inscrita no CNPJ sob o nº ([0-9/.,-]+),\s*com sede à ([^,\n]+(?:,[^,\n]+)*),': 
            ['razao_social', 'cnpj', 'endereco']
        }
        
        import re
        
        # Buscar padrões no conteúdo editado
        for pattern, fields in field_patterns.items():
            match = re.search(pattern, edited_content)
            if match:
                # Mapeamento de volta para placeholders
                if len(match.groups()) >= 3:
                    changes['[RAZÃO SOCIAL]'] = match.group(1).strip()
                    changes['[CNPJ]'] = match.group(2).strip()
                    changes['[ENDEREÇO]'] = match.group(3).strip()
        
        return changes

    def validate_template(self):
        try:
            doc = Document(self.template_path)
            
            return {
                'valid': True,
                'path': self.template_path,
                'paragraphs_count': len(doc.paragraphs),
                'tables_count': len(doc.tables),
                'fields_found': self.get_template_fields(),
                'error': None
            }
            
        except Exception as e:
            return {
                'valid': False,
                'path': self.template_path,
                'paragraphs_count': 0,
                'tables_count': 0,
                'fields_found': [],
                'error': str(e)
            }
