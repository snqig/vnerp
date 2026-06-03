#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
成品原料数据导入脚本 - 整合到现有仓库管理模块
将5月份报表数据导入到ERP项目现有的物料表中
"""

import pandas as pd
import mysql.connector
from mysql.connector import Error
import os
from pathlib import Path
import json
from datetime import datetime
import hashlib

# 数据库配置
DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'root',
    'password': 'Snqig521223',
    'database': 'vnerpdacahng',
    'charset': 'utf8mb4'
}

# 文件夹路径
FOLDER_PATH = r"C:\Users\snqig\Desktop\新建文件夹"

# 文件列表
FILES = {
    '辅料': os.path.join(FOLDER_PATH, '5月份辅料月报表.xls'),
    '原材料': os.path.join(FOLDER_PATH, '5月原材料月报表.xlsx'),
    '成品': os.path.join(FOLDER_PATH, '五月份成品管制帐.xlsm'),
    '其它': os.path.join(FOLDER_PATH, '五月份其它管制帐.xlsm'),
}


def read_excel_file(file_path, sheet_name=None):
    """读取Excel文件"""
    try:
        ext = Path(file_path).suffix.lower()
        
        if ext == '.xls':
            df = pd.read_excel(file_path, sheet_name=sheet_name, engine='xlrd')
        elif ext in ['.xlsx', '.xlsm']:
            df = pd.read_excel(file_path, sheet_name=sheet_name, engine='openpyxl')
        else:
            return None
        
        return df
    except Exception as e:
        print(f"读取文件失败: {e}")
        return None


def get_sheet_names(file_path):
    """获取所有工作表名称"""
    try:
        ext = Path(file_path).suffix.lower()
        
        if ext == '.xls':
            xl = pd.ExcelFile(file_path, engine='xlrd')
        else:
            xl = pd.ExcelFile(file_path, engine='openpyxl')
        
        return xl.sheet_names
    except Exception as e:
        print(f"获取工作表失败: {e}")
        return []


def get_or_create_warehouse(cursor, conn, warehouse_name):
    """获取或创建仓库"""
    cursor.execute(
        "SELECT id FROM inv_warehouse WHERE warehouse_name = %s AND deleted = 0",
        (warehouse_name,)
    )
    result = cursor.fetchone()
    
    if result:
        return result[0]
    
    # 创建新仓库
    warehouse_code = f'WH{hashlib.md5(warehouse_name.encode()).hexdigest()[:6].upper()}'
    cursor.execute('''
        INSERT INTO inv_warehouse (warehouse_name, warehouse_code, status, create_time, deleted)
        VALUES (%s, %s, 1, NOW(), 0)
    ''', (warehouse_name, warehouse_code))
    conn.commit()
    
    return cursor.lastrowid


def get_or_create_category(cursor, conn, category_name, parent_id=None):
    """获取或创建分类"""
    if not category_name or category_name == 'nan':
        return None
    
    cursor.execute(
        "SELECT id FROM inv_material_category WHERE category_name = %s AND deleted = 0",
        (category_name,)
    )
    result = cursor.fetchone()
    
    if result:
        return result[0]
    
    # 创建新分类
    category_code = f'CAT{hashlib.md5(category_name.encode()).hexdigest()[:6].upper()}'
    cursor.execute('''
        INSERT INTO inv_material_category (category_name, category_code, parent_id, status, create_time, deleted)
        VALUES (%s, %s, %s, 1, NOW(), 0)
    ''', (category_name, category_code, parent_id))
    conn.commit()
    
    return cursor.lastrowid


def import_auxiliary_to_material(conn, file_path, sheet_name, warehouse_name):
    """导入辅料数据到 inv_material 表"""
    df = read_excel_file(file_path, sheet_name)
    if df is None or df.empty:
        return 0
    
    cursor = conn.cursor()
    count = 0
    
    # 获取或创建仓库
    warehouse_id = get_or_create_warehouse(cursor, conn, warehouse_name)
    
    # 获取或创建辅料分类
    category_id = get_or_create_category(cursor, conn, '辅料')
    
    # 跳过标题行，处理数据
    for idx, row in df.iterrows():
        if idx < 2:  # 跳过前两行标题
            continue
        
        try:
            # 解析数据
            spec = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
            code = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ''
            name = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ''
            category = str(row.iloc[3]).strip() if pd.notna(row.iloc[3]) else ''
            supplier = str(row.iloc[4]).strip() if pd.notna(row.iloc[4]) else ''
            
            if not code or code == 'nan' or not name or name == 'nan':
                continue
            
            # 获取或创建子分类
            sub_category_id = get_or_create_category(cursor, conn, category, category_id) if category and category != 'nan' else category_id
            
            # 检查是否已存在
            cursor.execute(
                "SELECT id FROM inv_material WHERE material_code = %s AND deleted = 0",
                (code,)
            )
            existing = cursor.fetchone()
            
            if existing:
                # 更新
                cursor.execute('''
                    UPDATE inv_material 
                    SET material_name = %s, specification = %s, 
                        warehouse_id = %s, category_id = %s,
                        update_time = NOW()
                    WHERE id = %s
                ''', (
                    name, spec, warehouse_id, sub_category_id,
                    existing[0]
                ))
            else:
                # 插入
                cursor.execute('''
                    INSERT INTO inv_material 
                    (material_code, material_name, specification, material_type,
                     warehouse_id, category_id, safety_stock,
                     unit, status, deleted, create_time, remark)
                    VALUES (%s, %s, %s, 3, %s, %s, 0, %s, 1, 0, NOW(), %s)
                ''', (
                    code, name, spec,
                    warehouse_id, sub_category_id,
                    '个',
                    f'导入自5月份辅料月报表-{sheet_name}，供应商:{supplier}'
                ))
            
            count += 1
        except Exception as e:
            continue
    
    conn.commit()
    return count


def import_material_to_material(conn, file_path, sheet_name):
    """导入原材料数据到 inv_material 表"""
    df = read_excel_file(file_path, sheet_name)
    if df is None or df.empty:
        return 0
    
    cursor = conn.cursor()
    count = 0
    
    # 获取或创建仓库
    warehouse_id = get_or_create_warehouse(cursor, conn, '原料仓')
    
    # 获取或创建原材料分类
    category_id = get_or_create_category(cursor, conn, '原材料')
    
    for idx, row in df.iterrows():
        if idx < 2:
            continue
        
        try:
            # 解析数据
            code = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
            name = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ''
            spec = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ''
            
            if not code or code == 'nan' or not name or name == 'nan':
                continue
            
            # 检查是否已存在
            cursor.execute(
                "SELECT id FROM inv_material WHERE material_code = %s AND deleted = 0",
                (code,)
            )
            existing = cursor.fetchone()
            
            if existing:
                cursor.execute('''
                    UPDATE inv_material 
                    SET material_name = %s, specification = %s,
                        warehouse_id = %s, category_id = %s,
                        update_time = NOW()
                    WHERE id = %s
                ''', (name, spec, warehouse_id, category_id, existing[0]))
            else:
                cursor.execute('''
                    INSERT INTO inv_material 
                    (material_code, material_name, specification, material_type,
                     warehouse_id, category_id, safety_stock,
                     unit, status, deleted, create_time, remark)
                    VALUES (%s, %s, %s, 1, %s, %s, 0, %s, 1, 0, NOW(), %s)
                ''', (
                    code, name, spec,
                    warehouse_id, category_id, '个',
                    f'导入自5月原材料月报表-{sheet_name}'
                ))
            
            count += 1
        except Exception as e:
            continue
    
    conn.commit()
    return count


def import_product_to_material(conn, file_path, sheet_name):
    """导入成品数据到 inv_material 表"""
    df = read_excel_file(file_path, sheet_name)
    if df is None or df.empty:
        return 0
    
    cursor = conn.cursor()
    count = 0
    
    # 获取或创建仓库
    warehouse_id = get_or_create_warehouse(cursor, conn, '成品仓')
    
    # 获取或创建成品分类
    category_id = get_or_create_category(cursor, conn, '成品')
    
    for idx, row in df.iterrows():
        if idx < 2:
            continue
        
        try:
            # 解析数据
            code = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
            spec = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ''
            name = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ''
            
            if not code or code == 'nan' or not name or name == 'nan':
                continue
            
            # 检查是否已存在
            cursor.execute(
                "SELECT id FROM inv_material WHERE material_code = %s AND deleted = 0",
                (code,)
            )
            existing = cursor.fetchone()
            
            if existing:
                cursor.execute('''
                    UPDATE inv_material 
                    SET material_name = %s, specification = %s,
                        warehouse_id = %s, category_id = %s,
                        update_time = NOW()
                    WHERE id = %s
                ''', (name, spec, warehouse_id, category_id, existing[0]))
            else:
                cursor.execute('''
                    INSERT INTO inv_material 
                    (material_code, material_name, specification, material_type,
                     warehouse_id, category_id, safety_stock,
                     unit, status, deleted, create_time, remark)
                    VALUES (%s, %s, %s, 2, %s, %s, 0, %s, 1, 0, NOW(), %s)
                ''', (
                    code, name, spec,
                    warehouse_id, category_id, '个',
                    f'导入自5月份成品管制帐-{sheet_name}'
                ))
            
            count += 1
        except Exception as e:
            continue
    
    conn.commit()
    return count


def main():
    """主函数"""
    print("="*60)
    print("成品原料数据导入 - 整合到仓库管理模块")
    print("="*60)
    
    try:
        # 连接数据库
        conn = mysql.connector.connect(**DB_CONFIG)
        print("✓ 数据库连接成功")
        
        # 导入数据
        results = {}
        
        # 1. 导入辅料数据
        print("\n导入辅料数据...")
        file_path = FILES['辅料']
        sheets = get_sheet_names(file_path)
        
        for sheet in sheets:
            if '辅料' in sheet:
                count = import_auxiliary_to_material(conn, file_path, sheet, sheet.replace('辅料', '仓'))
                results[f'辅料-{sheet}'] = count
                print(f"  - {sheet}: {count} 条")
        
        # 2. 导入原材料数据
        print("\n导入原材料数据...")
        file_path = FILES['原材料']
        sheets = get_sheet_names(file_path)
        
        for sheet in sheets:
            if sheet in ['月报表', '网版']:
                count = import_material_to_material(conn, file_path, sheet)
                results[f'原材料-{sheet}'] = count
                print(f"  - {sheet}: {count} 条")
        
        # 3. 导入成品数据
        print("\n导入成品数据...")
        file_path = FILES['成品']
        sheets = get_sheet_names(file_path)
        
        for sheet in sheets:
            if '主料' in sheet:
                count = import_product_to_material(conn, file_path, sheet)
                results[f'成品-{sheet}'] = count
                print(f"  - {sheet}: {count} 条")
        
        # 关闭连接
        conn.close()
        
        # 输出汇总
        print("\n" + "="*60)
        print("导入汇总")
        print("="*60)
        total = 0
        for name, count in results.items():
            print(f"  {name}: {count} 条")
            total += count
        print(f"\n总计: {total} 条记录")
        
        print("\n数据已导入到以下模块:")
        print("  - 库存查询: /warehouse/inventory")
        print("  - 入库管理: /warehouse/inbound")
        print("  - 出库管理: /warehouse/outbound")
        print("  - 分切管理: /warehouse/inbound/cutting")
        print("  - 库存调拨: /warehouse/transfer")
        print("  - 库存盘点: /warehouse/stocktaking")
        print("  - 库存调整: /warehouse/stock-adjust")
        
        # 保存结果
        output_path = os.path.join(FOLDER_PATH, 'import_results_final.json')
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump({
                'import_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'results': results,
                'total': total,
                'modules': [
                    '/warehouse/inventory',
                    '/warehouse/inbound',
                    '/warehouse/outbound',
                    '/warehouse/inbound/cutting',
                    '/warehouse/transfer',
                    '/warehouse/stocktaking',
                    '/warehouse/stock-adjust'
                ]
            }, f, ensure_ascii=False, indent=2)
        
        print(f"\n结果已保存到: {output_path}")
        
    except Error as e:
        print(f"数据库错误: {e}")
    except Exception as e:
        print(f"错误: {e}")


if __name__ == '__main__':
    main()
