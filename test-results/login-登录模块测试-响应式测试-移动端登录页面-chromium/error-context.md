# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img "越南达昌科技有限公司"
      - generic [ref=e6]: 越南达昌科技有限公司
    - generic [ref=e7]:
      - heading "欢迎回来！" [level=1] [ref=e8]
      - paragraph [ref=e9]: 请输入您的登录信息
    - generic [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]: 用户名
        - textbox "用户名" [ref=e13]:
          - /placeholder: 请输入用户名
      - generic [ref=e14]:
        - generic [ref=e15]: 密码
        - generic [ref=e16]:
          - textbox "密码" [ref=e17]:
            - /placeholder: 请输入密码
          - button [ref=e18]:
            - img [ref=e19]
      - generic [ref=e23]:
        - checkbox "记住我" [ref=e24]
        - checkbox
        - generic [ref=e25] [cursor=pointer]: 记住我
      - button "登 录" [ref=e26]
  - alert [ref=e28]
```