import { readFileSync } from "node:fs";
const items = JSON.parse(readFileSync("output/live-full-tree.json", "utf8")).result.items;
const projects = items.filter((item) => item.kind === "project" && !item.path.includes("::"));
const classes = items.filter((item) => item.kind === "class" && !item.path.includes("::"));
const directClassesByParent = new Map();
for (const item of classes) {
  const index = item.path.lastIndexOf("\\");
  const parent = index >= 0 ? item.path.slice(0, index) : "";
  const list = directClassesByParent.get(parent) ?? [];
  list.push(item);
  directClassesByParent.set(parent, list);
}
const rows = projects.map((project) => {
  const index = project.path.lastIndexOf("\\");
  const parent = index >= 0 ? project.path.slice(0, index) : "";
  const siblings = directClassesByParent.get(parent) ?? [];
  const parameterLike = siblings.filter((item) => /(^|[_-])(parameter|param|calibration|calib|constant|const)([_-]|$)/i.test(item.path.slice(item.path.lastIndexOf("\\") + 1)));
  return { projectPath: project.path, siblingClassCount: siblings.length, parameterLikeSiblingCount: parameterLike.length, parameterLikePaths: parameterLike.map((item) => item.path) };
});
const distribution = {};
for (const row of rows) distribution[row.parameterLikeSiblingCount] = (distribution[row.parameterLikeSiblingCount] ?? 0) + 1;
console.log(JSON.stringify({
  projectCount: rows.length,
  projectsWithParameterLikeSibling: rows.filter((row) => row.parameterLikeSiblingCount > 0).length,
  projectsWithoutParameterLikeSibling: rows.filter((row) => row.parameterLikeSiblingCount === 0).length,
  parameterLikeSiblingDistribution: distribution,
  uniqueParameterLikeSiblingClasses: new Set(rows.flatMap((row) => row.parameterLikePaths)).size,
  projectsWithoutExamples: rows.filter((row) => row.parameterLikeSiblingCount === 0).slice(0, 20),
  projectsWithExamples: rows.filter((row) => row.parameterLikeSiblingCount > 0).slice(0, 20),
}, null, 2));
