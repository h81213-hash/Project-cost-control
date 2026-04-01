import json
import os
import sys

# Add current directory to path so we can import services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.category_service import load_categories
from services.ai_service import ai_service
from services.project_service import get_project

def diagnose(project_id):
    print(f"--- Diagnosing AI for Project: {project_id} ---")
    
    # 1. Check Categories
    cat_tree = load_categories()
    print(f"Category Tree loaded. Keys: {list(cat_tree.keys())}")
    
    cat_list = ai_service.get_flattened_categories(cat_tree, max_depth=2)
    print(f"Flattened Categories (depth=2): {len(cat_list)} items found.")
    if not cat_list:
        print("ERROR: Category list is empty!")
        return

    # 2. Check Project Data
    proj = get_project(project_id, include_all_rows=True)
    if not proj:
        print("ERROR: Project not found!")
        return
        
    rows = proj.get("files", [None])[-1].get("data", {}).get("rows", [])
    print(f"Project has {len(rows)} rows.")
    
    unclassified = [r for r in rows if r.get("system_category") == "未分類"]
    print(f"Unclassified rows: {len(unclassified)}")
    
    if not unclassified:
        print("No unclassified rows to test.")
        return

    # 3. Test AI with a small batch
    test_batch = unclassified[:5]
    print(f"Testing AI with 5 items...")
    results = ai_service.batch_classify_items(test_batch, cat_list)
    print(f"AI Results: {json.dumps(results, indent=2, ensure_ascii=False)}")
    
    if not results:
        print("ERROR: AI returned no results!")
    else:
        success = any(v['category'] != '未分類' for v in results.values())
        if not success:
            print("WARNING: AI returned '未分類' for all test items.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python diagnose_ai.py <project_id>")
    else:
        diagnose(sys.argv[1])
