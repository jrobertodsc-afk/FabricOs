from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import uuid
import os
import shutil
from typing import Annotated
from backend.app.api.deps import get_current_tenant_id

router = APIRouter(prefix="/api/upload", tags=["Upload"])

UPLOAD_DIR = "/data/uploads" if os.path.exists("/data") else "backend/uploads"

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/image")
async def upload_image(
    tenant_id: Annotated[uuid.UUID, Depends(get_current_tenant_id)],
    file: UploadFile = File(...)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="O arquivo deve ser uma imagem.")

    # Generate a unique filename
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Return the URL path
    return {"url": f"/uploads/{unique_filename}"}
