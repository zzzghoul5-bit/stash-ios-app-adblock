# 端点状态

状态定义：

- `verified`：已用用户当前 App 版本的脱敏抓包验证；
- `upstream-only`：近期公开上游支持，已有 fixture 和回归测试，但未用用户设备验证；
- `capture-required`：需要用户抓包才能安全处理；
- `disabled-risky`：容易误伤正常业务，默认禁用；
- `obsolete`：已知旧接口，仅保留记录。

## B 站

| 端点组 | 处理 | 状态 | 默认启用 | 来源 |
|---|---|---|---:|---|
| `/x/v2/splash/{show,list,brand/list,event/list2}` | 删除 `data.event_list/preload/show`，保留 `account` | upstream-only | 是 | Biliverse v0.7.3 |
| `/x/v2/feed/index` | 精确卡片组合和 `banner_item.type=ad` | upstream-only | 是 | Biliverse v0.7.3 |
| `/x/v2/feed/index/story` | `ad_info` 或三个精确 `vertical_ad_*` 值 | upstream-only | 是 | Biliverse v0.7.3 |
| `/bilibili.app.viewunite.v1.View/AIRelateAsync` | 上游在多个 B 站 gRPC 主机增加异步相关推荐广告过滤；需要当前 App 的脱敏 Protobuf 样本、实际主机和专门处理 | capture-required | 否 | Biliverse v0.7.3 |
| 课程、游戏、活动、直播带货 | 与本项目目标无关且误伤风险高 | disabled-risky | 否 | — |

计数：`verified=0`，`upstream-only=3`，`capture-required=1`，`disabled-risky=1`。

## 知乎

| 端点组 | 处理 | 状态 | 默认启用 | 来源 |
|---|---|---|---:|---|
| `/commercial_api/{launch_v2,real_time_launch_v2}` | `reject-dict` | upstream-only | 是 | fmz200 + blackmatrix7 |
| `/commercial_api/{answer/:id/bottom-v2,article/:id/bottom-v2}` | `reject-dict` | upstream-only | 是 | fmz200 + blackmatrix7 |
| `/commercial_api/banners_v3/app_topstory_banner` | `reject-dict` | upstream-only | 是 | fmz200 + blackmatrix7 |
| `/ad-style-service/request` | `reject-dict` | upstream-only | 是 | fmz200 + blackmatrix7 |
| `/commercial_api/app_float_layer` | 仅删除 `feed_egg` | upstream-only | 是 | fmz200 |
| `/topstory/recommend` | 过滤 `feed_advert`、非空 `ad/adjson`，并把 `promotion_extra` 限定到已知卡型 | upstream-only | 是 | fmz200 + blackmatrix7 |
| `/(v4/)questions/:id/{feed,feeds,answers}` | 仅删除 `ad_info` | upstream-only | 是 | fmz200 + blackmatrix7 |
| `next-bff`、`next-data`、`next-render` | 历史上有空白页/下一回答回归 | disabled-risky | 否 | 上游 Issue |
| 评论、相关内容、搜索、热榜、活动、直播 | 接口范围过大或内容边界不清 | capture-required | 否 | — |
| `api.zhihu.com` 的 QUIC 回退 | 仅在日志确认脚本未命中时考虑 | capture-required | 否 | 上游 Issue |

计数：`verified=0`，`upstream-only=7`，`capture-required=2`，`disabled-risky=1`。

## 淘宝

| 端点组 | 处理 | 状态 | 默认启用 | 来源 |
|---|---|---|---:|---|
| `/gw/mtop.taobao.wireless.home.splash.awesome.get/[数字版本]` | 保留数组，仅令已有时间、标志和素材字段失效 | upstream-only（单一实现谱系） | 是 | zirawell + fmz200 |
| cloudvideo、PopLayer、second-floor | 需要当前 App 抓包确认 | capture-required | 否 | 社区候选 |
| `acs.m.taobao.com` 上的共享广告/业务接口 | 会误伤商品、登录或其他业务 | disabled-risky | 否 | — |
| 商品推荐、搜索、购物车、订单、登录、支付、风控 | 明确不在项目范围 | disabled-risky | 否 | — |

计数：`verified=0`，`upstream-only=1`，`capture-required=1`，`disabled-risky=2`。

淘宝的两个公开快照具有相同代码指纹，不能算独立验证；模块必须由用户主动导入并启用，第一次启用后应检查启动、登录、搜索、购物车和订单。

## 最后审计

- 日期：2026-10-15
- 方式：固定提交审计、按 App 来源强度评估、脱敏 fixture 回归测试
- 用户设备验证：尚未进行

本次审计发现 Biliverse v0.7.3 新增 `AIRelateAsync` 处理。上游测试使用合成 wire fixture，并非用户抓包；由于本项目没有用户当前版本的脱敏 Protobuf 样本，未增加 MitM 主机、URL 匹配或默认启用逻辑，其状态保持为 `capture-required`。知乎监控文件无变化；淘宝监控模块只有图标 URL 修正，过滤行为无变化。
