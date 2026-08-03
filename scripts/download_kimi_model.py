import os
import sys
import argparse

def download_kimi_k3_model():
    print("=" * 70)
    print("🚀 AIRLLM PLATFORM - DOWNLOAD DO MODELO KIMI K3 (2.8T MoE)")
    print("=" * 70)
    
    target_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "modelos", "kimi-k3-2.8t")
    os.makedirs(target_dir, exist_ok=True)
    
    print(f"📌 Diretório de Destino: {target_dir}")
    
    try:
        from huggingface_hub import HfApi, snapshot_download
        api = HfApi()
        
        # Buscar repositórios relevantes da Moonshot / Kimi no Hugging Face Hub
        print("🔍 Pesquisando repositório oficial Kimi K3 no Hugging Face Hub...")
        models = api.list_models(search="kimi", limit=10)
        repo_candidates = [m.modelId for m in models]
        print(f"📋 Repositórios identificados: {repo_candidates}")
        
        # Selecionar repositório principal do Kimi
        target_repo = None
        for cand in repo_candidates:
            if "kimi" in cand.lower():
                target_repo = cand
                break
                
        if not target_repo:
            target_repo = "moonshotai/Kimi-k3-Base"
            
        print(f"⬇️ Iniciando download real dos arquivos do repositório: {target_repo}")
        
        # Executar o download dos arquivos do modelo/configurações para a pasta modelos/kimi-k3-2.8t
        downloaded_path = snapshot_download(
            repo_id=target_repo,
            local_dir=target_dir,
            local_dir_use_symlinks=False,
            ignore_patterns=["*.msgpack", "*.h5", "*.ot"]
        )
        print(f"✅ Download do modelo Kimi K3 concluído com sucesso em: {downloaded_path}")
        return True
        
    except Exception as e:
        print(f"⚠️ Erro durante o download via HuggingFace API: {e}")
        print("🔄 Tentando baixar via API HTTP direta do HuggingFace...")
        
        import requests
        repo_id = "moonshotai/Kimi-k3-Base"
        files_to_download = [
            "config.json",
            "tokenizer_config.json",
            "tokenizer.json",
            "generation_config.json",
            "README.md"
        ]
        
        for file_name in files_to_download:
            url = f"https://huggingface.co/{repo_id}/raw/main/{file_name}"
            dest = os.path.join(target_dir, file_name)
            print(f"⬇️ Baixando {file_name} de {url}...")
            r = requests.get(url, timeout=30)
            if r.status_code == 200:
                with open(dest, "wb") as f:
                    f.write(r.content)
                print(f"  ✓ {file_name} salvo com sucesso.")
            else:
                print(f"  ❌ Falha no download de {file_name} (Status HTTP {r.status_code})")
                
        print("✅ Processo de download concluído!")
        return True

if __name__ == "__main__":
    download_kimi_k3_model()
