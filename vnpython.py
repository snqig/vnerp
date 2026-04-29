#!/usr/bin/env python3
"""
GitHub 目录批量上传工具（增强版）
功能：图形界面、进度条、增量上传（仅上传修改的文件）、断点续传
作者：snqig
更新日期：2026-04-29
"""

import os
import base64
import time
import threading
import json
import hashlib
from pathlib import Path
from datetime import datetime
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext

import requests

# ========== 配置 ==========
DEFAULT_OWNER = "snqig"
DEFAULT_REPO = "vnerp"
DEFAULT_BRANCH = "main"
API_BASE = "https://api.github.com"
CACHE_FILE = ".github_upload_cache.json"  # 保存在脚本同目录或用户目录

# 代理配置
PROXY_CONFIG = {
    "http": "http://127.0.0.1:3067",
    "https": "http://127.0.0.1:3067"
}


class GitHubUploader:
    def __init__(self, root):
        self.root = root
        self.root.title("🚀 GitHub 上传工具 - 增量同步 + 断点续传")
        self.root.geometry("850x700")
        self.root.resizable(True, True)
        
        # 设置窗口图标（如果有的话）
        try:
            self.root.iconbitmap(default='icon.ico')
        except:
            pass

        self.token = tk.StringVar()
        self.owner = tk.StringVar(value=DEFAULT_OWNER)
        self.repo = tk.StringVar(value=DEFAULT_REPO)
        self.branch = tk.StringVar(value=DEFAULT_BRANCH)
        self.remote_root = tk.StringVar()
        self.local_dir = tk.StringVar()

        self.uploading = False
        self.stop_flag = False
        self.cache = {}          # 缓存结构: {remote_path: {"sha": "xxx", "mtime": 1234567890.0}}
        self.cache_file_path = None

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

        # 认证与分支
        auth_frame = ttk.LabelFrame(main_frame, text="🔐 认证与分支", padding="10")
        auth_frame.pack(fill=tk.X, pady=8)
        
        ttk.Label(auth_frame, text="GitHub Token:", style='Header.TLabel').grid(row=0, column=0, sticky=tk.W, padx=8, pady=5)
        ttk.Entry(auth_frame, textvariable=self.token, width=60, show="*", font=('Consolas', 9)).grid(row=0, column=1, columnspan=3, padx=8, pady=5, sticky=tk.W+tk.E)
        
        ttk.Label(auth_frame, text="分支:", style='Header.TLabel').grid(row=1, column=0, sticky=tk.W, padx=8, pady=5)
        ttk.Entry(auth_frame, textvariable=self.branch, width=30, font=('Consolas', 9)).grid(row=1, column=1, padx=8, pady=5, sticky=tk.W)
        
        ttk.Label(auth_frame, text="远程根路径:", style='Header.TLabel').grid(row=1, column=2, sticky=tk.W, padx=8, pady=5)
        ttk.Entry(auth_frame, textvariable=self.remote_root, width=30, font=('Consolas', 9)).grid(row=1, column=3, padx=8, pady=5, sticky=tk.W)

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
        
        self.incremental_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(option_frame, text="✓ 增量上传（仅上传修改过的文件）", variable=self.incremental_var).pack(anchor=tk.W, padx=8, pady=3)
        
        self.resume_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(option_frame, text="✓ 断点续传（使用本地缓存，跳过已成功文件）", variable=self.resume_var).pack(anchor=tk.W, padx=8, pady=3)
        
        ttk.Button(option_frame, text="🗑️ 清除缓存（强制全量上传）", command=self.clear_cache).pack(anchor=tk.W, padx=8, pady=5)

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
            self.log("⚠️ 正在取消上传...")
            self.cancel_btn.config(state=tk.DISABLED)

    def clear_cache(self):
        """删除本地上传缓存文件"""
        if self.cache_file_path and self.cache_file_path.exists():
            self.cache_file_path.unlink()
            self.log("✅ 已清除缓存，下次上传将全量同步")
        else:
            self.log("ℹ️ 暂无缓存文件")

    def load_cache(self):
        """加载续传缓存"""
        if not self.resume_var.get():
            self.cache = {}
            return
        if not self.cache_file_path or not self.cache_file_path.exists():
            self.cache = {}
            return
        try:
            with open(self.cache_file_path, 'r', encoding='utf-8') as f:
                self.cache = json.load(f)
            self.log(f"📦 加载续传缓存，已记录 {len(self.cache)} 个文件")
        except Exception as e:
            self.log(f"⚠️ 加载缓存失败: {e}", is_error=True)
            self.cache = {}

    def save_cache(self):
        """保存续传缓存"""
        if not self.resume_var.get():
            return
        try:
            with open(self.cache_file_path, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, indent=2)
        except Exception as e:
            self.log(f"⚠️ 保存缓存失败: {e}", is_error=True)

    def compute_local_sha1(self, file_path):
        """计算本地文件的 SHA-1（GitHub 使用 SHA-1 作为文件内容的标识）"""
        sha1 = hashlib.sha1()
        with open(file_path, 'rb') as f:
            while chunk := f.read(8192):
                sha1.update(chunk)
        return sha1.hexdigest()

    def get_session(self):
        """创建带有代理的 requests session"""
        session = requests.Session()
        session.proxies = PROXY_CONFIG
        session.verify = True  # SSL 验证
        return session
    
    def get_remote_file_sha(self, token, owner, repo, file_path, branch):
        """获取远程文件的 SHA，若文件不存在返回 None"""
        url = f"{API_BASE}/repos/{owner}/{repo}/contents/{file_path}"
        params = {"ref": branch}
        headers = {
            "Authorization": f"token {token}", 
            "Accept": "application/vnd.github.v3+json"
        }
        
        session = self.get_session()
        try:
            resp = session.get(url, headers=headers, params=params, timeout=30)
            if resp.status_code == 200:
                return resp.json().get("sha")
            elif resp.status_code == 404:
                return None
            else:
                return None
        except requests.exceptions.RequestException as e:
            self.log(f"网络请求失败: {e}", is_error=True)
            return None

    def upload_single_file(self, token, owner, repo, remote_path, local_path, branch):
        """上传或更新单个文件，返回是否成功"""
        try:
            with open(local_path, "rb") as f:
                content_bytes = f.read()
            if len(content_bytes) > 100 * 1024 * 1024:
                self.log(f"⚠️ 文件超过 100MB，跳过: {remote_path}", is_error=True)
                return False
            content_b64 = base64.b64encode(content_bytes).decode("utf-8")
        except Exception as e:
            self.log(f"读取文件失败: {e}", is_error=True)
            return False

        # 获取现有文件的 SHA
        sha = self.get_remote_file_sha(token, owner, repo, remote_path, branch)

        url = f"{API_BASE}/repos/{owner}/{repo}/contents/{remote_path}"
        headers = {
            "Authorization": f"token {token}", 
            "Accept": "application/vnd.github.v3+json"
        }
        payload = {
            "message": f"📤 Upload {remote_path}",
            "content": content_b64,
            "branch": branch,
        }
        if sha:
            payload["sha"] = sha

        session = self.get_session()
        try:
            resp = session.put(url, headers=headers, json=payload, timeout=60)
            if resp.status_code in (200, 201):
                # 上传成功后，获取最新的 SHA
                new_sha = resp.json().get("content", {}).get("sha")
                return new_sha
            else:
                error_msg = resp.json().get("message", resp.text)
                self.log(f"API错误 {resp.status_code}: {error_msg}", is_error=True)
                return None
        except Exception as e:
            self.log(f"上传请求异常: {e}", is_error=True)
            return None

    def start_upload(self):
        token = self.token.get().strip()
        if not token:
            messagebox.showerror("错误", "请输入 GitHub Token")
            return
        local_dir = self.local_dir.get().strip()
        if not local_dir or not os.path.isdir(local_dir):
            messagebox.showerror("错误", "请选择一个有效的本地目录")
            return

        # 确定缓存文件路径（放在本地目录下，方便每个项目独立）
        local_path_obj = Path(local_dir)
        self.cache_file_path = local_path_obj / CACHE_FILE

        self.uploading = True
        self.stop_flag = False
        self.upload_btn.config(state=tk.DISABLED)
        self.cancel_btn.config(state=tk.NORMAL)
        self.progress_var.set(0)
        self.status_label.config(text="正在扫描文件...")
        self.clear_log()

        thread = threading.Thread(target=self.upload_worker, daemon=True)
        thread.start()

    def upload_worker(self):
        try:
            token = self.token.get().strip()
            owner = self.owner.get().strip()
            repo = self.repo.get().strip()
            branch = self.branch.get().strip()
            remote_root = self.remote_root.get().strip()
            local_dir = self.local_dir.get().strip()
            local_path = Path(local_dir)

            # 加载续传缓存
            self.load_cache()

            # 收集所有本地文件
            all_files = [f for f in local_path.rglob("*") if f.is_file()]
            total = len(all_files)
            if total == 0:
                self.log("❌ 目录中没有文件可上传")
                return

            self.log(f"🔍 找到 {total} 个文件", is_success=True)
            self.log(f"🎯 目标仓库: {owner}/{repo}:{branch}", is_info=True)

            # 过滤需要上传的文件（增量判断）
            to_upload = []
            skipped_count = 0
            for idx, local_file in enumerate(all_files, 1):
                if self.stop_flag:
                    break
                rel_path = local_file.relative_to(local_path)
                if remote_root:
                    remote_path = f"{remote_root}/{rel_path.as_posix()}"
                else:
                    remote_path = rel_path.as_posix()

                # 1. 检查缓存和增量选项
                if self.incremental_var.get() or self.resume_var.get():
                    cached = self.cache.get(remote_path)
                    if cached:
                        cached_sha = cached.get("sha")
                        cached_mtime = cached.get("mtime")
                        # 获取本地文件修改时间和 SHA
                        local_mtime = local_file.stat().st_mtime
                        # 如果本地文件未修改且 SHA 匹配远程（缓存中的 SHA 可信），则跳过
                        if (cached_mtime and abs(local_mtime - cached_mtime) < 1.0) and cached_sha:
                            # 可选：验证远程 SHA 是否一致（网络请求开销大，信任缓存）
                            self.log(f"[{idx}/{total}] ⏭️ 跳过未修改: {remote_path}", is_info=True)
                            skipped_count += 1
                            continue
                        else:
                            # 需要重新上传
                            pass
                    else:
                        # 无缓存，需要上传
                        pass

                to_upload.append((local_file, remote_path))

            # 如果需要全量上传（未开启增量+续传），则 to_upload 已经是所有文件
            if self.incremental_var.get() or self.resume_var.get():
                self.log(f"📊 需要上传: {len(to_upload)} 个文件（跳过 {skipped_count} 个未修改的）")
            else:
                to_upload = [(f, (remote_root + "/" if remote_root else "") + f.relative_to(local_path).as_posix()) for f in all_files]
                self.log(f"📊 全量上传: {len(to_upload)} 个文件")

            total_upload = len(to_upload)
            if total_upload == 0:
                self.log("所有文件已是最新，无需上传")
                return

            success_count = 0
            fail_count = 0
            for idx, (local_file, remote_path) in enumerate(to_upload, 1):
                if self.stop_flag:
                    self.log("⚠️ 上传已取消")
                    break

                self.status_label.config(text=f"正在上传 ({idx}/{total_upload}): {remote_path}")
                self.progress_var.set((idx - 1) / total_upload * 100)

                # 获取本地文件修改时间（用于缓存）
                local_mtime = local_file.stat().st_mtime

                sha = self.upload_single_file(token, owner, repo, remote_path, str(local_file), branch)
                if sha:
                    success_count += 1
                    self.log(f"[{idx}/{total_upload}] ✅ 上传成功: {remote_path}", is_success=True)
                    # 更新缓存
                    if self.resume_var.get():
                        self.cache[remote_path] = {
                            "sha": sha,
                            "mtime": local_mtime,
                            "name": local_file.name
                        }
                        self.save_cache()
                else:
                    fail_count += 1
                    self.log(f"[{idx}/{total_upload}] ❌ 上传失败: {remote_path}", is_error=True)

                time.sleep(0.3)  # 限流

            self.progress_var.set(100)
            self.status_label.config(text=f"上传完成 成功:{success_count} 失败:{fail_count}")
            self.log(f"\n🎉 上传完成！成功 {success_count} 个，失败 {fail_count} 个", is_success=True)
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
