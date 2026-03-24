import re
import unicodedata
from typing import List, Dict, Any, Optional

def normalize_text(text: Any, preserve_decimal: bool = False, is_numeric: bool = False) -> str:
    """文字正規化：移除空格、統一全半形，並處理數值一致性"""
    if text is None or text == "":
        return ""
    
    # 如果是數字，先嘗試轉為標準浮點數格式避免 '8' != '8.0'
    if is_numeric:
        try:
            # 移除逗號
            clean_num = str(text).replace(',', '').strip()
            if not clean_num: return ""
            return "{:.4f}".format(float(clean_num)).rstrip('0').rstrip('.')
        except (ValueError, TypeError):
            pass

    s = str(text).strip()
    s = unicodedata.normalize('NFKC', s)
    s = re.sub(r'\s+', '', s)
    s = s.lower()
    if preserve_decimal:
        s = re.sub(r'[^a-z0-9.]', '', s)
    else:
        s = re.sub(r'[^\w]', '', s)
    return s

def create_item_fingerprint(row: Dict[str, Any]) -> str:
    """建立項目的唯一識別碼，主要依據：項目描述、單位"""
    desc = normalize_text(row.get("description", ""))
    unit = normalize_text(row.get("unit", ""))
    # 數量跟備註不納入身分識別，以便識別「數值變更」而不是視為不同項目
    
    # 如果品名跟單位都空，視為無效行
    if not desc and not unit:
        return f"invalid_{id(row)}"
        
    return f"{desc}|{unit}"

def compare_and_merge(old_rows: List[Dict[str, Any]], new_rows: List[Dict[str, Any]], max_depth: int = 2) -> Dict[str, Any]:
    """
    比對兩份標單版本：
    1. 識別 Added, Removed, Modified, Unchanged
    2. 繼承舊版的分類設定 (Category Inheritance)
    """
    # 改用清單儲存，以處理多個相同名稱項目的情況
    old_lookup: Dict[str, List[Dict[str, Any]]] = {}
    for r in old_rows:
        if r.get("is_invalid"): continue
        fp = create_item_fingerprint(r)
        if fp not in old_lookup:
            old_lookup[fp] = []
        old_lookup[fp].append(r)
    
    summary = {
        "added": 0,
        "removed": 0,
        "modified": 0,
        "unchanged": 0
    }
    
    merged_rows = []
    
    for row in new_rows:
        new_row = row.copy()
        if new_row.get("is_invalid"):
            merged_rows.append(new_row)
            continue
            
        fp = create_item_fingerprint(new_row)
        
        # 如果在舊版中有找到相同名稱的項目
        if fp in old_lookup and len(old_lookup[fp]) > 0:
            # 取出第一個匹配的（先進先出，維持順序穩定性）
            old_row = old_lookup[fp].pop(0)
            
            # 繼承分類 (CRITICAL)
            if old_row.get("is_manual_category"):
                new_row["is_manual_category"] = True
                new_row["manual_raw_category"] = old_row.get("manual_raw_category")
                new_row["system_category"] = old_row.get("system_category")
            else:
                new_row["system_category"] = old_row.get("system_category")

            # 判斷數值是否變更 (數量或單價)
            old_qty = str(old_row.get("quantity", "")).replace(",", "").strip()
            new_qty = str(new_row.get("quantity", "")).replace(",", "").strip()
            
            old_price = str(old_row.get("unit_price", "")).replace(",", "").strip()
            new_price = str(new_row.get("unit_price", "")).replace(",", "").strip()

            is_modified = (old_qty != new_qty) or (old_price != new_price)
            
            if is_modified:
                new_row["diff_status"] = "modified"
                new_row["old_values"] = {
                    "quantity": old_row.get("quantity"),
                    "unit_price": old_row.get("unit_price"),
                    "total_price": old_row.get("total_price")
                }
                summary["modified"] += 1
            else:
                new_row["diff_status"] = "unchanged"
                summary["unchanged"] += 1
        else:
            # 沒找到，視為新增
            new_row["diff_status"] = "added"
            summary["added"] += 1
            
        merged_rows.append(new_row)

    # 處理被刪除的項目 (所有剩在 lookup 裡的)
    removed_items = []
    for fp, items in old_lookup.items():
        for old_row in items:
            removed_row = old_row.copy()
            removed_row["diff_status"] = "removed"
            removed_items.append(removed_row)
            summary["removed"] += 1

    return {
        "summary": summary,
        "rows": merged_rows,
        "removed_rows": removed_items
    }
