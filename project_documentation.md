# Lost & Found Hub - Complete Technical Documentation

## 1. Tech Stack Overview

### Frontend
- **Deployment Platform**: Vercel (https://lost-and-found-hub-chi.vercel.app)
- **Framework**: React 18.2.0
- **Build Tool**: Vite 5.0.8
- **Styling**: Custom CSS with responsive design
- **Architecture**: Component-based React SPA
- **Development**: @vitejs/plugin-react 4.2.1, @types/react 18.2.43

### Backend
- **Deployment Platform**: Render (https://lost-and-found-hub-cd1w.onrender.com)
- **Framework**: FastAPI 0.104.0
- **Python Version**: Python 3.x
- **ASGI Server**: Uvicorn 0.24.0
- **Data Validation**: Pydantic 2.0.0
- **Authentication**: bcrypt (passlib 1.7.4)
- **HTTP Client**: requests 2.31.0

### Database
- **Platform**: Neon (PostgreSQL cloud database)
- **Database**: PostgreSQL (managed by Neon)
- **Driver**: psycopg2-binary 2.9.0
- **Connection**: Direct PostgreSQL connection via psycopg2
- **Schema**: Relational with foreign key constraints

### External Services
- **Email Service**: Brevo API (https://api.brevo.com/v3/smtp/email)
- **Protocol**: HTTPS (port 443) - Works on Render free tier
- **Purpose**: Transactional emails for OTP verification and contact messages

## 2. Architecture & File Structure

### High-Level System Design
```
Frontend (Vercel) → Backend (Render) → Neon Database → Brevo API
     React              FastAPI        PostgreSQL      Email Service
```

### Data Flow
1. **User Interaction**: React components capture user input
2. **API Requests**: Frontend makes HTTP requests to FastAPI backend
3. **Database Operations**: FastAPI queries Neon PostgreSQL
4. **Email Dispatch**: Backend calls Brevo API for transactional emails
5. **Response Chain**: Data flows back through the same path

### Backend Structure
```
backend/
├── main.py                    # FastAPI application & API routes
├── database.py                # Database connection & schema management
├── requirements.txt           # Python dependencies
├── .env                      # Environment variables (gitignored)
└── clear_database.py          # Database cleanup utility
```

### Frontend Structure
```
frontend/
├── src/
│   ├── main.jsx              # React entry point
│   ├── App.jsx               # Main application component
│   ├── App.css               # Global styles
│   ├── services/
│   │   └── api.js            # API service layer
│   └── components/           # React components
│       ├── AuthGateway.jsx    # Authentication gateway
│       ├── ChatModal.jsx     # Chat interface
│       ├── ContactModal.jsx  # Contact form
│       ├── InteractiveGuide.jsx # Help documentation
│       ├── LoginForm.jsx     # Login component
│       ├── MultiStepRegistration.jsx # Registration flow
│       ├── Navbar.jsx        # Navigation
│       ├── NotificationCenter.jsx # Notifications
│       ├── OTPModal.jsx      # OTP verification
│       ├── OnboardingTour.jsx # User onboarding
│       └── TopNavbar.jsx     # Top navigation bar
├── index.html                # HTML entry point
├── package.json              # Node.js dependencies
├── vite.config.js            # Vite configuration
└── .env                     # Environment variables (gitignored)
```

## 3. Complete API Endpoints Reference

### Authentication Routes

#### POST /auth/send-otp
- **Purpose**: Send OTP to user email for registration
- **Request Body**: 
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response**: 
  ```json
  {
    "message": "OTP sent successfully",
    "email": "user@example.com"
  }
  ```
- **External Services**: Brevo API call for OTP email delivery

#### POST /auth/verify-otp-and-register
- **Purpose**: Verify OTP and complete user registration
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "otp_code": "123456",
    "name": "John Doe",
    "password": "SecurePass123!",
    "dp_url": "https://example.com/avatar.jpg"
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "user@example.com",
      "dp_url": "https://example.com/avatar.jpg",
      "is_verified": true
    }
  }
  ```

#### POST /auth/verify-otp-only
- **Purpose**: Verify OTP without registration
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "otp_code": "123456"
  }
  ```
- **Response**:
  ```json
  {
    "message": "OTP verified successfully"
  }
  ```

#### POST /auth/send-forgot-password-otp
- **Purpose**: Send OTP for password reset
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response**:
  ```json
  {
    "message": "OTP sent successfully for password reset",
    "email": "user@example.com"
  }
  ```
- **External Services**: Brevo API call for OTP email delivery

#### POST /auth/verify-forgot-password-otp
- **Purpose**: Verify OTP for password reset
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "otp_code": "123456"
  }
  ```
- **Response**:
  ```json
  {
    "message": "OTP verified successfully"
  }
  ```

#### POST /auth/reset-password
- **Purpose**: Reset user password with new password
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "otp_code": "123456",
    "new_password": "NewSecurePass123!"
  }
  ```
- **Response**: Success message

### User Management Routes

#### POST /api/login
- **Purpose**: User login with email and password
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePass123!"
  }
  ```
- **Response**: User authentication token/session data

#### POST /api/register (DEPRECATED)
- **Purpose**: Legacy user registration
- **Status**: Deprecated in favor of OTP-based flow

#### POST /api/verify-otp (DEPRECATED)
- **Purpose**: Legacy OTP verification
- **Status**: Deprecated in favor of new flow

### Item Management Routes

#### GET /api/items
- **Purpose**: Get all active lost/found items with user information
- **Query Parameters**: None
- **Response**:
  ```json
  {
    "items": [
      {
        "id": 1,
        "title": "Lost Keys",
        "description": "Set of house keys",
        "type": "lost",
        "location": "Library",
        "user_id": 1,
        "image_url": "https://example.com/image.jpg",
        "status": "active",
        "is_active": true,
        "secret_question": null,
        "secret_answer": null,
        "user": {
          "name": "John Doe",
          "email": "john@example.com",
          "dp_url": "https://example.com/avatar.jpg"
        }
      }
    ]
  }
  ```

#### POST /api/items
- **Purpose**: Create new lost/found item
- **Request Body**:
  ```json
  {
    "title": "Lost Wallet",
    "description": "Brown leather wallet",
    "type": "lost",
    "location": "Campus",
    "user_id": 1,
    "image_url": "https://example.com/wallet.jpg",
    "secret_question": null,
    "secret_answer": null
  }
  ```
- **Response**: Created item details with ID

#### GET /api/items/{item_id}
- **Purpose**: Get single item by ID
- **Path Parameter**: item_id (integer)
- **Response**: Single item object with full details

#### DELETE /api/items/{item_id}
- **Purpose**: Delete item by ID
- **Path Parameter**: item_id (integer)
- **Response**: Success confirmation

#### PATCH /api/items/{item_id}/status
- **Purpose**: Update item status (active/resolved)
- **Path Parameter**: item_id (integer)
- **Request Body**:
  ```json
  {
    "status": "resolved"
  }
  ```
- **Response**: Updated item status

#### PUT /api/items/{item_id}/resolve
- **Purpose**: Mark item as found and remove from feed
- **Path Parameter**: item_id (integer)
- **Response**: Success confirmation

#### PUT /api/items/{item_id}/reactivate
- **Purpose**: Reactivate a resolved item
- **Path Parameter**: item_id (integer)
- **Response**: Success confirmation

#### GET /api/items/history
- **Purpose**: Get resolved/inactive items
- **Response**: Array of resolved items

### Contact & Messaging Routes

#### POST /api/contact-owner
- **Purpose**: Send email to item owner and store initial message
- **Request Body**:
  ```json
  {
    "owner_email": "owner@example.com",
    "sender_name": "Jane Doe",
    "sender_email": "jane@example.com",
    "message": "I think I found your keys",
    "item_id": 1,
    "verification_answer": "Blue car",
    "proof_image_url": "https://example.com/proof.jpg"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Email sent successfully!"
  }
  ```
- **External Services**: Brevo API call for contact email delivery

#### GET /api/messages
- **Purpose**: Get messages for current user
- **Query Parameters**: 
  - `user_email` (required): User's email address
  - `item_id` (optional): Filter by specific item
- **Response**:
  ```json
  {
    "messages": [
      {
        "id": 1,
        "item_id": 1,
        "sender_id": 2,
        "receiver_id": 1,
        "message": "I found your keys",
        "is_read": false,
        "created_at": "2024-01-15T10:30:00",
        "proof_image_url": "https://example.com/proof.jpg",
        "verification_answer": "Blue car"
      }
    ]
  }
  ```

#### PATCH /api/messages/{message_id}/read
- **Purpose**: Mark specific message as read
- **Path Parameter**: message_id (integer)
- **Response**: Success confirmation

#### PATCH /api/messages/mark-all-read
- **Purpose**: Mark all messages for user as read
- **Query Parameters**: user_email (required)
- **Response**: Success confirmation

#### PATCH /api/messages/mark-read
- **Purpose**: Mark all messages for an item as read for user
- **Query Parameters**: 
  - `item_id` (required)
  - `user_email` (required)
- **Response**: Success confirmation

#### GET /api/messages/unread-count
- **Purpose**: Get unread message count for user
- **Query Parameters**: user_email (required)
- **Response**:
  ```json
  {
    "unread_count": 5
  }
  ```

### Chat System Routes

#### GET /api/chat
- **Purpose**: Get chat history for an item with optional partner filter
- **Query Parameters**:
  - `item_id` (required): Item identifier
  - `user_email` (required): Current user's email
  - `partner_email` (optional): Filter by specific conversation partner
- **Response**:
  ```json
  {
    "messages": [
      {
        "id": 1,
        "item_id": 1,
        "sender_id": 2,
        "receiver_id": 1,
        "message": "Hello",
        "is_sent_by_me": false,
        "sender_name": "Jane Doe",
        "sender_email": "jane@example.com",
        "created_at": "2024-01-15T10:30:00",
        "read_at": "2024-01-15T10:35:00"
      }
    ]
  }
  ```

#### GET /api/chat/partners
- **Purpose**: Get list of unique conversation partners for an item
- **Query Parameters**:
  - `item_id` (required): Item identifier
  - `user_email` (required): Current user's email
- **Response**:
  ```json
  {
    "partners": [
      {
        "partner_email": "jane@example.com",
        "partner_name": "Jane Doe",
        "partner_dp": "https://example.com/avatar.jpg",
        "last_message": "Hello",
        "unread_count": 2
      }
    ]
  }
  ```

#### POST /api/chat/send
- **Purpose**: Send a chat message in conversation
- **Request Body**:
  ```json
  {
    "item_id": 1,
    "sender_email": "user@example.com",
    "receiver_email": "partner@example.com",
    "message": "Hi, is this still available?"
  }
  ```
- **Response**: Success confirmation with message details

### System Routes

#### GET /
- **Purpose**: Root endpoint
- **Response**:
  ```json
  {
    "message": "Lost and Found API",
    "version": "1.0.0"
  }
  ```

#### GET /health
- **Purpose**: Health check endpoint
- **Response**:
  ```json
  {
    "status": "healthy"
  }
  ```

## 4. Environment Variables & Configuration

### Backend Environment Variables (Render)

#### Database Configuration
- `DB_HOST` - Neon PostgreSQL host
- `DB_PORT` - PostgreSQL port (typically 5432)
- `DB_USER` - PostgreSQL username
- `DB_PASSWORD` - PostgreSQL password
- `DB_NAME` - Database name (e.g., lost_found_db)

#### Email Configuration (Brevo API)
- `BREVO_API_KEY` - Brevo API key for transactional emails

### Frontend Environment Variables (Vercel)

#### API Configuration
- `VITE_API_URL` - Backend API URL (e.g., https://lost-and-found-hub-cd1w.onrender.com)

### Local Development Variables

#### Backend (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=lost_found_db
BREVO_API_KEY=your_brevo_api_key
```

#### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
```

## 5. Deployment & Operations

### Automatic Deployment Workflow

#### GitHub Integration
- **Repository**: GitHub (https://github.com/srimuthuram/lost-and-found-hub.git)
- **Branch**: main
- **Triggers**: Push to main branch

#### Render Deployment (Backend)
- **Platform**: Render Web Service
- **Build System**: Automatic on git push
- **Runtime**: Python with Uvicorn ASGI server
- **Startup Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Health Checks**: /health endpoint for monitoring
- **Environment Variables**: Configured in Render dashboard

#### Vercel Deployment (Frontend)
- **Platform**: Vercel (React/Vite)
- **Build System**: Automatic on git push
- **Build Command**: `npm run build`
- **Output Directory**: dist/
- **Environment Variables**: Configured in Vercel dashboard
- **Framework Preset**: Vite

### Deployment Process
1. **Code Changes**: Developer commits changes to local repository
2. **Git Push**: Changes pushed to GitHub main branch
3. **Render Deployment**: Automatically detects push, builds, and deploys backend
4. **Vercel Deployment**: Automatically detects push, builds, and deploys frontend
5. **Zero Downtime**: Both platforms handle deployments with minimal downtime

### Database Management
- **Platform**: Neon PostgreSQL (serverless)
- **Migrations**: Automatic schema updates via database.py
- **Backups**: Managed by Neon platform
- **Connection Pooling**: Handled by psycopg2

### Email Service Integration
- **Provider**: Brevo API
- **Authentication**: API key-based
- **Protocol**: HTTPS (port 443)
- **Rate Limits**: Brevo free tier limits apply
- **Fallback**: Local logging if API key not configured

### Monitoring & Health
- **Backend Health**: /health endpoint
- **Error Logging**: Console logging for debugging
- **Email Failures**: Logged with fallback to console output
- **CORS**: Configured for cross-origin requests