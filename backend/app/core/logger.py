import logging
import sys
import json
from datetime import datetime
from typing import Any

class JSONFormatter(logging.Formatter):
    """
    Formatter that outputs JSON strings for log records.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_record = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "func": record.funcName
        }
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields if present
        if hasattr(record, "extra"):
            log_record.update(record.extra)
            
        return json.dumps(log_record)

def setup_logging():
    logger = logging.getLogger("fabricos")
    logger.setLevel(logging.INFO)
    
    # Console handler with JSON formatting
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    
    logger.addHandler(handler)
    
    # Disable propagation to avoid double logs from uvicorn
    logger.propagate = False
    
    return logger

# Global logger instance
logger = setup_logging()
