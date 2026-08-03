import os
import sys
import platform
import torch
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db, DB_PATH
from ..models import UserSettings
from ..schemas import UserSettingsUpdate, UserSettingsResponse

router = APIRouter(prefix="/api/settings", tags=["Configurações"])

@router.get("", response_model=UserSettingsResponse)
def get_user_settings(db: Session = Depends(get_db)):
    """Obtém as configurações atuais do usuário e da aplicação."""
    settings = db.query(UserSettings).first()
    if not settings:
        settings = UserSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("", response_model=UserSettingsResponse)
def update_user_settings(settings_in: UserSettingsUpdate, db: Session = Depends(get_db)):
    """Atualiza as configurações da aplicação."""
    settings = db.query(UserSettings).first()
    if not settings:
        settings = UserSettings()
        db.add(settings)

    for field, value in settings_in.dict(exclude_unset=True).items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)
    return settings

@router.get("/diagnostics")
def get_diagnostics():
    """Retorna diagnósticos do ambiente de execução hardware e software."""
    cuda_available = torch.cuda.is_available() if 'torch' in sys.modules else False
    device_name = torch.cuda.get_device_name(0) if cuda_available else "GPU Simulada / CPU Mode"
    vram_total = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2) if cuda_available else 8.0

    return {
        "os": platform.system(),
        "os_version": platform.version(),
        "python_version": platform.python_version(),
        "cuda_available": cuda_available,
        "device_name": device_name,
        "vram_total_gb": vram_total,
        "db_path": DB_PATH,
        "db_exists": os.path.exists(DB_PATH),
        "db_size_kb": round(os.path.getsize(DB_PATH) / 1024, 2) if os.path.exists(DB_PATH) else 0,
        "airllm_version": "3.0.0-Julho2026"
    }
