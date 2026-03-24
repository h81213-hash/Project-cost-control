import json
import os

projects_path = r'c:\Users\wanlin\projects\專案成本控制器\backend\data\projects.json'

if os.path.exists(projects_path):
    with open(projects_path, 'r', encoding='utf-8') as f:
        projects = json.load(f)
    
    for p in projects:
        if p['id'] == '5433baac' or p['name'] == '000':
            print(f"Project: {p['name']} ({p['id']})")
            print(f"  File count: {len(p.get('files', []))}")
            for i, f in enumerate(p.get('files', [])):
                data = f.get('data', {})
                rows = data.get('rows', [])
                print(f"    {i+1}. {f['file_name']} - {f['uploaded_at']}")
                print(f"       Data keys: {list(data.keys())}")
                print(f"       Rows count: {len(rows)}")
                if len(rows) > 0:
                    print(f"       Sample row: {rows[0]}")
else:
    print("projects.json not found")
