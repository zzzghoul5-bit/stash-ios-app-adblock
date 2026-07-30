# 提供脱敏抓包

只有在公开上游和你的 App 版本不一致时才需要抓包。请只截取广告出现前后几秒内、目标 App 的相关记录。

## 可以提供

- 请求方法；
- 精确主机名和 URL 路径；
- 已删除查询参数值的 URL；
- 脱敏后的 JSON 响应；
- App 版本、iOS 版本、Stash 版本和广告出现时间。

## 必须删除

- Cookie、Authorization、Token、签名和 Session；
- 手机号、邮箱、真实姓名和地址；
- 用户 ID、设备 ID、广告 ID；
- 商品订单号、支付信息和风控字段；
- Stash CA、私钥和证书密码。

请把未经确认安全的文件放在 `captures/private/`；该目录已被 Git 忽略。不要把原始抓包直接放进 `tests/fixtures/`。

## 最小验证流程

1. 复制一份响应并完成脱敏；
2. 用 `tools/inspect-response.mjs` 检查当前脚本是否命中；
3. 为新结构添加最小 fixture；
4. 只增加明确正向广告字段；
5. 运行 `npm run check`；
6. 在真机上仅启用一个覆写复测。
