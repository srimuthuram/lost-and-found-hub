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
    """Creates the users and items tables if they don't exist."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        """)
        print("Users table created or already exists.")
        
        # Create items table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                title VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                category VARCHAR(50) NOT NULL,
                type VARCHAR(10) NOT NULL,
                location VARCHAR(100) NOT NULL,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        print("Items table created or already exists.")
        
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
