import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runStashScript } from "../tools/stash-harness.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts", "zhihu-adblock.js");
const fixtureDir = path.join(root, "tests", "fixtures", "zhihu");

async function fixture(name) {
  return readFile(path.join(fixtureDir, name), "utf8");
}

test("知乎推荐流删除明确广告对象并保持顺序和分页字段", async () => {
  const input = await fixture("recommend.json");
  const output = await runStashScript(script, {
    url: "https://api.zhihu.com/topstory/recommend?limit=10",
    body: input
  });
  const parsed = JSON.parse(output.body);

  assert.equal(output.changed, true);
  assert.deepEqual(parsed.paging, {
    is_end: false,
    next: "fixture-next"
  });
  assert.equal(parsed.fresh_text, "正常分页信息");
  assert.deepEqual(
    parsed.data.map((item) => item.id),
    [
      "normal-1",
      "slot-without-marker",
      "market-card",
      "ad-zero",
      "ad-string-zero",
      "ad-false",
      "ad-null",
      "ad-empty-object",
      "ad-empty-array",
      "promotion-ordinary"
    ]
  );
});

test("知乎回答接口只移除 ad_info，保留回答、游标和分页", async () => {
  const input = await fixture("question.json");
  const output = await runStashScript(script, {
    url: "https://api.zhihu.com/v4/questions/123456/answers?limit=20",
    body: input
  });
  const parsed = JSON.parse(output.body);

  assert.equal(Object.hasOwn(parsed, "ad_info"), false);
  assert.equal(Object.hasOwn(parsed.data, "ad_info"), false);
  assert.deepEqual(parsed.data.answers, [
    { id: "answer-1", content: "正常回答" }
  ]);
  assert.equal(parsed.data.cursor, "question-cursor");
  assert.deepEqual(parsed.paging, { is_end: true });
});

test("知乎浮层接口仅移除 feed_egg", async () => {
  const body = JSON.stringify({
    feed_egg: { id: "top-egg" },
    data: {
      feed_egg: { id: "nested-egg" },
      content: { id: "normal-content" }
    },
    paging: { next: "keep" }
  });
  const output = await runStashScript(script, {
    url: "https://api.zhihu.com/commercial_api/app_float_layer",
    body
  });
  const parsed = JSON.parse(output.body);

  assert.equal(Object.hasOwn(parsed, "feed_egg"), false);
  assert.equal(Object.hasOwn(parsed.data, "feed_egg"), false);
  assert.deepEqual(parsed.data.content, { id: "normal-content" });
  assert.deepEqual(parsed.paging, { next: "keep" });
});

test("知乎未知结构、缺少字段时原样返回", async () => {
  const input = await fixture("unknown.json");
  const output = await runStashScript(script, {
    url: "https://api.zhihu.com/topstory/recommend",
    body: input
  });
  assert.equal(output.changed, false);
  assert.equal(output.body, input);
});

test("知乎非 JSON 和空响应均原样返回", async () => {
  const invalid = await fixture("invalid.txt");
  const invalidOutput = await runStashScript(script, {
    url: "https://api.zhihu.com/topstory/recommend",
    body: invalid
  });
  const emptyOutput = await runStashScript(script, {
    url: "https://api.zhihu.com/topstory/recommend",
    body: ""
  });

  assert.equal(invalidOutput.changed, false);
  assert.equal(invalidOutput.body, invalid);
  assert.equal(emptyOutput.changed, false);
  assert.equal(emptyOutput.body, "");
});

test("知乎账号接口不在匹配范围内且内容不被修改", async () => {
  const input = await fixture("account.json");
  const output = await runStashScript(script, {
    url: "https://api.zhihu.com/people/self",
    body: input
  });
  assert.equal(output.changed, false);
  assert.equal(output.body, input);
});

test("知乎普通 image、url、title 字段不会触发删除", async () => {
  const body = JSON.stringify({
    paging: { next: "keep" },
    data: [
      {
        id: "ordinary-card",
        image: "https://fixture.invalid/image.png",
        url: "https://fixture.invalid/article",
        title: "普通内容",
        banner: "普通横幅",
        video: "fixture-video"
      }
    ]
  });
  const output = await runStashScript(script, {
    url: "https://api.zhihu.com/topstory/recommend",
    body
  });
  assert.equal(output.changed, false);
  assert.equal(output.body, body);
});
test("知乎回答数组结构和尾斜杠保持正常数据不变", async () => {
  const body = JSON.stringify({
    ad_info: { id: "top-ad" },
    data: [
      { id: "answer-1", content: "正常回答一" },
      { id: "answer-2", content: "正常回答二" }
    ],
    paging: { next: "array-cursor" }
  });
  const output = await runStashScript(script, {
    url: "https://api.zhihu.com/questions/123456/feeds/",
    body
  });
  const parsed = JSON.parse(output.body);

  assert.equal(Object.hasOwn(parsed, "ad_info"), false);
  assert.deepEqual(parsed.data, [
    { id: "answer-1", content: "正常回答一" },
    { id: "answer-2", content: "正常回答二" }
  ]);
  assert.deepEqual(parsed.paging, { next: "array-cursor" });
});
