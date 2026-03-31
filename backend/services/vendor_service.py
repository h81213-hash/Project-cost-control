import os
import json
import uuid
from typing import List, Dict, Any, Optional
import re

# 模型定義與路徑
STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
VENDORS_FILE = os.path.join(STORAGE_DIR, "vendors.json")

def ensure_storage():
    """確保資料存放目錄存在"""
    if not os.path.exists(STORAGE_DIR):
        os.makedirs(STORAGE_DIR)
    if not os.path.exists(VENDORS_FILE):
        with open(VENDORS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)

def load_vendors() -> List[Dict[str, Any]]:
    """載入所有供應商數據"""
    ensure_storage()
    try:
        with open(VENDORS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def save_vendors(vendors: List[Dict[str, Any]]):
    """儲存供應商數據"""
    ensure_storage()
    with open(VENDORS_FILE, 'w', encoding='utf-8') as f:
        json.dump(vendors, f, ensure_ascii=False, indent=2)

def add_vendor(name: str, contact: str = "", phone: str = "", fax: str = "", email: str = "", tags: List[str] = None) -> Dict[str, Any]:
    """新增供應商"""
    vendors = load_vendors()
    new_vendor = {
        "id": str(uuid.uuid4())[:8],
        "name": name,
        "contact": contact,
        "phone": phone,
        "fax": fax,
        "email": email,
        "tags": tags or [],
        "created_at": "2024-03-30T00:00:00" # TODO: Use real date
    }
    vendors.append(new_vendor)
    save_vendors(vendors)
    return new_vendor

def update_vendor(vendor_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """更新供應商"""
    vendors = load_vendors()
    for v in vendors:
        if v["id"] == vendor_id:
            for key, val in updates.items():
                v[key] = val
            save_vendors(vendors)
            return v
    return None

def delete_vendor(vendor_id: str) -> bool:
    """刪除供應商"""
    vendors = load_vendors()
    filtered = [v for v in vendors if v["id"] != vendor_id]
    if len(filtered) == len(vendors):
        return False
    save_vendors(filtered)
    return True

def match_vendors(description: str = "", note: str = "", category: str = "") -> List[Dict[str, Any]]:
    """
    核心權重搜尋邏輯 (Weighted Search)
    1. Weight 100: Manual (暫不實作，需連動專案數據)
    2. Weight 80 (Note Match): 備註中出現廠商經營的標籤 (品牌)
    3. Weight 60 (Desc Match): 名稱中出現關鍵字
    4. Weight 40 (Category Match): 分類吻合
    """
    all_vendors = load_vendors()
    scored_vendors = []
    
    desc_norm = description.lower()
    note_norm = note.lower()
    cat_norm = category.lower()
    
    for v in all_vendors:
        score = 0
        tags = [t.lower() for t in v.get("tags", [])]
        
        # 標籤與備註匹配 (Weight 80)
        for tag in tags:
            if tag and tag in note_norm:
                score += 80
                break # 只要中一個就加分
                
        # 標籤與名稱匹配 (Weight 60)
        for tag in tags:
            if tag and tag in desc_norm:
                score += 60
                break
                
        # 標籤與分類匹配 (Weight 40)
        for tag in tags:
            if tag and (tag in cat_norm or cat_norm in tag):
                score += 40
                break
                
        if score > 0:
            final_score = min(score, 100)
            scored_vendors.append({**v, "match_score": final_score})
            
    # 按分數由高到低排序
    return sorted(scored_vendors, key=lambda x: x["match_score"], reverse=True)
