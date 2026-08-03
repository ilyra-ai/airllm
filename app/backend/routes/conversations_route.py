from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Conversation, Message
from ..schemas import ConversationCreate, ConversationResponse, MessageResponse

router = APIRouter(prefix="/api/conversations", tags=["Conversas & Histórico"])

@router.get("", response_model=List[ConversationResponse])
def list_conversations(db: Session = Depends(get_db)):
    """Lista todas as conversas salvas ordenadas da mais recente para a mais antiga."""
    return db.query(Conversation).order_by(Conversation.updated_at.desc()).all()

@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(conv_in: ConversationCreate, db: Session = Depends(get_db)):
    """Cria um novo tópico de conversa."""
    new_conv = Conversation(title=conv_in.title, model_id=conv_in.model_id)
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)
    return new_conv

@router.get("/{conv_id}", response_model=ConversationResponse)
def get_conversation(conv_id: int, db: Session = Depends(get_db)):
    """Obtém uma conversa específica com suas mensagens completas."""
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")
    return conv

@router.delete("/{conv_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conv_id: int, db: Session = Depends(get_db)):
    """Exclui uma conversa e todo o seu histórico de mensagens."""
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")
    db.delete(conv)
    db.commit()
    return None

@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_all_conversations(db: Session = Depends(get_db)):
    """Limpa todo o histórico de conversas do sistema."""
    db.query(Message).delete()
    db.query(Conversation).delete()
    db.commit()
    return None
