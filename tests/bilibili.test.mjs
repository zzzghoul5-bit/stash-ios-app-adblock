import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runStashScript } from "../tools/stash-harness.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts", "bilibili-adblock.js");
const fixtureDir = path.join(root, "tests", "fixtures", "bilibili");

async function fixture(name) {
  return readFile(path.join(fixtureDir, name), "utf8");
}

test("B站推荐流只删除固定广告卡片并保留分页和未知卡片", async () => {
  const input = await fixture("feed.json");
  const output = await runStashScript(script, {
    url: "https://app.bilibili.com/x/v2/feed/index?idx=1",
    body: input
  });
  assert.equal(output.changed, true);

  const parsed = JSON.parse(output.body);
  assert.equal(parsed.data.cursor, "bili-cursor-001");
  assert.deepEqual(
    parsed.data.items.map((item) => item.id),
    ["normal-1", "banner-1", "banner-all-ad", "game-card", "future-shape"]
  );
  assert.deepEqual(parsed.data.items[1].banner_item, [
    { type: "resource", title: "正常活动" }
  ]);
  assert.deepEqual(parsed.data.items[2].banner_item, []);
});

test("B站开屏只删除广告集合，保留账号和普通配置", async () => {
  const input = await fixture("splash.json");
  const output = await runStashScript(script, {
    url: "https://app.biliapi.net/x/v2/splash/show",
    body: input
  });
  const parsed = JSON.parse(output.body);

  assert.equal(Object.hasOwn(parsed.data, "event_list"), false);
  assert.equal(Object.hasOwn(parsed.data, "preload"), false);
  assert.equal(Object.hasOwn(parsed.data, "show"), false);
  assert.deepEqual(parsed.data.account, {
    id: "fixture-user",
    vip: false
  });
  assert.deepEqual(parsed.data.config, { duration: 3 });
});

test("B站竖屏故事删除明确广告并保留 vertical_pgc", async () => {
  const body = JSON.stringify({
    data: {
      cursor: "story-cursor",
      items: [
        { id: "normal", card_goto: "vertical_av" },
        { id: "ad-info", ad_info: { creative: "fixture" } },
        { id: "ad-empty", ad_info: {} },
        { id: "ad-picture", card_goto: "vertical_ad_picture" },
        { id: "pgc", card_goto: "vertical_pgc" }
      ]
    }
  });
  const output = await runStashScript(script, {
    url: "https://app.bilibili.com/x/v2/feed/index/story",
    body
  });
  const parsed = JSON.parse(output.body);

  assert.equal(parsed.data.cursor, "story-cursor");
  assert.deepEqual(
    parsed.data.items.map((item) => item.id),
    ["normal", "pgc"]
  );
});

test("B站未知 JSON 结构原样返回", async () => {
  const input = await fixture("unknown.json");
  const output = await runStashScript(script, {
    url: "https://app.bilibili.com/x/v2/feed/index",
    body: input
  });
  assert.equal(output.changed, false);
  assert.equal(output.body, input);
});

test("B站非 JSON 和空响应均原样返回", async () => {
  const invalid = await fixture("invalid.txt");
  const invalidOutput = await runStashScript(script, {
    url: "https://app.bilibili.com/x/v2/feed/index",
    body: invalid
  });
  const emptyOutput = await runStashScript(script, {
    url: "https://app.bilibili.com/x/v2/feed/index",
    body: ""
  });

  assert.equal(invalidOutput.body, invalid);
  assert.equal(invalidOutput.changed, false);
  assert.equal(emptyOutput.body, "");
  assert.equal(emptyOutput.changed, false);
});

test("B站账号接口不在匹配范围内且内容不被修改", async () => {
  const input = await fixture("account.json");
  const output = await runStashScript(script, {
    url: "https://app.bilibili.com/x/v2/account/myinfo",
    body: input
  });
  assert.equal(output.changed, false);
  assert.equal(output.body, input);
});
