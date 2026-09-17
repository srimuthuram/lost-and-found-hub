import os
import random
import re
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.message import EmailMessage
import bcrypt

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from backend.database import get_db_connection, ensure_database_exists, init_db

# Password hashing functions using direct bcrypt
def hash_password(password: str) -> str:
    """Hash a password using bcrypt, safely truncated to 72 bytes."""
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    pwd_bytes = plain_password.encode('utf-8')[:72]
    hash_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hash_bytes)

# Pydantic models for request validation
class SendOTPRequest(BaseModel):
    email: str = Field(..., pattern=r"[^@]+@[^@]+\.[^@]+")

class VerifyOTPAndRegister(BaseModel):
    email: str = Field(..., pattern=r"[^@]+@[^@]+\.[^@]+")
    otp_code: str = Field(..., min_length=6, max_length=6)
    name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8)
    dp_url: Optional[str] = None

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        # Truncate to 72 bytes to prevent bcrypt error
        password_bytes = v.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
            v = password_bytes.decode('utf-8', errors='ignore')
        
        errors = []
        if len(v) < 8:
            errors.append("at least 8 characters")
        if not re.search(r"[A-Z]", v):
            errors.append("one uppercase letter")
        if not re.search(r"[a-z]", v):
            errors.append("one lowercase letter")
        if not re.search(r"\d", v):
            errors.append("one number")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            errors.append("one special character")
        
        if errors:
            raise ValueError(f"Password must contain {', '.join(errors)}")
        return v

class OTPVerify(BaseModel):
    email: str = Field(..., pattern=r"[^@]+@[^@]+\.[^@]+")
    otp_code: str = Field(..., min_length=6, max_length=6)

class ContactOwnerRequest(BaseModel):
    owner_email: str = Field(..., pattern=r"[^@]+@[^@]+\.[^@]+")
    sender_name: str = Field(..., min_length=1, max_length=100)
    sender_email: str = Field(..., pattern=r"[^@]+@[^@]+\.[^@]+")
    message: str = Field(..., min_length=1, max_length=1000)
    item_id: int = Field(..., gt=0)
    verification_answer: Optional[str] = None
    proof_image_url: Optional[str] = None

class UserLogin(BaseModel):
    email: str = Field(..., pattern=r"[^@]+@[^@]+\.[^@]+")
    password: str = Field(..., min_length=8)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        # Truncate to 72 bytes to prevent bcrypt error
        password_bytes = v.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
            v = password_bytes.decode('utf-8', errors='ignore')
        
        errors = []
        if len(v) < 8:
            errors.append("at least 8 characters")
        if not re.search(r"[A-Z]", v):
            errors.append("one uppercase letter")
        if not re.search(r"[a-z]", v):
            errors.append("one lowercase letter")
        if not re.search(r"\d", v):
            errors.append("one number")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            errors.append("one special character")
        
        if errors:
            raise ValueError(f"Password must contain {', '.join(errors)}")
        return v

class ItemCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1)
    type: str = Field(..., pattern="^(lost|found)$")
    location: str = Field(..., min_length=1, max_length=100)
    user_id: int = Field(..., gt=0)
    image_url: Optional[str] = None
    secret_question: Optional[str] = None
    secret_answer: Optional[str] = None

    @field_validator('secret_question', 'secret_answer')
    @classmethod
    def validate_security_fields(cls, v, info):
        # Get the type field value
        values = info.data
        item_type = values.get('type')
        
        # For found items, security question and answer are required
        if item_type == 'found':
            if info.field_name == 'secret_question' and not v:
                raise ValueError('Security question is required for found items')
            if info.field_name == 'secret_answer' and not v:
                raise ValueError('Security answer is required for found items')
        
        return v

class ItemStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|resolved)$")

# Helper functions
def generate_otp():
    """Generate a 6-digit OTP code."""
    return str(random.randint(100000, 999999))

def store_otp(email: str, otp_code: str):
    """Store OTP in database with 10-minute expiration."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        expires_at = datetime.now() + timedelta(minutes=10)
        
        # Delete any existing OTPs for this email
        cursor.execute("DELETE FROM otp_storage WHERE email = %s", (email,))
        
        # Insert new OTP
        cursor.execute(
            "INSERT INTO otp_storage (email, otp_code, expires_at) VALUES (%s, %s, %s)",
            (email, otp_code, expires_at)
        )
        
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error storing OTP: {e}")
        raise

def send_otp_email(email: str, otp_code: str):
    """Send OTP email using SMTP."""
    try:
        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", 587))
        smtp_email = os.getenv("SMTP_EMAIL")
        smtp_password = os.getenv("SMTP_PASSWORD")
        smtp_from_name = os.getenv("SMTP_FROM_NAME", "Lost and Found Hub")
        
        if not smtp_email or not smtp_password:
            print("Warning: SMTP credentials not configured. OTP will be logged instead.")
            print(f"OTP for {email}: {otp_code}")
            return
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = f"{smtp_from_name} <{smtp_email}>"
        msg['To'] = email
        msg['Subject'] = "Verify Your Email - Lost and Found Hub"
        
        body = f"""
        Your verification code is: {otp_code}
        
        This code will expire in 10 minutes.
        
        If you didn't request this code, please ignore this email.
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_email, smtp_password)
        server.send_message(msg)
        server.quit()
        
        print(f"OTP sent to {email}")
    except Exception as e:
        print(f"Error sending OTP email: {e}")
        # Log OTP if email fails
        print(f"OTP for {email}: {otp_code}")
        raise

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

# POST /auth/send-otp: Send OTP to email for registration
@app.post("/auth/send-otp")
def send_otp_endpoint(request: SendOTPRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if email is already registered and verified
        cursor.execute(
            "SELECT id, is_verified FROM users WHERE email = %s",
            (request.email,)
        )
        existing_user = cursor.fetchone()
        
        if existing_user and existing_user[1]:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail="Email is already registered and verified")
        
        # Generate and send OTP
        otp_code = generate_otp()
        store_otp(request.email, otp_code)
        send_otp_email(request.email, otp_code)
        
        cursor.close()
        conn.close()
        
        return {
            "message": "OTP sent successfully",
            "email": request.email
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# POST /auth/verify-otp-and-register: Verify OTP and complete registration
@app.post("/auth/verify-otp-and-register")
def verify_otp_and_register(data: VerifyOTPAndRegister):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get the most recent OTP for this email
        cursor.execute(
            "SELECT otp_code, expires_at FROM otp_storage WHERE email = %s ORDER BY created_at DESC LIMIT 1",
            (data.email,)
        )
        otp_record = cursor.fetchone()
        
        if not otp_record:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail="No OTP found for this email")
        
        stored_otp, expires_at = otp_record
        
        # Check if OTP is expired
        if datetime.now() > expires_at:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail="OTP has expired")
        
        # Check if OTP matches
        if stored_otp != data.otp_code:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail="Invalid OTP")
        
        # Check if user already exists
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (data.email,)
        )
        existing_user = cursor.fetchone()
        
        if existing_user:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail="Email is already registered")
        
        # Hash password
        password_hash = hash_password(data.password)
        
        # Create user
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, dp_url, is_verified) VALUES (%s, %s, %s, %s, %s) RETURNING id, name, email, dp_url",
            (data.name, data.email, password_hash, data.dp_url, True)
        )
        user_data = cursor.fetchone()
        
        # Delete the used OTP
        cursor.execute("DELETE FROM otp_storage WHERE email = %s", (data.email,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            "status": "success",
            "user": {
                "id": user_data[0],
                "name": user_data[1],
                "email": user_data[2],
                "dp_url": user_data[3],
                "is_verified": True
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# POST /api/register: Register a new user (DEPRECATED - use new flow)
@app.post("/api/register")
def register_user(user: UserCreate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert user with parameterized query
        cursor.execute(
            "INSERT INTO users (name, email, password, dp_url, is_verified) VALUES (%s, %s, %s, %s, %s) RETURNING id, name, email, dp_url",
            (user.name, user.email, user.password, user.dp_url, False)
        )
        user_data = cursor.fetchone()
        conn.commit()
        
        cursor.close()
        conn.close()
        
        # Generate and send OTP
        otp_code = generate_otp()
        store_otp(user.email, otp_code)
        send_otp_email(user.email, otp_code)
        
        return {
            "id": user_data[0],
            "name": user_data[1],
            "email": user_data[2],
            "dp_url": user_data[3],
            "is_verified": False,
            "message": "Registration successful. Please check your email for verification code."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# POST /auth/verify-otp-only: Verify OTP only (without registration)
@app.post("/auth/verify-otp-only")
def verify_otp_only(otp_data: OTPVerify):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get the most recent OTP for this email
        cursor.execute(
            "SELECT otp_code, expires_at FROM otp_storage WHERE email = %s ORDER BY created_at DESC LIMIT 1",
            (otp_data.email,)
        )
        otp_record = cursor.fetchone()
        
        if not otp_record:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail="No OTP found for this email")
        
        stored_otp, expires_at = otp_record
        
        # Check if OTP is expired
        if datetime.now() > expires_at:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail="OTP has expired")
        
        # Check if OTP matches
        if stored_otp != otp_data.otp_code:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail="Invalid OTP")
        
        cursor.close()
        conn.close()
        
        return {"message": "OTP verified successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# POST /api/verify-otp: Verify OTP and mark user as verified
@app.post("/api/verify-otp")
def verify_otp(otp_data: OTPVerify):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get the most recent OTP for this email
        cursor.execute(
            "SELECT otp_code, expires_at FROM otp_storage WHERE email = %s ORDER BY created_at DESC LIMIT 1",
            (otp_data.email,)
        )
        otp_record = cursor.fetchone()
        
        if not otp_record:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail="No OTP found for this email")
        
        stored_otp, expires_at = otp_record
        
        # Check if OTP is expired
        if datetime.now() > expires_at:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail="OTP has expired")
        
        # Check if OTP matches
        if stored_otp != otp_data.otp_code:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail="Invalid OTP")
        
        # Mark user as verified
        cursor.execute(
            "UPDATE users SET is_verified = TRUE WHERE email = %s",
            (otp_data.email,)
        )
        
        # Delete the used OTP
        cursor.execute("DELETE FROM otp_storage WHERE email = %s", (otp_data.email,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {"message": "Email verified successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# POST /api/login: Login user
@app.post("/api/login")
def login_user(user: UserLogin):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Query for user with matching email
        cursor.execute(
            "SELECT id, name, email, password_hash, dp_url, is_verified FROM users WHERE email = %s",
            (user.email,)
        )
        user_data = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        # Check if user exists and password matches
        if not user_data or not verify_password(user.password, user_data[3]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check if user is verified
        if not user_data[5]:
            raise HTTPException(status_code=403, detail="Please verify your email before logging in")
        
        return {
            "status": "success",
            "user": {
                "id": user_data[0],
                "name": user_data[1],
                "email": user_data[2],
                "dp_url": user_data[4],
                "is_verified": user_data[5]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# POST /api/items: Create a new lost/found item
@app.post("/api/items")
def create_item(item: ItemCreate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user is verified
        cursor.execute(
            "SELECT is_verified FROM users WHERE id = %s",
            (item.user_id,)
        )
        user_verification = cursor.fetchone()
        
        if not user_verification or not user_verification[0]:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=403, detail="Please verify your email before posting items")
        
        # Insert item with parameterized query
        cursor.execute(
            """INSERT INTO items (title, description, type, location, user_id, image_url, secret_question, secret_answer) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (item.title, item.description, item.type, item.location, item.user_id, item.image_url, item.secret_question, item.secret_answer)
        )
        item_id = cursor.fetchone()[0]
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return {
            "id": item_id,
            "title": item.title,
            "description": item.description,
            "type": item.type,
            "location": item.location,
            "user_id": item.user_id,
            "image_url": item.image_url,
            "status": "active",
            "secret_question": item.secret_question,
            "secret_answer": item.secret_answer
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# GET /api/items: Get all items with user information
@app.get("/api/items")
def get_items():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Join items with users and order by id DESC, only active items
        cursor.execute("""
            SELECT i.id, i.title, i.description, i.type, i.location, i.user_id, i.image_url, i.status, i.is_active, i.secret_question, i.secret_answer,
                   u.name as user_name, u.email as user_email
            FROM items i
            JOIN users u ON i.user_id = u.id
            WHERE i.is_active = TRUE
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
                "type": item[3],
                "location": item[4],
                "user_id": item[5],
                "image_url": item[6],
                "status": item[7],
                "is_active": item[8],
                "secret_question": item[9],
                "secret_answer": item[10],
                "user_name": item[11],
                "user_email": item[12]
            }
            for item in items
        ]
        return {"items": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# GET /api/items/history: Get resolved/inactive items (MUST BE BEFORE /api/items/{item_id})
@app.get("/api/items/history")
def get_resolved_items():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT i.id, i.title, i.description, i.type, i.location,
                   i.user_id, i.image_url, i.status, i.is_active,
                   i.secret_question, i.secret_answer,
                   u.name AS user_name, u.email AS user_email
            FROM items i
            JOIN users u ON i.user_id = u.id
            WHERE i.is_active = FALSE
            ORDER BY i.id DESC
        """)

        items = []
        for row in cursor.fetchall():
            items.append({
                "id": row[0],
                "title": row[1],
                "description": row[2],
                "type": row[3],
                "location": row[4],
                "user_id": row[5],
                "image_url": row[6],
                "status": row[7],
                "is_active": row[8],
                "secret_question": row[9],
                "secret_answer": row[10],
                "user_name": row[11],
                "user_email": row[12]
            })

        cursor.close()
        conn.close()

        return {"items": items}
    except HTTPException:
        raise
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
            SELECT i.id, i.title, i.description, i.type, i.location, i.user_id, i.image_url, i.status, i.is_active, i.secret_question, i.secret_answer,
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
            "type": item[3],
            "location": item[4],
            "user_id": item[5],
            "image_url": item[6],
            "status": item[7],
            "is_active": item[8],
            "secret_question": item[9],
            "secret_answer": item[10],
            "user_name": item[11],
            "user_email": item[12]
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

# PATCH /api/items/{item_id}/status: Update item status
@app.patch("/api/items/{item_id}/status")
def update_item_status(item_id: int, status_update: ItemStatusUpdate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if item exists
        cursor.execute("SELECT id FROM items WHERE id = %s", (item_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Update item status
        cursor.execute(
            "UPDATE items SET status = %s WHERE id = %s",
            (status_update.status, item_id)
        )
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return {"message": "Item status updated successfully", "id": item_id, "status": status_update.status}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# POST /api/contact-owner: Send email to item owner and store message
@app.post("/api/contact-owner")
def contact_owner(data: ContactOwnerRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get sender user ID
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (data.sender_email,)
        )
        sender_result = cursor.fetchone()
        if not sender_result:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Sender user not found")
        sender_id = sender_result[0]
        
        # Get receiver user ID
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (data.owner_email,)
        )
        receiver_result = cursor.fetchone()
        if not receiver_result:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Receiver user not found")
        receiver_id = receiver_result[0]
        
        # Get item secret question and answer for verification
        cursor.execute(
            "SELECT secret_question, secret_answer FROM items WHERE id = %s",
            (data.item_id,)
        )
        item_secret = cursor.fetchone()
        
        # Verify answer if secret question exists (using combined verification: case-insensitive + keyword + fuzzy)
        # Note: We don't block incorrect answers - we allow chat regardless
        verification_passed = False
        if item_secret and item_secret[0] and item_secret[1] and data.verification_answer:
            stored_answer = item_secret[1].lower().strip()
            user_answer = data.verification_answer.lower().strip()
            
            # Option 1: Exact match after normalization
            if stored_answer == user_answer:
                verification_passed = True
            else:
                # Option 2: Keyword matching
                stored_words = set(stored_answer.split())
                user_words = set(user_answer.split())
                if stored_words.issubset(user_words) or user_words.issubset(stored_words):
                    verification_passed = True
                else:
                    # Option 3: Fuzzy matching
                    from difflib import SequenceMatcher
                    similarity = SequenceMatcher(None, stored_answer, user_answer).ratio()
                    if similarity >= 0.7:  # 70% similarity threshold
                        verification_passed = True

        
        # Store message in database with verification details
        cursor.execute(
            """INSERT INTO messages (item_id, sender_id, receiver_id, message, proof_image_url, verification_answer) 
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (data.item_id, sender_id, receiver_id, data.message, data.proof_image_url, data.verification_answer)
        )
        conn.commit()
        
        # Send email
        msg = EmailMessage()
        email_content = f"From: {data.sender_name} ({data.sender_email})\n\n{data.message}"
        if data.proof_image_url:
            email_content += "\n\nProof of ownership image provided."
        if data.verification_answer:
            email_content += "\n\nSecurity question answered."
        msg.set_content(email_content)
        msg["Subject"] = "Lost & Found Hub: Message regarding your item"
        msg["From"] = os.getenv("SMTP_EMAIL")
        msg["To"] = data.owner_email

        with smtplib.SMTP(os.getenv("SMTP_HOST", "smtp.gmail.com"), int(os.getenv("SMTP_PORT", 587))) as server:
            server.starttls()
            server.login(os.getenv("SMTP_EMAIL"), os.getenv("SMTP_PASSWORD"))
            server.send_message(msg)
        
        cursor.close()
        conn.close()
            
        return {"success": True, "message": "Email sent successfully!"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# GET /api/messages: Get messages for current user
@app.get("/api/messages")
def get_messages(user_email: str = Query(..., description="User email to get messages for"), item_id: int = Query(None, description="Filter by item ID")):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get user ID
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (user_email,)
        )
        user_result = cursor.fetchone()
        if not user_result:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")
        user_id = user_result[0]
        
        # Build query with optional item filter
        if item_id:
            cursor.execute("""
                SELECT m.id, m.item_id, m.message, m.is_read, m.read_at, m.created_at, m.proof_image_url, m.verification_answer,
                       m.sender_id, m.receiver_id,
                       u.name as sender_name, u.email as sender_email,
                       i.title as item_title, i.type as item_type
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                JOIN items i ON m.item_id = i.id
                WHERE (m.receiver_id = %s OR m.sender_id = %s) AND m.item_id = %s
                ORDER BY m.created_at DESC
            """, (user_id, user_id, item_id))
        else:
            cursor.execute("""
                SELECT m.id, m.item_id, m.message, m.is_read, m.read_at, m.created_at, m.proof_image_url, m.verification_answer,
                       m.sender_id, m.receiver_id,
                       u.name as sender_name, u.email as sender_email,
                       i.title as item_title, i.type as item_type
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                JOIN items i ON m.item_id = i.id
                WHERE m.receiver_id = %s OR m.sender_id = %s
                ORDER BY m.created_at DESC
            """, (user_id, user_id))
        
        messages = []
        for row in cursor.fetchall():
            messages.append({
                "id": row[0],
                "item_id": row[1],
                "message": row[2],
                "is_read": row[3],
                "read_at": row[4].isoformat() if row[4] else None,
                "created_at": row[5].isoformat(),
                "proof_image_url": row[6],
                "verification_answer": row[7],
                "sender_id": row[8],
                "receiver_id": row[9],
                "sender_name": row[10],
                "sender_email": row[11],
                "item_title": row[12],
                "item_type": row[13]
            })
        
        cursor.close()
        conn.close()
        
        return {"messages": messages}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# PATCH /api/messages/{message_id}/read: Mark message as read
@app.patch("/api/messages/{message_id}/read")
def mark_message_as_read(message_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE messages SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = %s",
            (message_id,)
        )
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return {"message": "Message marked as read"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# PATCH /api/messages/mark-all-read: Mark all messages for a user as read
@app.patch("/api/messages/mark-all-read")
def mark_all_messages_as_read(user_email: str = Query(..., description="User email")):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get user ID
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (user_email,)
        )
        user_result = cursor.fetchone()
        if not user_result:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")
        user_id = user_result[0]
        
        # Mark all unread messages where user is the receiver as read
        cursor.execute(
            """UPDATE messages 
               SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
               WHERE receiver_id = %s AND is_read = FALSE""",
            (user_id,)
        )
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return {"message": "All messages marked as read"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# PATCH /api/messages/mark-read: Mark all messages for an item as read for a user
@app.patch("/api/messages/mark-read")
def mark_item_messages_as_read(item_id: int = Query(..., description="Item ID"), user_email: str = Query(..., description="User email")):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get user ID
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (user_email,)
        )
        user_result = cursor.fetchone()
        if not user_result:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")
        user_id = user_result[0]
        
        # Mark all unread messages for this item where user is the receiver as read
        cursor.execute(
            """UPDATE messages 
               SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
               WHERE item_id = %s AND receiver_id = %s AND is_read = FALSE""",
            (item_id, user_id)
        )
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return {"message": "Messages marked as read"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# GET /api/chat: Get chat history for an item between two users
@app.get("/api/chat")
def get_chat_history(item_id: int = Query(..., description="Item ID"), user_email: str = Query(..., description="Current user email")):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get current user ID
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (user_email,)
        )
        user_result = cursor.fetchone()
        if not user_result:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")
        user_id = user_result[0]
        
        # Get all messages for this item where current user is either sender or receiver
        cursor.execute("""
            SELECT m.id, m.sender_id, m.receiver_id, m.message, m.is_read, m.read_at, m.created_at, 
                   m.proof_image_url, m.verification_answer,
                   u_sender.name as sender_name, u_sender.email as sender_email,
                   u_receiver.name as receiver_name, u_receiver.email as receiver_email
            FROM messages m
            JOIN users u_sender ON m.sender_id = u_sender.id
            JOIN users u_receiver ON m.receiver_id = u_receiver.id
            WHERE m.item_id = %s AND (m.sender_id = %s OR m.receiver_id = %s)
            ORDER BY m.created_at ASC
        """, (item_id, user_id, user_id))
        
        messages = []
        for row in cursor.fetchall():
            messages.append({
                "id": row[0],
                "sender_id": row[1],
                "receiver_id": row[2],
                "message": row[3],
                "is_read": row[4],
                "read_at": row[5].isoformat() if row[5] else None,
                "created_at": row[6].isoformat(),
                "proof_image_url": row[7],
                "verification_answer": row[8],
                "sender_name": row[9],
                "sender_email": row[10],
                "receiver_name": row[11],
                "receiver_email": row[12],
                "is_sent_by_me": row[1] == user_id
            })
        
        cursor.close()
        conn.close()
        
        return {"messages": messages}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# POST /api/chat/send: Send a reply in the chat
class ChatMessageRequest(BaseModel):
    item_id: int = Field(..., gt=0)
    sender_email: str = Field(..., pattern=r"[^@]+@[^@]+\.[^@]+")
    receiver_email: str = Field(..., pattern=r"[^@]+@[^@]+\.[^@]+")
    message: str = Field(..., min_length=1, max_length=1000)
    proof_image_url: Optional[str] = None

@app.post("/api/chat/send")
def send_chat_message(data: ChatMessageRequest):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get sender user ID
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (data.sender_email,)
        )
        sender_result = cursor.fetchone()
        if not sender_result:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Sender user not found")
        sender_id = sender_result[0]
        
        # Get receiver user ID
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (data.receiver_email,)
        )
        receiver_result = cursor.fetchone()
        if not receiver_result:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Receiver user not found")
        receiver_id = receiver_result[0]
        
        # Verify item exists
        cursor.execute(
            "SELECT id FROM items WHERE id = %s",
            (data.item_id,)
        )
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Store message
        cursor.execute(
            """INSERT INTO messages (item_id, sender_id, receiver_id, message, proof_image_url) 
               VALUES (%s, %s, %s, %s, %s)""",
            (data.item_id, sender_id, receiver_id, data.message, data.proof_image_url)
        )
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return {"success": True, "message": "Message sent successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# GET /api/messages/unread-count: Get unread message count for a user
@app.get("/api/messages/unread-count")
def get_unread_count(user_email: str = Query(..., description="User email")):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get user ID
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (user_email,)
        )
        user_result = cursor.fetchone()
        if not user_result:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")
        user_id = user_result[0]

        # Count unread messages
        cursor.execute(
            "SELECT COUNT(*) FROM messages WHERE receiver_id = %s AND is_read = FALSE",
            (user_id,)
        )
        count = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return {"unread_count": count}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# PUT /api/items/{item_id}/reactivate: Reactivate a resolved item
@app.put("/api/items/{item_id}/reactivate")
def reactivate_item(item_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update item to active status
        cursor.execute(
            """UPDATE items 
               SET is_active = TRUE, status = 'active' 
               WHERE id = %s""",
            (item_id,)
        )
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return {"success": True, "message": "Item reactivated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# PUT /api/items/{item_id}/resolve: Mark item as resolved and inactive
@app.put("/api/items/{item_id}/resolve")
def resolve_item(item_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if item exists
        cursor.execute("SELECT id FROM items WHERE id = %s", (item_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Item not found")

        # Update item status and is_active
        cursor.execute(
            "UPDATE items SET status = 'FOUND', is_active = FALSE WHERE id = %s",
            (item_id,)
        )
        conn.commit()

        cursor.close()
        conn.close()

        return {"message": "Item marked as found and removed from feed", "id": item_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
