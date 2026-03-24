import sys
import os
import time
import json

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

import services.project_service as ps

project_id = "8ff2181c"
category = "配電盤.弱電箱體"

print(f"Benchmarking LATEST get_inquiry_rows for {project_id}")

# Test Import + First Call (Cold)
start = time.time()
rows = ps.get_inquiry_rows(project_id, category)
print(f"First call (Cold): {time.time() - start:.4f}s - {len(rows)} rows")

# Test Second Call (Warm - from dict cache)
start = time.time()
rows = ps.get_inquiry_rows(project_id, category)
print(f"Second call (Warm): {time.time() - start:.4f}s - {len(rows)} rows")

# Test Index Speed
start = time.time()
p = ps.get_project_from_cache(project_id)
print(f"Cache Index access: {time.time() - start:.6f}s")
