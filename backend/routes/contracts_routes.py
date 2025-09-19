"""
Rotas para geração e download de contratos
"""
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
import os
import tempfile
import sqlite3
import json
from services.contract_generation_service import ContractGenerationService
from services.excel_sync_service import ExcelSyncService
from models.companies import get_company_details, search_companies

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

contracts_bp = Blueprint('contracts', __name__)

@contracts_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_contract():
    """
    Gera contratos para uma empresa específica ou para todas as empresas de um grupo
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados são obrigatórios'
            }), 400
        
        # Verificar se é geração por CNPJ individual ou por grupo
        cnpj = data.get('cnpj')
        group_name = data.get('group_name')
        
        if not cnpj and not group_name:
            return jsonify({
                'success': False,
                'error': 'CNPJ ou group_name é obrigatório'
            }), 400
        
        # Primeiro, sincronizar dados do SharePoint para garantir informações atualizadas
        try:
            sync_service = ExcelSyncService()
            sync_result = sync_service.sync_companies_from_sharepoint()
            logger.info(f"Sincronização SharePoint: {sync_result['message']}")
        except Exception as sync_error:
            logger.warning(f"Erro na sincronização SharePoint: {str(sync_error)}")
            # Continuar mesmo com erro de sincronização
        
        if group_name:
            # Geração por grupo - buscar todas as empresas do grupo
            logger.info(f"Usuário {user_id} solicitou geração de contratos para grupo: {group_name}")
            
            import sqlite3
            db_path = os.getenv('DATABASE_PATH', 'infra/contracts.db')
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Buscar todas as empresas do grupo
            cursor.execute('''
                SELECT * FROM companies_data 
                WHERE group_name = ?
                ORDER BY cod
            ''', (group_name,))
            
            companies = cursor.fetchall()
            conn.close()
            
            if not companies:
                return jsonify({
                    'success': False,
                    'error': f'Nenhuma empresa encontrada no grupo: {group_name}'
                }), 404
            
            # Retornar lista de empresas para geração individual no frontend
            companies_list = []
            for company in companies:
                company_dict = dict(company)
                
                # Parse do JSON armazenado no campo companie_data
                import json
                if company_dict.get('companie_data'):
                    try:
                        parsed_data = json.loads(company_dict['companie_data'])
                        company_dict['companie_data'] = parsed_data
                    except json.JSONDecodeError:
                        company_dict['companie_data'] = {}
                else:
                    company_dict['companie_data'] = {}
                
                companies_list.append(company_dict)
            
            return jsonify({
                'success': True,
                'type': 'group',
                'message': f'Encontradas {len(companies_list)} empresas no grupo {group_name}',
                'group_name': group_name,
                'companies': companies_list,
                'total_companies': len(companies_list)
            })
        
        else:
            # Geração individual por CNPJ (comportamento original)
            logger.info(f"Usuário {user_id} solicitou geração de contrato para CNPJ: {cnpj}")
            
            # Buscar dados da empresa
            company_data = get_company_details(cnpj)
            
            if not company_data:
                return jsonify({
                    'success': False,
                    'error': 'Empresa não encontrada'
                }), 404
            
            logger.info(f"Dados da empresa encontrados: {company_data.get('razao_social', 'N/A')}")
            
            # Validar se há dados suficientes para geração do contrato
            required_fields = ['razao_social', 'cnpj']
            missing_fields = []
            
            for field in required_fields:
                if not company_data.get(field):
                    missing_fields.append(field)
            
            # Para endereço, usar exatamente o campo "Endereço" como especificado
            endereco = company_data.get('Endereço')
            
            if not endereco:
                missing_fields.append('endereco')
            
            if missing_fields:
                return jsonify({
                    'success': False,
                    'error': f'Dados insuficientes para gerar contrato. Campos ausentes: {", ".join(missing_fields)}',
                    'missing_fields': missing_fields
                }), 400
            
            # Preparar dados para o template
            contract_data = {
                'razao_social': company_data.get('Razão Social'),  # Campo exato como especificado
                'cnpj': company_data.get('CNPJ'),                  # Campo exato como especificado
                'endereco': endereco                               # Campo "Endereço" como especificado
            }
            
            logger.info(f"Dados preparados para contrato: {contract_data}")
            
            # Gerar contrato
            contract_service = ContractGenerationService()
            contract_path = contract_service.generate_contract(contract_data)
            
            # Retornar informações do arquivo gerado
            filename = os.path.basename(contract_path)
            
            return jsonify({
                'success': True,
                'type': 'individual',
                'message': 'Contrato gerado com sucesso',
                'contract_file': filename,
                'download_url': f'/api/contracts/download/{filename}',
                'company_data': {
                    'razao_social': contract_data['razao_social'],
                    'cnpj': contract_data['cnpj']
                }
            })
        
    except ValueError as ve:
        logger.error(f"Erro de validação: {str(ve)}")
        return jsonify({
            'success': False,
            'error': str(ve)
        }), 400
        
    except Exception as e:
        logger.error(f"Erro interno ao gerar contrato: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

@contracts_bp.route('/generate-individual', methods=['POST'])
@jwt_required()
def generate_individual_contract():
    """
    Gera um contrato para uma empresa específica usando código da empresa
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'cod' not in data:
            return jsonify({
                'success': False,
                'error': 'Código da empresa é obrigatório'
            }), 400
        
        cod = data['cod']
        logger.info(f"Usuário {user_id} solicitou geração de contrato para empresa: {cod}")
        
        # Buscar dados da empresa na tabela companies_data
        db_path = os.getenv('DATABASE_PATH', 'infra/contracts.db')
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM companies_data 
            WHERE cod = ?
        ''', (cod,))
        
        company_row = cursor.fetchone()
        conn.close()
        
        if not company_row:
            return jsonify({
                'success': False,
                'error': f'Empresa com código {cod} não encontrada'
            }), 404
        
        # Converter para dict e parsear JSON
        company_dict = dict(company_row)
        if company_dict.get('companie_data'):
            try:
                parsed_data = json.loads(company_dict['companie_data'])
                company_dict['companie_data'] = parsed_data
            except json.JSONDecodeError:
                company_dict['companie_data'] = {}
        else:
            company_dict['companie_data'] = {}
        
        # Extrair dados necessários para o contrato
        companie_data = company_dict['companie_data']
        
        # Validar campos obrigatórios
        razao_social = companie_data.get('Razão Social') or companie_data.get('razao_social')
        cnpj = companie_data.get('CNPJ') or companie_data.get('cnpj')
        endereco = companie_data.get('Endereço') or companie_data.get('endereco')
        
        missing_fields = []
        if not razao_social:
            missing_fields.append('razao_social')
        if not cnpj:
            missing_fields.append('cnpj')
        if not endereco:
            missing_fields.append('endereco')
        
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Dados insuficientes para gerar contrato. Campos ausentes: {", ".join(missing_fields)}',
                'missing_fields': missing_fields,
                'available_data': list(companie_data.keys()) if companie_data else []
            }), 400
        
        # Preparar dados para o template
        contract_data = {
            'razao_social': razao_social,
            'cnpj': cnpj,
            'endereco': endereco
        }
        
        logger.info(f"Dados preparados para contrato: {contract_data}")
        
        # Gerar contrato
        contract_service = ContractGenerationService()
        contract_path = contract_service.generate_contract(contract_data)
        
        # Retornar informações do arquivo gerado
        filename = os.path.basename(contract_path)
        
        return jsonify({
            'success': True,
            'message': 'Contrato gerado com sucesso',
            'contract_file': filename,
            'download_url': f'/api/contracts/download/{filename}',
            'company_data': {
                'cod': cod,
                'razao_social': razao_social,
                'cnpj': cnpj
            }
        })
        
    except Exception as e:
        logger.error(f"Erro interno ao gerar contrato individual: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500



@contracts_bp.route('/download/<filename>', methods=['GET'])
@jwt_required()
def download_contract(filename):
    """
    Faz download de um contrato .docx gerado.
    """
    try:
        user_id = get_jwt_identity()
        logger.info(f"Usuário {user_id} solicitou download do arquivo: {filename}")
        
        if '..' in filename or '/' in filename:
            return jsonify({'success': False, 'error': 'Nome de arquivo inválido'}), 400
        
        file_path = os.path.join(tempfile.gettempdir(), filename)
        
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'error': 'Arquivo não encontrado'}), 404
        
        return send_file(
            file_path,
            as_attachment=True,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
    except Exception as e:
        logger.error(f"Erro ao fazer download do DOCX: {str(e)}")
        return jsonify({'success': False, 'error': 'Erro interno do servidor'}), 500

@contracts_bp.route('/download-as-pdf/<filename>', methods=['GET'])
@jwt_required()
def download_as_pdf(filename):
    """
    Converte um contrato .docx existente para .pdf e faz o download.
    """
    try:
        user_id = get_jwt_identity()
        logger.info(f"Usuário {user_id} solicitou download como PDF para o arquivo: {filename}")

        if not filename.endswith('.docx') or '..' in filename or '/' in filename:
            return jsonify({'success': False, 'error': 'Nome de arquivo inválido'}), 400

        docx_path = os.path.join(tempfile.gettempdir(), filename)

        if not os.path.exists(docx_path):
            return jsonify({'success': False, 'error': 'Arquivo DOCX original não encontrado'}), 404

        contract_service = ContractGenerationService()
        pdf_path = contract_service.convert_to_pdf(docx_path)

        return send_file(
            pdf_path,
            as_attachment=True,
            mimetype='application/pdf'
        )

    except Exception as e:
        logger.error(f"Erro ao converter e baixar PDF: {str(e)}")
        return jsonify({'success': False, 'error': 'Erro interno do servidor ao gerar PDF'}), 500

@contracts_bp.route('/template/info', methods=['GET'])
@jwt_required()
def get_template_info():
    """
    Retorna informações sobre o template de contrato
    """
    try:
        contract_service = ContractGenerationService()
        template_info = contract_service.validate_template()
        
        return jsonify({
            'success': True,
            'template_info': template_info
        })
        
    except Exception as e:
        logger.error(f"Erro ao obter informações do template: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erro ao acessar template'
        }), 500

@contracts_bp.route('/content/<filename>', methods=['GET'])
@jwt_required()
def get_contract_content(filename):
    """
    Retorna o conteúdo textual de um contrato para visualização/edição
    """
    try:
        user_id = get_jwt_identity()
        logger.info(f"Usuário {user_id} solicitou conteúdo do arquivo: {filename}")
        
        # Validar nome do arquivo por segurança
        if not filename.endswith('.docx') or '..' in filename or '/' in filename:
            return jsonify({
                'success': False,
                'error': 'Nome de arquivo inválido'
            }), 400
        
        # Caminho do arquivo temporário
        file_path = os.path.join(tempfile.gettempdir(), filename)
        
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'Arquivo não encontrado'
            }), 404
        
        # Ler conteúdo do Word usando o serviço
        from services.contract_generation_service import ContractGenerationService
        contract_service = ContractGenerationService()
        content = contract_service.extract_text_content(file_path)
        
        return jsonify({
            'success': True,
            'content': content,
            'filename': filename
        })
        
    except Exception as e:
        logger.error(f"Erro ao ler conteúdo do contrato: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

@contracts_bp.route('/update/<filename>', methods=['POST'])
@jwt_required()
def update_contract(filename):
    """
    Atualiza um contrato com dados editados de forma mais controlada
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'content' not in data:
            return jsonify({
                'success': False,
                'error': 'Conteúdo é obrigatório'
            }), 400
        
        # Validar nome do arquivo
        if not filename.endswith('.docx') or '..' in filename or '/' in filename:
            return jsonify({
                'success': False,
                'error': 'Nome de arquivo inválido'
            }), 400
        
        # Caminho do arquivo temporário
        file_path = os.path.join(tempfile.gettempdir(), filename)
        
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'Arquivo não encontrado'
            }), 404
        
        # Extrair dados específicos do conteúdo editado
        new_content = data['content']
        
        # Usar regex para extrair campos específicos do texto editado
        import re
        
        # Buscar padrão da linha do contratante
        contratante_pattern = r'([^,\n]*?),\s*inscrita no CNPJ sob o nº ([0-9/.,-]+),\s*com sede à ([^,]+(?:,[^,]+)*?)(?:,\s*neste ato|$)'
        match = re.search(contratante_pattern, new_content, re.IGNORECASE)
        
        if match:
            razao_social = match.group(1).strip()
            cnpj = match.group(2).strip()
            endereco = match.group(3).strip()
            
            # Recriar o documento usando o template original com os novos dados
            contract_service = ContractGenerationService()
            
            # Dados atualizados
            updated_data = {
                'razao_social': razao_social,
                'cnpj': cnpj,
                'endereco': endereco
            }
            
            logger.info(f"Atualizando contrato com dados: {updated_data}")
            
            # Gerar novo contrato com dados atualizados
            new_contract_path = contract_service.generate_contract(updated_data)
            
            # Substituir o arquivo original
            import shutil
            shutil.move(new_contract_path, file_path)
            
            return jsonify({
                'success': True,
                'message': 'Contrato atualizado com sucesso',
                'updated_data': updated_data
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Não foi possível identificar os dados do contratante no texto editado'
            }), 400
        
    except Exception as e:
        logger.error(f"Erro ao atualizar contrato: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

@contracts_bp.route('/content/<filename>', methods=['PUT'])
@jwt_required()
def update_contract_content(filename):
    """
    Atualiza o conteúdo de um contrato
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'content' not in data:
            return jsonify({
                'success': False,
                'error': 'Conteúdo é obrigatório'
            }), 400
        
        new_content = data['content']
        logger.info(f"Usuário {user_id} atualizando conteúdo do arquivo: {filename}")
        
        # Validar nome do arquivo por segurança
        if not filename.endswith('.docx') or '..' in filename or '/' in filename:
            return jsonify({
                'success': False,
                'error': 'Nome de arquivo inválido'
            }), 400
        
        # Caminho do arquivo temporário
        file_path = os.path.join(tempfile.gettempdir(), filename)
        
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'Arquivo não encontrado'
            }), 404
        
        # Atualizar documento Word usando o serviço
        from services.contract_generation_service import ContractGenerationService
        contract_service = ContractGenerationService()
        
        success = contract_service.update_document_content(file_path, new_content)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Erro ao atualizar documento'
            }), 500
        
        logger.info(f"Contrato atualizado com sucesso: {filename}")
        
        return jsonify({
            'success': True,
            'message': 'Contrato atualizado com sucesso',
            'filename': filename
        })
        
    except Exception as e:
        logger.error(f"Erro ao atualizar contrato: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

@contracts_bp.route('/save-edits/<filename>', methods=['POST'])
@jwt_required()
def save_contract_edits(filename):
    """
    Salva as edições feitas no contrato
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'content' not in data:
            return jsonify({
                'success': False,
                'error': 'Conteúdo é obrigatório'
            }), 400
        
        logger.info(f"Usuário {user_id} salvando edições do arquivo: {filename}")
        
        # Validar nome do arquivo
        if not filename.endswith('.docx') or '..' in filename or '/' in filename:
            return jsonify({
                'success': False,
                'error': 'Nome de arquivo inválido'
            }), 400
        
        # Caminho do arquivo original
        original_path = os.path.join(tempfile.gettempdir(), filename)
        
        if not os.path.exists(original_path):
            return jsonify({
                'success': False,
                'error': 'Arquivo original não encontrado'
            }), 404
        
        # Aplicar edições
        contract_service = ContractGenerationService()
        edited_path = contract_service.apply_text_edits(original_path, data['content'])
        
        # Retornar informações do arquivo editado
        edited_filename = os.path.basename(edited_path)
        
        return jsonify({
            'success': True,
            'message': 'Edições salvas com sucesso',
            'edited_file': edited_filename,
            'download_url': f'/api/contracts/download/{edited_filename}'
        })
        
    except Exception as e:
        logger.error(f"Erro ao salvar edições: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

@contracts_bp.route('/preview', methods=['POST'])
@jwt_required()
def preview_contract_data():
    """
    Prévia dos dados que serão usados no contrato sem gerar o arquivo
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'cnpj' not in data:
            return jsonify({
                'success': False,
                'error': 'CNPJ é obrigatório'
            }), 400
        
        cnpj = data['cnpj']
        logger.info(f"Usuário {user_id} solicitou prévia de contrato para CNPJ: {cnpj}")
        
        # Buscar dados da empresa
        company_data = get_company_details(cnpj)
        
        if not company_data:
            return jsonify({
                'success': False,
                'error': 'Empresa não encontrada'
            }), 404
        
        # Preparar dados para prévia
        endereco = company_data.get('Endereço')  # Campo exato como especificado
        
        preview_data = {
            'razao_social': company_data.get('Razão Social', ''),  # Campo exato como especificado
            'cnpj': company_data.get('CNPJ', ''),                  # Campo exato como especificado
            'endereco': endereco or ''                             # Campo "Endereço" como especificado
        }
        
        # Verificar quais campos estão ausentes
        missing_fields = []
        for field, value in preview_data.items():
            if not value:
                missing_fields.append(field)
        
        return jsonify({
            'success': True,
            'preview_data': preview_data,
            'missing_fields': missing_fields,
            'can_generate': len(missing_fields) == 0,
            'all_company_data': company_data
        })
        
    except Exception as e:
        logger.error(f"Erro ao gerar prévia: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500
