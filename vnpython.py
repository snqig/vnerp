#!/usr/bin/env python3
"""
GitHub 目录批量上传工具（Git 版本）
功能：图形界面、进度条、自动 Git 提交和推送
作者：snqig
更新日期：2026-04-29
"""

import os
import subprocess
import time
import threading
from pathlib import Path
from datetime import datetime
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext


class GitHubUploader:
    def __init__(self, root):
        self.root = root
        self.root.title("🚀 Git 上传工具 - 自动提交和推送")
        self.root.geometry("850x700")
        self.root.resizable(True, True)
        
        # 设置窗口图标（如果有的话）
        try:
            self.root.iconbitmap(default='icon.ico')
        except:
            pass

        self.owner = tk.StringVar(value="snqig")
        self.repo = tk.StringVar(value="vnerp")
        self.branch = tk.StringVar(value="main")
        self.local_dir = tk.StringVar()
        self.commit_message = tk.StringVar(value="feat: 自动提交 - Git 上传工具")

        self.uploading = False
        self.stop_flag = False

        self.create_widgets()

    def create_widgets(self):
        # 设置样式
        style = ttk.Style()
        style.theme_use('clam')
        
        # 配置颜色方案
        style.configure('Title.TLabel', font=('Microsoft YaHei UI', 12, 'bold'), foreground='#2c3e50')
        style.configure('Header.TLabel', font=('Microsoft YaHei UI', 10, 'bold'), foreground='#34495e')
        style.configure('TButton', font=('Microsoft YaHei UI', 9), padding=5)
        style.configure('TCheckbutton', font=('Microsoft YaHei UI', 9))
        
        main_frame = ttk.Frame(self.root, padding="15")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # 仓库信息
        repo_frame = ttk.LabelFrame(main_frame, text="📦 仓库信息", padding="10")
        repo_frame.pack(fill=tk.X, pady=8)
        
        ttk.Label(repo_frame, text="Owner:", style='Header.TLabel').grid(row=0, column=0, sticky=tk.W, padx=8, pady=5)
        ttk.Entry(repo_frame, textvariable=self.owner, width=25, font=('Consolas', 9)).grid(row=0, column=1, padx=8, pady=5, sticky=tk.W)
        
        ttk.Label(repo_frame, text="Repo:", style='Header.TLabel').grid(row=0, column=2, sticky=tk.W, padx=8, pady=5)
        ttk.Entry(repo_frame, textvariable=self.repo, width=25, font=('Consolas', 9)).grid(row=0, column=3, padx=8, pady=5, sticky=tk.W)
        
        ttk.Label(repo_frame, text="分支:", style='Header.TLabel').grid(row=1, column=0, sticky=tk.W, padx=8, pady=5)
        ttk.Entry(repo_frame, textvariable=self.branch, width=30, font=('Consolas', 9)).grid(row=1, column=1, padx=8, pady=5, sticky=tk.W)

        # 提交信息
        commit_frame = ttk.LabelFrame(main_frame, text="💬 提交信息", padding="10")
        commit_frame.pack(fill=tk.X, pady=8)
        
        ttk.Label(commit_frame, text="Commit Message:", style='Header.TLabel').grid(row=0, column=0, sticky=tk.W, padx=8, pady=5)
        ttk.Entry(commit_frame, textvariable=self.commit_message, width=70, font=('Consolas', 9)).grid(row=0, column=1, padx=8, pady=5, sticky=tk.W+tk.E)

        # 本地目录
        dir_frame = ttk.LabelFrame(main_frame, text="📁 本地目录", padding="10")
        dir_frame.pack(fill=tk.X, pady=8)
        
        ttk.Label(dir_frame, text="目录路径:", style='Header.TLabel').grid(row=0, column=0, sticky=tk.W, padx=8, pady=5)
        ttk.Entry(dir_frame, textvariable=self.local_dir, width=60, font=('Consolas', 9)).grid(row=0, column=1, padx=8, pady=5, sticky=tk.W+tk.E)
        
        browse_btn = ttk.Button(dir_frame, text="📂 浏览...", command=self.select_dir)
        browse_btn.grid(row=0, column=2, padx=8, pady=5)

        # 上传选项
        option_frame = ttk.LabelFrame(main_frame, text="⚙️ 上传选项", padding="10")
        option_frame.pack(fill=tk.X, pady=8)
        
        self.auto_commit_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(option_frame, text="✓ 自动 git add（添加所有更改）", variable=self.auto_commit_var).pack(anchor=tk.W, padx=8, pady=3)
        
        self.auto_push_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(option_frame, text="✓ 自动 git push（推送到远程）", variable=self.auto_push_var).pack(anchor=tk.W, padx=8, pady=3)
        
        self.force_push_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(option_frame, text="⚠️ 强制推送（--force，谨慎使用）", variable=self.force_push_var).pack(anchor=tk.W, padx=8, pady=3)

        # 进度条
        progress_frame = ttk.LabelFrame(main_frame, text="📊 上传进度", padding="10")
        progress_frame.pack(fill=tk.X, pady=8)
        
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(progress_frame, variable=self.progress_var, maximum=100, mode='determinate')
        self.progress_bar.pack(fill=tk.X, padx=8, pady=8)
        
        self.status_label = ttk.Label(progress_frame, text="⏸️ 等待开始", font=('Microsoft YaHei UI', 9), foreground='#7f8c8d')
        self.status_label.pack(anchor=tk.W, padx=8)

        # 日志
        log_frame = ttk.LabelFrame(main_frame, text="📝 上传日志", padding="10")
        log_frame.pack(fill=tk.BOTH, expand=True, pady=8)
        
        self.log_text = scrolledtext.ScrolledText(log_frame, height=12, wrap=tk.WORD, 
                                                  font=('Consolas', 9), 
                                                  bg='#f8f9fa', 
                                                  fg='#2c3e50')
        self.log_text.pack(fill=tk.BOTH, expand=True)

        # 按钮
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(fill=tk.X, pady=12)
        
        self.upload_btn = ttk.Button(btn_frame, text="🚀 开始上传", command=self.start_upload)
        self.upload_btn.pack(side=tk.LEFT, padx=8)
        
        self.cancel_btn = ttk.Button(btn_frame, text="⛔ 取消", command=self.cancel_upload, state=tk.DISABLED)
        self.cancel_btn.pack(side=tk.LEFT, padx=8)
        
        ttk.Button(btn_frame, text="🧹 清空日志", command=self.clear_log).pack(side=tk.LEFT, padx=8)

    def select_dir(self):
        directory = filedialog.askdirectory(title="选择要上传的目录")
        if directory:
            self.local_dir.set(directory)

    def clear_log(self):
        self.log_text.delete(1.0, tk.END)

    def log(self, message, is_error=False, is_success=False, is_info=False):
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        # 根据消息类型设置颜色
        if is_error:
            tag = "error"
            color = "#e74c3c"
            prefix = "❌ "
        elif is_success:
            tag = "success"
            color = "#27ae60"
            prefix = "✅ "
        elif is_info:
            tag = "info"
            color = "#3498db"
            prefix = "ℹ️ "
        else:
            tag = "normal"
            color = "#2c3e50"
            prefix = ""
        
        self.log_text.insert(tk.END, f"[{timestamp}] {prefix}{message}\n", tag)
        self.log_text.tag_config(tag, foreground=color)
        self.log_text.see(tk.END)
        self.root.update_idletasks()

    def cancel_upload(self):
        if self.uploading:
            self.stop_flag = True
            self.log("⚠️ 正在取消上传...", is_info=True)
            self.cancel_btn.config(state=tk.DISABLED)

    def start_upload(self):
        local_dir = self.local_dir.get().strip()
        if not local_dir or not os.path.isdir(local_dir):
            messagebox.showerror("错误", "请选择一个有效的本地目录")
            return

        self.uploading = True
        self.stop_flag = False
        self.upload_btn.config(state=tk.DISABLED)
        self.cancel_btn.config(state=tk.NORMAL)
        self.progress_var.set(0)
        self.status_label.config(text="正在检查 Git 状态...")
        self.clear_log()

        thread = threading.Thread(target=self.upload_worker, daemon=True)
        thread.start()

    def run_git_command(self, command, cwd=None):
        """执行 Git 命令并返回输出"""
        try:
            result = subprocess.run(
                command,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=120,
                encoding='utf-8'
            )
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return -1, "", "命令执行超时"
        except Exception as e:
            return -1, "", str(e)

    def upload_worker(self):
        try:
            owner = self.owner.get().strip()
            repo = self.repo.get().strip()
            branch = self.branch.get().strip()
            local_dir = self.local_dir.get().strip()
            commit_msg = self.commit_message.get().strip()
            
            if not commit_msg:
                commit_msg = "feat: 自动提交 - Git 上传工具"

            self.log(f"📁 工作目录: {local_dir}", is_info=True)
            self.log(f"🎯 目标仓库: {owner}/{repo}:{branch}", is_info=True)

            # 步骤 1: 检查 Git 状态
            self.status_label.config(text="正在检查 Git 状态...")
            self.log("🔍 检查 Git 状态...")
            
            returncode, stdout, stderr = self.run_git_command(['git', 'status', '--porcelain'], cwd=local_dir)
            if returncode != 0:
                self.log(f"❌ 不是 Git 仓库或 Git 未安装: {stderr}", is_error=True)
                return

            # 检查是否有更改
            if not stdout.strip():
                self.log("ℹ️ 没有检测到更改，无需提交", is_info=True)
                return

            # 解析更改
            changed_files = stdout.strip().split('\n')
            self.log(f"📝 检测到 {len(changed_files)} 个文件更改", is_success=True)

            # 步骤 2: git add
            if self.auto_commit_var.get():
                self.status_label.config(text="正在执行 git add...")
                self.log("➕ 执行 git add .")
                
                returncode, stdout, stderr = self.run_git_command(['git', 'add', '.'], cwd=local_dir)
                if returncode != 0:
                    self.log(f"❌ git add 失败: {stderr}", is_error=True)
                    return
                
                self.log("✅ git add 成功", is_success=True)
                time.sleep(0.5)

            # 步骤 3: git commit
            self.status_label.config(text="正在执行 git commit...")
            self.log(f"💬 执行 git commit: {commit_msg}")
            
            returncode, stdout, stderr = self.run_git_command(
                ['git', 'commit', '-m', commit_msg],
                cwd=local_dir
            )
            
            if returncode != 0:
                if "nothing to commit" in stderr or "nothing added to commit" in stderr:
                    self.log("ℹ️ 没有需要提交的内容", is_info=True)
                    return
                else:
                    self.log(f"❌ git commit 失败: {stderr}", is_error=True)
                    return
            
            self.log("✅ git commit 成功", is_success=True)
            self.progress_var.set(50)
            time.sleep(0.5)

            # 步骤 4: git push
            if self.auto_push_var.get():
                self.status_label.config(text="正在执行 git push...")
                self.log("📤 执行 git push...")
                
                push_cmd = ['git', 'push', 'origin', branch]
                if self.force_push_var.get():
                    push_cmd.insert(2, '--force')
                    self.log("⚠️ 使用强制推送模式", is_info=True)
                
                returncode, stdout, stderr = self.run_git_command(push_cmd, cwd=local_dir)
                
                if returncode != 0:
                    self.log(f"❌ git push 失败:\n{stderr}", is_error=True)
                    return
                
                self.log("✅ git push 成功", is_success=True)
                self.progress_var.set(100)

            self.status_label.config(text="✅ 上传完成")
            self.log(f"\n🎉 所有操作完成！", is_success=True)
            
        except Exception as e:
            self.log(f"❌ 严重错误: {str(e)}", is_error=True)
        finally:
            self.uploading = False
            self.upload_btn.config(state=tk.NORMAL)
            self.cancel_btn.config(state=tk.DISABLED)


if __name__ == "__main__":
    root = tk.Tk()
    app = GitHubUploader(root)
    root.mainloop()
