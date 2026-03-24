import json
import os
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Project, ProjectFile

# NOTE: 第一階段使用 JSON 檔做輕量化持久化，第三階段改為 PostgreSQL
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
PROJECTS_FILE = os.path.join(DATA_DIR, "projects.json")

# 檢查是否啟用資料庫模式
USE_DB = os.getenv("DATABASE_URL") is not None

def ensure_data_dir():
    """確保 data 目錄存在 (僅 JSON 模式需要)"""
    if not USE_DB:
        os.makedirs(DATA_DIR, exist_ok=True)
        if not os.path.exists(PROJECTS_FILE):
            with open(PROJECTS_FILE, "w", encoding="utf-8") as f:
                json.dump([], f)

def get_db_session():
    return SessionLocal()

def load_projects() -> List[Dict[str, Any]]:
    """讀取所有專案"""
    if USE_DB:
        db = get_db_session()
        try:
            projects = db.query(Project).all()
            return [serialize_project(p) for p in projects]
        finally:
            db.close()
    else:
        ensure_data_dir()
        with open(PROJECTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

def serialize_project(p: Project) -> Dict[str, Any]:
    """將 SQLAlchemy 物件轉換為字典"""
    return {
        "id": p.id,
        "name": p.name,
        "client": p.client,
        "location": p.location,
        "manager": p.manager,
        "start_date": p.start_date,
        "end_date": p.end_date,
        "note": p.note,
        "classification_depth": p.classification_depth,
        "created_at": p.created_at.isoformat() if p.created_at else "",
        "updated_at": p.updated_at.isoformat() if p.updated_at else "",
        "files": [
            {
                "file_name": f.file_name,
                "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else "",
                "data": f.data
            } for f in p.files
        ]
    }

def create_project(name: str, client: str = "", location: str = "", manager: str = "", start_date: str = "", end_date: str = "", note: str = "", classification_depth: int = 3) -> Dict[str, Any]:
    """建立新專案"""
    if USE_DB:
        db = get_db_session()
        try:
            project = Project(
                id=str(uuid.uuid4())[:8],
                name=name,
                client=client,
                location=location,
                manager=manager,
                start_date=start_date,
                end_date=end_date,
                note=note,
                classification_depth=classification_depth
            )
            db.add(project)
            db.commit()
            db.refresh(project)
            return serialize_project(project)
        finally:
            db.close()
    else:
        projects = load_projects()
        new_project = {
            "id": str(uuid.uuid4())[:8],
            "name": name,
            "client": client,
            "location": location,
            "manager": manager,
            "start_date": start_date,
            "end_date": end_date,
            "note": note,
            "classification_depth": classification_depth,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "files": []
        }
        projects.append(new_project)
        save_projects(projects)
        return new_project

def save_projects(projects: List[Dict[str, Any]]):
    """儲存所有專案 (僅 JSON 模式需要)"""
    if not USE_DB:
        ensure_data_dir()
        with open(PROJECTS_FILE, "w", encoding="utf-8") as f:
            json.dump(projects, f, ensure_ascii=False, indent=2)

def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    """取得單一專案"""
    if USE_DB:
        db = get_db_session()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            return serialize_project(project) if project else None
        finally:
            db.close()
    else:
        projects = load_projects()
        for p in projects:
            if p["id"] == project_id:
                return p
        return None

def delete_project(project_id: str) -> bool:
    """刪除專案"""
    if USE_DB:
        db = get_db_session()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                return False
            db.delete(project)
            db.commit()
            return True
        finally:
            db.close()
    else:
        projects = load_projects()
        filtered = [p for p in projects if p["id"] != project_id]
        if len(filtered) == len(projects):
            return False
        save_projects(filtered)
        return True

def add_file_to_project(project_id: str, file_name: str, parsed_data: Dict[str, Any]) -> bool:
    """將解析結果儲存至專案"""
    if USE_DB:
        db = get_db_session()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                return False
            new_file = ProjectFile(
                project_id=project_id,
                file_name=file_name,
                data=parsed_data
            )
            db.add(new_file)
            project.updated_at = datetime.utcnow()
            db.commit()
            return True
        finally:
            db.close()
    else:
        projects = load_projects()
        for p in projects:
            if p["id"] == project_id:
                p["files"].append({
                    "file_name": file_name,
                    "uploaded_at": datetime.now().isoformat(),
                    "data": parsed_data
                })
                p["updated_at"] = datetime.now().isoformat()
                save_projects(projects)
                return True
        return False

def update_project_settings(project_id: str, settings: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """更新專案設定"""
    if USE_DB:
        db = get_db_session()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                return None
            for key, value in settings.items():
                if hasattr(project, key):
                    setattr(project, key, value)
            project.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(project)
            return serialize_project(project)
        finally:
            db.close()
    else:
        projects = load_projects()
        for p in projects:
            if p["id"] == project_id:
                p.update(settings)
                p["updated_at"] = datetime.now().isoformat()
                save_projects(projects)
                return p
        return None

def delete_file_from_project(project_id: str, file_index: int) -> bool:
    """從專案中刪除特定索引的標單檔案"""
    if USE_DB:
        db = get_db_session()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project or not project.files:
                return False
            if 0 <= file_index < len(project.files):
                # 排序後刪除，以對應之前的「索引」概念
                files = sorted(project.files, key=lambda x: x.uploaded_at)
                target_file = files[file_index]
                db.delete(target_file)
                project.updated_at = datetime.utcnow()
                db.commit()
                return True
            return False
        finally:
            db.close()
    else:
        projects = load_projects()
        for p in projects:
            if p["id"] == project_id:
                files = p.get("files", [])
                if 0 <= file_index < len(files):
                    del files[file_index]
                    p["updated_at"] = datetime.now().isoformat()
                    save_projects(projects)
                    return True
        return False

def update_project_files(project_id: str, files_data: List[Dict[str, Any]]) -> bool:
    """更新專案的所有檔案數據"""
    if USE_DB:
        db = get_db_session()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                return False
            
            # 對於 DB 模式，這裡的 logic 比較複雜，因為我們通常只更新最後一個檔案的 data
            # 為了簡化遷移，我們目前僅更新「最後一筆」檔案的 data
            if project.files and files_data:
                latest_db_file = sorted(project.files, key=lambda x: x.uploaded_at)[-1]
                latest_input_data = files_data[-1].get("data")
                if latest_input_data:
                    latest_db_file.data = latest_input_data
            
            project.updated_at = datetime.utcnow()
            db.commit()
            return True
        finally:
            db.close()
    else:
        projects = load_projects()
        for p in projects:
            if p["id"] == project_id:
                p["files"] = files_data
                p["updated_at"] = datetime.now().isoformat()
                save_projects(projects)
                return True
        return False
