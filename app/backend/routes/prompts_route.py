from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import PromptTemplate
from ..schemas import PromptTemplateCreate, PromptTemplateUpdate, PromptTemplateResponse

router = APIRouter(prefix="/api/prompts", tags=["Templates de Prompts"])

@router.get("", response_model=List[PromptTemplateResponse])
def list_prompts(category: Optional[str] = None, db: Session = Depends(get_db)):
    """Lista todos os templates de prompts, com filtro opcional por categoria."""
    query = db.query(PromptTemplate)
    if category:
        query = query.filter(PromptTemplate.category == category)
    return query.order_by(PromptTemplate.id.desc()).all()

@router.post("", response_model=PromptTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_prompt(prompt_in: PromptTemplateCreate, db: Session = Depends(get_db)):
    """Cria um novo template de prompt reutilizável."""
    new_prompt = PromptTemplate(**prompt_in.dict())
    db.add(new_prompt)
    db.commit()
    db.refresh(new_prompt)
    return new_prompt

@router.get("/{prompt_id}", response_model=PromptTemplateResponse)
def get_prompt(prompt_id: int, db: Session = Depends(get_db)):
    """Obtém os detalhes de um prompt por ID."""
    prompt = db.query(PromptTemplate).filter(PromptTemplate.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Template de prompt não encontrado.")
    return prompt

@router.put("/{prompt_id}", response_model=PromptTemplateResponse)
def update_prompt(prompt_id: int, prompt_in: PromptTemplateUpdate, db: Session = Depends(get_db)):
    """Atualiza um template de prompt existente."""
    prompt = db.query(PromptTemplate).filter(PromptTemplate.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Template de prompt não encontrado.")

    for field, value in prompt_in.dict(exclude_unset=True).items():
        setattr(prompt, field, value)

    db.commit()
    db.refresh(prompt)
    return prompt

@router.delete("/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prompt(prompt_id: int, db: Session = Depends(get_db)):
    """Remove um template de prompt do banco de dados."""
    prompt = db.query(PromptTemplate).filter(PromptTemplate.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Template de prompt não encontrado.")
    db.delete(prompt)
    db.commit()
    return None
