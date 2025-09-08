"""
Rotas para geração e download de contratos
"""
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
import os
import tempfile
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
    Gera um contrato para uma empresa específica
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
        logger.info(f"Usuário {user_id} solicitou geração de contrato para CNPJ: {cnpj}")
        
        # Primeiro, sincronizar dados do SharePoint para garantir informações atualizadas
        try:
            sync_service = ExcelSyncService()
            sync_result = sync_service.sync_companies_from_sharepoint()
            logger.info(f"Sincronização SharePoint: {sync_result['message']}")
        except Exception as sync_error:
            logger.warning(f"Erro na sincronização SharePoint: {str(sync_error)}")
            # Continuar mesmo com erro de sincronização
        
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

@contracts_bp.route('/download/<filename>', methods=['GET'])
@jwt_required()
def download_contract(filename):
    """
    Faz download de um contrato gerado
    """
    try:
        user_id = get_jwt_identity()
        logger.info(f"Usuário {user_id} solicitou download do arquivo: {filename}")
        
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
        
        # Enviar arquivo
        return send_file(
            file_path,
            as_attachment=True,
            download_name=f"contrato_{filename}",
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
    except Exception as e:
        logger.error(f"Erro ao fazer download: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

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
