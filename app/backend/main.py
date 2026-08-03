import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .database import engine, Base, get_db
from .models import ModelConfig, PromptTemplate, UserSettings
from .routes import (
    models_route,
    chat_route,
    prompts_route,
    conversations_route,
    metrics_route,
    settings_route
)

# Criar tabelas no banco SQLite
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AirLLM Enterprise Platform",
    description="Servidor de Execução e Gerenciamento do AirLLM com Streaming de Camadas e Baixo Consumo de VRAM",
    version="3.0.0-Julho2026"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar roteadores
app.include_router(models_route.router)
app.include_router(chat_route.router)
app.include_router(prompts_route.router)
app.include_router(conversations_route.router)
app.include_router(metrics_route.router)
app.include_router(settings_route.router)

# Função para popular o banco de dados inicial (Seed PT-BR)
def seed_initial_data():
    db = next(get_db())
    try:
        # 1. Seed de Modelos Top de Linha (Julho 2026)
        if db.query(ModelConfig).count() == 0:
            models_seed = [
                ModelConfig(
                    name="Llama 3.1 405B Instruct",
                    hf_repo_id="meta-llama/Llama-3.1-405B-Instruct",
                    description="O maior modelo open-source da Meta. Executa streaming de camadas em GPUs de 8GB com precisão original.",
                    parameters_billions=405.0,
                    compression="layer_streaming",
                    max_seq_len=8192,
                    vram_required_gb=8.0,
                    is_active=True
                ),
                ModelConfig(
                    name="DeepSeek-V3 671B MoE",
                    hf_repo_id="deepseek-ai/DeepSeek-V3",
                    description="Arquitetura Sparse MoE com 671B parâmetros executando em ~12GB via streaming per-expert.",
                    parameters_billions=671.0,
                    compression="fp8_expert_stream",
                    max_seq_len=16384,
                    vram_required_gb=12.0,
                    is_active=False
                ),
                ModelConfig(
                    name="Kimi K3 (2.8T MoE)",
                    hf_repo_id="moonshot-ai/Kimi-K3-2.8T",
                    description="O maior modelo open-source do mundo (2.8T) rodando em uma única placa local de 4GB VRAM.",
                    parameters_billions=2800.0,
                    compression="compressed_tensors_flash_attn",
                    max_seq_len=32768,
                    vram_required_gb=3.72,
                    is_active=False
                ),
                ModelConfig(
                    name="Qwen 2.5 70B Instruct",
                    hf_repo_id="Qwen/Qwen2.5-70B-Instruct",
                    description="Modelo ultra-rápido para codificação avançada, raciocínio lógico e instrução em múltiplos idiomas.",
                    parameters_billions=70.0,
                    compression="layer_streaming",
                    max_seq_len=4096,
                    vram_required_gb=4.0,
                    is_active=False
                )
            ]
            db.add_all(models_seed)

        # 2. Seed de Prompts em PT-BR
        if db.query(PromptTemplate).count() == 0:
            prompts_seed = [
                PromptTemplate(
                    name="Engenharia de Software PhD & MBA",
                    category="Programação",
                    description="Solicita análise detalhada de código, arquitetura escalável e refatoração de elite.",
                    system_prompt="Você é um especialista PhD e MBA em Engenharia de Software de Elite. Responda em Português do Brasil de forma extremamente detalhada, sem simplificações ou omissões.",
                    template_content="Analise o seguinte código/requisito de arquitetura e forneça uma solução detalhada de nível sênior:\n\n[INSERIR CÓDIGO AQUI]",
                    tags="código, arquitetura, refatoração, python, web"
                ),
                PromptTemplate(
                    name="Otimização de Desempenho AirLLM & VRAM",
                    category="Análise",
                    description="Orientações estratégicas para ajuste fino de streaming de camadas e consumo de memória.",
                    system_prompt="Você é o Arquiteto de IA especialista no projeto AirLLM. Explique como otimizar VRAM e GPU.",
                    template_content="Como posso otimizar a execução do modelo [NOME DO MODELO] em uma GPU local com limite de VRAM?",
                    tags="vram, gpu, airllm, streaming, otimizacao"
                ),
                PromptTemplate(
                    name="Designer Web UI/UX VIP 2026",
                    category="Criativo",
                    description="Geração de diretrizes de design moderno com Glassmorphism, CSS variáveis e acessibilidade.",
                    system_prompt="Você é um Designer Web especialista em UI/UX responsivo seguindo as maiores tendências visuais de Julho de 2026.",
                    template_content="Crie a especificação de UI/UX e paleta de cores CSS para uma aplicação dashboard de [NOME DA APLICAÇÃO].",
                    tags="ui, ux, css, design, frontend"
                )
            ]
            db.add_all(prompts_seed)

        # 3. Seed de Configurações
        if db.query(UserSettings).count() == 0:
            db.add(UserSettings())

        db.commit()
    except Exception as e:
        print(f"Erro no seed de dados: {e}")
        db.rollback()
    finally:
        db.close()

# Executar seed na inicialização
seed_initial_data()

# Configuração de Arquivos Estáticos para o Frontend
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/api/health", tags=["Health"])
def health_check():
    """Rota de verificação de funcionamento do servidor backend."""
    return {"status": "online", "system": "AirLLM Enterprise Backend", "version": "3.0.0"}

@app.get("/")
def read_root():
    """Redireciona para o index.html da aplicação frontend."""
    index_file = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "AirLLM Backend Online. Frontend index.html não localizado."}
