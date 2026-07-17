Write-Host "============================================"
Write-Host "         Git 配置优化脚本"
Write-Host "         解决网络连接问题"
Write-Host "============================================"
Write-Host ""

Write-Host "正在配置 Git HTTP/1.1 协议..."
git config --global http.version HTTP/1.1

Write-Host "正在配置 Git 缓冲区大小..."
git config --global http.postBuffer 524288000

Write-Host "正在配置 Git 低速阈值..."
git config --global http.lowSpeedLimit 0

Write-Host "正在配置 Git 低速超时..."
git config --global http.lowSpeedTime 999999

Write-Host ""
Write-Host "配置完成！当前配置："
Write-Host ""
git config --global --get http.version
git config --global --get http.postBuffer
git config --global --get http.lowSpeedLimit
git config --global --get http.lowSpeedTime

Write-Host ""
Write-Host "============================================"
Write-Host "         配置已生效"
Write-Host "         现在可以正常推送代码了"
Write-Host "============================================"