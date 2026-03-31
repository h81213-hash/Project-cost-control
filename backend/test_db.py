import os
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print(f"Connecting to: {DATABASE_URL.split('@')[-1] if DATABASE_URL else 'None'}")
try:
    engine = create_engine(DATABASE_URL, connect_args={'connect_timeout': 5})
    with engine.connect() as conn:
        print("Connection successful!")
except Exception as e:
    print(f"Connection failed: {e}")
