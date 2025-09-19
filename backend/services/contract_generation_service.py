"""
Serviço para geração de contratos a partir de template Word
"""
import os
import tempfile
import datetime
from docx import Document
from typing import Dict, Any, Optional, List
import logging
import json
from fuzzywuzzy import fuzz, process

logger = logging.getLogger(__name__)

class ContractGenerationService:
    """Serviço responsável pela geração de contratos usando template Word"""
    
    # Mapeamento das empresas BPO
    BPO_COMPANIES_MAPPING = {
        'HR HILL': {
            'razao_social': 'Hr Hill Servicos Administrativos Ltda.',
            'cnpj': '36.446.561/0001-66'
        },
        'JMW SERVIÇOS': {
            'razao_social': 'JMW Servicos Administrativos Ltda.',
            'cnpj': '36.448.288/0001-09'
        },
        'GF SERVIÇOS': {
            'razao_social': 'GF Servicos De Contabilidade Ltda.',
            'cnpj': '36.583.021/0001-24'
        },
        'ACARNEGIE SERVIÇOS': {
            'razao_social': 'Acarnegie Servicos Administrativos Ltda.',
            'cnpj': '40.601.894/0001-90'
        },
        'E.REEVE SERVIÇOS': {
            'razao_social': 'E. Reeve Musk Servicos de Contabilidade Ltda.',
            'cnpj': '40.897.585/0001-09'
        },
        'S. JOBS SERVIÇOS': {
            'razao_social': 'S.Jobs Servicos de Contabilidade Ltda.',
            'cnpj': '40.933.869/0001-03'
        },
        'GF FINANCE': {
            'razao_social': 'GF Finance Ltda.',
            'cnpj': '44.613.528/0001-01'
        },
        'GF PAYROLL': {
            'razao_social': 'GF Payroll Ltda.',
            'cnpj': '44.612.639/0001-01'
        },
        'GF ACCOUNTING': {
            'razao_social': 'GF Accounting Ltda.',
            'cnpj': '44.615.004/0001-50'
        },
        'GF TAX': {
            'razao_social': 'GF Tax Servicos de Contabilidade Ltda.',
            'cnpj': '44.573.718/0001-42'
        },
        'GF LEGAL': {
            'razao_social': 'GF Legal Ltda.',
            'cnpj': '40.591.977/0001-45'
        }
    }
    
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
    
    def _find_bpo_company_by_fuzzy_match(self, bpo_name: str) -> Optional[Dict[str, str]]:
        """
        Encontra a empresa BPO usando fuzzy matching
        
        Args:
            bpo_name: Nome de referência da empresa BPO
            
        Returns:
            Dicionário com razao_social e cnpj da empresa, ou None se não encontrado
        """
        if not bpo_name or bpo_name.strip() == '':
            return None
            
        # Limpar o nome de entrada
        bpo_name_clean = bpo_name.strip().upper()
        
        # Lista de chaves para busca
        company_keys = list(self.BPO_COMPANIES_MAPPING.keys())
        
        # Fazer fuzzy matching
        best_match, score = process.extractOne(bpo_name_clean, company_keys)
        
        # Usar threshold de 70% de similaridade
        if score >= 70:
            logger.info(f"Fuzzy match encontrado: '{bpo_name}' -> '{best_match}' (score: {score})")
            return self.BPO_COMPANIES_MAPPING[best_match]
        else:
            logger.warning(f"Nenhum match encontrado para '{bpo_name}' (melhor: '{best_match}' com score {score})")
            return None
    
    def _generate_signature_section(self, bpo_companies: List[Dict[str, str]]) -> None:
        """
        Gera a seção de assinaturas dinamicamente baseada nas empresas BPO
        
        Args:
            bpo_companies: Lista de empresas BPO com nome e CNPJ
        """
        try:
            # Carregar template
            doc = Document(self.template_path)
            
            # Encontrar e substituir as empresas de assinatura específicas
            company_paragraphs = {
                'GF ACCOUNTING LTDA.': None,
                'E. REEVE MUSK SERVICOS DE CONTABILIDADE LTDA.': None,
                'HR HILL SERVICOS ADMINISTRATIVOS LTDA.': None
            }
            
            # Encontrar os parágrafos das empresas antigas
            for i, paragraph in enumerate(doc.paragraphs):
                text = paragraph.text.strip()
                for old_company in company_paragraphs.keys():
                    if text == old_company:
                        company_paragraphs[old_company] = i
                        logger.info(f"Encontrado parágrafo {i} com empresa: {old_company}")
            
            # Substituir pelas novas empresas (usar apenas as primeiras 3)
            company_names = [old_name for old_name in company_paragraphs.keys()]
            for i, (old_company, paragraph_index) in enumerate(company_paragraphs.items()):
                if paragraph_index is not None and i < len(bpo_companies):
                    new_company = bpo_companies[i]
                    doc.paragraphs[paragraph_index].text = new_company['nome'].upper()
                    logger.info(f"Substituído '{old_company}' por '{new_company['nome'].upper()}'")
            
            # Salvar template modificado temporariamente
            temp_template_path = self.template_path.replace('.docx', '_temp.docx')
            doc.save(temp_template_path)
            self.template_path = temp_template_path
            
            logger.info(f"Seção de assinaturas atualizada com {len(bpo_companies)} empresas")
            
        except Exception as e:
            logger.error(f"Erro ao gerar seção de assinaturas: {str(e)}")
            # Não falhar por conta das assinaturas, continuar sem elas
            logger.warning("Continuando geração sem modificar assinaturas")

    def _extract_bpo_companies(self, company_data: Dict[str, Any]) -> tuple[str, List[Dict[str, str]]]:
        """
        Extrai dinamicamente as empresas BPO dos dados da empresa e gera o texto formatado
        
        Args:
            company_data: Dados da empresa contendo campos BPO
            
        Returns:
            String formatada com as empresas BPO (a), b), c), etc.
        """
        try:
            # Campos BPO para verificar
            bpo_fields = [
                'BPO Contábil Faturado',
                'BPO Fiscal Faturado', 
                'BPO Folha Faturado',
                'BPO Financeiro Faturado',
                'BPO RH Faturado',
                'BPO Legal Faturado',
                'Diversos In. Faturado',
                'Implantação Faturado'
            ]
            
            # Extrair valores únicos e não nulos dos campos BPO
            bpo_companies = set()
            
            # Se company_data tem um campo 'companie_data' (JSON), usar ele
            data_source = company_data.get('companie_data', {})
            if isinstance(data_source, str):
                try:
                    data_source = json.loads(data_source)
                except json.JSONDecodeError:
                    data_source = {}
            
            # Se não encontrou no companie_data, usar os dados diretos
            if not data_source:
                data_source = company_data
            
            logger.info(f"Buscando empresas BPO nos dados: {list(data_source.keys())[:10]}...")  # Log primeiro 10 campos
            
            for field in bpo_fields:
                value = data_source.get(field)
                if value and value.strip() and value.lower() not in ['null', 'none', '']:
                    bpo_companies.add(value.strip())
                    logger.info(f"Encontrada empresa BPO: {field} = {value}")
            
            # Se não encontrou nenhuma empresa BPO, usar um padrão
            if not bpo_companies:
                logger.warning("Nenhuma empresa BPO encontrada, usando empresas padrão")
                bpo_companies = {"GF SERVIÇOS", "E.REEVE SERVIÇOS", "HR HILL"}
            
            # Endereço padrão para todas as empresas
            endereco_padrao = "Av. Dr. Cardoso de Melo, nº 1608, 8º andar, 81-B, Vila Olímpia, São Paulo/SP, CEP: 04548-005"
            
            # Gerar texto formatado usando fuzzy matching
            companies_list = sorted(list(bpo_companies))
            letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']  # Suporte até 10 empresas
            
            formatted_companies = []
            companies_for_signature = []  # Lista de dicionários para assinaturas
            
            for i, bpo_name in enumerate(companies_list):
                if i < len(letters):
                    letter = letters[i]
                    
                    # Buscar dados da empresa usando fuzzy matching
                    empresa_data = self._find_bpo_company_by_fuzzy_match(bpo_name)
                    
                    if empresa_data:
                        razao_social = empresa_data['razao_social']
                        cnpj = empresa_data['cnpj']
                    else:
                        # Fallback caso não encontre match
                        razao_social = f"{bpo_name} LTDA."
                        cnpj = "00.000.000/0001-00"
                        logger.warning(f"Usando dados fallback para: {bpo_name}")
                    
                    # Adicionar à lista de assinaturas
                    companies_for_signature.append({
                        'nome': razao_social,
                        'cnpj': cnpj
                    })
                    
                    formatted_text = (
                        f"{letter}) {razao_social.upper()}, inscrita no CNPJ sob o nº {cnpj}, "
                        f"com sede à {endereco_padrao}"
                    )
                    formatted_companies.append(formatted_text)
            
            # Juntar todas com "; " e adicionar "e" antes da última
            if len(formatted_companies) == 1:
                result = formatted_companies[0]
            elif len(formatted_companies) == 2:
                result = f"{formatted_companies[0]}; e {formatted_companies[1]}"
            else:
                result = "; ".join(formatted_companies[:-1]) + f"; e {formatted_companies[-1]}"
            
            logger.info(f"Texto BPO gerado com {len(companies_for_signature)} empresas")
            return result, companies_for_signature
            
        except Exception as e:
            logger.error(f"Erro ao extrair empresas BPO: {str(e)}")
            # Retornar um padrão em caso de erro usando dados reais
            endereco_padrao = "Av. Dr. Cardoso de Melo, nº 1608, 8º andar, 81-B, Vila Olímpia, São Paulo/SP, CEP: 04548-005"
            fallback_text = (
                f"a) GF SERVICOS DE CONTABILIDADE LTDA., inscrita no CNPJ sob o nº 36.583.021/0001-24, com sede à {endereco_padrao}; "
                f"b) E. REEVE MUSK SERVIÇOS DE CONTABILIDADE LTDA., inscrita no CNPJ sob o nº 40.897.585/0001-09, com sede à {endereco_padrao}; "
                f"e c) HR HILL SERVIÇOS ADMINISTRATIVOS LTDA., inscrita no CNPJ sob o nº 36.446.561/0001-66, com sede à {endereco_padrao}"
            )
            fallback_companies = [
                {"nome": "GF SERVIÇOS DE CONTABILIDADE LTDA.", "cnpj": "36.583.021/0001-24"},
                {"nome": "E. REEVE MUSK SERVIÇOS DE CONTABILIDADE LTDA.", "cnpj": "40.897.585/0001-09"},
                {"nome": "HR HILL SERVIÇOS ADMINISTRATIVOS LTDA.", "cnpj": "36.446.561/0001-66"}
            ]
            return fallback_text, fallback_companies
    
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
            
            # Gerar texto dinâmico das empresas BPO e lista para assinaturas
            empresas_bpo_texto, empresas_bpo_lista = self._extract_bpo_companies(company_data)
            
            # Gerar seção de assinaturas dinamicamente
            self._generate_signature_section(empresas_bpo_lista)
            
            # Recarregar template após modificar assinaturas
            doc = Document(self.template_path)
            
            # Mapeamento de campos básicos
            field_mapping = {
                '[RAZÃO SOCIAL]': company_data['razao_social'],
                '[CNPJ]': company_data['cnpj'],
                '[ENDEREÇO]': company_data['endereco']
            }
            
            logger.info(f"Campos a serem substituídos: {list(field_mapping.keys())}")
            
            # Substituir campos nos parágrafos (atualizado para negrito)
            total_replacements = 0
            for i, paragraph in enumerate(doc.paragraphs):
                if 'S.JOBS SERVIÇOS DE CONTABILIDADE LTDA.' in paragraph.text and 'E. REEVE MUSK SERVICOS' in paragraph.text:
                    logger.info(f"Substituindo parágrafo {i} com texto dinâmico das empresas BPO")
                    paragraph.text = empresas_bpo_texto
                    total_replacements += 1
                elif 'ESPAÇO PROPOSITALMENTE DEIXADO EM BRANCO' in paragraph.text:
                    logger.info(f"Removendo parágrafo {i} com texto indesejado")
                    paragraph.text = ""  # Limpar o parágrafo
                    total_replacements += 1
                elif paragraph.text:
                    for run in paragraph.runs:
                        for placeholder, value in field_mapping.items():
                            if placeholder in run.text:
                                run.text = run.text.replace(placeholder, str(value))
                                run.bold = True
                                total_replacements += 1
                                logger.debug(f"Substituído '{placeholder}' por '{value[:50]}...' em run do parágrafo")
            
            # Verificar se também há campos em tabelas
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        if cell.text:
                            original_text = cell.text
                            new_text = original_text
                            
                            # Remover textos indesejados nas tabelas
                            if 'ESPAÇO PROPOSITALMENTE DEIXADO EM BRANCO' in new_text:
                                new_text = new_text.replace('*******ESPAÇO PROPOSITALMENTE DEIXADO EM BRANCO *********', '')
                                new_text = new_text.replace('ESPAÇO PROPOSITALMENTE DEIXADO EM BRANCO', '')
                                total_replacements += 1
                                logger.info("Removido texto indesejado da tabela")
                            
                            for placeholder, value in field_mapping.items():
                                if placeholder in new_text:
                                    new_text = new_text.replace(placeholder, str(value))
                                    total_replacements += 1
                                    logger.debug(f"Substituído '{placeholder}' por '{value[:50]}...' na tabela")
                            
                            if new_text != original_text:
                                cell.text = new_text
            
            logger.info(f"Total de substituições realizadas: {total_replacements}")
            logger.info(f"Texto das empresas BPO gerado: {empresas_bpo_texto[:100]}...")
            
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

    def convert_to_pdf(self, docx_path: str) -> str:
        """
        Converte um arquivo .docx existente para .pdf usando LibreOffice.
        
        Args:
            docx_path: O caminho absoluto para o arquivo .docx.
            
        Returns:
            O caminho para o arquivo .pdf gerado.
        """
        try:
            # Verificar se o arquivo .docx existe
            if not os.path.exists(docx_path):
                logger.error(f"Arquivo DOCX não encontrado: {docx_path}")
                raise FileNotFoundError(f"Arquivo DOCX não encontrado: {docx_path}")
            
            logger.info(f"Arquivo DOCX encontrado: {docx_path}, tamanho: {os.path.getsize(docx_path)} bytes")
            
            # Definir caminho de saída do PDF
            pdf_path = docx_path.replace('.docx', '.pdf')
            logger.info(f"Convertendo {docx_path} para PDF em {pdf_path}...")
            
            # Usar LibreOffice em modo headless para converter para PDF
            import subprocess
            import shutil
            
            # Comando padrão para Linux (onde o Docker está rodando)
            soffice_cmd = "soffice"
            
            # Verificar se o LibreOffice está disponível
            if shutil.which(soffice_cmd):
                logger.info(f"LibreOffice encontrado, usando para conversão")
                
                # Comando para converter DOCX para PDF
                cmd = [
                    soffice_cmd,
                    '--headless',
                    '--convert-to', 'pdf',
                    '--outdir', os.path.dirname(pdf_path),
                    docx_path
                ]
                
                # Executar o comando com timeout para evitar bloqueios
                logger.info(f"Executando comando: {' '.join(cmd)}")
                process = subprocess.Popen(
                    cmd, 
                    stdout=subprocess.PIPE, 
                    stderr=subprocess.PIPE
                )
                
                stdout, stderr = process.communicate(timeout=30)
                
                # Verificar o resultado da conversão
                if process.returncode != 0:
                    logger.error(f"Erro ao converter com LibreOffice: {stderr.decode()}")
                    raise RuntimeError(f"Falha na conversão para PDF: {stderr.decode()}")
                
                logger.info(f"Saída da conversão: {stdout.decode()}")
                
                # Verificar se o PDF foi gerado corretamente
                if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 0:
                    logger.info(f"PDF gerado com sucesso: {pdf_path}, tamanho: {os.path.getsize(pdf_path)} bytes")
                    return pdf_path
                else:
                    logger.error(f"PDF não foi gerado ou está vazio: {pdf_path}")
                    raise RuntimeError(f"PDF não foi gerado corretamente: {pdf_path}")
            else:
                # Se LibreOffice não estiver disponível, retornar o arquivo DOCX como alternativa
                logger.warning("LibreOffice não está disponível, retornando arquivo DOCX original")
                return docx_path
            
        except subprocess.TimeoutExpired as timeout_error:
            if 'process' in locals():
                process.kill()
            logger.error("Timeout ao executar LibreOffice")
            return docx_path
            
        except Exception as e:
            logger.error(f"Erro ao converter para PDF: {str(e)}")
            # Em caso de erro, retorna o arquivo DOCX original
            return docx_path
    
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
        Extrai o conteúdo textual completo de um documento Word na ordem original
        
        Args:
            file_path: Caminho para o arquivo .docx
            
        Returns:
            Conteúdo textual completo do documento com formatação preservada
        """
        try:
            from docx.oxml.table import CT_Tbl
            from docx.oxml.text.paragraph import CT_P
            from docx.table import Table
            from docx.text.paragraph import Paragraph
            import json
            
            doc = Document(file_path)
            content_lines = []
            
            logger.info("Extraindo conteúdo do documento para edição...")
            
            # Processar elementos na ordem que aparecem no documento
            for element in doc.element.body:
                if isinstance(element, CT_P):
                    # É um parágrafo
                    paragraph = Paragraph(element, doc)
                    paragraph_text = paragraph.text.strip()
                    
                    # Incluir TODOS os parágrafos, mesmo vazios (para manter correspondência)
                    if paragraph_text:
                        content_lines.append(paragraph_text)
                        logger.debug(f"Parágrafo extraído: '{paragraph_text}'")
                    else:
                        # Parágrafos vazios também são importantes para manter estrutura
                        content_lines.append("")
                    
                elif isinstance(element, CT_Tbl):
                    # É uma tabela - converter para JSON
                    table = Table(element, doc)
                    
                    # Verificar se a tabela tem conteúdo
                    has_content = False
                    table_rows = []
                    
                    for row in table.rows:
                        row_cells = []
                        for cell in row.cells:
                            # Preservar quebras de linha dentro das células
                            cell_text = cell.text.strip()
                            if cell_text:
                                has_content = True
                            row_cells.append(cell_text)
                        table_rows.append(row_cells)
                    
                    if has_content and table_rows:
                        # Converter tabela para JSON que o frontend pode processar
                        table_json = json.dumps(table_rows, ensure_ascii=False)
                        logger.debug(f"Tabela extraída com {len(table_rows)} linhas e {max(len(row) for row in table_rows) if table_rows else 0} colunas")
                        
                        # Adicionar quebras de linha antes e depois para garantir que fique isolado
                        content_lines.append('')  # Linha em branco antes
                        content_lines.append(f"[TABELA_JSON]{table_json}[/TABELA_JSON]")
                        content_lines.append('')  # Linha em branco depois
            
            final_content = '\n'.join(content_lines)
            logger.info(f"Extração concluída: {len(content_lines)} linhas totais")
            
            return final_content
            
        except Exception as e:
            logger.error(f"Erro ao extrair conteúdo: {str(e)}")
            # Fallback simples
            try:
                doc = Document(file_path)
                content_lines = []
                for paragraph in doc.paragraphs:
                    content_lines.append(paragraph.text)
                return '\n'.join(content_lines)
            except:
                return ""
    
    def apply_text_edits(self, contract_path: str, new_content: str) -> str:
        """
        Aplica edições de texto completo ao contrato, reconstruindo tabelas corretamente
        
        Args:
            contract_path: Caminho do contrato original
            new_content: Novo conteúdo completo do contrato
            
        Returns:
            Caminho do novo arquivo editado
        """
        try:
            logger.info(f"Aplicando edições de texto completo ao contrato: {contract_path}")
            
            # Criar novo documento
            doc = Document()
            
            # Dividir conteúdo em linhas
            lines = new_content.split('\n')
            
            i = 0
            while i < len(lines):
                line = lines[i]
                
                # Verificar se é início de uma tabela (formato JSON)
                if "[TABELA_JSON]" in line:
                    import json
                    import re
                    
                    # Extrair JSON da linha
                    json_match = re.search(r'\[TABELA_JSON\](.*?)\[/TABELA_JSON\]', line)
                    if json_match:
                        try:
                            table_data = json.loads(json_match.group(1))
                            
                            if table_data and len(table_data) > 0:
                                # Determinar número de colunas
                                max_cols = max(len(row) for row in table_data) if table_data else 0
                                
                                # Criar tabela
                                table = doc.add_table(rows=len(table_data), cols=max_cols)
                                table.style = 'Table Grid'
                                
                                # Preencher dados
                                for row_idx, row_data in enumerate(table_data):
                                    for col_idx, cell_data in enumerate(row_data):
                                        if col_idx < max_cols and row_idx < len(table.rows):
                                            table.rows[row_idx].cells[col_idx].text = str(cell_data)
                                
                                logger.info(f"Tabela JSON reconstruída com {len(table_data)} linhas e {max_cols} colunas")
                        except json.JSONDecodeError as e:
                            logger.error(f"Erro ao decodificar JSON da tabela: {e}")
                            # Em caso de erro, adicionar como texto normal
                            doc.add_paragraph(line)
                    i += 1
                
                # Verificar se é início de uma tabela (novo formato)
                if line.strip() == "┌─ TABELA ─┐":
                    # Coletar linhas da tabela até encontrar o fechamento
                    table_lines = []
                    i += 1
                    
                    # Coletar todas as linhas da tabela
                    while i < len(lines):
                        current_line = lines[i]
                        if current_line.strip().startswith('└─') and '─┘' in current_line:
                            # Fim da tabela
                            break
                        elif current_line.strip().startswith('│') and current_line.strip().endswith('│'):
                            # Linha de dados da tabela
                            table_lines.append(current_line)
                        elif current_line.strip().startswith('├─') and '─┤' in current_line:
                            # Linha separadora - ignorar
                            pass
                        i += 1
                    
                    # Processar dados da tabela
                    if table_lines:
                        table_data = []
                        for table_line in table_lines:
                            # Remover │ do início e fim, dividir por │
                            clean_line = table_line.strip()
                            if clean_line.startswith('│') and clean_line.endswith('│'):
                                clean_line = clean_line[1:-1]  # Remover │ do início e fim
                                cells = [cell.strip() for cell in clean_line.split('│')]
                                if cells and any(cell.strip() for cell in cells):  # Se tem conteúdo
                                    table_data.append(cells)
                        
                        # Criar tabela se tiver dados
                        if table_data:
                            # Determinar número máximo de colunas
                            max_cols = max(len(row) for row in table_data)
                            
                            # Criar tabela
                            table = doc.add_table(rows=len(table_data), cols=max_cols)
                            
                            # Preencher dados
                            for row_idx, row_data in enumerate(table_data):
                                for col_idx, cell_data in enumerate(row_data):
                                    if col_idx < max_cols:
                                        table.cell(row_idx, col_idx).text = cell_data.strip()
                            
                            # Adicionar parágrafo vazio após tabela
                            doc.add_paragraph()
                            
                            logger.info(f"Tabela reconstruída com {len(table_data)} linhas e {max_cols} colunas")
                    
                    i += 1  # Pular linha de fechamento da tabela
                    
                # Verificar se é início de uma tabela (formato antigo com [INÍCIO_TABELA])
                elif line.strip() == "[INÍCIO_TABELA]":
                    # Coletar linhas da tabela até encontrar [FIM_TABELA]
                    table_rows = []
                    i += 1
                    
                    while i < len(lines) and lines[i].strip() != "[FIM_TABELA]":
                        if lines[i].strip():  # Ignorar linhas vazias dentro da tabela
                            # Dividir por [CÉLULA] para obter células
                            cells = lines[i].split(" [CÉLULA] ")
                            if cells:
                                table_rows.append(cells)
                        i += 1
                    
                    # Criar tabela se tiver dados
                    if table_rows:
                        # Determinar número máximo de colunas
                        max_cols = max(len(row) for row in table_rows)
                        
                        # Criar tabela
                        table = doc.add_table(rows=len(table_rows), cols=max_cols)
                        
                        # Preencher dados
                        for row_idx, row_data in enumerate(table_rows):
                            for col_idx, cell_data in enumerate(row_data):
                                if col_idx < max_cols:
                                    table.cell(row_idx, col_idx).text = cell_data.strip()
                        
                        # Adicionar parágrafo vazio após tabela
                        doc.add_paragraph()
                        
                        logger.info(f"Tabela (formato antigo) reconstruída com {len(table_rows)} linhas e {max_cols} colunas")
                    
                    i += 1  # Pular [FIM_TABELA]
                    
                else:
                    # Linha normal - adicionar como parágrafo
                    if line.strip():
                        doc.add_paragraph(line)
                    else:
                        doc.add_paragraph()  # Parágrafo vazio para espaçamento
                    i += 1
            
            # Salvar arquivo editado
            base_filename = os.path.basename(contract_path)
            name_without_ext = os.path.splitext(base_filename)[0]
            edited_filename = f"{name_without_ext}_editado.docx"
            edited_filepath = os.path.join(tempfile.gettempdir(), edited_filename)
            
            doc.save(edited_filepath)
            logger.info(f"Contrato editado salvo: {edited_filepath}")
            
            return edited_filepath
            
        except Exception as e:
            logger.error(f"Erro ao aplicar edições de texto: {str(e)}")
            raise

    def apply_selective_edits(self, contract_path: str, new_content: str) -> str:
        """
        Aplica edições diretamente no documento original preservando TODA formatação,
        imagens, tabelas complexas, etc. Só modifica o texto que realmente mudou.
        
        Args:
            contract_path: Caminho do contrato original
            new_content: Novo conteúdo completo editado
            
        Returns:
            Caminho do novo arquivo editado
        """
        try:
            logger.info(f"🔧 INICIANDO edição in-place: {contract_path}")
            
            import shutil
            import tempfile
            import json
            import re
            
            # Criar cópia do arquivo original
            base_filename = os.path.basename(contract_path)
            name_without_ext = os.path.splitext(base_filename)[0]
            edited_filename = f"{name_without_ext}_editado.docx"
            edited_filepath = os.path.join(tempfile.gettempdir(), edited_filename)
            
            # Copiar arquivo original (mantém TUDO: imagens, formatação, etc.)
            shutil.copy2(contract_path, edited_filepath)
            logger.info(f"📋 Arquivo copiado para: {edited_filepath}")
            
            # Carregar o documento copiado
            doc = Document(edited_filepath)
            
            # DEBUG: Vamos ver o que temos no novo conteúdo
            logger.info(f"📝 NOVO CONTEÚDO recebido ({len(new_content)} chars):")
            logger.info(f"Primeiras 500 chars: {new_content[:500]}...")
            
            new_lines = new_content.split('\n')
            logger.info(f"📄 Novo conteúdo tem {len(new_lines)} linhas")
            
            # DEBUG: Vamos ver o conteúdo atual do documento
            current_paragraphs = []
            current_tables = []
            
            para_count = 0
            table_count = 0
            
            logger.info("🔍 MAPEANDO documento atual:")
            
            for element in doc.element.body:
                if element.tag.endswith('p'):  # Parágrafo
                    para = None
                    for p in doc.paragraphs:
                        if p._element == element:
                            para = p
                            break
                    if para:
                        current_paragraphs.append(para)
                        logger.info(f"  📝 Parágrafo {para_count}: '{para.text[:100]}...'")
                        para_count += 1
                        
                elif element.tag.endswith('tbl'):  # Tabela
                    table = None
                    for t in doc.tables:
                        if t._element == element:
                            table = t
                            break
                    if table:
                        current_tables.append(table)
                        logger.info(f"  📊 Tabela {table_count}: {len(table.rows)} linhas x {len(table.columns)} colunas")
                        table_count += 1
            
            logger.info(f"📊 DOCUMENTO MAPEADO: {len(current_paragraphs)} parágrafos, {len(current_tables)} tabelas")
            
            # Agora vamos aplicar as mudanças linha por linha
            new_line_index = 0
            para_index = 0
            table_index = 0
            changes_made = 0
            
            # Processar cada elemento na ordem que aparece no documento
            for element in doc.element.body:
                if element.tag.endswith('p') and new_line_index < len(new_lines):  # Parágrafo
                    new_line = new_lines[new_line_index].strip()
                    
                    # Pular linhas de tabela JSON
                    if "[TABELA_JSON]" in new_line:
                        new_line_index += 1
                        continue
                    
                    # Encontrar o parágrafo correspondente
                    para = None
                    for p in doc.paragraphs:
                        if p._element == element:
                            para = p
                            break
                    
                    if para:
                        current_text = para.text.strip()
                        
                        logger.info(f"🔄 Comparando parágrafo {para_index}:")
                        logger.info(f"   ATUAL: '{current_text}'")
                        logger.info(f"   NOVO:  '{new_line}'")
                        
                        # SEMPRE aplicar o novo texto (não comparar)
                        logger.info(f"✏️ APLICANDO mudança no parágrafo {para_index}")
                        
                        # Verificar se o novo conteúdo está vazio (parágrafo deletado)
                        if not new_line or new_line.strip() == "":
                            logger.info(f"🗑️ REMOVENDO parágrafo {para_index} (conteúdo vazio)")
                            # Limpar completamente o parágrafo
                            para.clear()
                            # Deixar parágrafo vazio (será renderizado como espaço)
                            para.add_run("")
                        else:
                            # Preservar formatação do primeiro run
                            original_format = None
                            if para.runs:
                                first_run = para.runs[0]
                                original_format = {
                                    'font_name': first_run.font.name,
                                    'font_size': first_run.font.size,
                                    'font_bold': first_run.font.bold,
                                    'font_italic': first_run.font.italic,
                                }
                            
                            # Limpar parágrafo e aplicar novo texto
                            para.clear()
                            new_run = para.add_run(new_line)
                            
                            # Reaplicar formatação se existia
                            if original_format:
                                if original_format['font_name']:
                                    new_run.font.name = original_format['font_name']
                                if original_format['font_size']:
                                    new_run.font.size = original_format['font_size']
                                if original_format['font_bold']:
                                    new_run.font.bold = original_format['font_bold']
                                if original_format['font_italic']:
                                    new_run.font.italic = original_format['font_italic']
                        
                        changes_made += 1
                        logger.info(f"✅ Parágrafo {para_index} atualizado com sucesso")
                        
                        para_index += 1
                    
                    new_line_index += 1
                
                elif element.tag.endswith('tbl') and new_line_index < len(new_lines):  # Tabela
                    line = new_lines[new_line_index]
                    
                    logger.info(f"🔄 Processando linha de tabela {table_index}: {line[:100]}...")
                    
                    if "[TABELA_JSON]" in line:
                        json_match = re.search(r'\[TABELA_JSON\](.*?)\[/TABELA_JSON\]', line)
                        if json_match and table_index < len(current_tables):
                            try:
                                table_data = json.loads(json_match.group(1))
                                table = current_tables[table_index]
                                
                                logger.info(f"✏️ APLICANDO dados na tabela {table_index}: {len(table_data)} linhas")
                                
                                # Atualizar células mantendo formatação original
                                for row_idx, row_data in enumerate(table_data):
                                    if row_idx < len(table.rows):
                                        row = table.rows[row_idx]
                                        for col_idx, cell_data in enumerate(row_data):
                                            if col_idx < len(row.cells):
                                                cell = row.cells[col_idx]
                                                
                                                # Preservar formatação da primeira célula
                                                original_format = None
                                                if cell.paragraphs and cell.paragraphs[0].runs:
                                                    first_run = cell.paragraphs[0].runs[0]
                                                    original_format = {
                                                        'font_name': first_run.font.name,
                                                        'font_size': first_run.font.size,
                                                        'font_bold': first_run.font.bold,
                                                        'font_italic': first_run.font.italic,
                                                    }
                                                
                                                # Aplicar novo conteúdo
                                                cell.text = ""
                                                para = cell.paragraphs[0]
                                                new_run = para.add_run(str(cell_data))
                                                
                                                # Reaplicar formatação
                                                if original_format:
                                                    if original_format['font_name']:
                                                        new_run.font.name = original_format['font_name']
                                                    if original_format['font_size']:
                                                        new_run.font.size = original_format['font_size']
                                                    if original_format['font_bold']:
                                                        new_run.font.bold = original_format['font_bold']
                                                    if original_format['font_italic']:
                                                        new_run.font.italic = original_format['font_italic']
                                
                                changes_made += 1
                                logger.info(f"✅ Tabela {table_index} atualizada com sucesso")
                                
                            except json.JSONDecodeError as e:
                                logger.error(f"❌ Erro ao processar JSON da tabela: {e}")
                        
                        table_index += 1
                    
                    new_line_index += 1
            
            # Salvar documento modificado
            doc.save(edited_filepath)
            logger.info(f"💾 Documento salvo com {changes_made} modificações aplicadas")
            logger.info(f"📁 Arquivo final: {edited_filepath}")
            
            return edited_filepath
            
        except Exception as e:
            logger.error(f"❌ ERRO ao aplicar edições in-place: {str(e)}")
            logger.exception("Detalhes completos do erro:")
            
            # Fallback: retornar arquivo original
            import shutil
            base_filename = os.path.basename(contract_path)
            name_without_ext = os.path.splitext(base_filename)[0]
            fallback_filename = f"{name_without_ext}_editado.docx"
            fallback_filepath = os.path.join(tempfile.gettempdir(), fallback_filename)
            shutil.copy2(contract_path, fallback_filepath)
            logger.info(f"📋 Fallback: retornando cópia do original: {fallback_filepath}")
            return fallback_filepath

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
