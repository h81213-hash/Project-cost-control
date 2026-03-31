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

# 根據不同資料庫類型配置連線參數
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}, # SQLite 必備，讓 FastAPI 多執行緒存取
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,      # 悲觀檢測，自動修復 Broken Pipe
        pool_recycle=300,        # 每 5 分鐘重置連結，避免被 Neon 單向中斷
        pool_size=5,             # 限制連線數，避免超出 Neon 配額
        max_overflow=10,
        connect_args={
            "connect_timeout": 10                  # 建立連線不超過 10 秒
        }
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
