import sys
import os
import time

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from services import project_service

project_id = "8ff2181c"
category = "配電盤.弱電箱體"

# Warm up
project_service.get_inquiry_rows(project_id, category)

# Benchmark Warm
start = time.time()
projects = project_service.load_projects()
load_time = time.time() - start

start = time.time()
target_p = None
for p in projects:
    if p["id"] == project_id:
        target_p = p
        break
find_time = time.time() - start

if target_p:
    latest_file = target_p["files"][-1]
    rows = latest_file.get("data", {}).get("rows", [])
    total_count = len(rows)
    
    start = time.time()
    filtered = [r for r in rows if category in r.get("system_category", "")]
    filter_time = time.time() - start
    
    print(f"Total Rows: {total_count}")
    print(f"Load Time (from cache): {load_time:.4f}s")
    print(f"Find Project Time: {find_time:.4f}s")
    print(f"Filter Time: {filter_time:.4f}s - Result: {len(filtered)} rows")
else:
    print("Project not found")
