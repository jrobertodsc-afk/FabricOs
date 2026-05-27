import requests
from loguru import logger
from backend.app.core.config import settings

def send_telegram_message(message: str) -> bool:
    """
    Envia uma mensagem para o Telegram usando o BOT_TOKEN e CHAT_ID configurados.
    """
    token = settings.TELEGRAM_BOT_TOKEN
    chat_id = settings.TELEGRAM_CHAT_ID

    if not token or not chat_id:
        logger.warning("Telegram token ou chat_id não configurados. Mensagem ignorada.")
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML"
    }

    try:
        response = requests.post(url, json=payload, timeout=5.0)
        if response.status_code == 200:
            return True
        else:
            logger.error(f"Erro ao enviar mensagem pro Telegram: {response.text}")
            return False
    except Exception as e:
        logger.error(f"Exceção ao tentar conectar ao Telegram: {e}")
        return False
