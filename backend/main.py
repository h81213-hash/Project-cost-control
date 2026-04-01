from fastapi import FastAPI, UploadFile, File, Request, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import uvicorn
import pandas as pd
import io
import os
from dotenv import load_dotenv
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import defer
from services import project_service, category_service, excel_parser, diff_service, report_service, vendor_service, mail_service, excel_service
from database import engine, Base, SessionLocal
import models
from services.excel_parser import ExcelParser

load_dotenv()

# --- 供應商相關模型 ---
class VendorCreate(BaseModel):
    name: str
    contact: str = ""
    phone: str = ""
    fax: str = ""
    email: str = ""
    tags: List[str] = []

class VendorUpdate(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    phone: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None
    tags: Optional[List[str]] = None

app = FastAPI()

@app.on_event("startup")
def startup_warmup():
    """伺服器啟動時預先載入快取"""
    try:
        print(">>> [Startup] 正在確認資料庫連線與初始化資料表...")
        Base.metadata.create_all(bind=engine)
        print(">>> [Startup] 資料庫初始化完成")
    except Exception as e:
        print(f">>> [Startup] 資料庫初始化失敗: {e}")

    if not project_service.USE_DB:
        try:
            project_service.load_projects()
            print(">>> [Startup] 專案快取預熱完成")
        except Exception as e:
            print(f">>> [Startup] 快取預熱失敗（可忽略）: {e}")

import threading

# 存檔安全鎖，避免超大 JSON 併發寫入時損壞
save_lock = threading.Lock()

# AI 停止信號控管 {project_id: bool}
ai_stop_signals = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "https://project-cost-control-app.netlify.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProjectCreate(BaseModel):
    name: str
    client: str = ""
    location: str = ""
    manager: str = ""
    start_date: str = ""
    end_date: str = ""
    note: str = ""
    classification_depth: int = 2

class ProjectSettings(BaseModel):
    classification_depth: Optional[int] = None
    report_config: Optional[Dict[str, Any]] = None

class AnalyzeRequest(BaseModel):
    rows: List[Dict[str, Any]]
    max_depth: int = 2

class BatchClassifyRequest(BaseModel):
    row_indices: List[int]
    new_category_path: str
    add_keyword: bool = False
    keyword: str = ""
    classification_depth: int = 2
    version_idx: int = -1

class ConfirmAIRequest(BaseModel):
    row_indices: List[int]
    version_idx: int = -1

class ManualClassifyRequest(BaseModel):
    row_index: int
    new_category_path: str
    add_keyword: bool = False
    keyword: str = None
    item_name: str = None
    classification_depth: int = 2
    version_idx: int = -1

class InquiryDraftRequest(BaseModel):
    vendor: Dict[str, Any]
    category: str
    version_idx: int = -1
    row_indices: Optional[str] = None
    provider: str # "GMAIL" or "OUTLOOK"
    subject: str
    body: str
    outlook_client_id: Optional[str] = None
# --- 全域錯誤攔截器 (偵錯用，修復後建議移除) ---
import traceback
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_details = traceback.format_exc()
    print(f"CRITICAL ERROR: {error_details}")
    # 強制加入 CORS 標頭，確保前端能讀取到錯誤訊息
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*"
    }
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": str(exc),
            "traceback": error_details
        },
        headers=headers
    )

@app.get("/")
def read_root():
    return {"status": "專案成本控制器後端已啟動", "message": "已連線至 8002", "version": "1.0.3"}

# --- 內部輔助函數 ---

def _get_project_data(db: Optional[SessionLocal], project_id: str, include_rows: bool = False, version_indices: List[int] = None):
    """
    統一取得專案資料的內部函數，支援資料庫與 JSON 雙模式。
    """
    from services.project_service import USE_DB, load_projects, serialize_project, serialize_file
    
    if not USE_DB:
        # JSON 模式
        projects = load_projects()
        project = next((p for p in projects if p["id"] == project_id), None)
        if not project:
            raise HTTPException(status_code=404, detail="專案不存在 (JSON)")
        
        # 處理版本篩選
        if version_indices is not None and "files" in project:
            all_f = project["files"]
            target_files = []
            for v in version_indices:
                idx = v if v >= 0 else len(all_f) + v
                if 0 <= idx < len(all_f):
                    target_files.append(all_f[idx])
            project["files"] = target_files
            
        return project
    
    # DB 模式
    if db is None:
        db = SessionLocal()
        
    query = db.query(models.Project).filter(models.Project.id == project_id)
    project = query.first()
    if not project:
        raise HTTPException(status_code=404, detail="專案不存在 (DB)")
    
    proj_dict = serialize_project(project)
    f_query = db.query(models.ProjectFile).filter(models.ProjectFile.project_id == project_id).order_by(models.ProjectFile.uploaded_at)
    
    if version_indices is not None:
        all_f = f_query.all()
        target_ids = [all_f[v if v >= 0 else len(all_f)+v].id for v in version_indices if (v if v >= 0 else len(all_f)+v) < len(all_f)]
        if not target_ids:
            proj_dict["files"] = []
            return proj_dict
        f_query = db.query(models.ProjectFile).filter(models.ProjectFile.id.in_(target_ids)).order_by(models.ProjectFile.uploaded_at)
    
    if not include_rows:
        f_query = f_query.options(defer(models.ProjectFile.data))
    
    files = f_query.all()
    proj_dict["files"] = [serialize_file(f, include_data=include_rows) for f in files]
    return proj_dict

@app.get("/health")
def health_check():
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "degraded", "db_error": str(e)}, 503

# === 專案管理 API ===

@app.get("/projects")
def list_projects():
    return project_service.load_projects_summary()

@app.post("/projects")
def create_project(project: ProjectCreate):
    new_proj = project_service.create_project(
        name=project.name,
        client=project.client,
        location=project.location,
        manager=project.manager,
        start_date=project.start_date,
        end_date=project.end_date,
        note=project.note,
        classification_depth=project.classification_depth,
    )
    return {"status": "success", "project": new_proj}

@app.get("/projects/{project_id}")
def get_project(project_id: str, page: Optional[int] = None, page_size: int = 50, system_category: Optional[str] = None, version_idx: int = -1, filter_type: Optional[str] = None):
    version_indices = [version_idx] if version_idx != -1 else None
    proj = project_service.get_project(project_id, page=page, page_size=page_size, system_category=system_category, version_indices=version_indices, filter_type=filter_type)
    if proj: return proj
    raise HTTPException(status_code=404, detail="找不到該專案")

@app.get("/projects/{project_id}/inquiry_rows")
def get_inquiry_rows(project_id: str, system_category: str, version_idx: int = -1):
    return project_service.get_inquiry_rows(project_id, system_category, version_idx)

@app.delete("/projects/{project_id}")
def delete_project(project_id: str):
    if project_service.delete_project(project_id): return {"status": "success"}
    raise HTTPException(status_code=404, detail="找不到該專案")

@app.patch("/projects/{project_id}/settings")
def update_project_settings(project_id: str, settings: ProjectSettings):
    update_dict = {k: v for k, v in settings.dict().items() if v is not None}
    updated = project_service.update_project_settings(project_id, update_dict)
    if updated: return {"status": "success", "project": updated}
    raise HTTPException(status_code=404, detail="找不到該專案")

# === 報表管理 API ===

@app.post("/projects/{project_id}/inquiry_rows/update")
async def update_inquiry_rows(project_id: str, payload: Dict[str, Any]):
    system_category = payload.get("system_category")
    updates = payload.get("updates", [])
    version_idx = payload.get("version_idx", -1)
    if project_service.update_inquiry_rows(project_id, system_category, updates, version_idx):
        return {"status": "success"}
    raise HTTPException(status_code=500, detail="更新失敗")

@app.get("/projects/{project_id}/reports")
def get_project_report(project_id: str, depth: int = 1, version_idx: int = -1):
    return report_service.get_report_data(project_id, depth=depth, version_idx=version_idx)

@app.post("/projects/{project_id}/reports/config")
async def update_report_config(project_id: str, request: Request):
    body = await request.json()
    if report_service.update_report_config(project_id, body):
        return {"status": "success"}
    return {"status": "error", "message": "更新失敗"}

@app.post("/projects/{project_id}/files/save_as_new")
async def save_as_new_version(project_id: str, payload: Dict[str, Any]):
    source_idx = payload.get("source_version_idx")
    new_name = payload.get("new_file_name")
    if project_service.save_as_new_version(project_id, source_idx, new_name):
        return {"status": "success"}
    return {"status": "error", "message": "另存新檔失敗"}

# === 分類管理 API ===

@app.post("/projects/{project_id}/compare")
async def compare_project_versions(project_id: str, request: Request):
    body = await request.json()
    base_idx = body.get("base_index", 0)
    target_idx = body.get("target_index", -1)
    project = project_service.get_project(project_id, version_indices=[])
    try:
        if target_idx == -1: target_idx = len(project["files"]) - 1
        project_data = project_service.get_project(project_id, version_indices=[base_idx, target_idx])
        files = project_data["files"]
        old_data = files[0].get("data", {}).get("rows", [])
        new_data = files[1].get("data", {}).get("rows", [])
        diff_result = diff_service.compare_and_merge(old_data, new_data)
        analysis = category_service.analyze_project_data(diff_result["rows"], max_depth=project.get("classification_depth", 2))
        return {"status": "success", "data": {"diff": diff_result, "analysis": analysis}}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/projects/{project_id}/apply_diff")
async def apply_diff_version(project_id: str, request: Request):
    body = await request.json()
    rows = body.get("rows")
    file_name = body.get("file_name", "合併版本")
    project = project_service.get_project(project_id)
    analysis = category_service.analyze_project_data(rows, max_depth=project.get("classification_depth", 2))
    parsed_data = {"header_row": 0, "mapping": {}, "rows": rows, "analysis": analysis}
    if project_service.add_file_to_project(project_id, f"合併: {file_name}", parsed_data):
        return {"status": "success", "message": "已儲存為新版本"}
    return {"status": "error", "message": "儲存失敗"}

@app.delete("/projects/{project_id}/files/{file_index}")
async def delete_project_version(project_id: str, file_index: int):
    if project_service.delete_file_from_project(project_id, file_index):
        return {"status": "success"}
    return {"status": "error"}

@app.post("/projects/{project_id}/batch_classify")
def batch_classify(project_id: str, req: BatchClassifyRequest):
    from services.project_service import USE_DB, load_projects, save_projects, invalidate_cache
    if USE_DB:
        db = SessionLocal()
        try:
            proj = _get_project_data(db, project_id, include_rows=True, version_indices=[req.version_idx])
            target_file_dict = proj["files"][0]
            rows = target_file_dict.get("data", {}).get("rows", [])
            row_map = {r.get("_original_index"): r for r in rows if r.get("_original_index") is not None}
            for idx in req.row_indices:
                row = row_map.get(idx)
                if row:
                    row["is_manual_category"] = True
                    path = req.new_category_path
                    if req.add_keyword:
                        path = f"{req.new_category_path} > {row.get('description', '')}"
                        category_service.add_keyword_to_path(path, req.keyword if req.keyword else None)
                    else:
                        category_service.add_keyword_to_path(path)
                    row["manual_raw_category"] = path
                    row["system_category"] = " > ".join(path.split(" > ")[:req.classification_depth])
            if req.add_keyword:
                analysis = category_service.analyze_project_data(rows, max_depth=req.classification_depth, new_keyword=req.keyword or " > ".join(req.new_category_path.split(" > ")[-1:]))
            else:
                analysis = category_service.build_analysis_from_categories(rows, max_depth=req.classification_depth)
            
            all_f = db.query(models.ProjectFile).filter(models.ProjectFile.project_id == project_id).order_by(models.ProjectFile.uploaded_at).all()
            db_file = all_f[req.version_idx if req.version_idx >= 0 else -1]
            db_file.data = {**db_file.data, "rows": rows, "analysis": analysis}
            db.commit()
            return {"status": "success", "analysis": analysis}
        except Exception as e:
            db.rollback()
            return {"status": "error", "message": str(e)}
        finally:
            db.close()
    else:
        try:
            with save_lock:
                projects = load_projects()
                proj = next((p for p in projects if p["id"] == project_id), None)
                if not proj or not proj.get("files"): return {"status": "error", "message": "專案或版本不存在"}
                
                idx = req.version_idx if req.version_idx >= 0 else len(proj["files"]) - 1
                target_file_dict = proj["files"][idx]
                rows = target_file_dict.get("data", {}).get("rows", [])
                row_map = {r.get("_original_index"): r for r in rows if r.get("_original_index") is not None}
                
                for r_idx in req.row_indices:
                    row = row_map.get(r_idx)
                    if row:
                        row["is_manual_category"] = True
                        path = req.new_category_path
                        if req.add_keyword:
                            path = f"{req.new_category_path} > {row.get('description', '')}"
                            category_service.add_keyword_to_path(path, req.keyword if req.keyword else None)
                        else:
                            category_service.add_keyword_to_path(path)
                        row["manual_raw_category"] = path
                        row["system_category"] = " > ".join(path.split(" > ")[:req.classification_depth])
                        
                if req.add_keyword:
                    analysis = category_service.analyze_project_data(rows, max_depth=req.classification_depth, new_keyword=req.keyword or " > ".join(req.new_category_path.split(" > ")[-1:]))
                else:
                    analysis = category_service.build_analysis_from_categories(rows, max_depth=req.classification_depth)
                
                target_file_dict["data"]["analysis"] = analysis
                save_projects(projects)
                invalidate_cache()
                return {"status": "success", "analysis": analysis}
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": str(e)}

@app.post("/projects/{project_id}/manual_classify")
def manual_classify(project_id: str, req: ManualClassifyRequest):
    from services.project_service import USE_DB, load_projects, save_projects, invalidate_cache
    if USE_DB:
        db = SessionLocal()
        try:
            proj = _get_project_data(db, project_id, include_rows=True, version_indices=[req.version_idx])
            rows = proj["files"][0].get("data", {}).get("rows", [])
            row = next((r for r in rows if r.get("_original_index") == req.row_index), None)
            if row:
                row["is_manual_category"] = True
                path = req.new_category_path
                if req.add_keyword and req.item_name: path = f"{path} > {req.item_name}"
                category_service.add_keyword_to_path(path, req.keyword if req.keyword else None)
                row["manual_raw_category"] = path
                row["system_category"] = " > ".join(path.split(" > ")[:req.classification_depth])
                analysis = category_service.analyze_project_data(rows, max_depth=req.classification_depth) if req.add_keyword else category_service.build_analysis_from_categories(rows, max_depth=req.classification_depth)
                all_f = db.query(models.ProjectFile).filter(models.ProjectFile.project_id == project_id).order_by(models.ProjectFile.uploaded_at).all()
                db_file = all_f[req.version_idx if req.version_idx >= 0 else -1]
                db_file.data = {**db_file.data, "rows": rows, "analysis": analysis}
                db.commit()
                return {"status": "success", "data": db_file.data}
        except Exception as e:
            db.rollback()
            return {"status": "error", "message": str(e)}
        finally:
            db.close()
    else:
        try:
            with save_lock:
                projects = load_projects()
                proj = next((p for p in projects if p["id"] == project_id), None)
                if not proj or not proj.get("files"): return {"status": "error", "message": "專案或版本不存在"}
                
                idx = req.version_idx if req.version_idx >= 0 else len(proj["files"]) - 1
                target_file_dict = proj["files"][idx]
                rows = target_file_dict.get("data", {}).get("rows", [])
                row = next((r for r in rows if r.get("_original_index") == req.row_index), None)
                
                if row:
                    row["is_manual_category"] = True
                    # 清除 AI 標籤
                    if row.get("is_ai_category"): del row["is_ai_category"]
                    
                    path = req.new_category_path
                    if req.add_keyword and req.item_name: path = f"{path} > {req.item_name}"
                    category_service.add_keyword_to_path(path, req.keyword if req.keyword else None)
                    row["manual_raw_category"] = path
                    row["system_category"] = " > ".join(path.split(" > ")[:req.classification_depth])
                    
                    analysis = category_service.analyze_project_data(rows, max_depth=req.classification_depth) if req.add_keyword else category_service.build_analysis_from_categories(rows, max_depth=req.classification_depth)
                    target_file_dict["data"]["analysis"] = analysis
                    save_projects(projects)
                    invalidate_cache()
                    return {"status": "success", "data": target_file_dict["data"]}
                return {"status": "error", "message": "找不到指定的項目"}
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": str(e)}

@app.post("/projects/{project_id}/confirm_ai")
def confirm_ai_classification(project_id: str, req: ConfirmAIRequest):
    """
    確認並正式套用 AI 建議的分類。這將移除 is_ai_category 標籤，
    並將該項目視為人工確認過的分類 (is_manual_category = True)。
    包含「全生命週期鎖 (Full Cycle Lock)」，防止手動確認與 AI 存檔衝突。
    """
    from services.project_service import USE_DB, load_projects, save_projects, invalidate_cache
    if USE_DB:
        db = SessionLocal()
        try:
            proj = _get_project_data(db, project_id, include_rows=True, version_indices=[req.version_idx])
            if not proj or not proj.get("files"): return {"status": "error", "message": "專案或版本不存在"}
            
            target_file_dict = proj["files"][0]
            rows = target_file_dict.get("data", {}).get("rows", [])
            row_map = {r.get("_original_index"): r for r in rows if r.get("_original_index") is not None}
            
            updated_count = 0
            for idx in req.row_indices:
                row = row_map.get(idx)
                if row and row.get("is_ai_category"):
                    del row["is_ai_category"]
                    row["is_manual_category"] = True
                    updated_count += 1
                    
            if updated_count > 0:
                analysis_data = target_file_dict.get("data", {}).get("analysis", {})
                depth = analysis_data.get("classification_depth", 2)
                analysis = category_service.analyze_project_data(rows, max_depth=depth)
                
                all_f = db.query(models.ProjectFile).filter(models.ProjectFile.project_id == project_id).order_by(models.ProjectFile.uploaded_at).all()
                db_file = all_f[req.version_idx if req.version_idx >= 0 else -1]
                db_file.data = {**db_file.data, "rows": rows, "analysis": analysis}
                db.commit()
                
            return {"status": "success", "updated_count": updated_count}
        except Exception as e:
            db.rollback()
            return {"status": "error", "message": str(e)}
        finally:
            db.close()
    else:
        # JSON 模式 - Full Cycle Lock
        try:
            with save_lock:
                projects = load_projects()
                proj = next((p for p in projects if p["id"] == project_id), None)
                if not proj or not proj.get("files"): return {"status": "error", "message": "專案或版本不存在"}
                
                idx = req.version_idx if req.version_idx >= 0 else len(proj["files"]) - 1
                target_file_dict = proj["files"][idx]
                rows = target_file_dict.get("data", {}).get("rows", [])
                row_map = {r.get("_original_index"): r for r in rows if r.get("_original_index") is not None}
                
                updated_count = 0
                for row_idx in req.row_indices:
                    row = row_map.get(row_idx)
                    if row and row.get("is_ai_category"):
                        del row["is_ai_category"]
                        row["is_manual_category"] = True
                        updated_count += 1
                        
                if updated_count > 0:
                    import services.category_service as cat_svc
                    analysis_data = target_file_dict.get("data", {}).get("analysis", {})
                    depth = analysis_data.get("classification_depth", 2)
                    target_file_dict["data"]["analysis"] = cat_svc.analyze_project_data(rows, max_depth=depth)
                    save_projects(projects)
                    invalidate_cache()
                    
                return {"status": "success", "updated_count": updated_count}
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": str(e), "trace": traceback.format_exc()}

@app.post("/projects/{project_id}/reclassify")
def reclassify_project(project_id: str):
    db = SessionLocal()
    try:
        proj_base = _get_project_data(db, project_id, include_rows=False)
        depth = proj_base.get("classification_depth", 3)
        proj_full = _get_project_data(db, project_id, include_rows=True, version_indices=[-1])
        last_file = proj_full["files"][0]
        rows = last_file.get("data", {}).get("rows", [])
        for r in rows:
            if not r.get("is_manual_category"):
                r["system_category"] = category_service.classify_row(r.get("description", ""), max_depth=depth)
        analysis = category_service.analyze_project_data(rows, max_depth=depth)
        all_f = db.query(models.ProjectFile).filter(models.ProjectFile.project_id == project_id).order_by(models.ProjectFile.uploaded_at).all()
        db_file = all_f[-1]
        db_file.data = {**db_file.data, "rows": rows, "analysis": analysis}
        db.commit()
        return {"status": "success", "data": db_file.data}
    finally:
        db.close()

# ============================================================
# AI 分類核心層：公用讀寫輔助類（支援 JSON 模式 + DB 模式）
# ============================================================

class _AIPersistence:
    """
    統一處理 AI 分類的資料讀寫。
    自動失途除錯控制：使用 USE_DB flag 决定操作層。
    """
    
    @staticmethod
    def get_project_depth(project_id: str) -> int:
        """取得專案的分類深度設定"""
        from services.project_service import USE_DB
        if USE_DB:
            db = SessionLocal()
            try:
                project = db.query(models.Project).filter(models.Project.id == project_id).first()
                return (project.classification_depth or 2) if project else 2
            finally:
                db.close()
        else:
            import services.project_service as ps
            proj = ps.get_project(project_id)
            return proj.get("classification_depth", 2) if proj else 2

    @staticmethod
    def project_exists(project_id: str) -> bool:
        """檢查專案是否存在"""
        from services.project_service import USE_DB
        if USE_DB:
            db = SessionLocal()
            try:
                return db.query(models.Project).filter(models.Project.id == project_id).first() is not None
            finally:
                db.close()
        else:
            import services.project_service as ps
            return ps.get_project(project_id) is not None

    @staticmethod
    def read_rows(project_id: str, version_idx: int):
        """
        讀取指定專案版本的 rows。
        回傳 (rows, extra_data) 圖組，其中 extra_data 包含除 rows 外的其他資料。
        """
        import copy
        from services.project_service import USE_DB
        if USE_DB:
            db = SessionLocal()
            try:
                project = db.query(models.Project).filter(models.Project.id == project_id).first()
                if not project or not project.files:
                    return [], {}
                sorted_files = sorted(project.files, key=lambda x: x.uploaded_at)
                idx = version_idx if version_idx >= 0 else len(sorted_files) - 1
                if not (0 <= idx < len(sorted_files)):
                    return [], {}
                raw_data = sorted_files[idx].data or {}
                rows = copy.deepcopy(raw_data.get("rows", []))
                extra = {k: v for k, v in raw_data.items() if k != "rows"}
                return rows, extra
            finally:
                db.close()
        else:
            # JSON 模式：直接讀 projects.json 避免 get_project(version_indices=[-1]) 的缺陷
            import json as _json
            from services.project_service import PROJECTS_FILE
            try:
                with open(PROJECTS_FILE, "r", encoding="utf-8") as f:
                    projects_list = _json.load(f)
                raw_data = {}
                for p in projects_list:
                    if p["id"] == project_id:
                        files = p.get("files", [])
                        if not files:
                            break
                        idx = version_idx if version_idx >= 0 else len(files) - 1
                        if 0 <= idx < len(files):
                            raw_data = files[idx].get("data", {})
                        break
            except Exception as e:
                print(f"[AI-Persist] JSON read error: {e}")
                return [], {}
            rows = copy.deepcopy(raw_data.get("rows", []))
            extra = {k: v for k, v in raw_data.items() if k != "rows"}
            return rows, extra

    @staticmethod
    def write_data(project_id: str, version_idx: int, updated_data: dict) -> bool:
        """
        將 updated_data 寫入指定專案版本。
        DB 模式：直接更新 ProjectFile.data。
        JSON 模式：讀兩 projects.json 並更新對應檔案的 data。
        """
        from services.project_service import USE_DB
        if USE_DB:
            from sqlalchemy.orm.attributes import flag_modified
            db = SessionLocal()
            try:
                project = db.query(models.Project).filter(models.Project.id == project_id).first()
                if not project or not project.files:
                    return False
                sorted_files = sorted(project.files, key=lambda x: x.uploaded_at)
                idx = version_idx if version_idx >= 0 else len(sorted_files) - 1
                if not (0 <= idx < len(sorted_files)):
                    return False
                sorted_files[idx].data = updated_data
                flag_modified(sorted_files[idx], "data")
                db.commit()
                return True
            except Exception as e:
                print(f"[AI-Persist] DB write error: {e}")
                db.rollback()
                return False
            finally:
                db.close()
        else:
            # JSON 模式：直接操作 projects.json
            import json as _json
            from services.project_service import (
                DATA_DIR, PROJECTS_FILE, invalidate_cache, invalidate_inquiry_rows_cache
            )
            try:
                with open(PROJECTS_FILE, "r", encoding="utf-8") as f:
                    projects_list = _json.load(f)
                
                for p in projects_list:
                    if p["id"] == project_id:
                        files = p.get("files", [])
                        idx = version_idx if version_idx >= 0 else len(files) - 1
                        if 0 <= idx < len(files):
                            files[idx]["data"] = updated_data
                            from datetime import datetime
                            p["updated_at"] = datetime.now().isoformat()
                            
                            with open(PROJECTS_FILE, "w", encoding="utf-8") as f:
                                _json.dump(projects_list, f, ensure_ascii=False, indent=2)
                            
                            invalidate_cache()
                            invalidate_inquiry_rows_cache(project_id)
                            return True
                return False
            except Exception as e:
                print(f"[AI-Persist] JSON write error: {e}")
                return False

    @staticmethod
    def update_status(project_id: str, version_idx: int, status: str, progress: int, error: str = None):
        """快捷更新 AI 狀態，不覆寫 rows"""
        from services.project_service import USE_DB
        if USE_DB:
            from sqlalchemy.orm.attributes import flag_modified
            db = SessionLocal()
            try:
                project = db.query(models.Project).filter(models.Project.id == project_id).first()
                if not project or not project.files:
                    return
                sorted_files = sorted(project.files, key=lambda x: x.uploaded_at)
                idx = version_idx if version_idx >= 0 else len(sorted_files) - 1
                if not (0 <= idx < len(sorted_files)):
                    return
                current = dict(sorted_files[idx].data or {})
                current["ai_status"] = status
                current["ai_progress"] = progress
                if error:
                    current["ai_last_error"] = error
                sorted_files[idx].data = current
                flag_modified(sorted_files[idx], "data")
                db.commit()
                print(f"[AI-Status] DB updated: {status}({progress}%)")
            except Exception as e:
                print(f"[AI-Status] DB update error: {e}")
                db.rollback()
            finally:
                db.close()
        else:
            # JSON 模式
            import json as _json
            from services.project_service import PROJECTS_FILE, invalidate_cache
            try:
                # 安全鎖保護，防止超大 JSON 在寫入時損毀
                with save_lock:
                    with open(PROJECTS_FILE, "r", encoding="utf-8") as f:
                        projects_list = _json.load(f)
                    
                    found = False
                    for p in projects_list:
                        if p["id"] == project_id:
                            files = p.get("files", [])
                            idx = version_idx if version_idx >= 0 else len(files) - 1
                            if 0 <= idx < len(files):
                                data = files[idx].get("data", {})
                                data["ai_status"] = status
                                data["ai_progress"] = progress
                                if error: data["ai_error"] = error
                                # 更新回清單
                                files[idx]["data"] = data
                                found = True
                                break
                    
                    if found:
                        with open(PROJECTS_FILE, "w", encoding="utf-8") as f:
                            _json.dump(projects_list, f, ensure_ascii=False, indent=2)
                        invalidate_cache()
                        print(f"[AI-Status] JSON updated safely: {status}({progress}%)")
            except Exception as e:
                print(f"[AI-Status] JSON update error: {e}")

    @staticmethod
    def read_status(project_id: str, version_idx: int) -> dict:
        """讀取 AI 當前狀態"""
        from services.project_service import USE_DB
        if USE_DB:
            db = SessionLocal()
            try:
                project = db.query(models.Project).filter(models.Project.id == project_id).first()
                if not project or not project.files:
                    return {"status": "none", "progress": 0}
                sorted_files = sorted(project.files, key=lambda x: x.uploaded_at)
                idx = version_idx if version_idx >= 0 else len(sorted_files) - 1
                if not (0 <= idx < len(sorted_files)):
                    return {"status": "none", "progress": 0}
                data = sorted_files[idx].data or {}
                return {
                    "status": data.get("ai_status", "none"),
                    "progress": data.get("ai_progress", 0),
                    "last_error": data.get("ai_last_error")
                }
            finally:
                db.close()
        else:
            import json as _json
            from services.project_service import PROJECTS_FILE
            try:
                with open(PROJECTS_FILE, "r", encoding="utf-8") as f:
                    projects_list = _json.load(f)
                for p in projects_list:
                    if p["id"] == project_id:
                        files = p.get("files", [])
                        idx = version_idx if version_idx >= 0 else len(files) - 1
                        if 0 <= idx < len(files):
                            data = files[idx].get("data", {})
                            return {
                                "status": data.get("ai_status", "none"),
                                "progress": data.get("ai_progress", 0),
                                "last_error": data.get("ai_last_error")
                            }
            except Exception:
                pass
            return {"status": "none", "progress": 0}


def _run_ai_classification(project_id: str, version_idx: int, depth: int):
    """背景執行的 AI 分類邏輯。
    
    【核心修復】使用 _AIPersistence 統一讀寫層，
    支援 JSON 模式和 DB 模式，不再依賴有缺降的 project_service 中間層。
    """
    from services.ai_service import ai_service
    from services.category_service import load_categories, analyze_project_data
    import time
    import copy

    try:
        print(f"[AI-Background] Starting for project {project_id} (version_idx={version_idx})...")
        _AIPersistence.update_status(project_id, version_idx, "processing", 5)

        # 1. 讀取 rows
        rows, extra_data = _AIPersistence.read_rows(project_id, version_idx)
        if not rows:
            print(f"[AI-Background Error] No rows found for project {project_id}")
            _AIPersistence.update_status(project_id, version_idx, "error", 0, "找不到專案或標單資料")
            return

        # 確保 _original_index 存在
        for idx, row in enumerate(rows):
            if "_original_index" not in row:
                row["_original_index"] = idx

        # 2. 篩選未分類項目
        # 【修正】即便已被標記為 is_ai_category，但如果是「未分類」，代表之前失敗了，應納入重新分析
        unclassified_rows = [
            r for r in rows
            if (not r.get("system_category") or r.get("system_category") == "未分類")
            and not r.get("is_manual_category")
            and not r.get("should_hide")
            # 排除統計或標題項目
            and "小計" not in str(r.get("description", ""))
            and "合計" not in str(r.get("description", ""))
            and "TOTAL" not in str(r.get("description", "")).upper()
        ]
        
        if not unclassified_rows:
            print(f"[AI-Background] No unclassified rows for project {project_id}.")
            _AIPersistence.update_status(project_id, version_idx, "completed", 100)
            return

        print(f"[AI-Background] Found {len(unclassified_rows)} unclassified rows to process.")

        # 3. 載入分類清單
        cat_tree = load_categories()
        category_list = ai_service.get_flattened_categories(cat_tree, max_depth=depth)
        
        if not category_list:
            _AIPersistence.update_status(project_id, version_idx, "error", 0, "分類清單為空，請先設定分類結構")
            return

        # 3.5 萃取手動分類項目作為反饋迴圈的 Ground Truth 範例 (Few-shot learning)
        manual_examples = []
        for r in rows:
            if r.get("is_manual_category") and r.get("system_category") and r.get("system_category") != "未分類":
                manual_examples.append({
                    "desc": r.get("description", ""),
                    "unit": r.get("unit", ""),
                    "category": r.get("system_category")
                })

        # 3.8 Rule Priority Engine (規則優先權引擎)
        # 用於攔截最基礎、常見的項目，避免浪費 AI 效能與時間
        COMMON_RULES = {
            "PVC管": "電氣及弱電設備工程 > 導線管路", # 預設範例對齊
            "EMT管": "電氣及弱電設備工程 > 導線管路",
            "電纜": "電氣及弱電設備工程 > 電纜及電線",
            "電線": "電氣及弱電設備工程 > 電纜及電線",
            "開關箱": "電氣及弱電設備工程 > 配電盤",
            "插座": "電氣及弱電設備工程 > 開關箱",
            "燈具": "電氣及弱電設備工程 > 照明燈具",
            "幫浦": "給排水設備工程 > 幫浦設備",
            "閘閥": "給排水設備工程 > 閥類",
            "避雷": "弱電設備工程 > 避雷設備",
            "消防水": "消防設備工程 > 消防水設備",
        }
        
        # 建立歷史手動分類的精確比對庫
        user_exact_rules = {ex["desc"].strip().upper(): ex["category"] for ex in manual_examples if ex.get("desc")}
        
        ai_candidates = []
        rule_matched_count = 0
        
        for ur in unclassified_rows:
            desc = str(ur.get("description", "")).strip().upper()
            matched_cat = None
            
            # 優先規則 1：歷史完全一致的項目
            if desc and desc in user_exact_rules:
                matched_cat = user_exact_rules[desc]
            else:
                # 優先規則 2：基礎字串比對
                for kw, cat in COMMON_RULES.items():
                    if kw.upper() in desc:
                        # 簡單檢驗這條規則在當前專案分類清單是否存在
                        if any(cat in c for c in category_list):
                            matched_cat = next((c for c in category_list if cat in c), cat)
                            break
                            
            if matched_cat and matched_cat != "未分類":
                ur["system_category"] = matched_cat
                # 這裡設定 True 還是讓它走確認流程，但使用者會感覺極快
                ur["is_ai_category"] = True
                ur["ai_confidence"] = 1.0 # 100% 規則引擎
                rule_matched_count += 1
            else:
                # 確保不留殘餘的 is_ai_category 標記
                ur["is_ai_category"] = False
                ai_candidates.append(ur)
                
        print(f"[AI-RuleEngine] 規則引擎攔截了 {rule_matched_count} 筆簡單項目，剩餘 {len(ai_candidates)} 筆交由 AI 處理。")
        unclassified_rows = ai_candidates

        # 4. 分批 AI 處理 (Concurrency = 3)
        batch_size = 50
        total_unclassified = len(unclassified_rows)
        update_count = rule_matched_count # 先把規則命中的數量加上去

        if total_unclassified > 0:
            import concurrent.futures
            import time
            batches = [unclassified_rows[i:i + batch_size] for i in range(0, total_unclassified, batch_size)]
            
            # 使用 ThreadPoolExecutor 並發，但免費版 API 不支援瞬間高併發
            # 因此我們先準備好 future_to_batch，但 submission 時加入 1 秒緩衝
            future_to_batch = {}
            import random
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                for b in batches:
                    # 檢查是否被外部中斷
                    if ai_stop_signals.get(project_id):
                        print(f"[AI-Background] Stop signal received for project {project_id}. Breaking batch loop.")
                        break
                        
                    future = executor.submit(ai_service.batch_classify_items, b, category_list, manual_examples)
                    future_to_batch[future] = b
                    time.sleep(random.uniform(0.5, 1.5)) # [Jitter] 避免瞬間 burst 觸發 Gemini 429
                
                completed_batches = 0
                failed_batches = 0
                
                for future in concurrent.futures.as_completed(future_to_batch):
                    # 極速響應：在處理每一批次結果前，再次確認是否已被中斷
                    if ai_stop_signals.get(project_id):
                        print(f"[AI-Background] Stop signal detected during result processing. Aborting...")
                        break

                    completed_batches += 1
                    try:
                        batch_results = future.result()
                        if batch_results:
                            for r in rows:
                                rid = str(r.get("_original_index", ""))
                                if rid in batch_results:
                                    res = batch_results[rid]
                                    if res.get("category") and res.get("category") != "未分類":
                                        r["system_category"] = res["category"]
                                        r["is_ai_category"] = True
                                        r["ai_confidence"] = res.get("confidence", 0.9)
                                        update_count += 1
                                    else:
                                        # 如果 AI 沒分出結果，清除標記
                                        r["is_ai_category"] = False
                        else:
                            # 這一批次失敗（如 429），將該批次項目的標記清除，避免顯示 ⚡
                            for br_item in future_to_batch[future]:
                                for r in rows:
                                    if r.get("_original_index") == br_item.get("_original_index"):
                                        r["is_ai_category"] = False
                            failed_batches += 1
                    except Exception as exc:
                        print(f"[AI-Background] Batch exception: {exc}")
                        failed_batches += 1

                    progress = int((completed_batches * batch_size) / total_unclassified * 90) + 5
                    analysis = analyze_project_data(rows, max_depth=depth)
                    
                    updated_data = dict(extra_data)
                    updated_data["rows"] = rows
                    updated_data["analysis"] = analysis
                    updated_data["ai_status"] = "processing"
                    updated_data["ai_progress"] = min(progress, 99)
                    
                    _AIPersistence.write_data(project_id, version_idx, updated_data)
                    print(f"[AI-Background] Batch saved ({completed_batches}/{len(batches)}). Progress: {progress}%, Updated: {update_count} items.")

                if project_id in ai_stop_signals:
                    del ai_stop_signals[project_id]

                # 確保中斷後狀態正確
                _AIPersistence.update_status(project_id, version_idx, "completed", 100)
                print(f"[AI-Background] Classification loop finished (Success or Stopped).")
                return

            # 檢查是否全軍覆沒（例如 API Key 每分鐘/每日額度已滿）
            if failed_batches == len(batches) and len(batches) > 0:
                _AIPersistence.update_status(project_id, version_idx, "error", 0, "連線過載或 API 額度耗盡，請稍後再試 (HTTP 429)")
                return

        # 5. 最終完成
        final_analysis = analyze_project_data(rows, max_depth=depth)
        final_data = dict(extra_data)
        final_data["rows"] = rows
        final_data["analysis"] = final_analysis
        final_data["ai_status"] = "completed"
        final_data["ai_progress"] = 100
        _AIPersistence.write_data(project_id, version_idx, final_data)
        
        print(f"[AI-Background] Finished. Updated {update_count}/{total_unclassified} items for project {project_id}.")

    except Exception as e:
        import traceback
        err_msg = str(e)
        print(f"[AI-Background Error] {err_msg}")
        traceback.print_exc()
        _AIPersistence.update_status(project_id, version_idx, "error", 0, err_msg)

@app.post("/projects/{project_id}/ai-stop")
def stop_ai_classification(project_id: str):
    """中斷 AI 分類任務"""
    ai_stop_signals[project_id] = True
    return {"status": "success", "message": "已發出停止訊號"}

@app.post("/projects/{project_id}/ai-classify")
async def ai_classify_project(project_id: str, background_tasks: BackgroundTasks, version_idx: int = -1):
    """
    對指定專案中「未分類」的項目進行 AI 深度掃描與自動分類 (背景模式)。
    支援 JSON 模式和 DB 模式。
    """
    if not _AIPersistence.project_exists(project_id):
        raise HTTPException(status_code=404, detail=f"找不到專案: {project_id}")
    
    depth = _AIPersistence.get_project_depth(project_id)
    background_tasks.add_task(_run_ai_classification, project_id, version_idx, depth)
    
    return {"status": "started", "message": "AI 分類已在背景啟動，請稍候並重新整理頁面查看進度"}

@app.get("/projects/{project_id}/ai-status")
def get_ai_status(project_id: str, version_idx: int = -1):
    """取得 AI 分類目前的狀態與進度。支援 JSON 模式和 DB 模式。"""
    return _AIPersistence.read_status(project_id, version_idx)

@app.post("/projects/{project_id}/upload")
async def upload_to_project(project_id: str, file: UploadFile = File(...)):
    contents = await file.read()
    try:
        result = ExcelParser.parse_excel(contents)
        db = SessionLocal()
        proj = db.query(models.Project).filter(models.Project.id == project_id).first()
        depth = proj.classification_depth if proj else 3
        result["analysis"] = category_service.analyze_project_data(result["rows"], max_depth=depth)
        project_service.add_file_to_project(project_id, file.filename, result)
        db.close()
        return {"status": "success", "data": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        result = ExcelParser.parse_excel(contents)
        return {"status": "success", "data": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/categories")
def get_categories(): return category_service.load_categories()

@app.post("/categories")
async def update_categories(request: Request):
    category_service.save_categories(await request.json())
    return {"status": "success"}

@app.get("/vendors")
def list_vendors(): return vendor_service.load_vendors()

@app.post("/vendors")
def create_vendor(vendor: VendorCreate):
    return vendor_service.add_vendor(name=vendor.name, contact=vendor.contact, phone=vendor.phone, fax=vendor.fax, email=vendor.email, tags=vendor.tags)

@app.put("/vendors/{vendor_id}")
def update_vendor(vendor_id: str, v: VendorUpdate):
    updates = {k: val for k, val in v.dict().items() if val is not None}
    r = vendor_service.update_vendor(vendor_id, updates)
    if not r: raise HTTPException(status_code=404)
    return r

@app.delete("/vendors/{vendor_id}")
def delete_vendor(vendor_id: str):
    if vendor_service.delete_vendor(vendor_id): return {"status": "success"}
    raise HTTPException(status_code=404)

@app.get("/match_vendors")
def match_vendors_endpoint(description: str = "", note: str = "", category: str = ""):
    return vendor_service.match_vendors(description, note, category)

@app.get("/projects/{project_id}/export")
def export_project_excel(project_id: str, version_idx: int = -1):
    db = SessionLocal()
    proj = _get_project_data(db, project_id, include_rows=True, version_indices=[version_idx])
    target_file = proj["files"][0]
    rows = target_file.get("data", {}).get("rows", [])
    mapping = target_file.get("data", {}).get("mapping", {})
    depth = proj.get("classification_depth", 3)
    max_lv = max(3, depth)
    export_data = []
    for r in rows:
        new_row = {mapping.get(k, k): v for k, v in r.items() if k in mapping}
        path_parts = (r.get("manual_raw_category") or r.get("system_category") or "未分類").split(" > ")
        for i in range(1, max_lv+1): new_row[f"LV.{i}"] = path_parts[i-1].strip() if i <= len(path_parts) else ""
        export_data.append(new_row)
    df = pd.DataFrame(export_data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer: df.to_excel(writer, index=False)
    output.seek(0)
    from urllib.parse import quote
    return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(proj['name']+'.xlsx')}"})

@app.get("/projects/{project_id}/inquiry_export")
async def export_inquiry_excel(project_id: str, category: str, version_idx: int = -1, row_indices: str = None, vendor_name: str = None, vendor_phone: str = None, vendor_fax: str = None):
    db = SessionLocal()
    proj = _get_project_data(db, project_id, include_rows=True, version_indices=[version_idx])
    
    # --- 防禦性檢查：是否有檔案 ---
    if not proj.get("files"):
        raise HTTPException(status_code=400, detail="此專案目前沒有可匯出的標單檔案，請先上傳標單。")
        
    target_file = proj["files"][0]
    rows = target_file.get("data", {}).get("rows", [])
    
    # --- 防禦性檢查：報表設定 ---
    report_config = proj.get("report_config") or {}
    raw_tpl = report_config.get("inquiry_template") if isinstance(report_config, dict) else {}
    if not isinstance(raw_tpl, dict): raw_tpl = {}
    
    tpl = {
        **raw_tpl, 
        "project_name": proj.get("name", ""), 
        "vendor_to": vendor_name or "", 
        "vendor_phone": vendor_phone or "", 
        "vendor_fax": vendor_fax or ""
    }
    
    # --- 穩健解析 row_indices ---
    def safe_int_list(s: str):
        if not s: return None
        res = []
        for i in s.split(","):
            try:
                if i.strip(): res.append(int(i.strip()))
            except ValueError:
                continue
        return res if res else None

    sel_idx = safe_int_list(row_indices)
    filtered = [r for i, r in enumerate(rows) if (sel_idx is not None and (r.get("_original_index") in sel_idx or i in sel_idx)) or (sel_idx is None and category in (r.get("manual_raw_category") or r.get("system_category") or ""))]
    
    excel_data = excel_service.generate_inquiry_excel(filtered, tpl)
    from urllib.parse import quote
    filename = quote(f"詢價單_{proj.get('name', '未命名')}.xlsx")
    return StreamingResponse(io.BytesIO(excel_data), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"})

@app.post("/projects/{project_id}/inquiry_draft")
async def create_inquiry_draft(project_id: str, req: InquiryDraftRequest):
    db = SessionLocal()
    proj = _get_project_data(db, project_id, include_rows=True, version_indices=[req.version_idx])
    
    # --- 防禦性檢查：是否有檔案 ---
    if not proj.get("files"):
        raise HTTPException(status_code=400, detail="建立草稿失敗：找不到對應的標單數據。")
        
    target_file = proj["files"][0]
    rows = target_file.get("data", {}).get("rows", [])
    
    # --- 防禦性檢查：報表設定 ---
    report_config = proj.get("report_config") or {}
    raw_tpl = report_config.get("inquiry_template") if isinstance(report_config, dict) else {}
    if not isinstance(raw_tpl, dict): raw_tpl = {}
    
    req_vendor = req.vendor or {}
    tpl = {
        **raw_tpl, 
        "project_name": proj.get("name", ""), 
        "vendor_to": req_vendor.get("name", ""), 
        "vendor_phone": req_vendor.get("phone", ""), 
        "vendor_fax": req_vendor.get("fax", "")
    }
    
    # --- 穩健解析 row_indices ---
    def safe_int_list(s: str):
        if not s: return None
        res = []
        for i in s.split(","):
            try:
                if i.strip(): res.append(int(i.strip()))
            except ValueError:
                continue
        return res if res else None

    sel_idx = safe_int_list(req.row_indices)
    filtered = [r for i, r in enumerate(rows) if (sel_idx is not None and (r.get("_original_index") in sel_idx or i in sel_idx)) or (sel_idx is None and req.category in (r.get("manual_raw_category") or r.get("system_category") or ""))]
    
    excel_data = excel_service.generate_inquiry_excel(filtered, tpl)
    provider = mail_service.MailFactory.get_provider(req.provider, client_id=req.outlook_client_id)
    draft_id = provider.create_draft_with_attachment(
        to=req_vendor.get("email", ""), 
        subject=req.subject or f"詢價單 - {proj.get('name', '')}", 
        body=req.body or "", 
        file_content=excel_data, 
        file_name=f"詢價單_{proj.get('name', '未命名')}.xlsx"
    )
    return {"status": "success", "draft_id": draft_id}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)