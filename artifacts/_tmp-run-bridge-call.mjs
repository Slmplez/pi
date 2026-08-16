import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const [operation, requestPath, outputPath] = process.argv.slice(2);
const requestJson = readFileSync(requestPath, "utf8").replace(/^\uFEFF/u, "").trim();
JSON.parse(requestJson);
const exe = resolve("ascetcli/output/ascet-csharp/bin/AscetBridge.exe");
const result = spawnSync(exe, ["exec", operation, "--request-json", requestJson, "--json"], {
  cwd: process.cwd(), encoding: "utf8", timeout: 600_000, maxBuffer: 256 * 1024 * 1024,
});
writeFileSync(outputPath, result.stdout ?? "", "utf8");
process.stderr.write(result.stderr ?? "");
console.log(JSON.stringify({ status: result.status, signal: result.signal, error: result.error?.message ?? null, stdoutBytes: Buffer.byteLength(result.stdout ?? "", "utf8") }));
process.exitCode = result.status ?? (result.error ? 1 : 0);
