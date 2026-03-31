import json
import os
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session, defer, undefer, selectinload
from sqlalchemy.orm.attributes import flag_modified

from database import SessionLocal
from models import Project, ProjectFile
from services.category_service import normalize_text, classify_row

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
    優化：僅抓取必要欄位，並使用 func.count(ProjectFile.id) 在 DB 端計算數量。"""
    if USE_DB:
        db = SessionLocal()
        try:
            # 關鍵優化：使用 with_entities 只抓取必要的摘要欄位，並透過 GroupBy 計算檔案計數
            # 此舉能避免 SQLAlchemy 抓取大型物件，並解決遠端連線下的 N+1 問題
            query_results = db.query(Project).with_entities(
                Project.id,
                Project.name,
                Project.client,
                Project.location,
                Project.manager,
                Project.start_date,
                Project.end_date,
                Project.note,
                Project.classification_depth,
                Project.created_at,
                Project.updated_at,
                func.count(ProjectFile.id).label('file_count')
            ).outerjoin(ProjectFile).group_by(Project.id).all()

            result = []
            for r in query_results:
                proj_dict = {
                    "id": r.id,
                    "name": r.name,
                    "client": r.client,
                    "location": r.location,
                    "manager": r.manager,
                    "start_date": r.start_date,
                    "end_date": r.end_date,
                    "note": r.note,
                    "classification_depth": r.classification_depth,
                    "created_at": r.created_at.isoformat() if r.created_at else "",
                    "updated_at": r.updated_at.isoformat() if r.updated_at else "",
                    # 前端僅需 files.length，故我們回傳對應長度的空陣列以節省頻寬
                    "files": [None] * r.file_count 
                }
                result.append(proj_dict)
            return result
        finally:
            db.close()
    else:
        # JSON 模式：利用快取讀取
        full_projects = load_projects()
        summary = []
        for p in full_projects:
            p_summary = {k: v for k, v in p.items() if k != "files"}
            p_summary["files"] = [None] * len(p.get("files", []))
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
    # 確保檔案依上傳時間排序
    sorted_files = sorted(p.files, key=lambda x: x.uploaded_at)
    
    for f in sorted_files:
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
        "floor_area": p.floor_area,
        "report_config": p.report_config,
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

def get_project(project_id: str, page: Optional[int] = None, page_size: Optional[int] = 50, system_category: Optional[str] = None, version_indices: Optional[List[int]] = None, include_all_rows: bool = False) -> Optional[Dict[str, Any]]:
    """取得單一專案詳細資訊，支援分頁與類別過濾，並可指定要載入 data 的版本索引 (預設為最新)"""
    if USE_DB:
        db = get_db_session()
        try:
            # 關鍵優化：使用 selectinload + defer(data) 讀取專案，完全不抓歷史版本的 JSON 內容
            project = db.query(Project).filter(Project.id == project_id).options(
                selectinload(Project.files).defer(ProjectFile.data)
            ).first()
            if not project:
                return None
            
            # 使用輕量化序列化 (不含 data)
            result = serialize_project(project, include_data=False)
            
            if result.get("files"):
                # 決定要讀取的檔案索引清單 (預設為最新版本)
                if version_indices is None:
                    version_indices = [len(result["files"]) - 1]
                
                # SQLAlchemy 的 project.files 已經在 serialize_project 中被排序過了？
                # 不，serialize_project 回傳的是字典。我們需要對 project.files 本身進行排序以對應索引。
                db_files = sorted(project.files, key=lambda x: x.uploaded_at)
                
                for v_idx in version_indices:
                    if 0 <= v_idx < len(db_files):
                        target_file_obj = db_files[v_idx]
                        
                        # 手動讀取該檔案的 data (此時會觸發單一 SELECT 讀取 JSON)
                        raw_data = target_file_obj.data or {}
                        all_rows = raw_data.get("rows", [])
                        # 為每一列增加原始索引，以便後續手動分類能精準對應 (即使在有濾網的情況下)
                        for idx, row in enumerate(all_rows):
                            row["_original_index"] = idx
                        
                        if system_category:
                            all_rows = [r for r in all_rows if system_category in r.get("system_category", "")]
                        
                        data_copy = {k: v for k, v in raw_data.items() if k != "rows"}
                        
                        # 分頁邏輯：如果是要求的版本則提供分頁資料
                        is_target_version = (version_indices and v_idx in version_indices) or (v_idx == len(db_files) - 1)
                        if include_all_rows:
                            data_copy["rows"] = all_rows
                        elif page is not None and not system_category and is_target_version:
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
                        
                        # 將處理好的分頁資料放入 result 的對應檔案中
                        result["files"][v_idx]["data"] = data_copy
                
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
                    # 預設僅載入最新版本的 data，若有指定 indices 則載入指定版本
                    if version_indices is None:
                        version_indices = [len(p["files"]) - 1]
                        
                    new_files = []
                    for i, f in enumerate(p["files"]):
                        file_copy = {k: v for k, v in f.items() if k != "data"}
                        
                        if i in version_indices:
                            orig_data = f.get("data", {})
                            data_copy = {k: v for k, v in orig_data.items() if k != "rows"}
                            all_rows = orig_data.get("rows", [])
                            
                            if system_category:
                                all_rows = [r for r in all_rows if system_category in r.get("system_category", "")]
                                
                            # 分頁邏輯
                            is_target_version = (version_indices and i in version_indices) or (i == len(p["files"]) - 1)
                            if page is not None and not system_category and is_target_version:
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
                            file_copy["data"] = data_copy
                        
                        new_files.append(file_copy)
                    p_view["files"] = new_files
                    
                return p_view
        return None

def _get_cached_rows(project_id: str, version_idx: int = -1) -> List[Dict[str, Any]]:
    """取得專案指定版本的 rows（記憶體快取，跨請求共享）
    預設 version_idx = -1 代表最新版本。
    """
    global _inquiry_rows_cache
    cache_key = f"{project_id}_{version_idx}"
    if cache_key in _inquiry_rows_cache:
        return _inquiry_rows_cache[cache_key]

    # 限制快取數量，避免 Render 記憶體爆掉
    if len(_inquiry_rows_cache) > 20: 
        _inquiry_rows_cache.clear()

    rows: List[Dict[str, Any]] = []
    if USE_DB:
        db = SessionLocal()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if project and project.files:
                target_file = None
                if version_idx == -1:
                    target_file = max(project.files, key=lambda x: x.uploaded_at)
                elif 0 <= version_idx < len(project.files):
                    # 注意：SQLAlchemy 關聯列表順序可能不保證，
                    # 建議使用 uploaded_at 排序後取得相對索引
                    sorted_files = sorted(project.files, key=lambda x: x.uploaded_at)
                    target_file = sorted_files[version_idx]
                
                rows = target_file.data.get("rows", []) if target_file and target_file.data else []
        finally:
            db.close()
    else:
        p = get_project_from_cache(project_id)
        if p and p.get("files"):
            files = p["files"]
            idx = version_idx if version_idx != -1 else len(files) - 1
            if 0 <= idx < len(files):
                rows = files[idx].get("data", {}).get("rows", [])

    _inquiry_rows_cache[cache_key] = rows
    return rows

def get_inquiry_rows(project_id: str, system_category: str, version_idx: int = -1) -> List[Dict[str, Any]]:
    """專門為詢價單獲取過濾後的標單列"""
    rows = _get_cached_rows(project_id, version_idx)
    norm_query = normalize_text(system_category)
    
    # 動態模式：部分標單列可能尚未在 DB 中標註 system_category (例如剛上傳或建立新版本後)
    # 我們在查詢時，針對缺乏分類標註的項目執行即時匹配，以確保與 Summary Card 的分類統計完全同步。
    filtered = []
    for r in rows:
        cat = r.get("system_category")
        # 1. 如果資料庫已有分類，直接比對
        if cat:
            if norm_query in normalize_text(cat):
                filtered.append(r)
        # 2. 如果資料庫沒有分類，即時計算分類 (並同步存入快取，避免下次計算)
        else:
            description = r.get("description", "")
            if description:
                # 檢查是否已經在本次快取生命週期中計算過
                new_cat = r.get("_temp_system_category")
                if not new_cat:
                    new_cat = classify_row(description)
                    r["_temp_system_category"] = new_cat # 存入快取對象中 (in-memory only)
                
                if norm_query in normalize_text(new_cat):
                    filtered.append(r)
            elif norm_query == normalize_text("未分類"):
                filtered.append(r)
                
    return filtered

def invalidate_inquiry_rows_cache(project_id: str, version_idx: int = None):
    """清除全域詢價快取，若提供 version_idx 則僅清除特定版本，否則清除該專案所有版本"""
    global _inquiry_rows_cache
    if version_idx is not None:
        key = f"{project_id}_{version_idx}"
        if key in _inquiry_rows_cache:
            del _inquiry_rows_cache[key]
    else:
        keys_to_del = [k for k in _inquiry_rows_cache.keys() if k.startswith(f"{project_id}_")]
        for k in keys_to_del:
            del _inquiry_rows_cache[k]

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
            # 設定變更可能影響分類顯示，清除快取
            invalidate_inquiry_rows_cache(project_id)
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
                # 刪除檔案後清除快取
                invalidate_inquiry_rows_cache(project_id)
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
                    invalidate_inquiry_rows_cache(project_id)
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
                    flag_modified(latest_db_file, "data")

            
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

def update_inquiry_rows(project_id: str, system_category: str, updates: List[Dict[str, Any]], version_idx: int = -1) -> bool:
    """批量更新標單項目資訊 (廠商報價、折數等)，支援指定版本"""
    print(f"Updating inquiry rows for project {project_id}, version: {version_idx}, category: {system_category}")
    print(f"Updates received: {len(updates)}")
    
    if USE_DB:
        db = get_db_session()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project or not project.files:
                return False
            
            sorted_files = sorted(project.files, key=lambda x: x.uploaded_at)
            target_idx = version_idx if version_idx != -1 else len(sorted_files) - 1
            if target_idx < 0 or target_idx >= len(sorted_files):
                return False
                
            target_file = sorted_files[target_idx]
            data = target_file.data
            rows = data.get("rows", [])
            
            # 建立更新對照表 (使用 item_no + description 做 key)
            update_map = {(u.get("item_no"), u.get("description")): u for u in updates}
            print(f"Update map keys: {list(update_map.keys())}")
            
            modified = False
            match_count = 0
            for i, row in enumerate(rows):
                if row.get("system_category") == system_category:
                    key = (row.get("item_no"), row.get("description"))
                    if key in update_map:
                        print(f"Match found at index {i} for key {key}")
                        match_count += 1
                        u = update_map[key]
                        if "unit_price" in u:
                            row["unit_price"] = u["unit_price"]
                        if "discount_rate" in u:
                            row["discount_rate"] = u["discount_rate"]
                        
                        # 重算複價與公司成本
                        qty = float(row.get("quantity", 0))
                        price = float(row.get("unit_price", 0))
                        disc = float(row.get("discount_rate", 1))
                        
                        row["total_price"] = qty * price
                        row["internal_cost"] = row["total_price"] * disc
                        modified = True
            
            print(f"Total matches found: {match_count}, modified: {modified}")
            if modified:
                target_file.data = data
                project.updated_at = datetime.utcnow()
                db.commit()
                # 僅使該版本快取失效
                actual_idx = version_idx if version_idx != -1 else len(sorted_files) - 1
                invalidate_inquiry_rows_cache(project_id, actual_idx)
            return True
        finally:
            db.close()
    else:
        projects = load_projects()
        for p in projects:
            if p["id"] == project_id and p.get("files"):
                latest_file = p["files"][-1]
                data = latest_file["data"]
                rows = data.get("rows", [])
                
                update_map = {(u.get("item_no"), u.get("description")): u for u in updates}
                print(f"[JSON] Update map keys: {list(update_map.keys())}")
                
                modified = False
                match_count = 0
                for row in rows:
                    if row.get("system_category") == system_category:
                        key = (row.get("item_no"), row.get("description"))
                        if key in update_map:
                            print(f"[JSON] Match found for key {key}")
                            match_count += 1
                            u = update_map[key]
                            if "unit_price" in u:
                                row["unit_price"] = u["unit_price"]
                            if "discount_rate" in u:
                                row["discount_rate"] = u["discount_rate"]
                            
                            qty = float(row.get("quantity", 0))
                            price = float(row.get("unit_price", 0))
                            disc = float(row.get("discount_rate", 1))
                            
                            row["total_price"] = qty * price
                            row["internal_cost"] = row["total_price"] * disc
                            modified = True
                
                print(f"[JSON] Total matches found: {match_count}, modified: {modified}")
                if modified:
                    save_projects(projects)
                    invalidate_inquiry_rows_cache(project_id)
                return True
        return False


def save_as_new_version(project_id: str, source_version_idx: int, new_file_name: str) -> bool:
    """將指定版本的數據內容另存為一個全新的版本"""
    import copy
    from datetime import datetime
    if USE_DB:
        db = get_db_session()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project or not project.files:
                return False
            
            sorted_files = sorted(project.files, key=lambda x: x.uploaded_at)
            if not (0 <= source_version_idx < len(sorted_files)):
                return False
                
            source_file = sorted_files[source_version_idx]
            
            # 建立新檔案物件，複製 data
            new_data = copy.deepcopy(source_file.data)
            
            new_file = ProjectFile(
                project_id=project_id,
                file_name=new_file_name,
                data=new_data
            )
            db.add(new_file)
            project.updated_at = datetime.utcnow()
            db.commit()
            # 建立新版本後清除快取，避免前端讀到舊版本的最新版快取
            invalidate_inquiry_rows_cache(project_id)
            return True
        finally:
            db.close()
    else:
        # JSON 模式實作
        projects = load_projects()
        for p in projects:
            if p["id"] == project_id and p.get("files"):
                files = p["files"]
                if not (0 <= source_version_idx < len(files)):
                    return False
                
                source_file = files[source_version_idx]
                new_file = {
                    "file_name": new_file_name,
                    "uploaded_at": datetime.now().isoformat(),
                    "data": copy.deepcopy(source_file.get("data", {}))
                }
                files.append(new_file)
                p["updated_at"] = datetime.now().isoformat()
                save_projects(projects)
                return True
        return False
