import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { runStashScript } from "./stash-harness.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scripts = {
  bilibili: path.join(root, "scripts", "bilibili-adblock.js"),
  zhihu: path.join(root, "scripts", "zhihu-adblock.js"),
  taobao: path.join(root, "scripts", "taobao-splash.js")
};

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEndpoint(value) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch (_) {
    return "invalid-url";
  }
}

const app = argument("--app");
const url = argument("--url");
const file = argument("--file");

if (!app || !scripts[app] || !url || !file) {
  console.error(
    "用法: node tools/inspect-response.mjs --app bilibili|zhihu|taobao --url <请求URL> --file <脱敏响应文件>"
  );
  process.exit(1);
}

const original = await readFile(path.resolve(file), "utf8");
const output = await runStashScript(scripts[app], { url, body: original });
const report = {
  app,
  endpoint: safeEndpoint(url),
  changed: output.changed,
  originalBytes: Buffer.byteLength(original),
  resultBytes: Buffer.byteLength(output.body),
  originalSha256: sha256(original),
  resultSha256: sha256(output.body),
  logs: output.logs
};

console.log(JSON.stringify(report, null, 2));
