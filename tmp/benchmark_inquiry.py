import sys
import os
import time
import json

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from services import project_service

project_id = "8ff2181c"
category = "配電盤.弱電箱體"

print(f"Benchmarking get_inquiry_rows for {project_id} - {category}")

# Warm up cache
start = time.time()
rows = project_service.get_inquiry_rows(project_id, category)
print(f"First call (Cold): {time.time() - start:.4f}s - {len(rows)} rows")

# Second call (Cached?)
start = time.time()
rows = project_service.get_inquiry_rows(project_id, category)
print(f"Second call (Warm): {time.time() - start:.4f}s - {len(rows)} rows")

# Third call
start = time.time()
rows = project_service.get_inquiry_rows(project_id, category)
print(f"Third call (Warm): {time.time() - start:.4f}s - {len(rows)} rows")
