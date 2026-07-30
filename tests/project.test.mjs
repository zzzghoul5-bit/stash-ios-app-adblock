import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("生成的覆写与脚本源码保持同步", () => {
  assert.doesNotThrow(() => {
    execFileSync(
      process.execPath,
      [path.join(root, "tools", "bundle-overrides.mjs"), "--check"],
      { cwd: root, stdio: "pipe" }
    );
  });
});

test("上游锁定文件包含固定提交和双重校验值", async () => {
  const lock = JSON.parse(
    await readFile(
      path.join(root, "upstreams", "upstreams.lock.json"),
      "utf8"
    )
  );
  assert.equal(lock.schemaVersion, 1);
  assert.equal(lock.policy.automaticReplacement, false);
  assert.ok(lock.upstreams.length >= 5);

  for (const upstream of lock.upstreams) {
    assert.match(upstream.pinnedCommit, /^[0-9a-f]{40}$/);
    assert.ok(upstream.watch.length > 0);
    for (const watched of upstream.watch) {
      assert.match(watched.gitBlobSha1, /^[0-9a-f]{40}$/);
      assert.match(watched.sha256, /^[0-9a-f]{64}$/);
    }
  }
});

test("脚本与脱敏 fixtures 不含证书、私钥或常见凭据头", async () => {
  const roots = [
    path.join(root, "scripts"),
    path.join(root, "tests", "fixtures")
  ];
  const forbidden =
    /BEGIN (?:RSA )?PRIVATE KEY|BEGIN CERTIFICATE|Authorization\s*:|Cookie\s*:/i;

  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(target);
      } else {
        const content = await readFile(target, "utf8");
        assert.doesNotMatch(content, forbidden, target);
      }
    }
  }

  for (const directory of roots) {
    await visit(directory);
  }
});
