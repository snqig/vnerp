import requests
import json

def init_seed_data():
    """初始化种子数据"""
    url = "http://192.168.0.158:5000/api/init/settings-seed"
    
    try:
        print("正在调用种子数据初始化API...")
        response = requests.post(url)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("\n✅ 种子数据初始化成功！")
                print("\n统计数据:")
                stats = result.get('data', {})
                for key, value in stats.items():
                    print(f"  - {key}: {value} 条")
                
                print("\n初始化内容:")
                print("  ✅ 10个部门")
                print("  ✅ 10个角色")
                print("  ✅ 10个用户")
                print("  ✅ 10个仓库分类")
                print("  ✅ 10个物料分类")
                print("  ✅ 100+条字典数据")
                print("  ✅ 系统配置")
                print("  ✅ 通知公告")
                print("  ✅ 登录日志")
                print("  ✅ 操作日志")
                
                print("\n默认账号:")
                print("  admin / admin123")
                print("  zhangwei / admin123")
                print("  lina / admin123")
                print("  wangqiang / admin123")
                print("  liuyang / admin123")
                return True
            else:
                print(f"\n❌ 初始化失败: {result.get('message')}")
                return False
        else:
            print(f"\n❌ HTTP错误: {response.status_code}")
            return False
    except Exception as e:
        print(f"\n❌ 请求失败: {str(e)}")
        return False

if __name__ == "__main__":
    success = init_seed_data()
    if success:
        print("\n🎉 可以访问页面 http://192.168.0.158:5000/settings/user 查看用户列表")
        print("🎉 可以访问页面 http://192.168.0.158:5000/settings/organization 查看组织设置")
        print("🎉 可以访问页面 http://192.168.0.158:5000/dashboard/quality 查看质量仪表板")
