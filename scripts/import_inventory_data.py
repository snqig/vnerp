#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
成品原料数据导入脚本
将5月份报表数据导入到ERP项目数据库
"""

import pandas as pd
import mysql.connector
from mysql.connector import Error
import os
from pathlib import Path
import json
from datetime import datetime

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


def create_database_tables(conn):
    """创建数据库表"""
    cursor = conn.cursor()
    
    # 成品库存表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS inv_product_inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_code VARCHAR(100),
        product_name VARCHAR(255),
        specification VARCHAR(255),
        category VARCHAR(100),
        customer VARCHAR(255),
        unit VARCHAR(50),
        warehouse VARCHAR(100),
        location VARCHAR(100),
        opening_balance DECIMAL(18,4) DEFAULT 0,
        total_in DECIMAL(18,4) DEFAULT 0,
        total_out DECIMAL(18,4) DEFAULT 0,
        current_balance DECIMAL(18,4) DEFAULT 0,
        batch_no VARCHAR(100),
        supplier VARCHAR(255),
        source_file VARCHAR(255),
        source_sheet VARCHAR(100),
        import_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        remarks TEXT,
        INDEX idx_product_code (product_code),
        INDEX idx_product_name (product_name),
        INDEX idx_category (category),
        INDEX idx_warehouse (warehouse)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成品库存表'
    ''')
    
    # 原料库存表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS inv_material_inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        material_code VARCHAR(100),
        material_name VARCHAR(255),
        specification VARCHAR(255),
        category VARCHAR(100),
        material_type VARCHAR(50),
        unit VARCHAR(50),
        warehouse VARCHAR(100),
        location VARCHAR(100),
        supplier VARCHAR(255),
        opening_balance DECIMAL(18,4) DEFAULT 0,
        total_in DECIMAL(18,4) DEFAULT 0,
        total_out DECIMAL(18,4) DEFAULT 0,
        current_balance DECIMAL(18,4) DEFAULT 0,
        safety_stock DECIMAL(18,4) DEFAULT 0,
        source_file VARCHAR(255),
        source_sheet VARCHAR(100),
        import_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        remarks TEXT,
        INDEX idx_material_code (material_code),
        INDEX idx_material_name (material_name),
        INDEX idx_category (category),
        INDEX idx_supplier (supplier)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='原料库存表'
    ''')
    
    # 辅料库存表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS inv_auxiliary_inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        aux_code VARCHAR(100),
        aux_name VARCHAR(255),
        specification VARCHAR(255),
        category VARCHAR(100),
        unit VARCHAR(50),
        warehouse VARCHAR(100),
        location VARCHAR(100),
        supplier VARCHAR(255),
        opening_balance DECIMAL(18,4) DEFAULT 0,
        total_in DECIMAL(18,4) DEFAULT 0,
        total_out DECIMAL(18,4) DEFAULT 0,
        current_balance DECIMAL(18,4) DEFAULT 0,
        source_file VARCHAR(255),
        source_sheet VARCHAR(100),
        import_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        remarks TEXT,
        INDEX idx_aux_code (aux_code),
        INDEX idx_aux_name (aux_name),
        INDEX idx_supplier (supplier)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='辅料库存表'
    ''')
    
    # 库存事务表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS inv_inventory_transaction_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_type VARCHAR(50),
        item_type VARCHAR(50),
        item_id INT,
        item_code VARCHAR(100),
        item_name VARCHAR(255),
        quantity DECIMAL(18,4),
        transaction_date DATE,
        reference_no VARCHAR(100),
        warehouse VARCHAR(100),
        location VARCHAR(100),
        operator VARCHAR(100),
        source_file VARCHAR(255),
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        remarks TEXT,
        INDEX idx_transaction_type (transaction_type),
        INDEX idx_item_type (item_type),
        INDEX idx_transaction_date (transaction_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存事务日志表'
    ''')
    
    conn.commit()
    print("✓ 数据库表创建完成")


def import_auxiliary_data(conn, file_path, sheet_name, warehouse_name):
    """导入辅料数据"""
    df = read_excel_file(file_path, sheet_name)
    if df is None or df.empty:
        return 0
    
    cursor = conn.cursor()
    count = 0
    
    # 跳过标题行，处理数据
    for idx, row in df.iterrows():
        if idx < 2:  # 跳过前两行标题
            continue
        
        try:
            # 解析数据（根据实际列位置调整）
            spec = str(row.iloc[0]) if pd.notna(row.iloc[0]) else ''
            code = str(row.iloc[1]) if pd.notna(row.iloc[1]) else ''
            name = str(row.iloc[2]) if pd.notna(row.iloc[2]) else ''
            category = str(row.iloc[3]) if pd.notna(row.iloc[3]) else ''
            supplier = str(row.iloc[4]) if pd.notna(row.iloc[4]) else ''
            
            if not code or code == 'nan':
                continue
            
            cursor.execute('''
                INSERT INTO inv_auxiliary_inventory 
                (aux_code, aux_name, specification, category, supplier, 
                 warehouse, source_file, source_sheet, remarks)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                code, name, spec, category, supplier,
                warehouse_name, os.path.basename(file_path), sheet_name,
                f'导入自5月份辅料月报表-{sheet_name}'
            ))
            count += 1
        except Exception as e:
            continue
    
    conn.commit()
    return count


def import_material_data(conn, file_path, sheet_name):
    """导入原材料数据"""
    df = read_excel_file(file_path, sheet_name)
    if df is None or df.empty:
        return 0
    
    cursor = conn.cursor()
    count = 0
    
    for idx, row in df.iterrows():
        if idx < 2:
            continue
        
        try:
            # 解析数据
            code = str(row.iloc[0]) if pd.notna(row.iloc[0]) else ''
            name = str(row.iloc[1]) if pd.notna(row.iloc[1]) else ''
            spec = str(row.iloc[2]) if pd.notna(row.iloc[2]) else ''
            
            if not code or code == 'nan':
                continue
            
            cursor.execute('''
                INSERT INTO inv_material_inventory 
                (material_code, material_name, specification, material_type,
                 source_file, source_sheet, remarks)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            ''', (
                code, name, spec, '原材料',
                os.path.basename(file_path), sheet_name,
                f'导入自5月原材料月报表-{sheet_name}'
            ))
            count += 1
        except Exception as e:
            continue
    
    conn.commit()
    return count


def import_product_data(conn, file_path, sheet_name):
    """导入成品数据"""
    df = read_excel_file(file_path, sheet_name)
    if df is None or df.empty:
        return 0
    
    cursor = conn.cursor()
    count = 0
    
    for idx, row in df.iterrows():
        if idx < 2:
            continue
        
        try:
            # 解析数据
            code = str(row.iloc[0]) if pd.notna(row.iloc[0]) else ''
            spec = str(row.iloc[1]) if pd.notna(row.iloc[1]) else ''
            name = str(row.iloc[2]) if pd.notna(row.iloc[2]) else ''
            
            if not code or code == 'nan':
                continue
            
            cursor.execute('''
                INSERT INTO inv_product_inventory 
                (product_code, product_name, specification,
                 source_file, source_sheet, remarks)
                VALUES (%s, %s, %s, %s, %s, %s)
            ''', (
                code, name, spec,
                os.path.basename(file_path), sheet_name,
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
    print("成品原料数据导入")
    print("="*60)
    
    try:
        # 连接数据库
        conn = mysql.connector.connect(**DB_CONFIG)
        print("✓ 数据库连接成功")
        
        # 创建表
        create_database_tables(conn)
        
        # 导入数据
        results = {}
        
        # 1. 导入辅料数据
        print("\n导入辅料数据...")
        file_path = FILES['辅料']
        sheets = get_sheet_names(file_path)
        
        for sheet in sheets:
            if '辅料' in sheet:
                count = import_auxiliary_data(conn, file_path, sheet, sheet.replace('辅料', ''))
                results[f'辅料-{sheet}'] = count
                print(f"  - {sheet}: {count} 条")
        
        # 2. 导入原材料数据
        print("\n导入原材料数据...")
        file_path = FILES['原材料']
        sheets = get_sheet_names(file_path)
        
        for sheet in sheets:
            if sheet in ['月报表', '网版']:
                count = import_material_data(conn, file_path, sheet)
                results[f'原材料-{sheet}'] = count
                print(f"  - {sheet}: {count} 条")
        
        # 3. 导入成品数据
        print("\n导入成品数据...")
        file_path = FILES['成品']
        sheets = get_sheet_names(file_path)
        
        for sheet in sheets:
            if '主料' in sheet:
                count = import_product_data(conn, file_path, sheet)
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
        
        # 保存结果
        output_path = os.path.join(FOLDER_PATH, 'import_results.json')
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump({
                'import_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'results': results,
                'total': total
            }, f, ensure_ascii=False, indent=2)
        
        print(f"\n结果已保存到: {output_path}")
        
    except Error as e:
        print(f"数据库错误: {e}")
    except Exception as e:
        print(f"错误: {e}")


if __name__ == '__main__':
    main()
