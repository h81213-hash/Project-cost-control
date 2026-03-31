import pandas as pd
import io
from typing import List, Dict, Any, Optional
import re
import unicodedata

def normalize_text(text: Any) -> str:
    """極度強化的文字正規化：移除所有空格、標點，且全半形轉向統一"""
    if not text:
        return ""
    s = str(text).strip()
    s = unicodedata.normalize('NFKC', s)
    s = re.sub(r'\s+', '', s)
    s = s.lower()
    # 移除常見標點符號
    s = re.sub(r'[^\w]', '', s)
    return s

class ExcelParser:
    """
    智慧型 Excel 解析器，專門處理機電標單。
    具備自動標題定位與數據清理功能。
    """

    # 定義常用的標題關鍵字對應
    # 這裡的關鍵字建議也進行正規化處理
    HEADER_KEYWORDS = {
        "item_no": ["項次", "序號", "no", "item"],
        "description": ["項目", "內容", "品名", "名稱", "description", "itemname", "工程名稱", "材料名稱"],
        "specification": ["規格", "型號", "尺寸", "specification"],
        "unit": ["單位", "unit"],
        "quantity": ["數量", "數", "qty", "quantity"],
        "unit_price": ["單價", "price", "unitprice"],
        "total_price": ["總價", "金額", "小計", "total", "amount", "複價", "合價"],
        "note": ["備註", "說明", "note", "remark", "詳圖"]
    }

    @staticmethod
    def find_header_row(df: pd.DataFrame) -> int:
        """
        自動尋找標題列。
        透過計算每一列包含關鍵字的比例來判定。
        """
        max_matches = 0
        header_row_idx = 0
        
        # 掃描前 100 列即可
        for i in range(min(100, len(df))):
            row_values = [normalize_text(val) for val in df.iloc[i] if pd.notna(val)]
            match_count = 0
            
            for key, keywords in ExcelParser.HEADER_KEYWORDS.items():
                if any(any(k in val for k in keywords) for val in row_values):
                    match_count += 1
            
            if match_count > max_matches:
                max_matches = match_count
                header_row_idx = i
                
        return header_row_idx

    @staticmethod
    def parse_excel(file_content: bytes) -> Dict[str, Any]:
        """
        解析 Excel 並回傳標準化後的數據。
        """
        # 使用 openpyxl 引擎
        df_raw = pd.read_excel(io.BytesIO(file_content), header=None, engine='openpyxl')
        
        # 1. 尋找標題列
        header_idx = ExcelParser.find_header_row(df_raw)
        print(f"[ExcelParser] 判定標題列索引: {header_idx}")
        
        # 2. 抓取標題列並進行映射
        raw_headers = df_raw.iloc[header_idx].tolist()
        print(f"[ExcelParser] 標題列原始內容: {raw_headers}")
        column_mapping = {}
        
        for col_idx, raw_val in enumerate(raw_headers):
            if pd.isna(raw_val):
                continue
            
            clean_val = normalize_text(raw_val)
            for key, keywords in ExcelParser.HEADER_KEYWORDS.items():
                if any(k in clean_val for k in keywords):
                    column_mapping[col_idx] = key
                    break
        
        print(f"[ExcelParser] 欄位映射結果: {column_mapping}")
        
        # 3. 提取數據區塊 (標題列之後的所有數據)
        data_df = df_raw.iloc[header_idx + 1:].copy()
        
        standardized_data = []
        
        # NOTE: 機電標單項次格式多樣，需要用正則涵蓋常見格式
        # 例如：壹、貳、一、二、1、2、(1)、(01)、1.1 等
        item_no_pattern = re.compile(
            r'^[\s]*([\d]+\.?[\d]*|[\(（]\d+[\)）]|'  # 數字格式：1, 1.1, (1), (01)
            r'[壹貳參肆伍陸柒捌玖拾|'               # 中文大寫數字
            r'一二三四五六七八九十|'                   # 中文小寫數字
            r'[甲乙丙丁戊己庚辛壬癸])'               # 天干
            r'[\s]*$'
        )
        
    @staticmethod
    def get_item_weight(item_no: str) -> int:
        """根據項次符號判定層級強弱，權重越小越強 (0-50)"""
        if not item_no:
            return 50  # 無項次但為標題，權重最低
        
        s = str(item_no).strip()
        # 強度 10: 壹, 貳... A, B, C... I, II, III...
        if re.match(r'^[壹貳參肆伍陸柒捌玖拾]+$', s) or re.match(r'^[A-Z]$', s) or re.match(r'^[IVXLC]+$', s):
            return 10
        # 強度 20: 一, 二, 三... (壹), (貳)...
        if re.match(r'^[一二三四五六七八九十]+$', s) or re.match(r'^[（\(][壹貳參肆伍陸柒捌玖拾]+[）\)]$', s):
            return 20
        # 強度 30: 1, 2, 3... 1.1, 1.2...
        if re.match(r'^\d+(\.\d+)*$', s):
            return 30
        # 強度 40: (1), (01), i, ii, iii...
        if re.match(r'^[（\(]\d+[）\)]$', s) or re.match(r'^[ivxlc]+$', s):
            return 40
            
        return 50

    @staticmethod
    def apply_hierarchy_to_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        核心演算法：權重遞減堆疊 (Weighted Hierarchy Stack)
        讓系統能自動判斷誰是「章節大項」，誰是「分組標題」。
        """
        stack = [] # 格式: [{'weight': 10, 'text': '...'}]
        
        for row in rows:
            desc = str(row.get("description", "")).strip()
            item_no = str(row.get("item_no", "")).strip()
            qty = str(row.get("quantity", "")).strip()
            unit = str(row.get("unit", "")).strip()
            total = str(row.get("total_price", "")).strip()
            
            is_subtotal = any(k in desc for k in ["小計", "合計", "共計", "總計", "合價"])
            
            # 💡 關鍵判定：只要沒有數量 (且不是彙整列)，就視為階層標題更新的時機
            # 例：1 "TPC" PANEL 沒有數量，所以它是章節的一環。
            # 例：(01) 有數量，所以它不是章節，它會繼承之前的堆疊快照。
            is_header = not qty and not is_subtotal and (item_no or desc)
            
            if is_header:
                weight = ExcelParser.get_item_weight(item_no)
                clean_text = f"{item_no} {desc}".strip()
                
                if clean_text:
                    # 堆疊清理：彈出所有「同等或更弱」的層級
                    # (例如：新的 "二" 會彈掉舊的 "一"；新的 "1" 則會疊在 "一" 的下面)
                    while stack and stack[-1]['weight'] >= weight:
                        stack.pop()
                    
                    stack.append({'weight': weight, 'text': clean_text})
            
            # 賦予當前層級快照
            row["parent_section"] = " > ".join([s['text'] for s in stack])
            
        return rows

    @staticmethod
    def parse_excel(file_content: bytes) -> Dict[str, Any]:
        """
        解析 Excel 並回傳標準化後的數據。
        """
        # 使用 openpyxl 引擎
        df_raw = pd.read_excel(io.BytesIO(file_content), header=None, engine='openpyxl')
        
        # 1. 尋找標題列
        header_idx = ExcelParser.find_header_row(df_raw)
        print(f"[ExcelParser] 判定標題列索引: {header_idx}")
        
        # 2. 抓取標題列並進行映射
        raw_headers = df_raw.iloc[header_idx].tolist()
        column_mapping = {}
        
        for col_idx, raw_val in enumerate(raw_headers):
            if pd.isna(raw_val):
                continue
            
            clean_val = normalize_text(raw_val)
            for key, keywords in ExcelParser.HEADER_KEYWORDS.items():
                if any(k in clean_val for k in keywords):
                    column_mapping[col_idx] = key
                    break
        
        # 3. 提取數據區塊 (標題列之後的所有數據)
        data_df = df_raw.iloc[header_idx + 1:].copy()
        standardized_data = []
        
        for _, row in data_df.iterrows():
            item = {}
            for col_idx, key in column_mapping.items():
                val = row[col_idx]
                item[key] = val if pd.notna(val) else ""
            
            # 狀態檢查
            item_no_str = str(item.get("item_no", "")).strip()
            item_desc = str(item.get("description", "")).strip()
            has_item_no = bool(item_no_str)
            has_unit = bool(str(item.get("unit", "")).strip())
            has_qty = bool(str(item.get("quantity", "")).strip())
            
            # 完全空白列
            is_empty = not any(str(v).strip() for k, v in item.items() if k not in ["is_invalid", "should_hide"])
            
            if is_empty:
                item["is_invalid"] = True
            elif has_item_no:
                item["is_invalid"] = False
            elif not has_unit and not has_qty:
                item["is_invalid"] = True
            else:
                item["is_invalid"] = False
            
            item["should_hide"] = item["is_invalid"]
            
            if not is_empty or any(str(v).strip() for v in item.values() if isinstance(v, str)):
                standardized_data.append(item)

        # 4. 💡 執行階層同步 (Hierarchical Processing)
        # 這一步會幫所有 row 補上 parent_section 資訊
        standardized_data = ExcelParser.apply_hierarchy_to_rows(standardized_data)

        return {
            "header_row": header_idx,
            "mapping": {val: raw_headers[idx] for idx, val in column_mapping.items()},
            "rows": standardized_data
        }
