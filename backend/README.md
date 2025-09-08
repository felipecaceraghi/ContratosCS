# ContratosCS
Emissão automatizada de contratos de clientes para o CS

## Desenvolvimento Local

### Pré-requisitos
- Python 3.12+
- Virtual Environment

### Instalação
```bash
# Criar ambiente virtual
python -m venv env

# Ativar ambiente
env\Scripts\activate  # Windows
# source env/bin/activate  # Linux/Mac

# Instalar dependências
pip install -r requirements.txt
```

### Configuração
1. Copie `.env.example` para `.env`
2. Configure as variáveis de ambiente no `.env`

### Executar
```bash
python app.py
# A aplicação será executada na porta 5004
```

### Testes
```bash
# Executar todos os testes
pytest tests/ -v

# Modo watch (execução automática)
ptw tests/
```

## Docker

### Construir e Executar
```bash
# Com Docker Compose (recomendado)
docker-compose up -d

# Ou com Docker puro
docker build -t contratos-cs .
docker run -d --name contratos-app -p 5004:5000 contratos-cs
```

### Acessar
- API: http://localhost:5004
- Documentação: Em breve

## Endpoints

- `GET /` - Status da API
- `POST /login` - Login com email/senha
- `GET /users/<email>` - Buscar usuário por email

## Estrutura do Projeto
```
├── app.py                 # Aplicação principal
├── models/               # Modelos de dados
├── routes/               # Rotas da API
├── services/             # Lógica de negócio
├── tests/                # Testes
├── infra/                # Banco de dados
├── .env                  # Variáveis de ambiente
├── Dockerfile            # Configuração Docker
├── docker-compose.yml    # Orquestração Docker
└── requirements.txt      # Dependências Python
```
