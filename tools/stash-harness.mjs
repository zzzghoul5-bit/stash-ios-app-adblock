import { readFile } from "node:fs/promises";
import vm from "node:vm";

export async function runStashScript(
  scriptPath,
  { url, body = "", headers = {}, status = 200 }
) {
  const source = await readFile(scriptPath, "utf8");
  const logs = [];
  const doneResults = [];
  const context = vm.createContext({
    $request: { url, headers: {} },
    $response: { body, headers, status },
    $done(result) {
      doneResults.push(result || {});
    },
    console: {
      log(...args) {
        logs.push(args.map(String).join(" "));
      }
    }
  });

  const compiled = new vm.Script(source, { filename: scriptPath });
  compiled.runInContext(context, { timeout: 750 });

  if (doneResults.length !== 1) {
    throw new Error(
      `脚本必须调用一次 $done()，实际调用 ${doneResults.length} 次`
    );
  }

  const result = doneResults[0];
  const changed =
    Object.prototype.hasOwnProperty.call(result, "body") &&
    typeof result.body === "string";

  return {
    changed,
    body: changed ? result.body : body,
    result,
    logs
  };
}
