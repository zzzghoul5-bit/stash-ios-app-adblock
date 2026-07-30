import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runStashScript } from "../tools/stash-harness.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts", "taobao-splash.js");
const fixtureDir = path.join(root, "tests", "fixtures", "taobao");

async function fixture(name) {
  return readFile(path.join(fixtureDir, name), "utf8");
}

test("淘宝保留开屏数组结构并抑制素材和有效期", async () => {
  const input = await fixture("splash.json");
  const output = await runStashScript(script, {
    url: "https://guide-acs.m.taobao.com/gw/mtop.taobao.wireless.home.splash.awesome.get/1.0/?data=%7B%7D",
    body: input
  });
  const parsed = JSON.parse(output.body);
  const base = parsed.data.containers.splash_home_base.base;
  const first = base.sections[0].bizData;

  assert.equal(output.changed, true);
  assert.equal(first["taobao-splash"].data.length, 2);
  assert.equal(first["taobao-splash"].data[0].id, "splash-ad-1");
  assert.equal(first["taobao-splash"].data[0].startTime, "3818332800000");
  assert.equal(first["taobao-splash"].data[0].endTime, "3818419199000");
  assert.equal(first["taobao-splash"].data[0].gmtStart, "2090-12-31 00:00:00");
  assert.equal(first["taobao-splash"].data[0].imgUrl, "");
  assert.equal(first["taobao-splash"].data[0].videoUrl, "");
  assert.equal(first["taobao-splash"].data[0].tracking, "preserve-me");
  assert.equal(Object.hasOwn(first["taobao-splash"].data[1], "videoUrl"), false);
  assert.deepEqual(first["taobao-splash"].config, { duration: 3 });
  assert.deepEqual(first["normal-widget"].data, [{ id: "normal-widget-1" }]);
  assert.equal(base.sections[1].sectionId, "normal-section");
  assert.equal(base.cursor, "taobao-cursor");
});

test("淘宝多个开屏对象能够全部抑制", async () => {
  const input = await fixture("splash.json");
  const output = await runStashScript(script, {
    url: "https://guide-acs.m.taobao.com/gw/mtop.taobao.wireless.home.splash.awesome.get/2.0/",
    body: input
  });
  const parsed = JSON.parse(output.body);
  const data =
    parsed.data.containers.splash_home_base.base.sections[0].bizData[
      "taobao-splash"
    ].data;
  assert.equal(data.length, 2);
  assert.ok(data.every((item) => item.startTime === "3818332800000"));
  assert.ok(data.every((item) => item.imgUrl === ""));
  assert.match(output.logs.join("\n"), /suppressed=2/);
});

test("淘宝未知结构和缺少字段时原样返回", async () => {
  const input = await fixture("unknown.json");
  const output = await runStashScript(script, {
    url: "https://guide-acs.m.taobao.com/gw/mtop.taobao.wireless.home.splash.awesome.get/1.0/",
    body: input
  });
  assert.equal(output.changed, false);
  assert.equal(output.body, input);
});

test("淘宝非 JSON 和空响应均原样返回", async () => {
  const invalid = await fixture("invalid.txt");
  const invalidOutput = await runStashScript(script, {
    url: "https://guide-acs.m.taobao.com/gw/mtop.taobao.wireless.home.splash.awesome.get/1.0/",
    body: invalid
  });
  const emptyOutput = await runStashScript(script, {
    url: "https://guide-acs.m.taobao.com/gw/mtop.taobao.wireless.home.splash.awesome.get/1.0/",
    body: ""
  });

  assert.equal(invalidOutput.changed, false);
  assert.equal(invalidOutput.body, invalid);
  assert.equal(emptyOutput.changed, false);
  assert.equal(emptyOutput.body, "");
});

test("淘宝登录、购物车、订单和支付样本不被修改", async () => {
  const input = await fixture("commerce.json");
  const urls = [
    "https://guide-acs.m.taobao.com/gw/mtop.taobao.login/1.0/",
    "https://guide-acs.m.taobao.com/gw/mtop.taobao.cart.query/1.0/",
    "https://guide-acs.m.taobao.com/gw/mtop.taobao.order.query/1.0/",
    "https://guide-acs.m.taobao.com/gw/mtop.taobao.payment.query/1.0/"
  ];

  for (const url of urls) {
    const output = await runStashScript(script, { url, body: input });
    assert.equal(output.changed, false, url);
    assert.equal(output.body, input, url);
  }
});

test("淘宝共享业务主机和错误主机不会触发脚本", async () => {
  const input = await fixture("splash.json");
  for (const host of ["acs.m.taobao.com", "trade-acs.m.taobao.com"]) {
    const output = await runStashScript(script, {
      url: `https://${host}/gw/mtop.taobao.wireless.home.splash.awesome.get/1.0/`,
      body: input
    });
    assert.equal(output.changed, false, host);
    assert.equal(output.body, input, host);
  }
});
test("淘宝非版本路径不会触发脚本", async () => {
  const input = await fixture("splash.json");
  const output = await runStashScript(script, {
    url: "https://guide-acs.m.taobao.com/gw/mtop.taobao.wireless.home.splash.awesome.get/unexpected/",
    body: input
  });
  assert.equal(output.changed, false);
  assert.equal(output.body, input);
});
