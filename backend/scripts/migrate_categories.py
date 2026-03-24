import sys
import os

# Add backend to path
sys.path.append(r'c:\Users\wanlin\projects\專案成本控制器\backend')

from services import project_service, category_service

def migrate():
    print("Starting migration v2...")
    # Clear caches
    category_service._categories_cache = None
    category_service._classify_cache = {}
    
    projects = project_service.load_projects()
    for proj in projects:
        print(f"Processing project: {proj.get('name')} ({proj.get('id')})")
        depth = proj.get("classification_depth", 3)
        for f in proj.get("files", []):
            data = f.get("data", {})
            rows = data.get("rows", [])
            if rows:
                print(f"  Re-analyzing file: {f.get('file_name')}")
                category_service.analyze_project_data(rows, max_depth=depth)
                data["analysis"] = category_service.analyze_project_data(rows, max_depth=depth)
                
                # Check for "無類別" counts
                no_cat_count = sum(1 for r in rows if r.get("system_category") == "無類別")
                print(f"    -> Done. Rows marked as '無類別': {no_cat_count}")
    
    project_service.save_projects(projects)
    print("Migration v2 complete!")

if __name__ == "__main__":
    migrate()
