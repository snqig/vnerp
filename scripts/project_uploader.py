#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Print MIS 项目上传工具（带界面 + 实时日志版）
- 有图形界面
- 实时日志输出框
- 所有提示在界面内显示（无弹窗）
- 支持勾选文件上传
"""

import os
import sys
import subprocess
import tkinter as tk
from tkinter import ttk, scrolledtext
from pathlib import Path
import datetime
import threading


class UploaderUI:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root).resolve()
        self.root = tk.Tk()
        self.root.title("Print MIS 项目上传工具 - 实时日志版")
        self.root.geometry("1250x820")
        self.root.minsize(1100, 720)

        self.file_vars = {}
        self.is_uploading = False

        self.setup_ui()
        self.root.after(200, self.load_files)

    def setup_ui(self):
        main = ttk.Frame(self.root, padding=12)
        main.pack(fill=tk.BOTH, expand=True)

        # ==================== 上半部分：文件列表 ====================
        list_frame = ttk.LabelFrame(main, text="项目文件列表（自动排除无关文件）", padding=10)
        list_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))

        toolbar = ttk.Frame(list_frame)
        toolbar.pack(fill=tk.X, pady=(0, 8))
        ttk.Button(toolbar, text="全选", command=self.select_all).pack(side=tk.LEFT, padx=4)
        ttk.Button(toolbar, text="取消全选", command=self.deselect_all).pack(side=tk.LEFT, padx=4)
        ttk.Button(toolbar, text="刷新列表", command=self.load_files).pack(side=tk.LEFT, padx=4)

        self.stats_label = ttk.Label(toolbar, text="")
        self.stats_label.pack(side=tk.RIGHT, padx=10)

        # Treeview
        columns = ('select', 'path', 'size', 'modified')
        self.tree = ttk.Treeview(list_frame, columns=columns, show='headings', height=16)
        self.tree.heading('select', text='选择')
        self.tree.heading('path', text='文件路径')
        self.tree.heading('size', text='大小')
        self.tree.heading('modified', text='修改时间')

        self.tree.column('select', width=60, anchor='center')
        self.tree.column('path', width=680)
        self.tree.column('size', width=100, anchor='e')
        self.tree.column('modified', width=140, anchor='center')

        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.tree.bind('<Button-1>', self.on_click)

        # ==================== 日志输出框 ====================
        log_frame = ttk.LabelFrame(main, text="实时日志", padding=8)
        log_frame.pack(fill=tk.BOTH, expand=True, pady=8)

        self.log_text = scrolledtext.ScrolledText(log_frame, height=12, font=("Consolas", 10))
        self.log_text.pack(fill=tk.BOTH, expand=True)

        # ==================== 底部控制区 ====================
        bottom = ttk.Frame(main)
        bottom.pack(fill=tk.X, pady=8)

        ttk.Label(bottom, text="提交信息:").pack(side=tk.LEFT, padx=(0, 8))
        self.commit_entry = ttk.Entry(bottom, width=80)
        self.commit_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 15))
        self.commit_entry.insert(0, f"Update {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}")

        # 进度条
        prog = ttk.Frame(bottom)
        prog.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=10)
        ttk.Label(prog, text="进度:").pack(side=tk.LEFT)
        self.progress_var = tk.DoubleVar(value=0)
        self.progress = ttk.Progressbar(prog, variable=self.progress_var, maximum=100, length=360)
        self.progress.pack(side=tk.LEFT, padx=8, fill=tk.X, expand=True)
        self.progress_label = ttk.Label(prog, text="0%")
        self.progress_label.pack(side=tk.LEFT)

        # 按钮
        btn_frame = ttk.Frame(bottom)
        btn_frame.pack(side=tk.RIGHT)
        ttk.Button(btn_frame, text="刷新", command=self.load_files).pack(side=tk.LEFT, padx=4)
        self.upload_btn = ttk.Button(btn_frame, text="🚀 上传勾选文件", command=self.start_upload)
        self.upload_btn.pack(side=tk.LEFT, padx=4)
        ttk.Button(btn_frame, text="退出", command=self.root.quit).pack(side=tk.LEFT, padx=4)

        # 状态栏
        self.status_var = tk.StringVar(value="就绪 - 请勾选文件后点击上传")
        status_bar = ttk.Label(self.root, textvariable=self.status_var, relief=tk.SUNKEN, anchor=tk.W)
        status_bar.pack(side=tk.BOTTOM, fill=tk.X)

    def log(self, message: str, level: str = "INFO"):
        """实时写入日志"""
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        prefix = {
            "INFO": "ℹ️",
            "SUCCESS": "✅",
            "WARNING": "⚠️",
            "ERROR": "❌"
        }.get(level, "•")
        
        self.log_text.insert(tk.END, f"[{timestamp}] {prefix} {message}\n")
        self.log_text.see(tk.END)
        self.root.update_idletasks()

    def load_files(self):
        self.tree.delete(*self.tree.get_children())
        self.file_vars.clear()
        count = 0

        self.log("开始扫描项目文件...", "INFO")

        for root_dir, dirs, files in os.walk(self.project_root):
            root_path = Path(root_dir)
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            
            for file in files:
                if file.startswith('.'): 
                    continue
                file_path = root_path / file
                rel_path = file_path.relative_to(self.project_root)

                try:
                    stat = file_path.stat()
                    size_str = self.format_size(stat.st_size)
                    mod_time = datetime.datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M')

                    item = self.tree.insert('', tk.END, values=('☐', str(rel_path), size_str, mod_time))
                    self.file_vars[item] = {'path': str(rel_path), 'selected': False, 'size': stat.st_size}
                    count += 1
                except:
                    continue

        self.stats_label.config(text=f"共 {count} 个文件")
        self.log(f"文件扫描完成，共找到 {count} 个有效文件", "SUCCESS")
        self.status_var.set(f"加载完成，共 {count} 个文件")

    def format_size(self, size: int) -> str:
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.2f} TB"

    def on_click(self, event):
        if self.tree.identify_column(event.x) == '#1':
            item = self.tree.identify_row(event.y)
            if item:
                self.toggle_select(item)

    def toggle_select(self, item):
        info = self.file_vars[item]
        info['selected'] = not info['selected']
        values = list(self.tree.item(item, 'values'))
        values[0] = '☑' if info['selected'] else '☐'
        self.tree.item(item, values=values)

    def select_all(self):
        for item in self.file_vars:
            self.file_vars[item]['selected'] = True
            values = list(self.tree.item(item, 'values'))
            values[0] = '☑'
            self.tree.item(item, values=values)

    def deselect_all(self):
        for item in self.file_vars:
            self.file_vars[item]['selected'] = False
            values = list(self.tree.item(item, 'values'))
            values[0] = '☐'
            self.tree.item(item, values=values)

    def get_selected(self):
        return [info['path'] for info in self.file_vars.values() if info['selected']]

    def start_upload(self):
        if self.is_uploading:
            return
        selected = self.get_selected()
        if not selected:
            self.status_var.set("❌ 请至少勾选一个文件")
            self.log("未选择任何文件", "WARNING")
            return

        self.is_uploading = True
        self.upload_btn.config(state='disabled')
        self.progress_var.set(0)
        self.log_text.delete(1.0, tk.END)   # 清空日志
        self.log("开始上传流程...")

        threading.Thread(target=self.upload_process, args=(selected,), daemon=True).start()

    def update_progress(self, value: int, text: str):
        self.progress_var.set(value)
        self.progress_label.config(text=f"{value}%")
        self.status_var.set(text)

    def upload_process(self, selected_files):
        try:
            self.update_progress(10, f"正在添加 {len(selected_files)} 个文件...")
            self.log(f"准备添加 {len(selected_files)} 个勾选文件")

            for f in selected_files:
                subprocess.run(['git', 'add', f], cwd=self.project_root, check=False)

            self.update_progress(45, "正在提交更改...")
            self.log("执行 git commit...")

            commit_msg = self.commit_entry.get().strip() or f"Update {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}"

            result = subprocess.run(
                ['git', 'commit', '-m', commit_msg, '--no-verify'],
                cwd=self.project_root, capture_output=True, text=True
            )

            self.update_progress(70, "正在推送到 GitHub...")
            self.log("正在推送至远程仓库...")

            branch = subprocess.run(['git', 'branch', '--show-current'],
                                  cwd=self.project_root, capture_output=True, text=True).stdout.strip() or 'main'

            push_result = subprocess.run(['git', 'push', '-u', 'origin', branch],
                                       cwd=self.project_root, capture_output=True, text=True)

            if push_result.returncode == 0:
                self.update_progress(100, f"✅ 上传成功！共 {len(selected_files)} 个文件")
                self.log("上传成功完成！", "SUCCESS")
            else:
                self.update_progress(100, "⚠️ 推送失败")
                self.log(f"推送失败: {push_result.stderr.strip()[:150]}", "ERROR")

        except Exception as e:
            self.update_progress(100, "❌ 上传异常")
            self.log(f"发生异常: {str(e)}", "ERROR")
        finally:
            self.is_uploading = False
            self.root.after(0, lambda: self.upload_btn.config(state='normal'))

    def run(self):
        self.root.mainloop()


if __name__ == '__main__':
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    print(f"启动 Print MIS 上传工具 - 项目路径: {project_root}")
    app = UploaderUI(project_root)
    app.run()
