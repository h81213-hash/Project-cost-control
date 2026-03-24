import json
import os

projects_path = r'c:\Users\wanlin\projects\專案成本控制器\backend\data\projects.json'

if os.path.exists(projects_path):
    with open(projects_path, 'r', encoding='utf-8') as f:
        projects = json.load(f)
        for p in projects:
            print(f"Project: {p.get('name')} ({p.get('id')})")
            files = p.get('files', [])
            print(f"  File count: {len(files)}")
            for i, file in enumerate(files):
                print(f"    {i+1}. {file.get('file_name')} - {file.get('uploaded_at')}")
else:
    print("projects.json not found")
