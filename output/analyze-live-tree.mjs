import { readFileSync, writeFileSync } from "node:fs";

const payload = JSON.parse(readFileSync("output/live-full-tree.json", "utf8"));
if (!payload.ok) throw new Error(JSON.stringify(payload.error));
const result = payload.result;
const items = result.items ?? [];
const kindCounts = {};
const canonicalByOid = new Map();
const canonicalConflicts = new Map();
const projects = new Map();
for (const item of items) {
  kindCounts[item.kind] = (kindCounts[item.kind] ?? 0) + 1;
  if (item.kind === "project" && !item.path.includes("::")) projects.set(item.path, { oid: item.oid, members: [] });
  if (item.oid && !item.path.includes("::")) {
    const existing = canonicalByOid.get(item.oid);
    if (!existing) canonicalByOid.set(item.oid, item);
    else if (existing.path !== item.path) {
      const paths = canonicalConflicts.get(item.oid) ?? new Set([existing.path]);
      paths.add(item.path);
      canonicalConflicts.set(item.oid, paths);
      if (item.path.split("\\").length < existing.path.split("\\").length ||
          (item.path.split("\\").length === existing.path.split("\\").length && item.path < existing.path)) {
        canonicalByOid.set(item.oid, item);
      }
    }
  }
}
const memberKindCounts = {};
const orphanMemberRows = [];
const unmappedMembers = [];
for (const item of items) {
  const separator = item.path.lastIndexOf("::");
  if (separator < 0) continue;
  const projectPath = item.path.slice(0, separator);
  const elementName = item.path.slice(separator + 2);
  memberKindCounts[item.kind] = (memberKindCounts[item.kind] ?? 0) + 1;
  const member = {
    elementName,
    oid: item.oid,
    kind: item.kind,
    canonicalPath: canonicalByOid.get(item.oid)?.path ?? null,
  };
  const project = projects.get(projectPath);
  if (project) project.members.push(member);
  else orphanMemberRows.push({ projectPath, ...member });
  if (!member.canonicalPath) unmappedMembers.push({ projectPath, ...member });
}
const signatureGroups = new Map();
let projectsWithMembers = 0;
let memberEdges = 0;
for (const [path, project] of projects) {
  if (project.members.length > 0) projectsWithMembers++;
  memberEdges += project.members.length;
  const signature = project.members
    .map((m) => `${m.elementName}|${m.oid}|${m.kind}`)
    .sort()
    .join("\n");
  const group = signatureGroups.get(signature) ?? { projects: [], memberCount: project.members.length, rootOids: new Set() };
  group.projects.push(path);
  for (const member of project.members) if (member.oid) group.rootOids.add(member.oid);
  signatureGroups.set(signature, group);
}
const groups = [...signatureGroups.values()]
  .map((group) => ({
    projectCount: group.projects.length,
    memberCount: group.memberCount,
    uniqueRootCount: group.rootOids.size,
    sampleProjects: group.projects.slice(0, 5),
  }))
  .sort((a, b) => b.projectCount - a.projectCount || b.memberCount - a.memberCount);
const uniqueRootOids = new Set();
for (const project of projects.values()) for (const member of project.members) if (member.oid) uniqueRootOids.add(member.oid);
const projectMemberCounts = [...projects.entries()]
  .map(([path, project]) => ({ path, memberCount: project.members.length }))
  .sort((a, b) => b.memberCount - a.memberCount || a.path.localeCompare(b.path));
const summary = {
  coverage: result.coverage,
  truncated: result.truncated,
  database: result.database,
  itemCount: items.length,
  kindCounts,
  projectCount: projects.size,
  projectsWithMembers,
  projectsWithoutMembers: projects.size - projectsWithMembers,
  projectMemberEdgeCount: memberEdges,
  projectMemberKindCounts: memberKindCounts,
  uniqueProjectRootOids: uniqueRootOids.size,
  projectGroupCount: signatureGroups.size,
  largestGroups: groups.slice(0, 20),
  maxMembersPerProject: projectMemberCounts[0]?.memberCount ?? 0,
  projectsByMemberCountTop: projectMemberCounts.slice(0, 20),
  orphanMemberRowCount: orphanMemberRows.length,
  unmappedProjectMemberCount: unmappedMembers.length,
  canonicalOidConflictCount: canonicalConflicts.size,
};
writeFileSync("output/live-full-tree-analysis.json", JSON.stringify(summary, null, 2) + "\n", "utf8");
writeFileSync("output/live-projects.json", JSON.stringify([...projects.entries()].map(([path, value]) => ({ path, oid: value.oid, members: value.members })), null, 2) + "\n", "utf8");
console.log(JSON.stringify(summary, null, 2));
