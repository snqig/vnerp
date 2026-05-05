# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img "越南达昌丝网印刷有限公司" [ref=e6]
      - generic [ref=e7]: 越南达昌丝网印刷有限公司
    - generic [ref=e8]:
      - heading "欢迎回来！" [level=1] [ref=e9]
      - paragraph [ref=e10]: 请输入您的登录信息
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]: 用户名
        - textbox "用户名" [ref=e14]:
          - /placeholder: 请输入用户名
          - text: admin
      - generic [ref=e15]:
        - generic [ref=e16]: 密码
        - generic [ref=e17]:
          - textbox "密码" [ref=e18]:
            - /placeholder: 请输入密码
            - text: admin
          - button [ref=e19]:
            - img [ref=e20]
      - generic [ref=e24]:
        - checkbox "记住我" [ref=e25]
        - checkbox
        - generic [ref=e26] [cursor=pointer]: 记住我
      - generic [ref=e27]: 账号已锁定，请9分钟后再试
      - button "登 录" [ref=e28]
  - alert [ref=e30]
```