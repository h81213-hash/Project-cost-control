import re
import json
import os
from typing import List, Dict, Any, Optional

# 定義路徑
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
CATEGORIES_FILE = os.path.join(DATA_DIR, "categories.json")

# 全域快取
_categories_cache = None
_name_lookup_cache = None    # normalized_name -> entry
_keyword_entries_cache = None  # list of (normalized_kw, entry)
_classify_cache = {}          # (description, depth) -> category_path
_regex_lookup_cache = None    # list of (compiled_regex, entry)
_regex_keyword_cache = None   # list of (compiled_regex, entry)


def load_categories() -> Dict:
    """從 JSON 載入多層分類樹，具備快取機制"""
    global _categories_cache
    if _categories_cache is not None:
        return _categories_cache

    abs_path = os.path.abspath(CATEGORIES_FILE)
    if os.path.exists(abs_path):
        try:
            with open(abs_path, "r", encoding="utf-8") as f:
                _categories_cache = json.load(f)
                return _categories_cache
        except Exception as e:
            print(f"[Error] Failed to load categories from {abs_path}: {e}")
    else:
        print(f"[Warning] Categories file not found at: {abs_path}")
    return {}


def save_categories(categories: Dict):
    """儲存多層分類樹到 JSON 並清除快取"""
    global _categories_cache, _name_lookup_cache, _keyword_entries_cache, _classify_cache
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    with open(CATEGORIES_FILE, "w", encoding="utf-8") as f:
        json.dump(categories, f, indent=4, ensure_ascii=False)
    _categories_cache = categories
    _name_lookup_cache = None
    _keyword_entries_cache = None
    _regex_lookup_cache = None
    _regex_keyword_cache = None
    _classify_cache = {}  # 重要：清除描述快取，以便應用新的關鍵字


def normalize_text(text: str) -> str:
    """移除空白與特殊符號，方便模糊匹配"""
    if not text:
        return ""
    return re.sub(r"[\s\(\)（）\-\"\'\\/,，、。]", "", str(text)).strip().lower()


def _build_lookup_tables():
    """
    一次性建立兩個查詢表:
    1. name_lookup: { normalized_name: entry } — 用於名稱精確匹配 (O(1))
    2. keyword_entries: [ (norm_kw, entry) ] — 用於關鍵字匹配
    3. regex_lookup: [ (compiled_regex, entry) ] — 用於效能優化的名稱匹配
    4. regex_keyword: [ (compiled_regex, entry) ] — 用於效能優化的關鍵字匹配

    每個 entry = { name, path_parts, depth }
    """
    global _name_lookup_cache, _keyword_entries_cache, _regex_lookup_cache, _regex_keyword_cache
    if _name_lookup_cache is not None:
        return

    categories = load_categories()
    name_lookup = {}
    keyword_entries = []
    regex_lookup = []
    regex_keyword = []

    def _traverse(node: Dict, path_parts: List[str]):
        children = node.get("children", {})
        for child_name, child_node in children.items():
            child_path = path_parts + [child_name]
            norm = normalize_text(child_name)
            entry = {
                "name": child_name,
                "path_parts": child_path,
                "depth": len(child_path),
            }
            # 名稱索引 — 若有重複，保留最深的
            if norm and len(norm) >= 2:
                if norm not in name_lookup or entry["depth"] > name_lookup[norm]["depth"]:
                    name_lookup[norm] = entry
                
                try:
                    # 建立正規表示式，支援更彈性的匹配
                    pattern = re.compile(re.escape(norm))
                    regex_lookup.append((pattern, entry))
                except: pass

            # 關鍵字索引
            for kw in child_node.get("keywords", []):
                nkw = normalize_text(kw)
                if nkw and len(nkw) >= 2:
                    keyword_entries.append((nkw, entry))
                    try:
                        pattern = re.compile(re.escape(nkw))
                        regex_keyword.append((pattern, entry))
                    except: pass

            _traverse(child_node, child_path)

    for top_name, top_node in categories.items():
        top_path = [top_name]
        norm = normalize_text(top_name)
        entry = {
            "name": top_name,
            "path_parts": top_path,
            "depth": 1,
        }
        if norm and len(norm) >= 2:
            if norm not in name_lookup:
                name_lookup[norm] = entry
            try:
                pattern = re.compile(re.escape(norm))
                regex_lookup.append((pattern, entry))
            except: pass

        for kw in top_node.get("keywords", []):
            nkw = normalize_text(kw)
            if nkw and len(nkw) >= 2:
                keyword_entries.append((nkw, entry))
                try:
                    pattern = re.compile(re.escape(nkw))
                    regex_keyword.append((pattern, entry))
                except: pass

        _traverse(top_node, top_path)

    _name_lookup_cache = name_lookup
    _keyword_entries_cache = keyword_entries
    # 預先依照深度排序，深度深的（越精確）優先匹配
    _regex_lookup_cache = sorted(regex_lookup, key=lambda x: x[1]["depth"], reverse=True)
    _regex_keyword_cache = regex_keyword


def clean_text(text: str) -> str:
    """清理標單項目描述中的項目符號 (如: 壹、1. (1))"""
    if not text:
        return ""
    text = re.sub(r"^[0-9一二三四五六七八九十壹貳參肆伍陸柒捌玖拾、\.\(\)\s]+", "", text)
    return text.strip()


def classify_row(description: str, max_depth: int = 2) -> str:
    """根據項目名稱自動判定所屬的系統類別，具備快取機制"""
    if not description:
        return "未分類"

    global _classify_cache
    cache_key = (description, max_depth)
    if cache_key in _classify_cache:
        return _classify_cache[cache_key]

    _build_lookup_tables()
    raw_desc = str(description)
    cleaned = clean_text(raw_desc)
    norm_desc = normalize_text(raw_desc)
    norm_cleaned = normalize_text(cleaned)

    # --- 策略 1: 精確匹配（正規化後完全相同）---
    res = None
    if norm_cleaned and norm_cleaned in _name_lookup_cache:
        entry = _name_lookup_cache[norm_cleaned]
        res = " > ".join(entry["path_parts"][:max_depth])
    elif norm_desc and norm_desc in _name_lookup_cache:
        entry = _name_lookup_cache[norm_desc]
        res = " > ".join(entry["path_parts"][:max_depth])

    if res:
        _classify_cache[cache_key] = res
        return res

    # --- 策略 2: 名稱子字串匹配 (使用 Pre-compiled Regex 優化) ---
    for pattern, entry in _regex_lookup_cache:
        if pattern.search(norm_cleaned) or pattern.search(norm_desc):
            res = " > ".join(entry["path_parts"][:max_depth])
            _classify_cache[cache_key] = res
            return res

    # --- 策略 3: 關鍵字匹配 (使用 Pre-compiled Regex 優化) ---
    kw_scores: Dict[str, tuple] = {}
    for pattern, entry in _regex_keyword_cache:
        if pattern.search(norm_cleaned) or pattern.search(norm_desc):
            key = " > ".join(entry["path_parts"])
            if key in kw_scores:
                count, e = kw_scores[key]
                kw_scores[key] = (count + 1, e)
            else:
                kw_scores[key] = (1, entry)

    res = "未分類"
    if kw_scores:
        # 取匹配關鍵字最多的
        best_key = max(kw_scores, key=lambda k: kw_scores[k][0])
        _, best_entry = kw_scores[best_key]
        res = " > ".join(best_entry["path_parts"][:max_depth])

    _classify_cache[cache_key] = res
    return res


def _collect_all_paths(node: Dict, current_path: str) -> List[str]:
    """收集樹中所有分類路徑"""
    paths = [current_path] if current_path else []
    for child_name, child_node in node.get("children", {}).items():
        path = f"{current_path} > {child_name}" if current_path else child_name
        paths.extend(_collect_all_paths(child_node, path))
    return paths


def analyze_project_data(rows: List[Dict[str, Any]], max_depth: int = 2, new_keyword: Optional[str] = None) -> Dict[str, Any]:
    """
    分析整個標單的系統分布與成本加總。
    若提供 new_keyword，則僅對受影響的項目（未分類或包含關鍵字者）進行重新掃描 (增量更新)。
    """
    import time
    start_time = time.time()
    
    summary = {
        "total_cost": 0,
        "classification_depth": max_depth,
        "systems": {}
    }

    summary["systems"]["未分類"] = {"count": 0, "total": 0}
    
    # 識別是否為增量更新
    is_incremental = new_keyword is not None
    norm_new_keyword = normalize_text(new_keyword) if new_keyword else None

    for row in rows:
        if row.get("should_hide"):
            continue

        description = str(row.get("description", ""))
        total_price = row.get("total_price", 0)
        try:
            total_price = float(str(total_price).replace(",", ""))
        except:
            total_price = 0

        # 確認是否需要重新分類
        needs_reclassify = False
        if not is_incremental:
            # 全量更新模式：非手動分類者皆需重掃
            if not row.get("is_manual_category"):
                needs_reclassify = True
        else:
            # 增量更新模式：僅對未分類或命中新關鍵字者重掃
            current_cat = row.get("system_category", "未分類")
            if current_cat == "未分類":
                needs_reclassify = True
            elif norm_new_keyword and norm_new_keyword in normalize_text(description):
                # 只有當項目不是手動強制分類時，才給予自動重新判定的機會
                if not row.get("is_manual_category"):
                    needs_reclassify = True

        # 核心優化：若沒單位也沒數量，標註為無類別 (標題/合計)
        unit = str(row.get("unit") or "").strip()
        quantity = row.get("quantity")
        is_empty_record = not unit and (quantity is None or str(quantity).strip() == "")
        
        if row.get("is_manual_category"):
            # 手動分類：尊重 manual_raw_category 並依當前深度截斷
            raw_path = row.get("manual_raw_category", row.get("system_category", "未分類"))
            parts = raw_path.split(" > ")
            full_path = " > ".join(parts[:max_depth])
            row["system_category"] = full_path
        elif is_empty_record:
            full_path = "未分類"
            row["system_category"] = full_path
        elif needs_reclassify:
            full_path = classify_row(description, max_depth=max_depth)
            row["system_category"] = full_path
        else:
            # 維持現狀
            cat = row.get("system_category", "未分類")
            parts = cat.split(" > ")
            full_path = " > ".join(parts[:max_depth])
            row["system_category"] = full_path

        if full_path not in summary["systems"]:
            summary["systems"][full_path] = {"count": 0, "total": 0}

        summary["systems"][full_path]["count"] += 1
        summary["systems"][full_path]["total"] += total_price
        summary["total_cost"] += total_price

    # 計算百分比
    for system in summary["systems"].values():
        if summary["total_cost"] > 0:
            system["percentage"] = round(system["total"] / summary["total_cost"] * 100, 1)
        else:
            system["percentage"] = 0

    print(f"[Analyze] Duration: {time.time() - start_time:.3f}s, rows={len(rows)}, incremental={is_incremental}")
    return summary


def add_keyword_to_path(path: str, keyword: Optional[str] = None) -> bool:
    """
    確保指定分類路徑存在（若不存在則遞迴建立），
    若有提供 keyword 則加入到該節點。
    """
    print(f"[CategoryService] add_keyword_to_path: path='{path}', keyword='{keyword}'")
    tree = load_categories()
    parts = path.split(" > ")
    
    # 遍歷尋找或建立節點
    current = tree
    for i, part in enumerate(parts):
        part = part.strip()
        if not part: continue
        
        if part not in current:
            print(f"[CategoryService] 建立新節點: '{part}' 在層級 {i}")
            current[part] = {"keywords": [], "children": {}}
        
        node = current[part]
        if i == len(parts) - 1:
            # 找到了目標節點
            if keyword:
                keyword_clean = keyword.replace(" ", "").strip()
                if keyword_clean and keyword_clean not in node.get("keywords", []):
                    node.setdefault("keywords", []).append(keyword_clean)
                    print(f"[CategoryService] 加入關鍵字 '{keyword_clean}' 到 '{part}'")
            save_categories(tree)
            return True
        
        # 準備進入下一層，確保 children 存在
        if "children" not in node:
            node["children"] = {}
        current = node["children"]
        
    return False


def build_analysis_from_categories(rows: List[Dict[str, Any]], max_depth: int = 2) -> Dict[str, Any]:
    """
    從現有的 system_category 欄位快速重新建立分析摘要，
    而不重新執行 classify_row (關鍵字比對)。
    這在手動修改單一類別且不增加關鍵字時非常快速。
    """
    summary = {
        "total_cost": 0,
        "classification_depth": max_depth,
        "systems": {"未分類": {"count": 0, "total": 0}}
    }
    
    for row in rows:
        if row.get("should_hide"):
            continue

        total_price = row.get("total_price", 0)
        try:
            total_price = float(str(total_price).replace(",", ""))
        except:
            total_price = 0

        cat = row.get("system_category")
        if not cat:
            description = str(row.get("description", ""))
            cat = classify_row(description, max_depth=max_depth)
            row["system_category"] = cat
        
        # 依照目前選定的深度截斷顯示
        parts = cat.split(" > ")
        full_path = " > ".join(parts[:max_depth])
        
        if full_path not in summary["systems"]:
            summary["systems"][full_path] = {"count": 0, "total": 0}

        summary["systems"][full_path]["count"] += 1
        summary["systems"][full_path]["total"] += total_price
        summary["total_cost"] += total_price

    # 計算百分比
    for system in summary["systems"].values():
        if summary["total_cost"] > 0:
            system["percentage"] = round(system["total"] / summary["total_cost"] * 100, 1)
        else:
            system["percentage"] = 0

    return summary
