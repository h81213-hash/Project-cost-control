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
        
        for _, row in data_df.iterrows():
            item = {}
            for col_idx, key in column_mapping.items():
                val = row[col_idx]
                item[key] = val if pd.notna(val) else ""
            
            # --- 採購人員專用判斷邏輯 ---
            # 規則：
            #   1. 先看左側是否有「項次」(壹、一、1、(1)、(01) 等)
            #   2. 有項次 → 一律保留 (不管是分類標題還是品項)
            #   3. 沒有項次 → 再看右側是否有「單位」和「數量」
            #   4. 沒有項次 且 沒有單位/數量 → 標記為建議隱藏
            
            item_no_str = str(item.get("item_no", "")).strip()
            has_item_no = bool(item_no_str) and item_no_str != ""
            
            has_unit = bool(str(item.get("unit", "")).strip())
            has_qty = bool(str(item.get("quantity", "")).strip())
            
            # 完全空白列
            is_empty = not any(
                str(v).strip() for k, v in item.items() 
                if k not in ["is_invalid", "should_hide"]
            )
            
            if is_empty:
                item["is_invalid"] = True
            elif has_item_no:
                # 有項次的行一律保留
                item["is_invalid"] = False
            elif not has_unit and not has_qty:
                # 沒有項次 + 沒有單位 + 沒有數量 → 判定為說明行
                item["is_invalid"] = True
            else:
                item["is_invalid"] = False
            
            # 預設建議隱藏
            item["should_hide"] = item["is_invalid"]
            
            # 只有在不是完全空的列時才加入
            if not is_empty or any(str(v).strip() for v in item.values() if isinstance(v, str)):
                standardized_data.append(item)

        return {
            "header_row": header_idx,
            "mapping": {val: raw_headers[idx] for idx, val in column_mapping.items()},
            "rows": standardized_data
        }
