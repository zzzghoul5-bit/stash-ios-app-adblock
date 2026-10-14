# Changelog

## Weekly audit - 2026-10-15

- 固定 Biliverse/ADBlock v0.7.3 及其他受监控上游的最新已审计提交与哈希；
- 将新增 `AIRelateAsync` 广告过滤登记为 `capture-required`，在取得用户脱敏 Protobuf 样本前不默认启用；
- 确认知乎受监控文件无变化，淘宝上游变化仅为模块图标 URL 修正；
- 未修改运行时脚本、URL 匹配、MitM 主机、Provider 结构或默认启用范围。

## 1.1.0 - 2026-07-30

- 增加 GitHub Raw 远程脚本提供器，Stash 每天检查脚本更新；
- 保留内嵌脚本作为首次安装与断网回退；
- 增加公开安装链接和 GitHub Actions 每周校验；
- 明确脚本自动更新与覆写结构手动刷新的边界。

## 1.0.0 - 2026-07-29

- 新增 B 站、知乎、淘宝三个独立 Stash 覆写；
- 新增保守型响应脚本和精确知乎 URL Rewrite；
- 新增脱敏 fixtures、Node.js 回归测试和 YAML 静态校验；
- 新增固定上游锁定、SHA-256 记录和只读更新检查；
- 默认不启用共享核心 API、全局 QUIC 拦截或未经抓包验证的候选。
