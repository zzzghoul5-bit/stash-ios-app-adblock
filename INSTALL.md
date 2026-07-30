# Stash 安装与自动更新

本项目包含三个可独立启用的 iOS Stash 覆写：哔哩哔哩、知乎和淘宝。建议一次只安装并启用一个模块，确认对应 App 的登录、浏览和播放等正常功能后，再安装下一个。

## 一键安装

在安装了 Stash 的 iPhone 或 iPad 上打开对应链接：

- [安装哔哩哔哩去广告覆写](https://link.stash.ws/install-override/raw.githubusercontent.com/zzzghoul5-bit/stash-ios-app-adblock/main/overrides/Bilibili-ADBlock.stoverride)
- [安装知乎去广告覆写](https://link.stash.ws/install-override/raw.githubusercontent.com/zzzghoul5-bit/stash-ios-app-adblock/main/overrides/Zhihu-ADBlock.stoverride)
- [安装淘宝开屏去广告覆写](https://link.stash.ws/install-override/raw.githubusercontent.com/zzzghoul5-bit/stash-ios-app-adblock/main/overrides/Taobao-Splash-ADBlock.stoverride)

如果一键链接没有自动唤起 Stash，可复制下面的 Raw 地址，在 Stash 的覆写页面选择“从 URL 下载”：

- 哔哩哔哩：<https://raw.githubusercontent.com/zzzghoul5-bit/stash-ios-app-adblock/main/overrides/Bilibili-ADBlock.stoverride>
- 知乎：<https://raw.githubusercontent.com/zzzghoul5-bit/stash-ios-app-adblock/main/overrides/Zhihu-ADBlock.stoverride>
- 淘宝：<https://raw.githubusercontent.com/zzzghoul5-bit/stash-ios-app-adblock/main/overrides/Taobao-Splash-ADBlock.stoverride>

## 首次启用

1. 在 Stash 中自行生成 CA 证书，安装描述文件，并在“设置 → 通用 → 关于本机 → 证书信任设置”中完全信任该证书。
2. 回到 Stash，开启覆写、URL 改写、MitM 和脚本。
3. 分别启用需要的覆写；不要使用来源不明的共享 CA。
4. 打开对应 App 验证效果。如登录、播放、商品浏览或其他正常功能异常，请立即停用对应覆写。

## 自动更新方式

每个覆写中的远程脚本 provider 设置了 `interval: 86400`，因此 Stash 会按约每 24 小时检查并下载脚本更新。脚本内容更新通常不需要重新安装覆写。

URL 匹配、MitM 主机、脚本 provider 配置等属于覆写结构。如果这些内容发生变化，仅更新远程 JavaScript 不够，需要在 Stash 的覆写页面点击“更新全部覆写”（或单独更新对应覆写），让 Stash 重新下载 `.stoverride` 文件。

推荐保持以下流程：

1. 保留上述 GitHub Raw URL 安装方式，不要下载后改成本地静态文件。
2. 让 Stash 自动按 provider 间隔更新脚本。
3. 每周至少一次在 Stash 中点击“更新全部覆写”，同步结构性调整。
4. 更新后逐个验证 App；出现异常时先停用最近更新的模块，再提交脱敏后的请求 URL 与响应样本。

## 安全边界

本项目仅过滤广告，不提供会员、付费内容、账号权限或地区限制绕过。MitM 会让 Stash 检查列出的 HTTPS 主机；请只信任自己生成的 CA，不要导出或公开 CA 私钥、Cookie、Token、订单信息及其他账号数据。
