import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

def ensure_database_exists():
    """Connects to the default postgres DB and creates lost_found_db if it doesn't exist."""
    try:
        # Connect to the default postgres database
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            dbname="postgres"
        )
        conn.autocommit = True  # Required for CREATE DATABASE
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (os.getenv("DB_NAME"),)
        )
        exists = cursor.fetchone()
        
        if not exists:
            # Create the database
            cursor.execute(
                sql.SQL("CREATE DATABASE {}").format(
                    sql.Identifier(os.getenv("DB_NAME"))
                )
            )
            print(f"Database '{os.getenv('DB_NAME')}' created successfully.")
        else:
            print(f"Database '{os.getenv('DB_NAME')}' already exists.")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error ensuring database exists: {e}")
        raise

def get_db_connection():
    """Connects to lost_found_db and returns the connection."""
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            dbname=os.getenv("DB_NAME")
        )
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        raise

def init_db():
    """Creates the users and items tables if they don't exist and adds new columns."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                dp_url TEXT,
                is_verified BOOLEAN DEFAULT FALSE
            )
        """)
        print("Users table created or already exists.")
        
        # Add dp_url column if it doesn't exist
        try:
            cursor.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'users' AND column_name = 'dp_url'
                    ) THEN
                        ALTER TABLE users ADD COLUMN dp_url TEXT;
                    END IF;
                END $$;
            """)
            print("Checked/added dp_url column to users table.")
        except Exception as e:
            print(f"Note: dp_url column check: {e}")
        
        # Add is_verified column if it doesn't exist
        try:
            cursor.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'users' AND column_name = 'is_verified'
                    ) THEN
                        ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
                    END IF;
                END $$;
            """)
            print("Checked/added is_verified column to users table.")
        except Exception as e:
            print(f"Note: is_verified column check: {e}")
        
        # Rename password column to password_hash if it exists
        try:
            cursor.execute("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'users' AND column_name = 'password'
                    ) THEN
                        ALTER TABLE users RENAME COLUMN password TO password_hash;
                    END IF;
                END $$;
            """)
            print("Renamed password column to password_hash.")
        except Exception as e:
            print(f"Note: password column rename: {e}")
        
        # Create otp_storage table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS otp_storage (
                id SERIAL PRIMARY KEY,
                email VARCHAR(100) NOT NULL,
                otp_code VARCHAR(6) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("OTP storage table created or already exists.")
        
        # Create items table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                title VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                type VARCHAR(10) NOT NULL,
                location VARCHAR(100) NOT NULL,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                image_url TEXT,
                status VARCHAR(20) DEFAULT 'active',
                is_active BOOLEAN DEFAULT TRUE,
                secret_question TEXT,
                secret_answer TEXT
            )
        """)
        print("Items table created or already exists.")
        
        # Add is_active column if it doesn't exist
        try:
            cursor.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'items' AND column_name = 'is_active'
                    ) THEN
                        ALTER TABLE items ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
                    END IF;
                END $$;
            """)
            print("Checked/added is_active column to items table.")
        except Exception as e:
            print(f"Note: is_active column check: {e}")
        
        # Add secret_question column if it doesn't exist
        try:
            cursor.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'items' AND column_name = 'secret_question'
                    ) THEN
                        ALTER TABLE items ADD COLUMN secret_question TEXT;
                    END IF;
                END $$;
            """)
            print("Checked/added secret_question column to items table.")
        except Exception as e:
            print(f"Note: secret_question column check: {e}")
        
        # Add secret_answer column if it doesn't exist
        try:
            cursor.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'items' AND column_name = 'secret_answer'
                    ) THEN
                        ALTER TABLE items ADD COLUMN secret_answer TEXT;
                    END IF;
                END $$;
            """)
            print("Checked/added secret_answer column to items table.")
        except Exception as e:
            print(f"Note: secret_answer column check: {e}")
        
        # Create messages table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
                sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                proof_image_url TEXT,
                verification_answer TEXT
            )
        """)
        print("Messages table created or already exists.")
        
        # Add proof_image_url column if it doesn't exist
        try:
            cursor.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'messages' AND column_name = 'proof_image_url'
                    ) THEN
                        ALTER TABLE messages ADD COLUMN proof_image_url TEXT;
                    END IF;
                END $$;
            """)
            print("Checked/added proof_image_url column to messages table.")
        except Exception as e:
            print(f"Note: proof_image_url column check: {e}")
        
        # Add verification_answer column if it doesn't exist
        try:
            cursor.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'messages' AND column_name = 'verification_answer'
                    ) THEN
                        ALTER TABLE messages ADD COLUMN verification_answer TEXT;
                    END IF;
                END $$;
            """)
            print("Checked/added verification_answer column to messages table.")
        except Exception as e:
            print(f"Note: verification_answer column check: {e}")
        
        # Add read_at column if it doesn't exist
        try:
            cursor.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'messages' AND column_name = 'read_at'
                    ) THEN
                        ALTER TABLE messages ADD COLUMN read_at TIMESTAMP;
                    END IF;
                END $$;
            """)
            print("Checked/added read_at column to messages table.")
        except Exception as e:
            print(f"Note: read_at column check: {e}")
        
        # Add is_read column if it doesn't exist
        try:
            cursor.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'messages' AND column_name = 'is_read'
                    ) THEN
                        ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
                    END IF;
                END $$;
            """)
            print("Checked/added is_read column to messages table.")
        except Exception as e:
            print(f"Note: is_read column check: {e}")
        
        conn.commit()
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        raise

if __name__ == '__main__':
    print("Setting up database...")
    ensure_database_exists()
    init_db()
    print("Database setup complete!")
