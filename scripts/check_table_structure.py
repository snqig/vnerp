#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""查询表结构"""
import mysql.connector

conn = mysql.connector.connect(
    host='127.0.0.1',
    port=3306,
    user='root',
    password='Snqig521223',
    database='vnerpdacahng'
)

cursor = conn.cursor()

# 查询 inv_material 表结构
print("inv_material 表结构:")
cursor.execute("DESCRIBE inv_material")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]}")

print("\ninv_material_category 表结构:")
cursor.execute("DESCRIBE inv_material_category")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]}")

print("\ninv_warehouse 表结构:")
cursor.execute("DESCRIBE inv_warehouse")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]}")

conn.close()
