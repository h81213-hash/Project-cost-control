import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# 取得資料庫連線字串，優先使用環境變數 DATABASE_URL
DATABASE_URL = os.getenv("DATABASE_URL")

# 如果沒有 DATABASE_URL，則拋出錯誤 (在線上環境必須設定)
if not DATABASE_URL:
    # 本地開發預設可以使用 sqlite，或是提醒使用者設定
    DATABASE_URL = "sqlite:///./test.db"
    print("WARNING: DATABASE_URL not set, using local sqlite.")

# PostgreSQL 連線字串的協議修正 (SQLAlchemy 需要 postgresql://)
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
