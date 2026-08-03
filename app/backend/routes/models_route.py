from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import ModelConfig
from ..schemas import ModelConfigCreate, ModelConfigUpdate, ModelConfigResponse

router = APIRouter(prefix="/api/models", tags=["Modelos"])

@router.get("", response_model=List[ModelConfigResponse])
def list_models(db: Session = Depends(get_db)):
    """Lista todos os modelos cadastrados no banco de dados."""
    return db.query(ModelConfig).order_by(ModelConfig.id.desc()).all()

@router.post("", response_model=ModelConfigResponse, status_code=status.HTTP_201_CREATED)
def create_model(model_in: ModelConfigCreate, db: Session = Depends(get_db)):
    """Cadastra um novo modelo HuggingFace para uso no AirLLM."""
    existing = db.query(ModelConfig).filter(ModelConfig.hf_repo_id == model_in.hf_repo_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Modelo com este Repositório HuggingFace já existe.")
    
    # Se o novo modelo estiver marcado como ativo, desativa os outros
    if model_in.is_active:
        db.query(ModelConfig).update({ModelConfig.is_active: False})

    new_model = ModelConfig(**model_in.dict())
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    return new_model

@router.get("/{model_id}", response_model=ModelConfigResponse)
def get_model(model_id: int, db: Session = Depends(get_db)):
    """Obtém detalhes de um modelo específico por ID."""
    model = db.query(ModelConfig).filter(ModelConfig.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Modelo não encontrado.")
    return model

@router.put("/{model_id}", response_model=ModelConfigResponse)
def update_model(model_id: int, model_in: ModelConfigUpdate, db: Session = Depends(get_db)):
    """Atualiza as configurações de um modelo cadastrado."""
    model = db.query(ModelConfig).filter(ModelConfig.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Modelo não encontrado.")

    update_data = model_in.dict(exclude_unset=True)

    if update_data.get("is_active"):
        db.query(ModelConfig).filter(ModelConfig.id != model_id).update({ModelConfig.is_active: False})

    for field, value in update_data.items():
        setattr(model, field, value)

    db.commit()
    db.refresh(model)
    return model

@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model(model_id: int, db: Session = Depends(get_db)):
    """Remove um modelo do banco de dados."""
    model = db.query(ModelConfig).filter(ModelConfig.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Modelo não encontrado.")
    db.delete(model)
    db.commit()
    return None

@router.post("/{model_id}/activate", response_model=ModelConfigResponse)
def activate_model(model_id: int, db: Session = Depends(get_db)):
    """Define o modelo especificado como o modelo ativo principal."""
    model = db.query(ModelConfig).filter(ModelConfig.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Modelo não encontrado.")
    
    db.query(ModelConfig).update({ModelConfig.is_active: False})
    model.is_active = True
    db.commit()
    db.refresh(model)
    return model
