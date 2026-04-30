from typing import Annotated, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import uuid

from backend.app.core.auth import SECRET_KEY, ALGORITHM
from backend.app.schemas import schemas

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

async def get_current_tenant_id(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        tenant_id: str = payload.get("tenant_id")
        if tenant_id is None:
            raise credentials_exception
        return uuid.UUID(tenant_id)
    except (JWTError, ValueError):
        raise credentials_exception
