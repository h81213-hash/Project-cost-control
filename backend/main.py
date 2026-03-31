from fastapi import FastAPI, UploadFile, File, Request, HTTPException
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

# 配置 CORS 中間件
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

@app.get("/")
def read_root():
    return {"status": "專案成本控制器後端已啟動", "message": "已連線至 8002", "version": "1.0.3"}

# --- 內部輔助函數 ---

def _get_project_data(db: SessionLocal, project_id: str, include_rows: bool = False, version_indices: List[int] = None):
    """
    統一取得專案資料的內部函數，支援延遲加載 (Lazy Loading) 以優化效能。
    """
    query = db.query(models.Project).filter(models.Project.id == project_id)
    project = query.first()
    if not project:
        raise HTTPException(status_code=404, detail="專案不存在")
    
    proj_dict = project_service.serialize_project(project)
    f_query = db.query(models.ProjectFile).filter(models.ProjectFile.project_id == project_id).order_by(models.ProjectFile.uploaded_at)
    
    if version_indices is not None:
        all_f = f_query.all()
        target_ids = []
        for v in version_indices:
            idx = v if v >= 0 else len(all_f) + v
            if 0 <= idx < len(all_f):
                target_ids.append(all_f[idx].id)
        f_query = f_query.filter(models.ProjectFile.id.in_(target_ids))
    
    if not include_rows:
        f_query = f_query.options(defer(models.ProjectFile.data))
    
    files = f_query.all()
    proj_dict["files"] = [project_service.serialize_file(f, include_data=include_rows) for f in files]
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
def get_project(project_id: str, page: Optional[int] = None, page_size: int = 50, system_category: Optional[str] = None, version_idx: int = -1):
    version_indices = [version_idx] if version_idx != -1 else None
    proj = project_service.get_project(project_id, page=page, page_size=page_size, system_category=system_category, version_indices=version_indices)
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

@app.post("/projects/{project_id}/manual_classify")
def manual_classify(project_id: str, req: ManualClassifyRequest):
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
    rows = proj["files"][0].get("data", {}).get("rows", [])
    raw_tpl = proj.get("report_config", {}).get("inquiry_template", {})
    tpl = {**raw_tpl, "project_name": proj["name"], "vendor_to": vendor_name, "vendor_phone": vendor_phone, "vendor_fax": vendor_fax}
    sel_idx = [int(i) for i in row_indices.split(",") if i.strip()] if row_indices else None
    filtered = [r for i, r in enumerate(rows) if (sel_idx is not None and (r.get("_original_index") in sel_idx or i in sel_idx)) or (sel_idx is None and category in (r.get("manual_raw_category") or r.get("system_category") or ""))]
    excel_data = excel_service.generate_inquiry_excel(filtered, tpl)
    from urllib.parse import quote
    return StreamingResponse(io.BytesIO(excel_data), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

@app.post("/projects/{project_id}/inquiry_draft")
async def create_inquiry_draft(project_id: str, req: InquiryDraftRequest):
    db = SessionLocal()
    proj = _get_project_data(db, project_id, include_rows=True, version_indices=[req.version_idx])
    rows = proj["files"][0].get("data", {}).get("rows", [])
    raw_tpl = proj.get("report_config", {}).get("inquiry_template", {})
    tpl = {**raw_tpl, "project_name": proj["name"], "vendor_to": req.vendor.get("name"), "vendor_phone": req.vendor.get("phone"), "vendor_fax": req.vendor.get("fax")}
    sel_idx = [int(i) for i in req.row_indices.split(",") if i.strip()] if req.row_indices else None
    filtered = [r for i, r in enumerate(rows) if (sel_idx is not None and (r.get("_original_index") in sel_idx or i in sel_idx)) or (sel_idx is None and req.category in (r.get("manual_raw_category") or r.get("system_category") or ""))]
    excel_data = excel_service.generate_inquiry_excel(filtered, tpl)
    provider = mail_service.MailFactory.get_provider(req.provider, client_id=req.outlook_client_id)
    draft_id = provider.create_draft_with_attachment(to=req.vendor.get("email", ""), subject=req.subject, body=req.body, file_content=excel_data, file_name=f"詢價單_{proj['name']}.xlsx")
    return {"status": "success", "draft_id": draft_id}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)