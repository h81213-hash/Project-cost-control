import json
import os
import sys
from datetime import datetime

# 將 backend 加入路徑以導入模組
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal, Base
from models import Project, ProjectFile

def migrate():
    # 1. 建立資料表
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

    # 2. 讀取 JSON 資料
    json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "projects.json")
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found.")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        projects_data = json.load(f)

    db = SessionLocal()
    try:
        print(f"Migrating {len(projects_data)} projects...")
        for p_data in projects_data:
            # 建立 Project 物件
            project = Project(
                id=p_data["id"],
                name=p_data["name"],
                client=p_data.get("client", ""),
                location=p_data.get("location", ""),
                manager=p_data.get("manager", ""),
                start_date=p_data.get("start_date", ""),
                end_date=p_data.get("end_date", ""),
                note=p_data.get("note", ""),
                classification_depth=p_data.get("classification_depth", 3),
                created_at=datetime.fromisoformat(p_data["created_at"]) if "created_at" in p_data else datetime.utcnow(),
                updated_at=datetime.fromisoformat(p_data["updated_at"]) if "updated_at" in p_data else datetime.utcnow()
            )
            db.add(project)
            db.flush() # 取得 project.id 前後關聯

            # 建立 ProjectFile 物件
            for f_data in p_data.get("files", []):
                project_file = ProjectFile(
                    project_id=project.id,
                    file_name=f_data["file_name"],
                    uploaded_at=datetime.fromisoformat(f_data["uploaded_at"]) if "uploaded_at" in f_data else datetime.utcnow(),
                    data=f_data["data"]
                )
                db.add(project_file)
        
        db.commit()
        print("Migration successful!")
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
