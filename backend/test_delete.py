import asyncio
from db import users_collection
from bson import ObjectId

async def test():
    user = await users_collection.find_one({})
    if not user:
        print("No users found")
        return
    materials = user.get("materials", [])
    if not materials:
        print("No materials found")
        return
    
    mat_id = materials[0]["id"]
    print(f"Deleting material {mat_id}")
    
    res = await users_collection.update_one(
        {"_id": user["_id"]},
        {"$pull": {"materials": {"id": mat_id}}}
    )
    print(f"Modified count: {res.modified_count}")

asyncio.run(test())
