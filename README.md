# iOS Stash 应用内广告过滤

这是一个面向 iOS Stash 的保守型去广告项目，目标是过滤：

- B 站：开屏、首页推荐流中的明确广告卡片、竖屏故事广告；
- 知乎：开屏/商业独立接口、推荐流中的明确广告对象、回答接口中的广告字段；
- 淘宝：仅开屏广告。

三个模块可以独立启用和回滚。项目接受 MitM、URL Rewrite 和 HTTP Response Script，但不修改会员、账号、地区限制、商品、搜索、购物车、订单、登录或支付功能。

## 当前状态

| App | 默认启用的端点组 | 用户抓包验证 | 状态 |
|---|---:|---:|---|
| B 站 | 3 | 0 | upstream-only |
| 知乎 | 7 | 0 | upstream-only |
| 淘宝 | 1 | 0 | upstream-only（单一实现谱系，建议先小范围试用） |

`upstream-only` 表示端点由近期公开上游支持，但尚未在你的 App 版本和网络环境中用真实抓包验证。每周检查可以发现上游变化并执行回归测试，不能保证 App 服务端接口永远不变。接口失效或证书固定时，仍需要脱敏 Stash 日志做第二轮适配。

详细状态见 [ENDPOINT_STATUS.md](ENDPOINT_STATUS.md)。

## 文件

可直接导入 Stash 的自包含覆写位于：

- `overrides/Bilibili-ADBlock.stoverride`
- `overrides/Zhihu-ADBlock.stoverride`
- `overrides/Taobao-Splash-ADBlock.stoverride`

每个覆写都内嵌了对应脚本作为首次安装和断网回退，同时通过 `script-providers.url`、`path` 与 `interval: 86400` 每天检查公开仓库中的脚本更新，适用于支持 `script-providers.payload` 的 Stash 3.2.5 或更高版本。`scripts/` 是可审查的脚本源文件，`templates/` 是覆写模板；请勿手工修改生成的 `overrides/`。

## 构建和校验

要求 Node.js 20+、Python 3.10+ 和 PyYAML。

```powershell
npm run build
npm test
npm run validate
```

一次执行全部检查：

```powershell
npm run check
```

本项目没有 npm 第三方依赖。测试通过 Node.js 内置测试框架在沙盒中执行实际 Stash 脚本，覆盖广告删除、正常内容保留、未知结构、非 JSON、空响应、分页字段和敏感业务样本。

## 在 Stash 中安装

1. 在 Stash 中生成自己的 CA：`设置 → MitM → CA 证书 → Stash Generated CA`。
2. 安装描述文件后，到 iOS 的 `设置 → 通用 → 关于本机 → 证书信任设置`，完全信任该 CA。
3. 打开 [INSTALL.md](INSTALL.md)，使用对应 App 的一键安装链接导入 `.stoverride`。
4. 在 Stash 中打开该覆写，并确认覆写、改写、MitM 和脚本功能已启用。
5. 第一次只启用一个模块，强制退出并重新打开对应 App 后测试。
6. 依次测试登录、搜索、播放/回答、购物车和订单查看；发现异常立即关闭对应覆写。

不要导入他人提供的 CA，也不要把自己的 CA、P12、密码或私钥放进本仓库。

### URL 安装与自动更新

公开仓库：

```text
https://github.com/zzzghoul5-bit/stash-ios-app-adblock
```

三个可直接导入的 Raw URL 与 Stash 一键安装链接见 [INSTALL.md](INSTALL.md)。

- 响应脚本：Stash 每 86400 秒检查一次 `main` 上对应的 JS 文件；
- 覆写结构：URL 匹配、MitM 主机或脚本提供器配置改变后，需要在 Stash 中执行一次“更新全部覆写”；
- 仓库维护：每周自动审计上游并运行全部测试，只有安全边界不扩大且测试通过的变更才允许推送；
- 回滚：GitHub 历史保留每次发布，需要时可改用某个固定提交的 Raw URL。

## MitM 最小范围

| 主机 | App | 必要性 |
|---|---|---|
| `app.bilibili.com` | B 站 | 开屏和推荐流 JSON |
| `app.biliapi.net` | B 站 | 同一组新版 API 的备用主机 |
| `api.zhihu.com` | 知乎 | 精确商业端点和推荐/回答 JSON |
| `guide-acs.m.taobao.com` | 淘宝 | 精确开屏 MTop 响应 |

没有使用 `*.taobao.com`、`acs.m.taobao.com`、根域名 REJECT 或全局 UDP 443 拦截。

## 回滚

出现登录、内容加载、播放、回答、商品、购物车、订单或支付异常时：

1. 立即关闭对应 App 的覆写；
2. 强制退出并重新打开 App；
3. 若仍异常，关闭 Stash MitM 后复测；
4. 保留异常发生时间和脱敏 HTTP 日志，不要扩大主机通配符尝试修复。

三个覆写互不依赖，关闭其中一个不会影响另外两个。

## 抓包后的第二轮适配

先阅读 [captures/README.md](captures/README.md)。对响应样本脱敏后，可在电脑上验证脚本是否会修改它：

```powershell
node tools/inspect-response.mjs `
  --app bilibili `
  --url "https://app.bilibili.com/x/v2/feed/index" `
  --file ".\captures\private\response.json"
```

工具默认只输出端点、字节数、SHA-256 和脚本日志，不打印完整响应。

## 每周上游检查

手动检查：

```powershell
npm run check:updates
```

离线检查锁定文件结构：

```powershell
npm run check:updates:offline
```

在线检查的退出码：

- `0`：受监控文件没有相关变化；
- `2`：有变化，需要人工审计；
- `3`：网络或 GitHub API 检查失败。

更新工具本身不会替换脚本或扩大 MitM。每周维护任务发现变化后，会固定新提交、比较目标端点、补 fixture 并执行 `npm run check`；只有全部通过且没有新增高风险端点时才发布，否则只报告并保持当前稳定版本。

## 能力边界

- Stash 可以在 MitM 成功时按 URL 和 JSON 内容过滤，但无法保证处理证书固定的接口。
- HTTP/3/QUIC 流量可能绕过普通 HTTP 引擎。项目没有默认禁用 UDP 443；只有日志确认目标主机受 QUIC 影响时，才应做精确主机回退。
- App 更新可能改变路径、响应字段或把广告与正常内容混在新的结构中。脚本遇到未知结构会原样放行，因此可能漏广告，但不会主动清空正常响应。
- 淘宝模块刻意只处理开屏；商品推荐和营销内容不在范围内。

更多不能安全启用的规则见 [UNSUPPORTED.md](UNSUPPORTED.md)，来源与许可证见 [SOURCES.md](SOURCES.md)。

## 官方 Stash 文档

- [覆写](https://stash.wiki/en/configuration/override)
- [MitM](https://stash.wiki/en/http-engine/mitm)
- [URL Rewrite](https://stash.wiki/http-engine/rewrite)
- [HTTP Response Script](https://stash.wiki/en/script/rewrite-requests)
- [Script Provider](https://stash.wiki/en/script/manage-script)
