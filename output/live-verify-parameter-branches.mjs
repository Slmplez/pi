import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const parseFile = (path) => JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
const tree = parseFile("output/live-full-tree.json").result.items;
const kindByPath = new Map(tree.filter((item) => !item.path.includes("::")).map((item) => [item.path, item.kind]));
const files = ["output/live-project-implementation-adc.json", "output/live-project-implementation-nonhadhap.json", "output/live-project-implementation-avh.json"];
const classPaths = new Set();
function collectClassBranch(element) {
  if (element.ReferencedComponentPath && kindByPath.get(element.ReferencedComponentPath) === "class") classPaths.add(element.ReferencedComponentPath);
  for (const child of element.ChildElements ?? []) collectClassBranch(child);
}
for (const file of files) {
  const result = parseFile(file).result;
  for (const element of result.Elements ?? []) {
    if (kindByPath.get(element.ReferencedComponentPath) === "class") collectClassBranch(element);
  }
}
const exe = resolve("ascetcli/output/ascet-csharp/bin/AscetCli.exe");
const records = [];
const started = performance.now();
for (const path of [...classPaths].sort()) {
  const callStarted = performance.now();
  const call = spawnSync(exe, ["exec", "list_methods", path, "--json"], { cwd: process.cwd(), encoding: "utf8", timeout: 120_000, maxBuffer: 16 * 1024 * 1024 });
  let payload = null;
  try { payload = JSON.parse((call.stdout ?? "").replace(/^\uFEFF/, "")); } catch {}
  records.push({ path, status: call.status, elapsedMs: Math.round(performance.now() - callStarted), methodCount: payload?.result?.counts?.methods ?? null, error: payload?.error ?? call.error?.message ?? call.stderr ?? null });
  if (call.status !== 0) break;
}
const summary = {
  classCount: records.length,
  methodlessCount: records.filter((record) => record.methodCount === 0).length,
  methodsPositiveCount: records.filter((record) => typeof record.methodCount === "number" && record.methodCount > 0).length,
  failedCount: records.filter((record) => record.status !== 0 || record.methodCount === null).length,
  totalElapsedMs: Math.round(performance.now() - started),
  maxCallMs: Math.max(...records.map((record) => record.elapsedMs), 0),
  averageCallMs: records.length ? Math.round(records.reduce((sum, record) => sum + record.elapsedMs, 0) / records.length) : 0,
  positiveMethods: records.filter((record) => typeof record.methodCount === "number" && record.methodCount > 0),
  failures: records.filter((record) => record.status !== 0 || record.methodCount === null),
};
writeFileSync("output/live-parameter-branch-methods.json", JSON.stringify({ summary, records }, null, 2) + "\n", "utf8");
console.log(JSON.stringify(summary, null, 2));
