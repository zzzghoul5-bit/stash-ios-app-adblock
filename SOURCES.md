# 上游来源

所有启用逻辑都采用 `behavioral-reference`：固定公开版本用于核对端点和正向广告特征，本项目重新编写最小实现，没有复制、镜像或内嵌上游脚本。精确提交、文件哈希和更新策略见 `upstreams/upstreams.lock.json`。

## B 站

### Biliverse/ADBlock

- 仓库：https://github.com/Biliverse/ADBlock
- 固定版本：`v0.7.3`
- 固定提交：`bf9f66250fe97383847ffabfcb6183fed752e181`
- 发布时间：2026-10-08
- 获取日期：2026-10-15
- 许可证：Apache-2.0
- 使用方式：behavioral-reference
- 人工筛选：是

项目已由 `BiliUniverse` 更名为 `Biliverse`。只保留开屏、推荐流和竖屏故事中的广告接口与精确正向标记。v0.7.3 新增的 `AIRelateAsync` 处理已记录为 `capture-required`；上游测试使用合成 wire fixture，在取得用户当前版本的脱敏 Protobuf 样本前不启用。没有采用账号字段删除、请求重签名、缓存重取、会员/地区/清晰度修改、游戏或活动清理等功能。

## 知乎

### fmz200/wool_scripts

- 仓库：https://github.com/fmz200/wool_scripts
- 固定提交：`5d5f63fcf98bc69d5f8f1b1bae6f86a01ee4bb97`
- 获取日期：2026-10-15
- 许可证：GPL-3.0
- 使用方式：behavioral-reference
- 人工筛选：是

用于核对精确商业端点、推荐流和回答接口字段。没有复制其脚本，也没有启用搜索、评论、热榜或其他大范围处理。

### blackmatrix7/ios_rule_script

- 仓库：https://github.com/blackmatrix7/ios_rule_script
- 固定提交：`d8363caa2c1e47fb735615316032bed3f475ee57`
- 获取日期：2026-10-15
- 许可证：GPL-2.0，且仓库 README 另有转载/发布限制
- 使用方式：behavioral-reference
- 人工筛选：是

只用固定仓库快照交叉核对端点和历史回归风险。没有复制、修改或重新托管其代码，也没有采用覆写中未固定版本的 Gist 脚本 URL。

## 淘宝

### zirawell/R-Store

- 仓库：https://github.com/zirawell/R-Store
- 固定提交：`3118ed2e25193192e56d94effa6b3ebec9572e17`
- 获取日期：2026-10-15
- 许可证：GPL-3.0
- 使用方式：behavioral-reference
- 人工筛选：是

### fmz200/wool_scripts

- 仓库：https://github.com/fmz200/wool_scripts
- 固定提交：`5d5f63fcf98bc69d5f8f1b1bae6f86a01ee4bb97`
- 获取日期：2026-10-15
- 许可证：GPL-3.0
- 使用方式：behavioral-reference
- 人工筛选：是

淘宝参考的两个维护快照高度同源，不能视为两个独立实现；因此状态明确标为单一实现谱系。本次 zirawell 监控模块只修正展示图标 URL，规则和脚本未变。脚本只处理共同出现的 `guide-acs.m.taobao.com` 开屏接口，保留 `taobao-splash.data` 数组、元素顺序和未知字段，仅修改对象中已存在的开屏时间、标志及素材字段。没有启用共享 `acs.m.taobao.com`、商品推荐、PopLayer、登录、交易、订单、支付或风控规则。

## 未采用的来源

无许可证、只存在转载镜像、明确禁止修改/再分发或只提供滚动地址而不能固定版本的项目，不作为代码来源。它们即使包含相似规则，也不会被自动加入本项目。
