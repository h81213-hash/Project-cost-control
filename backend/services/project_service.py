import json
import os
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

# NOTE: 第一階段使用 JSON 檔做輕量化持久化，第三階段再轉向 PostgreSQL
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
PROJECTS_FILE = os.path.join(DATA_DIR, "projects.json")


def ensure_data_dir():
    """確保 data 目錄存在"""
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(PROJECTS_FILE):
        with open(PROJECTS_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)


def load_projects() -> List[Dict[str, Any]]:
    """讀取所有專案"""
    ensure_data_dir()
    with open(PROJECTS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_projects(projects: List[Dict[str, Any]]):
    """儲存所有專案"""
    ensure_data_dir()
    with open(PROJECTS_FILE, "w", encoding="utf-8") as f:
        json.dump(projects, f, ensure_ascii=False, indent=2)


def create_project(name: str, client: str = "", location: str = "", manager: str = "", start_date: str = "", end_date: str = "", note: str = "", classification_depth: int = 3) -> Dict[str, Any]:
    """建立新專案"""
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


def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    """取得單一專案"""
    projects = load_projects()
    for p in projects:
        if p["id"] == project_id:
            return p
    return None


def delete_project(project_id: str) -> bool:
    """刪除專案"""
    projects = load_projects()
    filtered = [p for p in projects if p["id"] != project_id]
    if len(filtered) == len(projects):
        return False
    save_projects(filtered)
    return True


def add_file_to_project(project_id: str, file_name: str, parsed_data: Dict[str, Any]) -> bool:
    """將解析結果儲存至專案"""
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
    """更新專案設定（如分類深度）"""
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
