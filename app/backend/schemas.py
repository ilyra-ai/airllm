from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# --- ModelConfig Schemas ---
class ModelConfigBase(BaseModel):
    name: str = Field(..., example="Llama 3.1 405B Instruct")
    hf_repo_id: str = Field(..., example="meta-llama/Llama-3.1-405B-Instruct")
    description: Optional[str] = None
    parameters_billions: float = Field(70.0, example=405.0)
    compression: str = Field("layer_streaming", example="layer_streaming")
    max_seq_len: int = Field(4096, example=8192)
    vram_required_gb: float = Field(4.0, example=8.0)
    is_active: bool = False

class ModelConfigCreate(ModelConfigBase):
    pass

class ModelConfigUpdate(BaseModel):
    name: Optional[str] = None
    hf_repo_id: Optional[str] = None
    description: Optional[str] = None
    parameters_billions: Optional[float] = None
    compression: Optional[str] = None
    max_seq_len: Optional[int] = None
    vram_required_gb: Optional[float] = None
    is_active: Optional[bool] = None

class ModelConfigResponse(ModelConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

# --- Message Schemas ---
class MessageBase(BaseModel):
    role: str
    content: str

class MessageCreate(MessageBase):
    conversation_id: int

class MessageResponse(MessageBase):
    id: int
    conversation_id: int
    tokens_count: int
    tokens_per_sec: float
    vram_used_gb: float
    latency_ms: float
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

# --- Conversation Schemas ---
class ConversationCreate(BaseModel):
    title: Optional[str] = "Nova Conversa"
    model_id: Optional[int] = None

class ConversationResponse(BaseModel):
    id: int
    title: str
    model_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []

    class Config:
        orm_mode = True
        from_attributes = True

# --- PromptTemplate Schemas ---
class PromptTemplateBase(BaseModel):
    name: str
    category: str = "Geral"
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    template_content: str
    tags: Optional[str] = None

class PromptTemplateCreate(PromptTemplateBase):
    pass

class PromptTemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    template_content: Optional[str] = None
    tags: Optional[str] = None

class PromptTemplateResponse(PromptTemplateBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

# --- SystemMetric Schemas ---
class SystemMetricResponse(BaseModel):
    id: int
    timestamp: datetime
    gpu_vram_used_mb: float
    gpu_vram_total_mb: float
    ram_used_mb: float
    cpu_usage_percent: float
    active_layer: int
    total_layers: int

    class Config:
        orm_mode = True
        from_attributes = True

# --- UserSettings Schemas ---
class UserSettingsUpdate(BaseModel):
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    theme: Optional[str] = None
    language: Optional[str] = None
    auto_save_history: Optional[bool] = None
    stream_response: Optional[bool] = None
    max_history_context: Optional[int] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    hf_token: Optional[str] = None
    api_port: Optional[int] = None

class UserSettingsResponse(BaseModel):
    id: int
    user_name: str
    user_role: str
    theme: str
    language: str
    auto_save_history: bool
    stream_response: bool
    max_history_context: int
    temperature: float
    top_p: float
    hf_token: Optional[str] = ""
    api_port: int

    class Config:
        orm_mode = True
        from_attributes = True

# --- Chat Completion Request ---
class ChatRequest(BaseModel):
    conversation_id: Optional[int] = None
    model_id: Optional[int] = None
    prompt: str
    system_prompt: Optional[str] = None
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9
    max_tokens: Optional[int] = 1024
