import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field
from typing import Optional
from backend.database import get_db_connection, ensure_database_exists, init_db

# Pydantic models for request validation
class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., pattern=r"[^@]+@[^@]+\.[^@]+")
    password: str = Field(..., min_length=1)

class ItemCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1, max_length=50)
    type: str = Field(..., pattern="^(lost|found)$")
    location: str = Field(..., min_length=1, max_length=100)
    user_id: int = Field(..., gt=0)

# Lifespan context manager for startup tasks
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database
    print("Initializing database...")
    ensure_database_exists()
    init_db()
    print("Database initialization complete.")
    yield
    # Shutdown: Add cleanup if needed
    print("Shutting down...")

# Create FastAPI app with lifespan
app = FastAPI(
    title="Lost and Found API",
    description="API for managing lost and found items",
    lifespan=lifespan
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Lost and Found API", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# POST /api/register: Register a new user
@app.post("/api/register")
def register_user(user: UserCreate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert user with parameterized query
        cursor.execute(
            "INSERT INTO users (name, email, password) VALUES (%s, %s, %s) RETURNING id, name, email",
            (user.name, user.email, user.password)
        )
        user_data = cursor.fetchone()
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return {
            "id": user_data[0],
            "name": user_data[1],
            "email": user_data[2]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# POST /api/items: Create a new lost/found item
@app.post("/api/items")
def create_item(item: ItemCreate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert item with parameterized query
        cursor.execute(
            """INSERT INTO items (title, description, category, type, location, user_id) 
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
            (item.title, item.description, item.category, item.type, item.location, item.user_id)
        )
        item_id = cursor.fetchone()[0]
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return {
            "id": item_id,
            "title": item.title,
            "description": item.description,
            "category": item.category,
            "type": item.type,
            "location": item.location,
            "user_id": item.user_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# GET /api/items: Get all items with user information
@app.get("/api/items")
def get_items():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Join items with users and order by id DESC
        cursor.execute("""
            SELECT i.id, i.title, i.description, i.category, i.type, i.location, i.user_id, 
                   u.name as user_name, u.email as user_email
            FROM items i
            JOIN users u ON i.user_id = u.id
            ORDER BY i.id DESC
        """)
        items = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # Convert to list of dicts
        result = [
            {
                "id": item[0],
                "title": item[1],
                "description": item[2],
                "category": item[3],
                "type": item[4],
                "location": item[5],
                "user_id": item[6],
                "user_name": item[7],
                "user_email": item[8]
            }
            for item in items
        ]
        return {"items": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# GET /api/items/{item_id}: Get a single item by ID
@app.get("/api/items/{item_id}")
def get_item(item_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get single item with user information
        cursor.execute("""
            SELECT i.id, i.title, i.description, i.category, i.type, i.location, i.user_id,
                   u.name as user_name, u.email as user_email
            FROM items i
            JOIN users u ON i.user_id = u.id
            WHERE i.id = %s
        """, (item_id,))
        item = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        return {
            "id": item[0],
            "title": item[1],
            "description": item[2],
            "category": item[3],
            "type": item[4],
            "location": item[5],
            "user_id": item[6],
            "user_name": item[7],
            "user_email": item[8]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# DELETE /api/items/{item_id}: Delete an item by ID
@app.delete("/api/items/{item_id}")
def delete_item(item_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if item exists
        cursor.execute("SELECT id FROM items WHERE id = %s", (item_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Delete item
        cursor.execute("DELETE FROM items WHERE id = %s", (item_id,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return {"message": "Item deleted successfully", "id": item_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
