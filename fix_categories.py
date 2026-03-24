import json
import os

path = 'backend/data/categories.json'
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

mapping = {
    '管線': ['管', '線', '配管', '管材'],
    '水電消防設備': ['電氣', '弱電', '消防', '設備', '給排水', '空調', '水電', '電力', '照明', '工程'],
    '水電消防工資另料': ['工資', '另料', '安裝'],
    '防火填塞工程': ['防火', '填塞'],
    '雜項費用': ['雜項', '清潔', '運費', '保險'],
    '直接成本+間接成本': []
}

for k, kw in mapping.items():
    if k in data:
        data[k]['keywords'] = list(set(data[k].get('keywords', []) + kw))
        print(f"Updated {k} with {len(kw)} keywords")
    else:
        # 嘗試模糊匹配 Key
        found = False
        for actual_k in data.keys():
            if k in actual_k:
                data[actual_k]['keywords'] = list(set(data[actual_k].get('keywords', []) + kw))
                print(f"Fuzzy updated {actual_k} (from {k}) with {len(kw)} keywords")
                found = True
        if not found:
            print(f"Category {k} not found in data")

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=4, ensure_ascii=False)

print("Done.")
