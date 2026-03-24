import sys
import os
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Fix encoding for PowerShell
sys.stdout.reconfigure(encoding='utf-8')

from backend.services import category_service

# === 底層葉節點匹配測試 ===
print("=== 底層匹配測試 (Lv.2) ===")
test_rows = [
    {"description": "PVC管  3\" x 5.5mm"},
    {"description": "EMT導線管"},
    {"description": "消防設備含廣播及簽證"},
    {"description": "壹、電氣設備工程"},
    {"description": "貳、弱電設備工程"},
    {"description": "參、給排水設備工程"},
    {"description": "肆、消防安全設備工程"},
    {"description": "伍、空調通風設備工程"},
    {"description": "PVC電線 600V級 5.5mm2/2C"},
    {"description": "防火填塞工程"},
    {"description": "隨便亂打的文字"},
]

for row in test_rows:
    path = category_service.classify_row(row["description"], max_depth=2)
    print(f"  {row['description']:45s} -> {path}")

print("\n=== 深度 Lv.1 測試 ===")
for row in test_rows:
    path = category_service.classify_row(row["description"], max_depth=1)
    print(f"  {row['description']:45s} -> {path}")

print("\n=== 深度 Lv.3 測試 ===")
for row in test_rows:
    path = category_service.classify_row(row["description"], max_depth=3)
    print(f"  {row['description']:45s} -> {path}")

print("\n=== 未分類測試 ===")
no_match = ["完全無關的東西", "", "xyz123"]
for desc in no_match:
    path = category_service.classify_row(desc, max_depth=2)
    print(f"  '{desc}' -> {path}")
