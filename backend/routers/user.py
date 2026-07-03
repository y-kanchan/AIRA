from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from bson import ObjectId
import uuid
import datetime
from services.rag import extract_pdf_text

from db import interviews_collection, users_collection
from services.auth_utils import get_current_user

router = APIRouter(prefix="/user", tags=["user"])

@router.get("/history")
async def get_user_history(user_id: str = Depends(get_current_user)):
    """
    Fetch all completed interviews for the authenticated user.
    """
    cursor = interviews_collection.find({"user_id": user_id}).sort("created_at", -1)
    history = await cursor.to_list(length=100)
    
    # Format the data for the frontend
    formatted_history = []
    for item in history:
        # Convert ObjectId to string
        item["_id"] = str(item["_id"])
        formatted_history.append({
            "id": item["_id"],
            "session_id": item.get("session_id", ""),
            "date": item.get("created_at", "Unknown Date"),
            "role": item.get("role", "Software Engineer"), # Could be extracted from JD in future
            "score": item.get("overall_score", 0),
            "status": "Completed"
        })
        
    return {"history": formatted_history}

class SettingsUpdate(BaseModel):
    time_limit: int

@router.get("/settings")
async def get_settings(user_id: str = Depends(get_current_user)):
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    return {"time_limit": user.get("time_limit", 30) if user else 30}

@router.post("/settings")
async def update_settings(settings: SettingsUpdate, user_id: str = Depends(get_current_user)):
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"time_limit": settings.time_limit}}
    )
    return {"status": "success"}
    return {"status": "success"}

# ── Materials Management ──────────────────────────────────────────────────────

@router.get("/materials")
async def get_materials(user_id: str = Depends(get_current_user)):
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    materials = user.get("materials", []) if user else []
    return {"materials": materials}

@router.post("/materials/upload")
async def upload_material(
    material_type: str = Form(...),
    name: str = Form(...),
    content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    user_id: str = Depends(get_current_user)
):
    text_content = content
    if file:
        file_bytes = await file.read()
        # Save temporarily to extract text, or extract_pdf_text handles bytes?
        # rag.extract_pdf_text needs a file path. Let's write to a temp file.
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        
        try:
            text_content = extract_pdf_text(tmp_path)
        except Exception as e:
            raise HTTPException(400, f"Failed to extract text from PDF: {str(e)}")
        finally:
            os.remove(tmp_path)
            
    if not text_content:
        raise HTTPException(400, "Could not extract text or no content provided.")

    material_id = str(uuid.uuid4())
    material = {
        "id": material_id,
        "type": material_type, # 'resume', 'jd', 'github'
        "name": name,
        "content": text_content,
        "created_at": datetime.datetime.utcnow().isoformat()
    }
    
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$push": {"materials": material}}
    )
    
    return {"status": "success", "material": material}

@router.delete("/materials/{material_id}")
async def delete_material(material_id: str, user_id: str = Depends(get_current_user)):
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$pull": {"materials": {"id": material_id}}}
    )
    return {"status": "success"}
