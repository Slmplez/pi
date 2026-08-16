import { readFileSync } from "node:fs";
const tree = JSON.parse(readFileSync("output/live-full-tree.json", "utf8")).result.items;
const refs = JSON.parse(readFileSync("output/live-component-refs-cm-lfi.json", "utf8")).result.items;
const byOid = new Map();
for (const item of tree) if (item.oid && !item.path.includes("::")) byOid.set(item.oid, item);
const kindCounts = {};
const classTargets = [];
for (const ref of refs) {
  const kind = byOid.get(ref.targetOid)?.kind ?? "unknown";
  kindCounts[kind] = (kindCounts[kind] ?? 0) + 1;
  if (kind === "class") classTargets.push(ref);
}
console.log(JSON.stringify({
  refCount: refs.length,
  uniqueTargetOids: new Set(refs.map((r) => r.targetOid).filter(Boolean)).size,
  kindCounts,
  classTargetCount: classTargets.length,
  uniqueClassTargetOids: new Set(classTargets.map((r) => r.targetOid)).size,
  parameterNamedClassTargets: classTargets.filter((r) => /parameter|param|calibration|calib|constant|const/i.test(r.targetPath)).map((r) => r.targetPath),
}, null, 2));
