#!/usr/bin/env python3
"""
GitHub 目录批量上传工具（Git 版本 - 美化界面）
功能：现代化 UI、进度条、自动 Git 提交和推送
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
import webbrowser


class GitHubUploader:
    def __init__(self, root):
        self.root = root
        self.root.title("🚀 Git 上传工具 - 自动提交和推送")
        self.root.geometry("800x650")
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
        
        # 配置颜色方案 - 现代化设计
        # 主色调
        PRIMARY_COLOR = '#4A90E2'      # 蓝色
        SECONDARY_COLOR = '#50C878'    # 绿色
        ACCENT_COLOR = '#FF6B6B'       # 红色
        BG_COLOR = '#F5F7FA'           # 浅灰背景
        CARD_BG = '#FFFFFF'            # 卡片背景
        TEXT_COLOR = '#2C3E50'         # 深色文字
        
        style.configure('TFrame', background=BG_COLOR)
        style.configure('Card.TFrame', background=CARD_BG, relief='flat')
        style.configure('Title.TLabel', 
                       font=('Microsoft YaHei UI', 12, 'bold'), 
                       foreground=TEXT_COLOR,
                       background=BG_COLOR)
        style.configure('Header.TLabel', 
                       font=('Microsoft YaHei UI', 10, 'bold'), 
                       foreground=PRIMARY_COLOR,
                       background=CARD_BG)
        style.configure('Info.TLabel', 
                       font=('Microsoft YaHei UI', 9), 
                       foreground=TEXT_COLOR,
                       background=CARD_BG)
        style.configure('TButton', 
                       font=('Microsoft YaHei UI', 9, 'bold'),
                       padding=8,
                       foreground='white',
                       background=PRIMARY_COLOR)
        style.map('TButton',
                 background=[('active', '#357ABD'), ('pressed', '#2E6BA8')])
        style.configure('Success.TButton',
                       font=('Microsoft YaHei UI', 9, 'bold'),
                       padding=8,
                       foreground='white',
                       background=SECONDARY_COLOR)
        style.map('Success.TButton',
                 background=[('active', '#45B068'), ('pressed', '#3DA05A')])
        style.configure('Danger.TButton',
                       font=('Microsoft YaHei UI', 9, 'bold'),
                       padding=8,
                       foreground='white',
                       background=ACCENT_COLOR)
        style.map('Danger.TButton',
                 background=[('active', '#E55A5A'), ('pressed', '#D54A4A')])
        style.configure('TCheckbutton', 
                       font=('Microsoft YaHei UI', 9),
                       background=CARD_BG,
                       foreground=TEXT_COLOR)
        style.configure('TProgressbar', 
                       background=PRIMARY_COLOR,
                       troughcolor='#E0E0E0')
        style.configure('TEntry',
                       font=('Consolas', 9),
                       padding=5,
                       fieldbackground='white')
        style.configure('TLabelframe',
                       font=('Microsoft YaHei UI', 10, 'bold'),
                       background=CARD_BG,
                       foreground=PRIMARY_COLOR)
        style.configure('TLabelframe.Label',
                       font=('Microsoft YaHei UI', 10, 'bold'),
                       background=CARD_BG,
                       foreground=PRIMARY_COLOR)
        
        # 主框架
        main_frame = ttk.Frame(self.root, style='TFrame')
        main_frame.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)
        
        # 标题栏
        title_frame = ttk.Frame(main_frame, style='Card.TFrame')
        title_frame.pack(fill=tk.X, padx=3, pady=3)
        
        title_label = ttk.Label(title_frame, 
                               text="🚀 Git 上传工具", 
                               style='Title.TLabel')
        title_label.pack(pady=8)
        
        subtitle_label = ttk.Label(title_frame,
                                  text="自动提交和推送到 GitHub",
                                  font=('Microsoft YaHei UI', 9),
                                  foreground='#7F8C8D',
                                  background=CARD_BG)
        subtitle_label.pack(pady=(0, 5))

        # 仓库信息卡片
        repo_frame = ttk.LabelFrame(main_frame, text="📦 仓库信息", padding="10")
        repo_frame.pack(fill=tk.X, pady=5, padx=3)
        
        ttk.Label(repo_frame, text="Owner:", style='Info.TLabel').grid(row=0, column=0, sticky=tk.W, padx=8, pady=5)
        owner_entry = ttk.Entry(repo_frame, textvariable=self.owner, width=25, font=('Consolas', 9))
        owner_entry.grid(row=0, column=1, padx=8, pady=5, sticky=tk.W)
        
        ttk.Label(repo_frame, text="Repo:", style='Info.TLabel').grid(row=0, column=2, sticky=tk.W, padx=8, pady=5)
        repo_entry = ttk.Entry(repo_frame, textvariable=self.repo, width=25, font=('Consolas', 9))
        repo_entry.grid(row=0, column=3, padx=8, pady=5, sticky=tk.W)
        
        ttk.Label(repo_frame, text="分支:", style='Info.TLabel').grid(row=1, column=0, sticky=tk.W, padx=8, pady=5)
        branch_entry = ttk.Entry(repo_frame, textvariable=self.branch, width=25, font=('Consolas', 9))
        branch_entry.grid(row=1, column=1, padx=8, pady=5, sticky=tk.W)

        # 提交信息卡片
        commit_frame = ttk.LabelFrame(main_frame, text="💬 提交信息", padding="10")
        commit_frame.pack(fill=tk.X, pady=5, padx=3)
        
        ttk.Label(commit_frame, text="Commit Message:", style='Info.TLabel').grid(row=0, column=0, sticky=tk.W, padx=8, pady=5)
        commit_entry = ttk.Entry(commit_frame, textvariable=self.commit_message, width=65, font=('Consolas', 9))
        commit_entry.grid(row=0, column=1, padx=8, pady=5, sticky=tk.W+tk.E)

        # 本地目录卡片
        dir_frame = ttk.LabelFrame(main_frame, text="📁 本地目录", padding="10")
        dir_frame.pack(fill=tk.X, pady=5, padx=3)
        
        ttk.Label(dir_frame, text="目录路径:", style='Info.TLabel').grid(row=0, column=0, sticky=tk.W, padx=8, pady=5)
        
        dir_entry = ttk.Entry(dir_frame, textvariable=self.local_dir, width=55, font=('Consolas', 9))
        dir_entry.grid(row=0, column=1, padx=8, pady=5, sticky=tk.W+tk.E)
        
        browse_btn = ttk.Button(dir_frame, text="📂 浏览...", command=self.select_dir, style='Success.TButton')
        browse_btn.grid(row=0, column=2, padx=8, pady=5)

        # 上传选项卡片
        option_frame = ttk.LabelFrame(main_frame, text="⚙️ 上传选项", padding="10")
        option_frame.pack(fill=tk.X, pady=5, padx=3)
        
        self.auto_commit_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(option_frame, text="✓ 自动 git add", variable=self.auto_commit_var).pack(anchor=tk.W, padx=8, pady=3)
        
        self.auto_push_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(option_frame, text="✓ 自动 git push", variable=self.auto_push_var).pack(anchor=tk.W, padx=8, pady=3)
        
        self.force_push_var = tk.BooleanVar(value=False)
        force_cb = ttk.Checkbutton(option_frame, text="⚠️ 强制推送（谨慎使用）", variable=self.force_push_var)
        force_cb.pack(anchor=tk.W, padx=8, pady=3)

        # 进度条卡片
        progress_frame = ttk.LabelFrame(main_frame, text="📊 上传进度", padding="10")
        progress_frame.pack(fill=tk.X, pady=5, padx=3)
        
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(progress_frame, 
                                           variable=self.progress_var, 
                                           maximum=100, 
                                           mode='determinate',
                                           style='TProgressbar')
        self.progress_bar.pack(fill=tk.X, padx=8, pady=6)
        
        self.status_label = ttk.Label(progress_frame, 
                                     text="⏸️ 等待开始", 
                                     font=('Microsoft YaHei UI', 9, 'bold'), 
                                     foreground='#7F8C8D')
        self.status_label.pack(anchor=tk.W, padx=8, pady=3)

        # 日志卡片
        log_frame = ttk.LabelFrame(main_frame, text="📝 上传日志", padding="8")
        log_frame.pack(fill=tk.BOTH, expand=True, pady=5, padx=3)
        
        self.log_text = scrolledtext.ScrolledText(log_frame, 
                                                 height=8, 
                                                 wrap=tk.WORD, 
                                                 font=('Consolas', 9), 
                                                 bg='#F8F9FA', 
                                                 fg='#2C3E50',
                                                 relief='flat',
                                                 borderwidth=0)
        self.log_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=3)

        # 按钮区域
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(fill=tk.X, pady=8, padx=3)
        
        self.upload_btn = ttk.Button(btn_frame, 
                                    text="🚀 开始上传", 
                                    command=self.start_upload,
                                    style='Success.TButton')
        self.upload_btn.pack(side=tk.LEFT, padx=5)
        
        self.cancel_btn = ttk.Button(btn_frame, 
                                    text="⛔ 取消", 
                                    command=self.cancel_upload, 
                                    state=tk.DISABLED,
                                    style='Danger.TButton')
        self.cancel_btn.pack(side=tk.LEFT, padx=5)
        
        clear_btn = ttk.Button(btn_frame, 
                              text="🧹 清空日志", 
                              command=self.clear_log)
        clear_btn.pack(side=tk.LEFT, padx=5)
        
        # 底部信息
        info_frame = ttk.Frame(main_frame)
        info_frame.pack(fill=tk.X, pady=5, padx=3)
        
        info_label = ttk.Label(info_frame,
                              text="提示: 请确保已配置 Git 和远程仓库 | 代理: 127.0.0.1:3067",
                              font=('Microsoft YaHei UI', 8),
                              foreground='#95A5A6')
        info_label.pack()

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
