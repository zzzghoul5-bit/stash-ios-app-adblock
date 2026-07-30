import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(root, "upstreams", "upstreams.lock.json");
const offline = process.argv.includes("--offline");
const jsonOutput = process.argv.includes("--json");
const lock = JSON.parse(await readFile(lockPath, "utf8"));

function assertLock(value) {
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.upstreams)) {
    throw new Error("upstreams.lock.json 的 schemaVersion 或 upstreams 无效");
  }
  for (const upstream of value.upstreams) {
    if (
      !upstream.id ||
      !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(upstream.repository) ||
      !/^[0-9a-f]{40}$/.test(upstream.pinnedCommit) ||
      !Array.isArray(upstream.watch) ||
      upstream.watch.length === 0
    ) {
      throw new Error(`上游锁定项无效: ${upstream.id || "unknown"}`);
    }
    for (const watched of upstream.watch) {
      if (
        !watched.path ||
        !/^[0-9a-f]{40}$/.test(watched.gitBlobSha1) ||
        !/^[0-9a-f]{64}$/.test(watched.sha256)
      ) {
        throw new Error(`上游文件锁定项无效: ${upstream.id}/${watched.path}`);
      }
    }
  }
}

async function githubJson(route) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "stash-ios-app-adblock-updater",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(`https://api.github.com${route}`, { headers });
  if (!response.ok) {
    throw new Error(
      `GitHub API ${response.status} ${response.statusText}: ${route}`
    );
  }
  return response.json();
}

function encodedPath(filePath) {
  return filePath.split("/").map(encodeURIComponent).join("/");
}

assertLock(lock);

if (offline) {
  const files = lock.upstreams.reduce(
    (count, upstream) => count + upstream.watch.length,
    0
  );
  const result = {
    mode: "offline",
    checkedAt: lock.checkedAt,
    upstreams: lock.upstreams.length,
    watchedFiles: files,
    automaticReplacement: lock.policy.automaticReplacement
  };
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `lock ok: ${result.upstreams} upstreams, ${result.watchedFiles} files, automaticReplacement=false`
    );
  }
  process.exit(0);
}

const results = [];
let relevantUpdates = false;
let networkErrors = false;

for (const upstream of lock.upstreams) {
  try {
    let latestRef;
    let latestLabel;
    if (upstream.tracking.mode === "release") {
      const release = await githubJson(
        `/repos/${upstream.repository}/releases/latest`
      );
      latestRef = release.tag_name;
      latestLabel = release.tag_name;
      const changed = release.tag_name !== upstream.tracking.release;
      relevantUpdates ||= changed;
      results.push({
        id: upstream.id,
        pinned: upstream.tracking.release,
        latest: latestLabel,
        changed,
        changedFiles: changed ? ["release"] : []
      });
      continue;
    }

    const branch = upstream.tracking.branch;
    const commit = await githubJson(
      `/repos/${upstream.repository}/commits/${encodeURIComponent(branch)}`
    );
    latestRef = commit.sha;
    latestLabel = commit.sha;
    if (latestRef === upstream.pinnedCommit) {
      results.push({
        id: upstream.id,
        pinned: upstream.pinnedCommit,
        latest: latestLabel,
        changed: false,
        changedFiles: []
      });
      continue;
    }

    const changedFiles = [];
    for (const watched of upstream.watch) {
      const content = await githubJson(
        `/repos/${upstream.repository}/contents/${encodedPath(
          watched.path
        )}?ref=${encodeURIComponent(latestRef)}`
      );
      if (content.sha !== watched.gitBlobSha1) {
        changedFiles.push(watched.path);
      }
    }

    const changed = changedFiles.length > 0;
    relevantUpdates ||= changed;
    results.push({
      id: upstream.id,
      pinned: upstream.pinnedCommit,
      latest: latestLabel,
      changed,
      changedFiles
    });
  } catch (error) {
    networkErrors = true;
    results.push({
      id: upstream.id,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

if (jsonOutput) {
  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        relevantUpdates,
        networkErrors,
        results
      },
      null,
      2
    )
  );
} else {
  for (const result of results) {
    if (result.error) {
      console.error(`error ${result.id}: ${result.error}`);
    } else if (result.changed) {
      console.log(
        `review ${result.id}: ${result.pinned} -> ${result.latest}; ${result.changedFiles.join(
          ", "
        )}`
      );
    } else {
      console.log(`ok ${result.id}: watched files unchanged`);
    }
  }
  if (networkErrors) {
    console.error("上游检查未完成：网络或 GitHub API 不可用；没有据此判断规则是最新的。");
  } else {
    console.log(
      relevantUpdates
        ? "有相关上游变化：仅提示审查，不会自动替换稳定规则。"
        : "未发现相关上游文件变化。"
    );
  }
}

if (networkErrors) {
  process.exitCode = 3;
} else if (relevantUpdates) {
  process.exitCode = 2;
}
