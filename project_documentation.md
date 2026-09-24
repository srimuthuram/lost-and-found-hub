Lost & Found Hub - Complete Codebase Documentation

1. Project Overview & Architecture

Lost & Found Hub is a full-stack web application that helps users report and recover lost items. The platform facilitates item reporting, claiming, and multi-user communication through a secure chat system.

Core Features:
- User Authentication: Email-based registration with OTP verification, password recovery, and profile management
- Item Reporting: Users can report lost or found items with photos, descriptions, and location details
- Security Questions: Found items can include security questions with answers to verify ownership
- Multi-User Claim System: Multiple users can claim the same item, with separate chat conversations for each claimant
- Real-time Chat: Private messaging between item owners and claimants with message read receipts
- Notification System: Email notifications and in-app notification center for new messages
- Item Status Management: Mark items as found/returned, reactivate resolved items, and manage item history
- Responsive Design: Mobile-optimized interface with adaptive layouts

Architecture:
- Frontend: React.js SPA with Vite build tool, component-based architecture
- Backend: FastAPI REST API with PostgreSQL database
- Communication: HTTP requests between frontend and backend
- Database: PostgreSQL with relational schema supporting users, items, messages, and OTP storage

2. Complete Tech Stack & Dependencies

Frontend:
- Languages: JavaScript (ES6+), JSX
- Framework: React 18.2.0
- Build Tool: Vite 5.0.8
- Development: @vitejs/plugin-react 4.2.1
- Type Checking: @types/react 18.2.43, @types/react-dom 18.2.17

Backend:
- Language: Python 3.x
- Web Framework: FastAPI 0.104.0
- Database: PostgreSQL (via psycopg2-binary 2.9.0)
- Server: Uvicorn 0.24.0
- Authentication: bcrypt (passlib 1.7.4)
- Email: Python smtplib for SMTP integration
- Data Validation: Pydantic 2.0.0
- Environment: python-dotenv
- ORM: Raw SQL with psycopg2

Database:
- Database: PostgreSQL
- Driver: psycopg2-binary
- Schema: Relational with foreign key constraints

3. API Endpoints & Route Mapping

Authentication Routes:
- POST /auth/send-otp - Send OTP to user email for registration
- POST /auth/verify-otp-and-register - Verify OTP and complete user registration
- POST /auth/verify-otp-only - Verify OTP without registration
- POST /auth/send-forgot-password-otp - Send OTP for password reset
- POST /auth/verify-forgot-password-otp - Verify OTP for password reset
- POST /auth/reset-password - Reset user password with new password

User Management Routes:
- POST /api/login - User login with email and password
- POST /api/register - Legacy user registration (deprecated)
- POST /api/verify-otp - Legacy OTP verification (deprecated)

Item Management Routes:
- GET /api/items - Get all active lost/found items with user information
- POST /api/items - Create new lost/found item
- GET /api/items/{item_id} - Get single item by ID
- DELETE /api/items/{item_id} - Delete item by ID
- PATCH /api/items/{item_id}/status - Update item status (active/resolved)
- PUT /api/items/{item_id}/resolve - Mark item as found and remove from feed
- PUT /api/items/{item_id}/reactivate - Reactivate a resolved item
- GET /api/items/history - Get resolved/inactive items

Contact & Messaging Routes:
- POST /api/contact-owner - Send email to item owner and store initial message
- GET /api/messages - Get messages for current user (with optional item filter)
- PATCH /api/messages/{message_id}/read - Mark specific message as read
- PATCH /api/messages/mark-all-read - Mark all messages for user as read
- PATCH /api/messages/mark-read - Mark all messages for an item as read for user
- GET /api/messages/unread-count - Get unread message count for user

Chat System Routes:
- GET /api/chat - Get chat history for an item (with optional partner filter)
- GET /api/chat/partners - Get list of unique conversation partners for an item
- POST /api/chat/send - Send a chat message in conversation

System Routes:
- GET / - Root endpoint
- GET /health - Health check endpoint

4. Database Schema & Models

Tables:

users
- `id` (SERIAL PRIMARY KEY) - Unique user identifier
- `name` (VARCHAR(100) NOT NULL) - User's full name
- `email` (VARCHAR(100) UNIQUE NOT NULL) - User's email address
- `password_hash` (TEXT NOT NULL) - Bcrypt hashed password
- `dp_url` (TEXT) - Display picture URL (optional)
- `is_verified` (BOOLEAN DEFAULT FALSE) - Email verification status

items
- `id` (SERIAL PRIMARY KEY) - Unique item identifier
- `title` (VARCHAR(100) NOT NULL) - Item title
- `description` (TEXT NOT NULL) - Item description
- `type` (VARCHAR(10) NOT NULL) - 'lost' or 'found'
- `location` (VARCHAR(100) NOT NULL) - Location where item was lost/found
- `user_id` (INTEGER NOT NULL, FOREIGN KEY → users.id) - Item owner
- `image_url` (TEXT) - Optional item image URL
- `status` (VARCHAR(20) DEFAULT 'active') - Item status
- `is_active` (BOOLEAN DEFAULT TRUE) - Whether item is active in feed
- `secret_question` (TEXT) - Security question for found items
- `secret_answer` (TEXT) - Security answer for verification

messages
- `id` (SERIAL PRIMARY KEY) - Unique message identifier
- `item_id` (INTEGER NOT NULL, FOREIGN KEY → items.id) - Related item
- `sender_id` (INTEGER NOT NULL, FOREIGN KEY → users.id) - Message sender
- `receiver_id` (INTEGER NOT NULL, FOREIGN KEY → users.id) - Message receiver
- `message` (TEXT NOT NULL) - Message content
- `is_read` (BOOLEAN DEFAULT FALSE) - Read status
- `read_at` (TIMESTAMP) - When message was read
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP) - Message creation time
- `proof_image_url` (TEXT) - Optional proof of ownership image
- `verification_answer` (TEXT) - Security question answer from claimant

otp_storage
- `id` (SERIAL PRIMARY KEY) - Unique OTP record
- `email` (VARCHAR(100) NOT NULL) - User email
- `otp_code` (VARCHAR(6) NOT NULL) - 6-digit OTP code
- `expires_at` (TIMESTAMP NOT NULL) - OTP expiration time
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP) - OTP creation time

Relationships:
- users → items: One-to-many (one user can have multiple items)
- users → messages: One-to-many (users can send/receive multiple messages)
- items → messages: One-to-many (one item can have multiple messages)
- messages → users: Many-to-one (messages reference both sender and receiver)

5. Environment Configuration & Deployment Readiness

Required Environment Variables (.env file in backend):

Database Configuration:
- `DB_HOST` - PostgreSQL database host (default: localhost)
- `DB_PORT` - PostgreSQL database port (default: 5432)
- `DB_USER` - PostgreSQL username
- `DB_PASSWORD` - PostgreSQL password
- `DB_NAME` - Database name (e.g., lost_found_db)

Email Configuration (SMTP):
- `SMTP_HOST` - SMTP server host (e.g., smtp.gmail.com)
- `SMTP_PORT` - SMTP server port (e.g., 587)
- `SMTP_EMAIL` - SMTP sender email address
- `SMTP_PASSWORD` - SMTP password/app password
- `SMTP_FROM_NAME` - Email sender name (default: "Lost and Found Hub")

Frontend Configuration:
- API Base URL: Currently hardcoded as `http://localhost:8000` in services/api.js
- CORS: Configured to allow requests from `http://localhost:5173` (Vite default)

Development Setup:

Backend:
  - Install Python dependencies: `pip install -r requirements.txt`
  - Configure PostgreSQL database
  - Set up .env file with database and SMTP credentials
  - Run database initialization: `python database.py`
  - Start backend server: `uvicorn main:app --reload`

Frontend:
  - Install Node.js dependencies: `npm install`
  - Start development server: `npm run dev`
  - Build for production: `npm run build`

Production Deployment Considerations:
- Update API base URL to production domain
- Configure CORS for production domain
- Set up production PostgreSQL database
- Configure production SMTP server
- Use environment variables for sensitive data
- Enable HTTPS for secure connections
- Configure proper database backups