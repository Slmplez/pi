import { readFileSync } from "node:fs";
const tree = JSON.parse(readFileSync("output/live-full-tree.json", "utf8")).result.items;
const kindByPath = new Map(tree.filter((item) => !item.path.includes("::")).map((item) => [item.path, item.kind]));
const files = [
  "output/live-project-implementation-adc.json",
  "output/live-project-implementation-nonhadhap.json",
  "output/live-project-implementation-avh.json",
];
function walk(elements, state, depth = 0) {
  state.maxDepth = Math.max(state.maxDepth, depth);
  for (const element of elements ?? []) {
    state.totalElements++;
    if (element.IsPrimitive) {
      state.primitiveElements++;
      if (element.CanonicalKind === "parameter") state.parameterPrimitive++;
      if (element.IsCalibration) state.calibrationElements++;
    } else if (element.ReferencedComponentPath) {
      state.complexElements++;
      const kind = kindByPath.get(element.ReferencedComponentPath) ?? "unknown";
      state.referencedKinds[kind] = (state.referencedKinds[kind] ?? 0) + 1;
      if (kind === "class") state.classPaths.add(element.ReferencedComponentPath);
      if (kind === "module") state.modulePaths.add(element.ReferencedComponentPath);
    }
    walk(element.ChildElements, state, depth + 1);
  }
}
for (const file of files) {
  const result = JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, "")).result;
  const roots = (result.Elements ?? []).filter((element) => kindByPath.get(element.ReferencedComponentPath) === "class");
  const state = { totalElements: 0, primitiveElements: 0, complexElements: 0, parameterPrimitive: 0, calibrationElements: 0, maxDepth: 0, referencedKinds: {}, classPaths: new Set(), modulePaths: new Set() };
  walk(roots, state);
  console.log(JSON.stringify({
    projectPath: result.ComponentPath,
    topLevelElementCount: result.Elements.length,
    topLevelClassRoots: roots.map((element) => ({ name: element.ElementName, path: element.ReferencedComponentPath, childCount: element.ChildElements?.length ?? 0 })),
    branchTotalElements: state.totalElements,
    branchPrimitiveElements: state.primitiveElements,
    branchComplexElements: state.complexElements,
    uniqueReferencedClasses: state.classPaths.size,
    uniqueReferencedModules: state.modulePaths.size,
    parameterPrimitive: state.parameterPrimitive,
    calibrationElements: state.calibrationElements,
    maxDepth: state.maxDepth,
    referencedKinds: state.referencedKinds,
  }, null, 2));
}


