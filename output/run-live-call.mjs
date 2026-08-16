import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [operation, requestPath, outputPath] = process.argv.slice(2);
if (!operation || !requestPath || !outputPath) {
  throw new Error("usage: node run-live-call.mjs <operation> <request-file> <output-path>");
}
const requestJson = readFileSync(requestPath, "utf8").trim();
JSON.parse(requestJson);
const exe = resolve("ascetcli/output/ascet-csharp/bin/AscetCli.exe");
const started = performance.now();
const result = spawnSync(exe, ["exec", operation, "--request-json", requestJson, "--json"], {
  cwd: process.cwd(),
  encoding: "utf8",
  timeout: 600_000,
  maxBuffer: 256 * 1024 * 1024,
});
const elapsedMs = performance.now() - started;
writeFileSync(outputPath, result.stdout ?? "", "utf8");
process.stderr.write(result.stderr ?? "");
process.stdout.write(JSON.stringify({
  operation,
  status: result.status,
  signal: result.signal,
  error: result.error?.message ?? null,
  elapsedMs: Math.round(elapsedMs),
  outputPath: resolve(outputPath),
  stdoutBytes: Buffer.byteLength(result.stdout ?? "", "utf8"),
}) + "\n");
process.exitCode = result.status ?? (result.error ? 1 : 0);
