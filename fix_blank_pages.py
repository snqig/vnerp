#!/usr/bin/env python3
import re
import os

def fix_data_structure_issue(file_path, fetch_var_name='data'):
    """修复 API 数据结构问题"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 匹配模式：setXXX(Array.isArray(data.data) ? data.data : [])
    patterns = [
        (r'set(\w+)\(Array\.isArray\((data|\w+)\.data\)\s*\?\s*(data|\w+)\.data\s*:\s*\[\]\)',
         r'const \1List = Array.isArray(\2.data) ? \2.data : (\2.data?.list || []);\n        set\1(\1List)'),
    ]

    changes = 0
    for pattern, replacement in patterns:
        matches = list(re.finditer(pattern, content))
        if matches:
            for match in matches:
                old_code = match.group(0)
                entity_name = re.search(r'set(\w+)', old_code).group(1)
                var_name = re.search(r'(data|\w+)\.data', old_code).group(1)

                new_code = f"const {entity_name.lower()}List = Array.isArray({var_name}.data) ? {var_name}.data : ({var_name}.data?.list || []);\n        set{entity_name}({entity_name.lower()}List)"

                content = content.replace(old_code, new_code)
                changes += 1
                print(f"  ✓ Fixed {entity_name} in {os.path.basename(file_path)}")

    # 如果没有匹配到简单模式，尝试更复杂的替换
    if changes == 0:
        # 尝试：setXXX(result.data || [])
        pattern = r'set(\w+)\((data|result|\w+)\.data\s*\|\|\s*\[\]\)'
        matches = list(re.finditer(pattern, content))
        if matches:
            for match in matches:
                old_code = match.group(0)
                entity_name = match.group(1)
                var_name = match.group(2)

                new_code = f"const {entity_name.lower()}List = Array.isArray({var_name}.data) ? {var_name}.data : ({var_name}.data?.list || []);\n        set{entity_name}({entity_name.lower()}List)"

                content = content.replace(old_code, new_code)
                changes += 1
                print(f"  ✓ Fixed {entity_name} in {os.path.basename(file_path)}")

    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

    return changes

# 要修复的文件
files_to_fix = [
    'd:\\dcprint\\erp-project\\src\\app\\warehouse\\transfer\\page.tsx',
    'd:\\dcprint\\erp-project\\src\\app\\warehouse\\stocktaking\\page.tsx',
    'd:\\dcprint\\erp-project\\src\\app\\purchase\\orders\\page.tsx',
]

print("Fixing blank page data structure issues...")
for file_path in files_to_fix:
    if os.path.exists(file_path):
        changes = fix_data_structure_issue(file_path)
        if changes == 0:
            print(f"  ~ No changes needed for {os.path.basename(file_path)}")
    else:
        print(f"  ✗ File not found: {file_path}")

print("\nDone!")
