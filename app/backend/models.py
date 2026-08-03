import datetime
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class ModelConfig(Base):
    __tablename__ = "model_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    hf_repo_id = Column(String(200), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    parameters_billions = Column(Float, nullable=False, default=70.0)
    compression = Column(String(50), default="layer_streaming") # layer_streaming, fp8, 4bit, 8bit
    max_seq_len = Column(Integer, default=4096)
    vram_required_gb = Column(Float, default=4.0)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    conversations = relationship("Conversation", back_populates="model", cascade="all, delete-orphan")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, default="Nova Conversa")
    model_id = Column(Integer, ForeignKey("model_configs.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    model = relationship("ModelConfig", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False) # user, assistant, system
    content = Column(Text, nullable=False)
    tokens_count = Column(Integer, default=0)
    tokens_per_sec = Column(Float, default=0.0)
    vram_used_gb = Column(Float, default=0.0)
    latency_ms = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")


class PromptTemplate(Base):
    __tablename__ = "prompt_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    category = Column(String(50), nullable=False, default="Geral") # Programação, Análise, Resumo, Criativo, Sistema
    description = Column(Text, nullable=True)
    system_prompt = Column(Text, nullable=True)
    template_content = Column(Text, nullable=False)
    tags = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class SystemMetric(Base):
    __tablename__ = "system_metrics"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    gpu_vram_used_mb = Column(Float, nullable=False)
    gpu_vram_total_mb = Column(Float, nullable=False, default=8192.0)
    ram_used_mb = Column(Float, nullable=False)
    cpu_usage_percent = Column(Float, nullable=False)
    active_layer = Column(Integer, default=0)
    total_layers = Column(Integer, default=80)


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String(100), default="Engenheiro AirLLM")
    user_role = Column(String(100), default="Especialista PhD/MBA")
    theme = Column(String(20), default="dark")
    language = Column(String(10), default="pt-BR")
    auto_save_history = Column(Boolean, default=True)
    stream_response = Column(Boolean, default=True)
    max_history_context = Column(Integer, default=10)
    temperature = Column(Float, default=0.7)
    top_p = Column(Float, default=0.9)
    hf_token = Column(String(200), nullable=True, default="")
    api_port = Column(Integer, default=8000)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
