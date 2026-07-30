from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError as error:
    raise SystemExit("缺少 PyYAML；请先安装 PyYAML 后再运行静态校验。") from error


ROOT = Path(__file__).resolve().parent.parent
EXPECTED = {
    "Bilibili-ADBlock.stoverride": {
        "script": "scripts/bilibili-adblock.js",
        "provider": "local-bilibili-adblock",
        "provider_url": (
            "https://raw.githubusercontent.com/zzzghoul5-bit/"
            "stash-ios-app-adblock/main/scripts/bilibili-adblock.js"
        ),
        "provider_path": "./stash-ios-app-adblock/bilibili-adblock.js",
        "mitm": {"app.bilibili.com", "app.biliapi.net"},
        "script_positive": [
            "https://app.bilibili.com/x/v2/splash/show",
            "https://app.biliapi.net/x/v2/splash/event/list2?x=1",
            "https://app.bilibili.com/x/v2/feed/index?idx=1",
            "https://app.bilibili.com/x/v2/feed/index/story",
        ],
        "rewrite_positive": [],
        "negative": [
            "https://app.bilibili.com/x/v2/account/myinfo",
            "https://api.bilibili.com/x/web-interface/nav",
            "https://bilibili.com/",
        ],
    },
    "Zhihu-ADBlock.stoverride": {
        "script": "scripts/zhihu-adblock.js",
        "provider": "local-zhihu-adblock",
        "provider_url": (
            "https://raw.githubusercontent.com/zzzghoul5-bit/"
            "stash-ios-app-adblock/main/scripts/zhihu-adblock.js"
        ),
        "provider_path": "./stash-ios-app-adblock/zhihu-adblock.js",
        "mitm": {"api.zhihu.com"},
        "script_positive": [
            "https://api.zhihu.com/topstory/recommend?limit=10",
            "https://api.zhihu.com/commercial_api/app_float_layer",
            "https://api.zhihu.com/v4/questions/123/answers?limit=10",
        ],
        "rewrite_positive": [
            "https://api.zhihu.com/commercial_api/launch_v2",
            "https://api.zhihu.com/commercial_api/real_time_launch_v2?x=1",
            "https://api.zhihu.com/commercial_api/answer/123/bottom-v2",
            "https://api.zhihu.com/commercial_api/article/123/bottom-v2",
            "https://api.zhihu.com/commercial_api/banners_v3/app_topstory_banner",
            "https://api.zhihu.com/ad-style-service/request",
        ],
        "negative": [
            "https://api.zhihu.com/people/self",
            "https://api.zhihu.com/account/login",
            "https://api.zhihu.com/questions/123/comments",
            "https://zhihu.com/",
        ],
    },
    "Taobao-Splash-ADBlock.stoverride": {
        "script": "scripts/taobao-splash.js",
        "provider": "local-taobao-splash-adblock",
        "provider_url": (
            "https://raw.githubusercontent.com/zzzghoul5-bit/"
            "stash-ios-app-adblock/main/scripts/taobao-splash.js"
        ),
        "provider_path": "./stash-ios-app-adblock/taobao-splash.js",
        "mitm": {"guide-acs.m.taobao.com"},
        "script_positive": [
            "https://guide-acs.m.taobao.com/gw/mtop.taobao.wireless.home.splash.awesome.get/1.0/",
            "https://guide-acs.m.taobao.com/gw/mtop.taobao.wireless.home.splash.awesome.get?x=1",
        ],
        "rewrite_positive": [],
        "negative": [
            "https://guide-acs.m.taobao.com/gw/mtop.taobao.login/1.0/",
            "https://guide-acs.m.taobao.com/gw/mtop.taobao.order.query/1.0/",
            "https://guide-acs.m.taobao.com/gw/mtop.taobao.wireless.home.splash.awesome.get/unexpected/",
            "https://acs.m.taobao.com/gw/mtop.taobao.wireless.home.splash.awesome.get/1.0/",
            "https://taobao.com/",
        ],
    },
}

FORBIDDEN_HOSTS = {
    "bilibili.com",
    "api.bilibili.com",
    "zhihu.com",
    "taobao.com",
    "acs.m.taobao.com",
    "trade-acs.m.taobao.com",
    "pay.taobao.com",
}
SECRET_PATTERNS = [
    r"BEGIN (?:RSA )?PRIVATE KEY",
    r"BEGIN CERTIFICATE",
    r"\bauthorization\s*:",
    r"\bcookie\s*:",
    r"\bpassphrase\s*:",
    r"\bpassword\s*:",
]


def compile_stash(pattern: str) -> re.Pattern[str]:
    return re.compile(pattern.replace(r"\/", "/"))


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def validate_lock(errors: list[str]) -> None:
    lock_path = ROOT / "upstreams" / "upstreams.lock.json"
    try:
        lock = json.loads(lock_path.read_text(encoding="utf-8"))
    except Exception as error:  # noqa: BLE001
        fail(errors, f"无法读取 upstreams.lock.json: {error}")
        return

    if lock.get("schemaVersion") != 1 or not isinstance(lock.get("upstreams"), list):
        fail(errors, "upstreams.lock.json schema 无效")
        return
    if lock.get("policy", {}).get("automaticReplacement") is not False:
        fail(errors, "上游锁定策略必须禁用自动替换")

    for upstream in lock["upstreams"]:
        if not re.fullmatch(r"[0-9a-f]{40}", upstream.get("pinnedCommit", "")):
            fail(errors, f"{upstream.get('id')} 的 pinnedCommit 无效")
        for watched in upstream.get("watch", []):
            if not re.fullmatch(r"[0-9a-f]{40}", watched.get("gitBlobSha1", "")):
                fail(errors, f"{upstream.get('id')}/{watched.get('path')} blob SHA 无效")
            if not re.fullmatch(r"[0-9a-f]{64}", watched.get("sha256", "")):
                fail(errors, f"{upstream.get('id')}/{watched.get('path')} SHA-256 无效")


def validate_override(
    filename: str, expected: dict[str, object], errors: list[str]
) -> str | None:
    override_path = ROOT / "overrides" / filename
    try:
        text = override_path.read_text(encoding="utf-8")
        document = yaml.safe_load(text)
    except Exception as error:  # noqa: BLE001
        fail(errors, f"{filename} YAML 无法解析: {error}")
        return None

    if not isinstance(document, dict):
        fail(errors, f"{filename} 顶层必须是映射")
        return None
    if "PROCESS-NAME" in text or "PROCESS-PATH" in text:
        fail(errors, f"{filename} 不得使用 iOS 无效的进程规则")
    if re.search(r"\bDOMAIN-KEYWORD\b", text):
        fail(errors, f"{filename} 不得使用 DOMAIN-KEYWORD")
    if any(re.search(pattern, text, re.IGNORECASE) for pattern in SECRET_PATTERNS):
        fail(errors, f"{filename} 疑似包含证书或凭据")

    http = document.get("http")
    if not isinstance(http, dict):
        fail(errors, f"{filename} 缺少 http")
        return None

    mitm = http.get("mitm")
    if not isinstance(mitm, list) or set(mitm) != expected["mitm"]:
        fail(errors, f"{filename} MitM 主机与最小允许集合不一致")
        return None
    for host in mitm:
        if (
            not isinstance(host, str)
            or "*" in host
            or host.startswith(".")
            or host.lower() in FORBIDDEN_HOSTS
        ):
            fail(errors, f"{filename} 包含过宽或禁止的 MitM 主机: {host}")

    script_entries = http.get("script")
    if not isinstance(script_entries, list) or len(script_entries) != 1:
        fail(errors, f"{filename} 必须有且只有一个响应脚本配置")
        return None
    entry = script_entries[0]
    if not isinstance(entry, dict):
        fail(errors, f"{filename} script 配置无效")
        return None
    if (
        entry.get("name") != expected["provider"]
        or entry.get("type") != "response"
        or entry.get("require-body") is not True
        or not isinstance(entry.get("max-size"), int)
        or entry["max-size"] > 4 * 1024 * 1024
    ):
        fail(errors, f"{filename} script 安全参数无效")

    script_patterns = []
    try:
        script_patterns = [compile_stash(entry["match"])]
    except Exception as error:  # noqa: BLE001
        fail(errors, f"{filename} script URL 正则无效: {error}")
    if ".*" in entry.get("match", ""):
        fail(errors, f"{filename} script URL 正则不得使用 .*")

    rewrites: list[re.Pattern[str]] = []
    for rewrite in http.get("url-rewrite", []):
        if not isinstance(rewrite, str) or " - " not in rewrite:
            fail(errors, f"{filename} url-rewrite 格式无效")
            continue
        pattern, action = rewrite.rsplit(" - ", 1)
        if action not in {"reject", "reject-200", "reject-img", "reject-dict", "reject-array"}:
            fail(errors, f"{filename} 使用未允许的 rewrite 动作: {action}")
        if ".*" in pattern:
            fail(errors, f"{filename} rewrite URL 正则不得使用 .*")
        try:
            rewrites.append(compile_stash(pattern))
        except Exception as error:  # noqa: BLE001
            fail(errors, f"{filename} rewrite URL 正则无效: {error}")

    for url in expected["script_positive"]:
        if not any(pattern.search(url) for pattern in script_patterns):
            fail(errors, f"{filename} 未覆盖预期脚本端点: {url}")
    for url in expected["rewrite_positive"]:
        if not any(pattern.search(url) for pattern in rewrites):
            fail(errors, f"{filename} 未覆盖预期 rewrite 端点: {url}")
    for url in expected["negative"]:
        if any(pattern.search(url) for pattern in script_patterns + rewrites):
            fail(errors, f"{filename} 错误匹配敏感或非目标端点: {url}")

    providers = document.get("script-providers")
    if not isinstance(providers, dict) or set(providers) != {expected["provider"]}:
        fail(errors, f"{filename} script-provider 名称不一致")
        return None
    provider = providers[expected["provider"]]
    if not isinstance(provider, dict):
        fail(errors, f"{filename} script-provider 配置无效")
        return None
    if provider.get("url") != expected["provider_url"]:
        fail(errors, f"{filename} provider URL 与发布地址不一致")
    if provider.get("path") != expected["provider_path"]:
        fail(errors, f"{filename} provider path 与稳定缓存路径不一致")
    if provider.get("interval") != 86400:
        fail(errors, f"{filename} provider interval 必须为 86400")
    payload = provider.get("payload")
    if not isinstance(payload, str) or not payload.strip():
        fail(errors, f"{filename} provider 缺少内嵌 payload")
        return None

    source_path = ROOT / str(expected["script"])
    source = source_path.read_text(encoding="utf-8").replace("\r\n", "\n").rstrip()
    if payload.replace("\r\n", "\n").rstrip() != source:
        fail(errors, f"{filename} 内嵌脚本与 {expected['script']} 不一致，请重新构建")

    return str(expected["provider"])


def main() -> int:
    errors: list[str] = []
    providers: list[str] = []
    for filename, expected in EXPECTED.items():
        provider = validate_override(filename, expected, errors)
        if provider:
            providers.append(provider)
    if len(providers) != len(set(providers)):
        fail(errors, "三个覆写的 provider 名称必须互不相同")

    validate_lock(errors)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"静态校验失败：{len(errors)} 项", file=sys.stderr)
        return 1

    print(
        "静态校验通过：3 个独立覆写、4 个最小 MitM 主机、"
        "3 个响应脚本、3 条知乎精确 rewrite。"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
