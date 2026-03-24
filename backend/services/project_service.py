import json
import os
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session, defer, undefer
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

# 快取機制：使用字典 {id: project_data} 以提高檢索速度
_projects_cache_dict = None

# 詢價單 rows 快取：{project_id: rows_list}，避免每次都從 DB 反序列化整個 JSON
_inquiry_rows_cache: dict = {}

def invalidate_cache():
    """強制讓快取失效"""
    global _projects_cache_dict
    _projects_cache_dict = None

def invalidate_inquiry_rows_cache(project_id: str):
    """讓特定專案的 rows 快取失效（上傳新版本或手動分類後呼叫）"""
    global _inquiry_rows_cache
    _inquiry_rows_cache.pop(project_id, None)

def load_projects() -> List[Dict[str, Any]]:
    """讀取所有專案 (支援在 JSON 模式下進行記憶體快取)"""
    global _projects_cache_dict
    
    if USE_DB:
        from database import SessionLocal
        from models import Project
        db = SessionLocal()
        try:
            projects = db.query(Project).all()
            return [serialize_project(p) for p in projects]
        finally:
            db.close()
    else:
        if _projects_cache_dict is not None:
            return list(_projects_cache_dict.values())
            
        ensure_data_dir()
        try:
            with open(PROJECTS_FILE, "r", encoding="utf-8") as f:
                projects_list = json.load(f)
                # 建立索引字典以加速後續檢索
                _projects_cache_dict = {p["id"]: p for p in projects_list}
                return projects_list
        except Exception as e:
            print(f"Error loading projects: {e}")
            return []

def load_projects_summary() -> List[Dict[str, Any]]:
    """讀取專案摘要（不含 rows/analysis 等大型資料），用於專案列表頁面。
    JSON 模式：利用快取讀取後去除 data 欄位，確保不額外 I/O。
    DB 模式：只查詢 projects 表，不 join files 的 data 欄位。"""
    if USE_DB:
        from database import SessionLocal
        from models import Project
        db = SessionLocal()
        try:
            projects = db.query(Project).all()
            result = []
            for p in projects:
                proj_dict = {
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
                        {"file_name": f.file_name, "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else ""}
                        for f in p.files
                    ]
                }
                result.append(proj_dict)
            return result
        finally:
            db.close()
    else:
        # JSON 模式：利用現有快取，只剝除 data 欄位，不重新讀取檔案
        full_projects = load_projects()
        summary = []
        for p in full_projects:
            p_summary = {k: v for k, v in p.items() if k != "files"}
            p_summary["files"] = [
                {"file_name": f.get("file_name", ""), "uploaded_at": f.get("uploaded_at", "")}
                for f in p.get("files", [])
            ]
            summary.append(p_summary)
        return summary



def get_project_from_cache(project_id: str) -> Optional[Dict[str, Any]]:
    """從快取字典中快速取得單一專案"""
    global _projects_cache_dict
    if _projects_cache_dict is None:
        load_projects()
    return _projects_cache_dict.get(project_id) if _projects_cache_dict else None

def serialize_project(p: "Project", include_data: bool = False) -> Dict[str, Any]:
    """將 SQLAlchemy 物件轉換為字典，預設不包含巨大的 data 欄位以節省記憶體"""
    files_list = []
    for f in p.files:
        file_info = {
            "file_name": f.file_name,
            "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else "",
        }
        if include_data:
            file_info["data"] = f.data
        files_list.append(file_info)

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
        "files": files_list
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
        invalidate_cache()

def get_project(project_id: str, page: Optional[int] = None, page_size: Optional[int] = 50, system_category: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """取得單一專案詳細資訊，支援分頁與類別過濾"""
    if USE_DB:
        db = get_db_session()
        try:
            # 使用 defer 延遲加載 ProjectFile.data，防止一次載入數十 MB 的 JSON 到記憶體
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                return None
            
            # 使用輕量化序列化 (不含 data)
            result = serialize_project(project, include_data=False)
            
            if result.get("files"):
                # 找出要讀取的檔案索引 (最新版或指定版本)
                target_idx = len(result["files"]) - 1
                
                # 只有最新版本或是請求分頁時，我們才手動從 DB 抓取那「一個」檔案的 data
                # 這樣就不會 5 個版本 25MB 全塞進 Render 記憶體
                target_file_obj = project.files[target_idx]
                
                # 手動讀取該檔案的 data (此時會觸發單一 SELECT 讀取 JSON)
                raw_data = target_file_obj.data or {}
                all_rows = raw_data.get("rows", [])
                
                if system_category:
                    all_rows = [r for r in all_rows if system_category in r.get("system_category", "")]
                
                data_copy = {k: v for k, v in raw_data.items() if k != "rows"}
                
                if page is not None and not system_category:
                    start_idx = (page - 1) * page_size
                    end_idx = start_idx + page_size
                    data_copy["rows"] = all_rows[start_idx:end_idx]
                    data_copy["pagination"] = {
                        "total": len(all_rows),
                        "page": page,
                        "page_size": page_size,
                        "has_more": end_idx < len(all_rows)
                    }
                else:
                    data_copy["rows"] = all_rows
                    data_copy["pagination"] = {"total": len(all_rows), "has_more": False}
                
                # 將處理好的分頁資料放入 result 的最新檔案中
                result["files"][target_idx]["data"] = data_copy
                
            return result
        finally:
            db.close()
    else:
        # JSON 模式的分頁/過濾優化
        projects = load_projects()
        for p in projects:
            if p["id"] == project_id:
                # 重新打包避免使用緩慢的 deepcopy
                p_view = {k: v for k, v in p.items() if k != "files"}
                
                if p.get("files"):
                    new_files = []
                    for i, f in enumerate(p["files"]):
                        file_copy = {k: v for k, v in f.items() if k != "data"}
                        orig_data = f.get("data", {})
                        data_copy = {k: v for k, v in orig_data.items() if k != "rows"}
                        all_rows = orig_data.get("rows", [])
                        
                        if system_category:
                            all_rows = [r for r in all_rows if system_category in r.get("system_category", "")]
                            
                        if page is not None and not system_category:
                            if i == len(p["files"]) - 1:
                                start_idx = (page - 1) * page_size
                                end_idx = start_idx + page_size
                                data_copy["rows"] = all_rows[start_idx:end_idx]
                                data_copy["pagination"] = {
                                    "total": len(all_rows),
                                    "page": page,
                                    "page_size": page_size,
                                    "has_more": end_idx < len(all_rows)
                                }
                            else:
                                data_copy["rows"] = []
                                data_copy["pagination"] = {"total": len(all_rows), "has_more": False}
                        else:
                            data_copy["rows"] = all_rows
                            data_copy["pagination"] = {"total": len(all_rows), "has_more": False}
                            
                        file_copy["data"] = data_copy
                        new_files.append(file_copy)
                    p_view["files"] = new_files
                    
                return p_view
        return None

def _get_cached_rows(project_id: str) -> List[Dict[str, Any]]:
    """取得專案最新版本的 rows（記憶體快取，跨請求共享）\n    第一次呼叫從 DB/JSON 載入並快取，後續直接回傳，大幅降低延遲。"""
    global _inquiry_rows_cache
    if project_id in _inquiry_rows_cache:
        return _inquiry_rows_cache[project_id]

    # 限制快取數量，避免 Render 記憶體爆掉 (最多保留 5 個專案的快取)
    if len(_inquiry_rows_cache) > 5:
        _inquiry_rows_cache.clear()

    # 快取未命中，從資料來源載入
    rows: List[Dict[str, Any]] = []
    if USE_DB:
        db = SessionLocal()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if project and project.files:
                # max() 比 sorted()[-1] 更快，且只在需要時讀取 data
                latest_file = max(project.files, key=lambda x: x.uploaded_at)
                rows = latest_file.data.get("rows", []) if latest_file.data else []
        finally:
            db.close()
    else:
        p = get_project_from_cache(project_id)
        if p and p.get("files"):
            rows = p["files"][-1].get("data", {}).get("rows", [])

    _inquiry_rows_cache[project_id] = rows
    return rows


def get_inquiry_rows(project_id: str, system_category: str) -> List[Dict[str, Any]]:
    """專門為詢價單獲取過濾後的標單列（使用記憶體快取，避免重複反序列化 DB JSON）"""
    rows = _get_cached_rows(project_id)
    return [r for r in rows if system_category in r.get("system_category", "")]

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
            # 新版本上傳後，讓 rows 快取失效以確保下次取到最新資料
            invalidate_inquiry_rows_cache(project_id)
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
                invalidate_inquiry_rows_cache(project_id)
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
                latest_db_file = max(project.files, key=lambda x: x.uploaded_at)
                latest_input_data = files_data[-1].get("data")
                if latest_input_data:
                    latest_db_file.data = latest_input_data
            
            project.updated_at = datetime.utcnow()
            db.commit()
            # 手動分類後讓 rows 快取失效（rows 的 system_category 已更新）
            invalidate_inquiry_rows_cache(project_id)
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
                invalidate_inquiry_rows_cache(project_id)
                return True
        return False
