from fastapi import FastAPI, UploadFile, File, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import uvicorn
import pandas as pd
import io
from fastapi.responses import StreamingResponse
from services.excel_parser import ExcelParser
from services import project_service, category_service, excel_parser, diff_service

app = FastAPI()

# 允許前端 (3002) 連線到後端 (8002)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    classification_depth: int


class AnalyzeRequest(BaseModel):
    rows: List[Dict[str, Any]]
    max_depth: int = 2


class BatchClassifyRequest(BaseModel):
    row_indices: list[int]
    new_category_path: str
    add_keyword: bool = False
    keyword: str = ""
    classification_depth: int = 2

class ManualClassifyRequest(BaseModel):
    row_index: int
    new_category_path: str
    add_keyword: bool = False
    keyword: str = None
    item_name: str = None
    classification_depth: int = 2


@app.get("/")
def read_root():
    return {"status": "專案成本控制器後端已啟動", "message": "已連線至 8002", "version": "1.0.2"}


# === 專案管理 API ===

@app.get("/projects")
def list_projects():
    """取得所有專案列表"""
    return project_service.load_projects()


@app.post("/projects")
def create_project(project: ProjectCreate):
    """建立新專案"""
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
def get_project(project_id: str):
    """取得單一專案詳細資訊"""
    proj = project_service.get_project(project_id)
    if proj:
        return proj
    return {"status": "error", "message": "找不到該專案"}


@app.delete("/projects/{project_id}")
def delete_project(project_id: str):
    """刪除專案"""
    success = project_service.delete_project(project_id)
    if success:
        return {"status": "success"}
    return {"status": "error", "message": "找不到該專案"}


@app.patch("/projects/{project_id}/settings")
def update_project_settings(project_id: str, settings: ProjectSettings):
    """更新專案設定（例如分類深度）"""
    updated = project_service.update_project_settings(
        project_id, {"classification_depth": settings.classification_depth}
    )
    if updated:
        return {"status": "success", "project": updated}
    return {"status": "error", "message": "找不到該專案"}


# === 分類管理 API ===

@app.post("/projects/{project_id}/compare")
async def compare_project_versions(project_id: str, request: Request):
    """比對兩個不同版本的標單檔案"""
    body = await request.json()
    base_idx = body.get("base_index", 0)  # 基準版本 (通常是舊的)
    target_idx = body.get("target_index", -1) # 目標版本 (通常是新的)
    
    project = project_service.get_project(project_id)
    if not project or not project.get("files"):
        return {"status": "error", "message": "專案或檔案不存在"}
    
    try:
        files = project["files"]
        if target_idx == -1: target_idx = len(files) - 1
        
        old_data = files[base_idx]["data"]["rows"]
        new_data = files[target_idx]["data"]["rows"]
        
        diff_result = diff_service.compare_and_merge(old_data, new_data)
        
        # 進行成本分析 (基於比對後的結果)
        analysis = category_service.analyze_project_data(diff_result["rows"], max_depth=project.get("classification_depth", 2))
        
        return {
            "status": "success", 
            "data": {
                "diff": diff_result,
                "analysis": analysis
            }
        }
    except Exception as e:
        print(f"[Error] Compare failed: {e}")
        return {"status": "error", "message": f"比對失敗: {str(e)}"}

@app.post("/projects/{project_id}/apply_diff")
async def apply_diff_version(project_id: str, request: Request):
    """將比對合併後的結果存為新版本"""
    body = await request.json()
    rows = body.get("rows")
    file_name = body.get("file_name", "合併版本")
    
    if not rows:
        return {"status": "error", "message": "無效的數據"}
        
    project = project_service.get_project(project_id)
    if not project:
        return {"status": "error", "message": "專案不存在"}
        
    # 分析並儲存
    analysis = category_service.analyze_project_data(rows, max_depth=project.get("classification_depth", 2))
    parsed_data = {
        "header_row": 0,
        "mapping": {}, # 合併版本可能沒有原始對應
        "rows": rows,
        "analysis": analysis
    }
    
    success = project_service.add_file_to_project(project_id, f"合併: {file_name}", parsed_data)
    if success:
        return {"status": "success", "message": "已儲存為新版本"}
    return {"status": "error", "message": "儲存失敗"}


@app.delete("/projects/{project_id}/files/{file_index}")
async def delete_project_version(project_id: str, file_index: int):
    """刪除特定版本的標單檔案"""
    success = project_service.delete_file_from_project(project_id, file_index)
    if success:
        return {"status": "success", "message": "已刪除該版本"}
    return {"status": "error", "message": "刪除失敗，找不到該版本"}


@app.get("/categories")
def get_categories():
    """取得機電系統分類配置"""
    return category_service.load_categories()


@app.post("/categories")
async def update_categories(request: Request):
    """更新機電系統分類配置"""
    print("--- 收到儲存請求 ---")
    try:
        categories = await request.json()
        print(f"資料大小: {len(str(categories))} 字元")
        category_service.save_categories(categories)
        return {"status": "success"}
    except Exception as e:
        print(f"Error saving categories: {e}")
        return {"status": "error", "message": str(e)}


@app.post("/analyze")
def analyze_rows(req: AnalyzeRequest):
    """手動重新分析數據列（用於切換深度時即時更新）"""
    try:
        analysis = category_service.analyze_project_data(req.rows, max_depth=req.max_depth)
        return {"status": "success", "analysis": analysis, "rows": req.rows}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/projects/{project_id}/batch_classify")
def batch_classify(project_id: str, req: BatchClassifyRequest):
    """批次強制分類多個項目"""
    try:
        projects = project_service.load_projects()
        proj = next((p for p in projects if p["id"] == project_id), None)
        if not proj:
            return {"status": "error", "message": "找不到該專案"}
            
        files = proj.get("files", [])
        if not files:
            return {"status": "error", "message": "專案尚無檔案"}
            
        last_file = files[-1]
        data = last_file.get("data", {})
        rows = data.get("rows", [])
        
        updated_count = 0
        parts = req.new_category_path.split(" > ")
        short_path = " > ".join(parts[:req.classification_depth])
        
        for idx in req.row_indices:
            if 0 <= idx < len(rows):
                row = rows[idx]
                row["is_manual_category"] = True
                
                # 基於要求的邏輯：如果同時加入關鍵字，則把每個項目的描述作為子項目名稱
                item_description = row.get("description", "未命名項目")
                current_item_path = req.new_category_path
                
                if req.add_keyword:
                    # 建立品項子分類
                    current_item_path = f"{req.new_category_path} > {item_description}"
                    if req.keyword:
                        category_service.add_keyword_to_path(current_item_path, req.keyword)
                    else:
                        category_service.add_keyword_to_path(current_item_path)
                else:
                    # 不加入關鍵字，則純粹歸類到父分類
                    category_service.add_keyword_to_path(current_item_path)

                row["manual_raw_category"] = current_item_path
                row["system_category"] = " > ".join(current_item_path.split(" > ")[:req.classification_depth])
                updated_count += 1

        # 清除快取，觸發重新量分析
        category_service._categories_cache = None
        category_service._name_lookup_cache = None
        category_service._keyword_entries_cache = None
        category_service._classify_cache = {}
        
        analysis = category_service.analyze_project_data(rows, max_depth=req.classification_depth)
        
        data["analysis"] = analysis
        data["rows"] = rows
        project_service.save_projects(projects)
        
        return {"status": "success", "updated_count": updated_count, "data": data}
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"status": "error", "message": f"後端錯誤: {str(e)}"}


@app.post("/projects/{project_id}/manual_classify")
def manual_classify(project_id: str, req: ManualClassifyRequest):
    """手動強制分類單一項目，可選是否加入關鍵字學習"""
    try:
        projects = project_service.load_projects()
        proj = next((p for p in projects if p["id"] == project_id), None)
        if not proj:
            return {"status": "error", "message": "找不到該專案"}
            
        files = proj.get("files", [])
        if not files:
            return {"status": "error", "message": "專案尚無檔案"}
            
        last_file = files[-1]
        data = last_file.get("data", {})
        rows = data.get("rows", [])
        
        if req.row_index >= len(rows) or req.row_index < 0:
            return {"status": "error", "message": "無效的索引"}
            
        row = rows[req.row_index]
        row["is_manual_category"] = True
        row["manual_raw_category"] = req.new_category_path
        
        parts = req.new_category_path.split(" > ")
        row["system_category"] = " > ".join(parts[:req.classification_depth])

        # 如果有勾選學習且提供品項名稱，則建立品項子分類
        final_path = req.new_category_path
        if req.add_keyword and req.item_name:
            final_path = f"{req.new_category_path} > {req.item_name}"
            # 更新項目的顯示路徑為包含品項名稱的路徑（或維持原層級，取決於顯示需求，這裡選擇更新）
            # row["system_category"] = final_path 

        if req.add_keyword and req.keyword:
            category_service.add_keyword_to_path(final_path, req.keyword)
        else:
            category_service.add_keyword_to_path(final_path)

        category_service._categories_cache = None
        category_service._name_lookup_cache = None
        category_service._keyword_entries_cache = None
        category_service._classify_cache = {}
        
        analysis = category_service.analyze_project_data(rows, max_depth=req.classification_depth)
        
        data["analysis"] = analysis
        data["rows"] = rows
        
        # 7. 永久儲存回 json
        project_service.save_projects(projects)
        
        return {"status": "success", "data": data}
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"status": "error", "message": f"後端錯誤: {str(e)}"}


# === 標單上傳 API ===

@app.post("/projects/{project_id}/upload")
async def upload_to_project(project_id: str, file: UploadFile = File(...)):
    """上傳標單至指定專案並自動儲存解析結果"""
    contents = await file.read()
    try:
        result = ExcelParser.parse_excel(contents)

        # 讀取該專案設定的分類深度
        proj = project_service.get_project(project_id)
        depth = proj.get("classification_depth", 3) if proj else 3

        # 依深度進行機電系統分類分析
        analysis = category_service.analyze_project_data(result["rows"], max_depth=depth)
        result["analysis"] = analysis

        # 診斷日誌
        print(f">>> [UPLOAD] Project: {project_id}, File: {file.filename}")
        print(f">>> [UPLOAD] Rows: {len(result.get('rows', []))}")

        success = project_service.add_file_to_project(project_id, file.filename, result)
        print(f">>> [UPLOAD] Save Success: {success}")

        return {"fileName": file.filename, "status": "success", "data": result}
    except Exception as e:
        import traceback
        print(f">>> [UPLOAD] Critical Error: {str(e)}")
        print(traceback.format_exc())
        return {"status": "error", "message": str(e)}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """獨立上傳（不綁定專案，向後相容）"""
    contents = await file.read()
    try:
        result = ExcelParser.parse_excel(contents)
        return {
            "fileName": file.filename,
            "status": "success",
            "data": result
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/debug/paths")
def debug_paths():
    from services.category_service import CATEGORIES_FILE, _categories_cache, _classify_cache
    import os
    return {
        "cwd": os.getcwd(),
        "categories_file": CATEGORIES_FILE,
        "abs_categories_file": os.path.abspath(CATEGORIES_FILE),
        "exists": os.path.exists(CATEGORIES_FILE),
        "cache_is_none": _categories_cache is None,
        "first_few_keys": list(_categories_cache.keys())[:5] if _categories_cache else [],
        "classify_cache_size": len(_classify_cache)
    }
@app.get("/projects/{project_id}/export")
def export_project_excel(project_id: str, version_idx: int = -1):
    """將專案內容匯出為 Excel 檔案，並將分類拆解為層級欄位 (LV.1, LV.2, LV.3)"""
    proj = project_service.get_project(project_id)
    if not proj or not proj.get("files"):
        return {"status": "error", "message": "找不到專案或尚未上傳標單"}
    
    # 決定要匯出的版本
    files = proj["files"]
    if version_idx == -1:
        version_idx = len(files) - 1
    
    if not (0 <= version_idx < len(files)):
        return {"status": "error", "message": f"無效的版本索引: {version_idx}"}
    
    target_file = files[version_idx]
    file_data = target_file.get("data", {})
    rows = file_data.get("rows", [])
    mapping = file_data.get("mapping", {})
    depth = proj.get("classification_depth", 3)
    
    if not rows:
        return {"status": "error", "message": "該版本無資料可匯出"}
    
    # 重新執行分析以確保最新分類結果以 rows 為準
    category_service.analyze_project_data(rows, max_depth=depth)
    
    # 決定要建立多少個層級欄位（至少 3 層，或根據專案設定更高）
    max_lv = max(3, depth)
    
    export_data = []
    for r in rows:
        new_row = {}
        # 1. 填入原始欄位 (依 mapping)
        for internal_key, chinese_name in mapping.items():
            new_row[chinese_name] = r.get(internal_key, "")
        
        # 2. 處理層級分類結果
        final_path = r.get("manual_raw_category") or r.get("system_category") or "未分類"
        path_parts = [p.strip() for p in final_path.split(" > ") if p.strip()]
        
        # 建立 LV.1 ~ LV.max_lv 欄位
        for i in range(1, max_lv + 1):
            col_name = f"LV.{i}"
            if i <= len(path_parts):
                new_row[col_name] = path_parts[i-1]
            else:
                new_row[col_name] = ""
                
        export_data.append(new_row)
        
    df_export = pd.DataFrame(export_data)
    
    # 將 DataFrame 寫入記憶體
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df_export.to_excel(writer, index=False, sheet_name="成本控制分析")
    
    output.seek(0)
    
    filename = f"{proj['name']}_V{version_idx+1}_分級分析.xlsx"
    from urllib.parse import quote
    encoded_filename = quote(filename)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
        }
    )


if __name__ == "__main__":
    # 強制指定運行於 8002 埠，並開啟熱重載以套用後續修正
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)