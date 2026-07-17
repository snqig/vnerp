# Git 配置优化脚本

本目录包含用于优化 Git 网络连接配置的脚本，解决在某些网络环境下推送失败的问题。

## 问题背景

在部分网络环境下，Git 推送代码到 GitHub 可能会遇到以下错误：
- `Failed to connect to github.com port 443`
- `Recv failure: Connection was reset`
- `Could not connect to server`

这通常是因为 HTTP/2 协议在某些网络环境下不稳定，切换到 HTTP/1.1 协议可以解决这个问题。

## 使用方法

### Windows 用户

```powershell
.\setup-git-config.ps1
```

或双击运行 `setup-git-config.ps1` 文件。

### Mac/Linux 用户

```bash
chmod +x setup-git-config.sh
./setup-git-config.sh
```

## 配置说明

脚本会设置以下 Git 全局配置：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `http.version` | `HTTP/1.1` | 使用 HTTP/1.1 协议 |
| `http.postBuffer` | `524288000` | 增大缓冲区至 500MB |
| `http.lowSpeedLimit` | `0` | 关闭低速限制 |
| `http.lowSpeedTime` | `999999` | 延长超时时间 |

## 手动配置

如果不想使用脚本，可以手动执行以下命令：

```bash
git config --global http.version HTTP/1.1
git config --global http.postBuffer 524288000
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999
```

## 代理配置

如果需要使用 SOCKS5 代理（如 Clash、V2Ray 等），可以添加以下配置：

```bash
git config --global http.proxy socks5://127.0.0.1:3067
git config --global https.proxy socks5://127.0.0.1:3067
```

取消代理：

```bash
git config --global --unset http.proxy
git config --global --unset https.proxy
```

## 验证配置

执行完成后，可以通过以下命令验证配置是否生效：

```bash
git config --global --get http.version
git config --global --get http.postBuffer
```

## 注意事项

1. 配置为全局生效，影响所有 Git 仓库
2. 如果网络环境改善，可以恢复默认配置：
   ```bash
   git config --global --unset http.version
   git config --global --unset http.postBuffer
   git config --global --unset http.lowSpeedLimit
   git config --global --unset http.lowSpeedTime
   ```