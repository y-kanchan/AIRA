from fastapi import APIRouter, Depends
from typing import List
from pydantic import BaseModel
from bson import ObjectId

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
