import json
import os

projects_path = r'c:\Users\wanlin\projects\專案成本控制器\backend\data\projects.json'

if os.path.exists(projects_path):
    with open(projects_path, 'r', encoding='utf-8') as f:
        projects = json.load(f)
    
    for p in projects:
        if p['id'] == '5433baac' or p['name'] == '000':
            print(f"Project: {p['name']} ({p['id']})")
            for i, f in enumerate(p.get('files', [])):
                if i == 0: # Version 1
                    data = f.get('data', {})
                    print(f"    Version {i+1}: {f['file_name']}")
                    print(f"    Header Row: {data.get('header_row')}")
                    print(f"    Mapping: {data.get('mapping')}")
                    print(f"    Rows Count: {len(data.get('rows', []))}")
                    # Print mapping types
                    mapping = data.get('mapping', {})
                    print(f"    Mapping Keys: {list(mapping.keys())}")
else:
    print("projects.json not found")
