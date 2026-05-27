import os
import re
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import httpx
from loguru import logger

from backend.app.core.database import get_db, set_tenant_id
from backend.app.models import models
from backend.app.core.config import settings

router = APIRouter(prefix="/api/integrations", tags=["Integrations"])


async def fetch_trello_card_cover(card_id: str) -> Optional[str]:
    """
    Consome a API do Trello de forma resiliente para capturar a URL da imagem de capa.
    """
    key = settings.TRELLO_API_KEY
    token = settings.TRELLO_TOKEN
    
    if not key or not token:
        logger.warning("TRELLO_API_KEY ou TRELLO_TOKEN não configurados no arquivo .env. Ignorando captura de imagem de capa.")
        return None
        
    try:
        async with httpx.AsyncClient() as client:
            # 1. Busca os detalhes do cartão para obter o ID do anexo de capa
            card_url = f"https://api.trello.com/1/cards/{card_id}"
            params = {"key": key, "token": token, "fields": "idAttachmentCover"}
            card_res = await client.get(card_url, params=params, timeout=5.0)
            
            if card_res.status_code != 200:
                logger.warning(f"Falha ao consultar detalhes do card no Trello. Status: {card_res.status_code}")
                return None
                
            card_data = card_res.json()
            cover_attachment_id = card_data.get("idAttachmentCover")
            
            if not cover_attachment_id:
                logger.info(f"O card do Trello ({card_id}) não possui imagem de capa definida.")
                return None
                
            # 2. Busca a lista de anexos do cartão para encontrar a URL correspondente ao ID da capa
            attachments_url = f"https://api.trello.com/1/cards/{card_id}/attachments"
            attachments_params = {"key": key, "token": token}
            att_res = await client.get(attachments_url, params=attachments_params, timeout=5.0)
            
            if att_res.status_code != 200:
                logger.warning(f"Falha ao carregar anexos do Trello. Status: {att_res.status_code}")
                return None
                
            attachments = att_res.json()
            for attachment in attachments:
                if attachment.get("id") == cover_attachment_id:
                    return attachment.get("url")
                    
    except Exception as e:
        logger.error(f"Erro ao interagir com a API do Trello: {e}")
        
    return None


@router.head("/trello")
@router.head("/trello/")
async def trello_webhook_verification():
    """
    Responde com HTTP 200 OK para validar o webhook junto ao Trello na criação.
    """
    return Response(status_code=200)


@router.post("/trello")
@router.post("/trello/")
async def trello_webhook_handler(
    request: Request,
    tenant_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Escuta as atualizações do Trello e cria produtos/OPs automaticamente
    quando cards são movidos para colunas aprovadas.
    """
    try:
        payload = await request.json()
    except Exception:
        logger.warning("Recebida requisição de Webhook do Trello com corpo não-JSON ou vazio.")
        return {"status": "ok", "detail": "Empty or non-JSON body"}

    action = payload.get("action", {})
    action_type = action.get("type")
    
    if not action_type:
        return {"status": "ok", "detail": "No action type in payload"}

    # Monitora apenas movimentações de cartão
    data = action.get("data", {})
    list_after = data.get("listAfter", {})
    list_after_name = list_after.get("name") if list_after else None

    # Fallback caso seja um card recém-criado na coluna correta ou formato diferente
    if not list_after_name:
        list_obj = data.get("list", {})
        list_after_name = list_obj.get("name") if list_obj else None

    if not list_after_name:
        return {"status": "ignored", "detail": "Sem identificação de coluna destino no payload."}

    list_upper = list_after_name.upper()
    if "APROVADAS" not in list_upper:
        return {"status": "ignored", "detail": f"Coluna '{list_after_name}' não é monitorada pelo FabricOS."}

    card = data.get("card", {})
    card_id = card.get("id")
    card_name = card.get("name")
    card_desc = card.get("desc", "")
    card_short_link = card.get("shortLink")

    if not card_id or not card_name:
        return {"status": "ignored", "detail": "Payload sem informações básicas do card (id/name)."}

    # 1. Resolução do Tenant ID
    if not tenant_id:
        # Fallback de segurança: busca o primeiro Tenant disponível no banco de dados
        tenant_query = select(models.Tenant)
        tenant_res = await db.execute(tenant_query)
        tenant = tenant_res.scalars().first()
        if not tenant:
            logger.error("Nenhum Tenant cadastrado no banco de dados. Integração Trello abortada.")
            raise HTTPException(status_code=400, detail="Sem Tenant cadastrado")
        resolved_tenant_id = tenant.id
    else:
        resolved_tenant_id = tenant_id

    # Configura o tenant no escopo do banco de dados
    await set_tenant_id(db, str(resolved_tenant_id))

    # 2. Busca ou cria o Produto baseado no Nome do Card
    prod_query = select(models.Product).where(
        models.Product.name == card_name,
        models.Product.tenant_id == resolved_tenant_id
    )
    prod_res = await db.execute(prod_query)
    product = prod_res.scalar_one_or_none()

    # Busca a imagem de capa via Trello attachments API
    image_url = await fetch_trello_card_cover(card_id)

    if not product:
        short_id = card_short_link.upper() if card_short_link else uuid.uuid4().hex[:6].upper()
        reference = f"TR-{short_id}"
        
        # Garante a unicidade da referência
        ref_check_query = select(models.Product).where(
            models.Product.reference == reference,
            models.Product.tenant_id == resolved_tenant_id
        )
        ref_check_res = await db.execute(ref_check_query)
        if ref_check_res.scalar_one_or_none():
            reference = f"TR-{short_id}-{uuid.uuid4().hex[:4].upper()}"

        product = models.Product(
            id=uuid.uuid4(),
            tenant_id=resolved_tenant_id,
            reference=reference,
            name=card_name,
            description=card_desc or f"Produto importado automaticamente do Trello (Coluna: {list_after_name})",
            image_url=image_url
        )
        db.add(product)
        await db.flush()
        logger.info(f"Produto '{card_name}' criado com sucesso a partir da integração Trello.")
    else:
        # Caso o produto já exista, apenas atualizamos a imagem/descrição se estiverem vazios no banco
        if card_desc and not product.description:
            product.description = card_desc
        if image_url:
            product.image_url = image_url
        await db.flush()
        logger.info(f"Reutilizando produto existente '{card_name}' no FabricOS.")

    # 3. Cria a Ordem de Produção (OP) automática
    # Gera o número da OP de forma sequencial e atômica
    max_query = select(func.max(models.ProductionOrder.order_number)).where(
        models.ProductionOrder.tenant_id == resolved_tenant_id,
        models.ProductionOrder.order_number.like("OP-%"),
    )
    max_result = await db.execute(max_query)
    last_op = max_result.scalar_one_or_none()
    if last_op:
        try:
            last_num = int(last_op.split("-")[1])
        except (IndexError, ValueError):
            last_num = 0
    else:
        last_num = 0
    order_number = f"OP-{last_num + 1:04d}"

    # Captura o nome do Quadro do Trello de forma totalmente dinâmica
    board = data.get("board", {})
    board_name = board.get("name") if board else None
    
    if not board_name:
        model = payload.get("model", {})
        board_name = model.get("name") if model else None
        
    if not board_name:
        board_name = "BOAH VERÃO 26/27" # Fallback caso falhe

    # Define a Coleção correta dependendo do nome do Quadro e da coluna destino
    month_suffix = ""
    if "JULHO" in list_upper:
        month_suffix = " - JULHO"
    elif "AGOSTO" in list_upper:
        month_suffix = " - AGOSTO"
    elif "SETEMBRO" in list_upper:
        month_suffix = " - SETEMBRO"
    elif "OUTUBRO" in list_upper:
        month_suffix = " - OUTUBRO"
    elif "NOVEMBRO" in list_upper:
        month_suffix = " - NOVEMBRO"
    elif "DEZEMBRO" in list_upper:
        month_suffix = " - DEZEMBRO"
    elif "JANEIRO" in list_upper:
        month_suffix = " - JANEIRO"
    elif "FEVEREIRO" in list_upper:
        month_suffix = " - FEVEREIRO"
    elif "MARÇO" in list_upper:
        month_suffix = " - MARÇO"
    elif "ABRIL" in list_upper:
        month_suffix = " - ABRIL"
    elif "MAIO" in list_upper:
        month_suffix = " - MAIO"
    elif "JUNHO" in list_upper:
        month_suffix = " - JUNHO"
    else:
        month_suffix = f" - {list_after_name}"

    collection = f"{board_name}{month_suffix}"

    default_grade = {"PP": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "U": 0}

    new_order = models.ProductionOrder(
        id=uuid.uuid4(),
        tenant_id=resolved_tenant_id,
        order_number=order_number,
        item_name=card_name,
        total_quantity=1,
        price_per_piece=0.0,
        product_id=product.id,
        current_stage="Corte",
        status="em_andamento",
        collection=collection,
        size_grade=default_grade,
        observations=f"Criada automaticamente via integração com Trello.\nCard original: {card_name}\nLink/ID do Card: {card_id}"
    )
    db.add(new_order)
    await db.commit()
    logger.info(f"Ordem de Produção {order_number} criada para o produto '{card_name}' via Webhook Trello.")

    return {
        "status": "success",
        "action": "imported",
        "product": {
            "id": str(product.id),
            "name": product.name,
            "reference": product.reference,
            "image_url": product.image_url
        },
        "production_order": {
            "id": str(new_order.id),
            "order_number": new_order.order_number,
            "collection": new_order.collection
        }
    }


def update_env_file(key: str, value: str):
    env_path = "backend/.env"
    if not os.path.exists(env_path):
        env_path = ".env"
    
    if not os.path.exists(env_path):
        return
        
    with open(env_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    updated = False
    new_lines = []
    for line in lines:
        if line.strip().startswith(f"{key}="):
            new_lines.append(f"{key}={value}\n")
            updated = True
        else:
            new_lines.append(line)
            
    if not updated:
        # Append if not found
        new_lines.append(f"{key}={value}\n")
        
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)


def extract_board_id(url_or_id: str) -> str:
    url_or_id = url_or_id.strip()
    match = re.search(r"trello\.com/b/([^/]+)", url_or_id)
    if match:
        return match.group(1)
    return url_or_id


@router.get("/settings")
async def get_integrations_settings(request: Request):
    from dotenv import dotenv_values
    
    env_path = "backend/.env"
    if not os.path.exists(env_path):
        env_path = ".env"
        
    config_dict = {}
    if os.path.exists(env_path):
        config_dict = dotenv_values(env_path)
        
    api_key = config_dict.get("TRELLO_API_KEY") or settings.TRELLO_API_KEY or ""
    token = config_dict.get("TRELLO_TOKEN") or settings.TRELLO_TOKEN or ""
    board_url = config_dict.get("TRELLO_BOARD_URL") or getattr(settings, "TRELLO_BOARD_URL", "") or ""
    base_url = str(request.base_url).rstrip("/")
    if base_url.startswith("http://") and "localhost" not in base_url and "127.0.0.1" not in base_url:
        base_url = base_url.replace("http://", "https://")
    default_webhook = f"{base_url}/api/integrations/trello"
    webhook_url = config_dict.get("TRELLO_WEBHOOK_URL") or getattr(settings, "TRELLO_WEBHOOK_URL", "") or default_webhook
    
    active_boards = []
    if api_key and token:
        try:
            async with httpx.AsyncClient() as client:
                webhooks_url = f"https://api.trello.com/1/tokens/{token}/webhooks"
                res = await client.get(webhooks_url, params={"key": api_key, "token": token}, timeout=5.0)
                if res.status_code == 200:
                    webhooks_data = res.json()
                    for wh in webhooks_data:
                        wh_callback = wh.get("callbackURL", "")
                        if "/api/integrations/trello" in wh_callback:
                            desc = wh.get("description", "")
                            board_name = desc.replace("FabricOS Webhook - ", "") if desc.startswith("FabricOS Webhook - ") else f"Quadro ({wh.get('idModel')})"
                            active_boards.append({
                                "id": wh.get("id"),
                                "board_id": wh.get("idModel"),
                                "board_name": board_name,
                                "callback_url": wh_callback,
                                "active": wh.get("active", True)
                            })
        except Exception as e:
            logger.warning(f"Erro ao listar webhooks do Trello para a tela de configurações: {e}")
            
    return {
        "api_key": api_key,
        "token": token,
        "board_url": board_url,
        "webhook_url": webhook_url,
        "active_boards": active_boards
    }


@router.post("/trello/register")
async def register_trello_webhook(
    payload: dict,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    api_key = payload.get("api_key", "").strip()
    token = payload.get("token", "").strip()
    board_url = payload.get("board_url", "").strip()
    webhook_url = payload.get("webhook_url", "").strip()
    
    if not api_key or not token or not board_url:
        raise HTTPException(status_code=400, detail="API Key, Token e Link do Quadro são obrigatórios.")
        
    board_id = extract_board_id(board_url)
    
    async with httpx.AsyncClient() as client:
        # 1. Resolve short Board ID to long Board ID
        board_info_url = f"https://api.trello.com/1/boards/{board_id}"
        params = {"key": api_key, "token": token, "fields": "name"}
        try:
            res = await client.get(board_info_url, params=params, timeout=10.0)
            if res.status_code != 200:
                logger.error(f"Erro ao consultar quadro no Trello: {res.text}")
                raise HTTPException(
                    status_code=400, 
                    detail=f"Não foi possível encontrar o quadro no Trello. Verifique se o link/ID está correto e se a chave/token são válidos."
                )
            board_data = res.json()
            long_board_id = board_data.get("id")
            board_name = board_data.get("name")
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            logger.error(f"Erro ao acessar API do Trello: {e}")
            raise HTTPException(status_code=500, detail=f"Erro de conexão com o Trello: {str(e)}")
            
        # 2. Determine Webhook callback URL
        if not webhook_url or "loca.lt" in webhook_url:
            base_url = str(request.base_url).rstrip("/")
            if base_url.startswith("http://") and "localhost" not in base_url and "127.0.0.1" not in base_url:
                base_url = base_url.replace("http://", "https://")
            webhook_url = f"{base_url}/api/integrations/trello"
            
        # 3. Check if webhook is already registered on Trello to avoid duplicates
        webhooks_url = f"https://api.trello.com/1/tokens/{token}/webhooks"
        webhooks_params = {"key": api_key, "token": token}
        existing_webhook_id = None
        try:
            webhooks_res = await client.get(webhooks_url, params=webhooks_params, timeout=10.0)
            if webhooks_res.status_code == 200:
                webhooks_data = webhooks_res.json()
                for wh in webhooks_data:
                    if wh.get("idModel") == long_board_id and wh.get("callbackURL") == webhook_url:
                        existing_webhook_id = wh.get("id")
                        break
        except Exception as e:
            logger.warning(f"Erro ao listar webhooks existentes: {e}")
            
        if existing_webhook_id:
            logger.info(f"Webhook já registrado para o quadro {board_name} com URL {webhook_url}.")
        else:
            # Register new webhook
            register_url = "https://api.trello.com/1/webhooks/"
            try:
                reg_res = await client.post(
                    register_url, 
                    params={"key": api_key, "token": token},
                    json={
                        "callbackURL": webhook_url,
                        "idModel": long_board_id,
                        "description": f"FabricOS Webhook - {board_name}"
                    },
                    timeout=10.0
                )
                if reg_res.status_code != 200:
                    logger.error(f"Erro ao registrar webhook no Trello: {reg_res.text}")
                    raise HTTPException(
                        status_code=400,
                        detail=f"Erro ao registrar webhook no Trello: {reg_res.text}"
                    )
            except Exception as e:
                if isinstance(e, HTTPException):
                    raise e
                logger.error(f"Erro ao tentar registrar webhook no Trello: {e}")
                raise HTTPException(status_code=500, detail=f"Erro ao registrar webhook no Trello: {str(e)}")
                
        # 4. Save settings to .env
        update_env_file("TRELLO_API_KEY", api_key)
        update_env_file("TRELLO_TOKEN", token)
        update_env_file("TRELLO_BOARD_URL", board_url)
        update_env_file("TRELLO_WEBHOOK_URL", webhook_url)
        
        # Update settings object in-memory
        settings.TRELLO_API_KEY = api_key
        settings.TRELLO_TOKEN = token
        if hasattr(settings, "TRELLO_BOARD_URL"):
            settings.TRELLO_BOARD_URL = board_url
        if hasattr(settings, "TRELLO_WEBHOOK_URL"):
            settings.TRELLO_WEBHOOK_URL = webhook_url
        
        return {
            "status": "success",
            "message": f"Quadro '{board_name}' integrado com sucesso!",
            "board_name": board_name,
            "board_id": long_board_id,
            "webhook_url": webhook_url
        }


@router.delete("/trello/webhooks/{webhook_id}")
async def delete_trello_webhook(
    webhook_id: str,
    db: AsyncSession = Depends(get_db)
):
    from dotenv import dotenv_values
    
    env_path = "backend/.env"
    if not os.path.exists(env_path):
        env_path = ".env"
        
    config_dict = {}
    if os.path.exists(env_path):
        config_dict = dotenv_values(env_path)
        
    api_key = config_dict.get("TRELLO_API_KEY") or settings.TRELLO_API_KEY or ""
    token = config_dict.get("TRELLO_TOKEN") or settings.TRELLO_TOKEN or ""
    
    if not api_key or not token:
        raise HTTPException(status_code=400, detail="Chave de API e Token não configurados.")
        
    async with httpx.AsyncClient() as client:
        delete_url = f"https://api.trello.com/1/webhooks/{webhook_id}"
        try:
            res = await client.delete(delete_url, params={"key": api_key, "token": token}, timeout=10.0)
            if res.status_code not in (200, 404):
                logger.error(f"Erro ao remover webhook no Trello: {res.text}")
                raise HTTPException(status_code=400, detail=f"Não foi possível remover o webhook no Trello: {res.text}")
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            logger.error(f"Erro de conexão ao remover webhook no Trello: {e}")
            raise HTTPException(status_code=500, detail=f"Erro ao conectar com o Trello: {str(e)}")
            
    return {"status": "success", "message": "Quadro desvinculado com sucesso!"}
