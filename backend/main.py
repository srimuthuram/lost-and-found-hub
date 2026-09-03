from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import get_db_connection

app = FastAPI(title="Simple Backend API")

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
    return {"message": "Welcome to the API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Example endpoint with raw SQL
@app.get("/users")
def get_users():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Raw SQL query
        cursor.execute("SELECT id, name, email FROM users")
        users = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # Convert to list of dicts
        result = [{"id": user[0], "name": user[1], "email": user[2]} for user in users]
        return {"users": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Example POST endpoint with raw SQL
@app.post("/users")
def create_user(name: str, email: str, password: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Raw SQL insert with parameterized query (prevents SQL injection)
        cursor.execute(
            "INSERT INTO users (name, email, password) VALUES (%s, %s, %s) RETURNING id",
            (name, email, password)
        )
        user_id = cursor.fetchone()[0]
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return {"id": user_id, "name": name, "email": email}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
