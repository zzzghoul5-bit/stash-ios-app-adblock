# 上游来源

所有启用逻辑都采用 `behavioral-reference`：固定公开版本用于核对端点和正向广告特征，本项目重新编写最小实现，没有复制、镜像或内嵌上游脚本。精确提交、文件哈希和更新策略见 `upstreams/upstreams.lock.json`。

## B 站

### BiliUniverse/ADBlock

- 仓库：https://github.com/BiliUniverse/ADBlock
- 固定版本：`v0.6.24`
- 固定提交：`2879496ca5e18f2bb0efb7ce1582415f52524a7c`
- 发布时间：2026-02-01
- 许可证：Apache-2.0
- 使用方式：behavioral-reference
- 人工筛选：是

只保留开屏、推荐流和竖屏故事中的广告接口与精确正向标记。没有采用账号字段删除、请求重签名、缓存重取、会员/地区/清晰度修改、游戏或活动清理等功能。

## 知乎

### fmz200/wool_scripts

- 仓库：https://github.com/fmz200/wool_scripts
- 固定提交：`a32915d2aadf9564fd9842114df02c90ca9566a7`
- 获取日期：2026-07-29
- 许可证：GPL-3.0
- 使用方式：behavioral-reference
- 人工筛选：是

用于核对精确商业端点、推荐流和回答接口字段。没有复制其脚本，也没有启用搜索、评论、热榜或其他大范围处理。

### blackmatrix7/ios_rule_script

- 仓库：https://github.com/blackmatrix7/ios_rule_script
- 固定提交：`8818705adee20571a856daf11c9fc69c4929109a`
- 获取日期：2026-07-29
- 许可证：GPL-2.0，且仓库 README 另有转载/发布限制
- 使用方式：behavioral-reference
- 人工筛选：是

只用固定仓库快照交叉核对端点和历史回归风险。没有复制、修改或重新托管其代码，也没有采用覆写中未固定版本的 Gist 脚本 URL。

## 淘宝

### zirawell/R-Store

- 仓库：https://github.com/zirawell/R-Store
- 固定提交：`18a09f484f60eeea4ee24cfcadf53e3b68b7f4ab`
- 获取日期：2026-07-29
- 许可证：GPL-3.0
- 使用方式：behavioral-reference
- 人工筛选：是

### fmz200/wool_scripts

- 仓库：https://github.com/fmz200/wool_scripts
- 固定提交：`a32915d2aadf9564fd9842114df02c90ca9566a7`
- 获取日期：2026-07-29
- 许可证：GPL-3.0
- 使用方式：behavioral-reference
- 人工筛选：是

淘宝参考的两个维护快照高度同源，不能视为两个独立实现；因此状态明确标为单一实现谱系。脚本只处理共同出现的 `guide-acs.m.taobao.com` 开屏接口，保留 `taobao-splash.data` 数组、元素顺序和未知字段，仅修改对象中已存在的开屏时间、标志及素材字段。没有启用共享 `acs.m.taobao.com`、商品推荐、PopLayer、登录、交易、订单、支付或风控规则。

## 未采用的来源

无许可证、只存在转载镜像、明确禁止修改/再分发或只提供滚动地址而不能固定版本的项目，不作为代码来源。它们即使包含相似规则，也不会被自动加入本项目。
