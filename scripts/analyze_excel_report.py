#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
成品原料报表分析
分析5月份成品和原料数据，用于ERP项目仓库管理
"""

import pandas as pd
import os
from pathlib import Path
import json

# 文件夹路径
folder_path = r"C:\Users\snqig\Desktop\新建文件夹"

# 文件列表
files = {
    '辅料': os.path.join(folder_path, '5月份辅料月报表.xls'),
    '原材料': os.path.join(folder_path, '5月原材料月报表.xlsx'),
    '成品': os.path.join(folder_path, '五月份成品管制帐.xlsm'),
    '其它': os.path.join(folder_path, '五月份其它管制帐.xlsm'),
}

def read_excel_file(file_path, sheet_name=None):
    """读取Excel文件"""
    try:
        ext = Path(file_path).suffix.lower()
        
        if ext == '.xls':
            # 使用 xlrd 读取旧格式
            df = pd.read_excel(file_path, sheet_name=sheet_name, engine='xlrd')
        elif ext in ['.xlsx', '.xlsm']:
            # 使用 openpyxl 读取新格式
            df = pd.read_excel(file_path, sheet_name=sheet_name, engine='openpyxl')
        else:
            print(f"不支持的文件格式: {ext}")
            return None
        
        return df
    except Exception as e:
        print(f"读取文件失败 {file_path}: {e}")
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

def analyze_file(name, file_path):
    """分析单个文件"""
    print(f"\n{'='*60}")
    print(f"文件: {name}")
    print(f"路径: {file_path}")
    print(f"{'='*60}")
    
    if not os.path.exists(file_path):
        print(f"文件不存在!")
        return None
    
    # 获取工作表
    sheets = get_sheet_names(file_path)
    print(f"\n工作表: {sheets}")
    
    results = {}
    
    for sheet in sheets:
        print(f"\n--- 工作表: {sheet} ---")
        
        df = read_excel_file(file_path, sheet)
        if df is None:
            continue
        
        # 基本信息
        print(f"行数: {len(df)}")
        print(f"列数: {len(df.columns)}")
        print(f"列名: {list(df.columns)}")
        
        # 显示前几行
        print(f"\n前5行数据:")
        print(df.head().to_string())
        
        # 数据类型
        print(f"\n数据类型:")
        print(df.dtypes.to_string())
        
        # 统计信息
        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 0:
            print(f"\n数值列统计:")
            print(df[numeric_cols].describe().to_string())
        
        results[sheet] = {
            'rows': len(df),
            'columns': list(df.columns),
            'dtypes': df.dtypes.to_dict(),
            'sample': df.head(5).to_dict('records'),
            'numeric_summary': df[numeric_cols].describe().to_dict() if len(numeric_cols) > 0 else {}
        }
    
    return results

def main():
    """主函数"""
    print("="*60)
    print("成品原料报表分析 - 5月份")
    print("="*60)
    
    all_results = {}
    
    # 分析每个文件
    for name, file_path in files.items():
        result = analyze_file(name, file_path)
        if result:
            all_results[name] = result
    
    # 保存结果
    output_path = os.path.join(folder_path, 'analysis_results.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2, default=str)
    
    print(f"\n\n分析结果已保存到: {output_path}")
    
    # 生成汇总报告
    print("\n\n" + "="*60)
    print("汇总报告")
    print("="*60)
    
    for name, data in all_results.items():
        print(f"\n【{name}】")
        for sheet, info in data.items():
            print(f"  - {sheet}: {info['rows']} 行, {len(info['columns'])} 列")

if __name__ == '__main__':
    main()
