import sys
sys.path.append('c:\\Users\\wanlin\\projects\\專案成本控制器\\backend')
from services.ai_service import ai_service
from services.category_service import load_categories

unclassified_rows = [
    {'id': '2', '_original_index': 2, 'description': '受電箱 P8~P10 PANEL', 'unit': '式'},
    {'id': '3', '_original_index': 3, 'description': '三相電錶箱 PANEL', 'unit': '式'},
    {'id': '4', '_original_index': 4, 'description': '弱電給排水設備', 'unit': '式'}
]

cat_tree = load_categories()
category_list = ai_service.get_flattened_categories(cat_tree, 2)
print("Categories sample:", category_list[:5])

print("Testing AI...")
res = ai_service.batch_classify_items(unclassified_rows, category_list, [])
print("AI Result:", res)
