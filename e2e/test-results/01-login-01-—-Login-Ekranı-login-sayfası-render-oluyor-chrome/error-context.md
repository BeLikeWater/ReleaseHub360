# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e7]
      - heading "ReleaseHub360" [level=5] [ref=e9]
      - paragraph [ref=e10]: Hesabınıza giriş yapın
    - tablist [ref=e13]:
      - tab "Kurum Girişi" [selected] [ref=e14] [cursor=pointer]:
        - img [ref=e15]
        - text: Kurum Girişi
      - tab "Müşteri Girişi" [ref=e17] [cursor=pointer]:
        - img [ref=e18]
        - text: Müşteri Girişi
    - generic [ref=e21]:
      - generic [ref=e22]:
        - generic [ref=e23]:
          - text: E-posta
          - generic [ref=e24]: "*"
        - generic [ref=e25]:
          - textbox "E-posta" [active] [ref=e26]
          - group:
            - generic: E-posta *
      - generic [ref=e27]:
        - generic:
          - text: Şifre
          - generic: "*"
        - generic [ref=e28]:
          - textbox "Şifre" [ref=e29]
          - group:
            - generic: Şifre *
      - button "Giriş Yap" [ref=e30] [cursor=pointer]
  - generic [ref=e31]:
    - img [ref=e33]
    - button "Open Tanstack query devtools" [ref=e81] [cursor=pointer]:
      - img [ref=e82]
```