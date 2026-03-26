from typing import List, Dict, Any, Optional
from services import project_service
import json

def get_report_data(project_id: str, depth: int = 1) -> Dict[str, Any]:
    """生成報表數據：依深度聚合廠商報價與內部成本 (支援 JSON/DB 模式)"""
    project = project_service.get_project(project_id)
    if not project:
        return {"status": "error", "message": "專案不存在"}

    # 獲取最新檔案的數據
    files = project.get("files", [])
    if not files:
        return {
            "project_name": project.get("name", ""),
            "floor_area": project.get("floor_area", ""),
            "categories": [],
            "summary": {}
        }
    
    # 找出最後一個上傳的檔案
    latest_file = max(files, key=lambda x: x.get("uploaded_at") or "")
    rows = latest_file.get("data", {}).get("rows", [])
    
    # 報表設定
    config = project.get("report_config") or {}
    cat_configs = config.get("categories", {})
    summary_config = config.get("summary", {})
    
    # 依選擇深度進行聚合
    aggregated = {}
    for row in rows:
        sys_cat = row.get("system_category", "未分類")
        parts = sys_cat.split(" > ")
        display_path = " > ".join(parts[:depth]) if parts else "未分類"
        
        # 檢查此分類是否被使用者隱藏
        if cat_configs.get(display_path, {}).get("hidden"):
            continue
            
        if display_path not in aggregated:
            aggregated[display_path] = {
                "name": display_path.split(" > ")[-1],
                "path": display_path,
                "supplier_total": 0,
                "internal_total": 0,
                "count": 0
            }
        
        # 廠商總報價
        supplier_price = float(row.get("total_price", 0) or 0)
        
        # 內部成本 (優先採用項目級別的 internal_cost)
        internal_cost = float(row.get("internal_cost", 0) or 0)
        if internal_cost == 0:
            # 向後相容：如果項目沒有 internal_cost，則維持原價 (或根據舊分類折數估算，但此需求已指定取消分類折數)
            internal_cost = supplier_price
            
        aggregated[display_path]["supplier_total"] += supplier_price
        aggregated[display_path]["internal_total"] += internal_cost
        aggregated[display_path]["count"] += 1

    # 算出總供應商報價以計算比例
    total_supplier_calc = sum(item["supplier_total"] for item in aggregated.values())
    
    # 整理為清單
    report_categories = []
    for path, item in aggregated.items():
        ratio = (item["supplier_total"] / total_supplier_calc * 100) if total_supplier_calc > 0 else 0
        
        report_categories.append({
            "name": item["name"],
            "path": item["path"],
            "supplier_total": round(item["supplier_total"]),
            "internal_total": round(item["internal_total"]),
            "supplier_ratio": ratio,
            "remark": cat_configs.get(path, {}).get("remark", ""),
            # discount 欄位已棄用，但在前端或舊邏輯切換時可能仍需要預設值
            "discount": cat_configs.get(path, {}).get("discount", 1.0)
        })

    # 合計數據處理
    direct_supplier = sum(cat["supplier_total"] for cat in report_categories)
    direct_internal = sum(cat["internal_total"] for cat in report_categories)
    
    profit_rate = summary_config.get("profit_rate", 0.18)
    tax_rate = summary_config.get("tax_rate", 0.05)
    
    indirect_supplier = direct_supplier * profit_rate
    indirect_internal = direct_internal * (profit_rate * 0.5) # 假設內部管理費僅佔一半 (此為範例邏輯)
    
    subtotal_supplier = direct_supplier + indirect_supplier
    subtotal_internal = direct_internal + indirect_internal
    
    tax_supplier = subtotal_supplier * tax_rate
    total_supplier = subtotal_supplier + tax_supplier
    total_internal = subtotal_internal # 內部成本通常不含對外營業稅
    
    return {
        "status": "success",
        "project_name": project.get("name"),
        "floor_area": project.get("floor_area"),
        "categories": report_categories,
        "summary": {
            "direct_supplier": round(direct_supplier),
            "direct_internal": round(direct_internal),
            "profit_rate": profit_rate,
            "indirect_supplier": round(indirect_supplier),
            "indirect_internal": round(indirect_internal),
            "tax_rate": tax_rate,
            "tax_supplier": round(tax_supplier),
            "total_supplier": round(total_supplier),
            "total_internal": round(total_internal)
        },
        "config": config
    }

def update_report_config(project_id: str, new_config: Dict[str, Any]) -> bool:
    """更新專案的報表設定與樓地板面積 (支援 JSON/DB 模式)"""
    project = project_service.get_project(project_id)
    if not project:
        return False
        
    settings_to_update = {}
    
    # 處理 floor_area
    if "floor_area" in new_config:
        settings_to_update["floor_area"] = str(new_config.get("floor_area", ""))
        
    # 處理其餘設定到 report_config
    old_report_config = project.get("report_config") or {}
    
    # 支援部分更新 (Merge)
    if "categories" in new_config:
        if "categories" not in old_report_config: 
            old_report_config["categories"] = {}
        old_report_config["categories"].update(new_config["categories"])
        
    if "summary" in new_config:
        if "summary" not in old_report_config: 
            old_report_config["summary"] = { "profit_rate": 0.18, "tax_rate": 0.05 }
        old_report_config["summary"].update(new_config["summary"])
        
    settings_to_update["report_config"] = old_report_config
    
    # 利用 project_service 的通用更新機制
    result = project_service.update_project_settings(project_id, settings_to_update)
    return result is not None
