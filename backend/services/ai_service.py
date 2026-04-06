import os
import json
import time
import warnings
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# 忽略 requests 套件的版本警告（urllib3 版本不匹配）
warnings.filterwarnings("ignore", category=Warning)

# 載入開發環境變數
load_dotenv()

class AIService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        # 使用 v1beta + gemini-2.5-flash（models_raw.json 確認此 API Key 下唯一可用模型）
        # gemini-1.5-flash / gemini-2.0-flash 均回傳 404（此 API Key 無法存取）
        self.model_name = "gemini-2.5-flash"
        self.api_version = "v1beta"



    def _get_api_url(self) -> str:
        return (
            f"https://generativelanguage.googleapis.com/"
            f"{self.api_version}/models/{self.model_name}:generateContent"
            f"?key={self.api_key}"
        )

    def get_flattened_categories(self, category_tree: Dict, max_depth: int = 2) -> List[str]:
        """
        將巢狀類別樹平坦化。
        """
        flattened = []
        def _traverse(node, path):
            if len(path) >= max_depth: return
            if not path:
                for n, ch in node.items(): flattened.append(n); _traverse(ch, [n])
            else:
                for n, ch in node.get("children", {}).items():
                    p = path + [n]; flattened.append(" > ".join(p)); _traverse(ch, p)
        _traverse(category_tree, []); return flattened

    def _call_gemini_api(self, system_prompt: str, user_prompt: str, max_retries: int = 3) -> Optional[str]:
        """
        【核心 API 呼叫層】使用 Python requests 直接呼叫 Gemini API。
        
        完全取代不穩定的 PowerShell Bridge：
        - PowerShell 的 Invoke-RestMethod 在 FastAPI 背景任務中會無限期掛起
        - Python requests 直接在同一進程中執行，穩定可靠
        - 內建 429 限流重試機制
        """
        import time
        try:
            import requests as req_lib
        except ImportError:
            print("[AI-Error] requests package not installed. Run: pip install requests")
            return None
            
        url = self._get_api_url()
        
        payload = {
            "contents": [{
                "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]
            }],
            "generationConfig": {
                "temperature": 0.1
                # 注意：responseMimeType 僅 v1beta 支援，v1 穩定版不可用
                # 改在 prompt 中明確要求純 JSON 格式
            }
        }
        
        print(f"[AI] Requesting Gemini {self.api_version}/{self.model_name}...")
        
        for attempt in range(max_retries):
            try:
                # 設定合理的 timeout：連線 10 秒，讀取 90 秒
                response = req_lib.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json; charset=utf-8"},
                    timeout=(10, 90)
                )
                
                if response.status_code == 429:
                    print(f"[AI-Warn] Rate limited (429). Waiting 60s before retry {attempt + 1}/{max_retries}...")
                    time.sleep(60)
                    continue
                
                if response.status_code != 200:
                    print(f"[AI-Error] HTTP {response.status_code}: {response.text[:500]}")
                    return None
                
                resp_data = response.json()
                
                # 提取生成的文字
                candidates = resp_data.get("candidates", [])
                if not candidates:
                    print(f"[AI-Error] No candidates in response: {resp_data}")
                    return None
                
                text = candidates[0]["content"]["parts"][0]["text"]
                print(f"[AI] Response received, length={len(text)}")
                return text
                
            except req_lib.exceptions.Timeout:
                print(f"[AI-Warn] Request timed out. Retrying {attempt + 1}/{max_retries}...")
                time.sleep(5)
            except req_lib.exceptions.ConnectionError as e:
                print(f"[AI-Warn] Connection error: {e}. Retrying {attempt + 1}/{max_retries}...")
                time.sleep(5)
            except Exception as e:
                print(f"[AI-Error] Unexpected error: {e}")
                return None
                
        print("[AI-Error] Max retries reached.")
        return None

    def batch_classify_items(self, items: List[Dict[str, Any]], category_list: List[str], manual_examples: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        使用 AI 進行批次分類 (引導式選擇邏輯)，支援 Few-shot learning
        """
        if not self.api_key:
            print("[AI-Error] GOOGLE_API_KEY not set")
            return {}

        import re
        def clean_desc(text) -> str:
            if not text: return ""
            # 去除多餘空白與換行，精簡字串
            return re.sub(r'\s+', ' ', str(text)).strip()

        examples_text = ""
        if manual_examples and len(manual_examples) > 0:
            examples_text = "\n[團隊過往判斷範本]\n" + "\n".join([f"- 項目: {clean_desc(ex['desc'])} ➔ {ex['category']}" for ex in manual_examples[:50]]) + "\n(請遵循上述範本的分類邏輯進行判斷)\n"

        # 注入專業營造估算專家角色，並強制限制分類範圍
        # 建立 LV.1 籃子真值表
        lv1_map = "1. 電氣及弱電設備工程\n2. 給排水設備工程\n3. 消防設備工程\n4. 空調及通風設備工程\n5. 衛生設備工程\n6. 雜項設備工程\n7. 公共空間設備\n8. 景觀工程\n9. 智慧建築設備\n10. 照明設備\n11. 未分類"

        system_prompt = f"""你是一位資深的建築機電預算估算專家。你的任務是將標單項目分類到指定的路徑。
[!!重要規則!!]
0. 【分類地圖】你必須像丟球進籃框一樣，找出並將項目分配到以下主分類系統中：
{lv1_map}
1. 僅能從下方的 [現有分類清單] 中挑選最精確的路徑。
2. 絕對不允許自行創造新的分類名稱。
3. 若項目完全不符合任何類別，請回傳 "未分類"。
4. 【輸出格式】只輸出純 JSON 陣列，不加任何說明文字、markdown 標記或程式碼區塊：
   [{{ "id": "123", "category": "大分類 > 小分類" }}]
5. 不得在 JSON 前後加上 ```json 或任何其他文字。
{examples_text}
[現有分類清單]
{json.dumps(category_list, ensure_ascii=False)}
"""
        # 極限 Payload 精簡：只傳送 ID 與清洗過的描述
        input_data = []
        for item in items:
            desc_cleaned = clean_desc(item.get("description"))
            if desc_cleaned:
                input_data.append({
                    "id": str(item.get("_original_index", "")),
                    "desc": desc_cleaned
                })

        user_prompt = f"請對以下項目進行分類辨識：\n{json.dumps(input_data, ensure_ascii=False)}"

        raw_text = self._call_gemini_api(system_prompt, user_prompt)
        if not raw_text: return {}

        try:
            # 清理 markdown 代碼塊格式
            clean_text = raw_text.replace("```json", "").replace("```", "").strip()
            raw_results = json.loads(clean_text)
            
            final_mapping = {}
            def _scan(o):
                if isinstance(o, dict):
                    rid = str(o.get("id") or o.get("idx") or "")
                    cat = o.get("category") or o.get("suggested_category")
                    if rid and cat: final_mapping[rid] = {"category": cat, "confidence": 0.9}
                    for _, v in o.items(): _scan(v)
                elif isinstance(o, list):
                    for i in o: _scan(i)
            
            _scan(raw_results)
            print(f"[AI] Successfully classified {len(final_mapping)} items.")
            return final_mapping
        except Exception as e:
            print(f"[AI-Parser Error] {e}")
            print(f"[AI-Parser] Raw text (first 500 chars): {raw_text[:500]}")
            return {}

# 全域單例
ai_service = AIService()
