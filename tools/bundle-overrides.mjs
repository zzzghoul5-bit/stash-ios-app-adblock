import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const bundles = [
  {
    template: "templates/Bilibili-ADBlock.stoverride",
    script: "scripts/bilibili-adblock.js",
    output: "overrides/Bilibili-ADBlock.stoverride"
  },
  {
    template: "templates/Zhihu-ADBlock.stoverride",
    script: "scripts/zhihu-adblock.js",
    output: "overrides/Zhihu-ADBlock.stoverride"
  },
  {
    template: "templates/Taobao-Splash-ADBlock.stoverride",
    script: "scripts/taobao-splash.js",
    output: "overrides/Taobao-Splash-ADBlock.stoverride"
  }
];

function normalize(text) {
  return text.replace(/\r\n/g, "\n").replace(/\s+$/, "") + "\n";
}

function indentPayload(source) {
  return normalize(source)
    .slice(0, -1)
    .split("\n")
    .map((line) => (line ? `      ${line}` : ""))
    .join("\n");
}

let stale = false;
await mkdir(path.join(root, "overrides"), { recursive: true });

for (const bundle of bundles) {
  const templatePath = path.join(root, bundle.template);
  const scriptPath = path.join(root, bundle.script);
  const outputPath = path.join(root, bundle.output);
  const template = normalize(await readFile(templatePath, "utf8"));
  const script = await readFile(scriptPath, "utf8");
  const marker = "__SCRIPT_PAYLOAD__";

  if (template.split(marker).length !== 2) {
    throw new Error(`${bundle.template} 必须且只能包含一个 ${marker}`);
  }

  const generated = normalize(template.replace(marker, indentPayload(script)));
  let current = "";
  try {
    current = normalize(await readFile(outputPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  if (current === generated) {
    console.log(`ok ${bundle.output}`);
    continue;
  }

  stale = true;
  if (checkOnly) {
    console.error(`stale ${bundle.output}`);
  } else {
    await writeFile(outputPath, generated, "utf8");
    console.log(`generated ${bundle.output}`);
  }
}

if (checkOnly && stale) {
  process.exitCode = 1;
}
