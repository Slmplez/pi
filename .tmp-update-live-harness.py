from pathlib import Path
root = Path(r"C:\Repo\09_ASCETCopilot\pi-ascet-extension-prototype")
path = root / "scripts" / "ascet-permission-modes-live-validation.ts"
text = path.read_text(encoding="utf-8")
old = '''async function readTree(stage: string, targetPathPrefix: string) {
\tconst response = await executeTool(
\t\tstage,
\t\t"ascet_get",
\t\t{ action: "tree", target: { targetPathPrefix }, traversal: { depth: 4, maxFolders: 200, maxComponents: 200 } },
\t\treadContext(),
\t);
\tassertOutcomeOk(response);
\treturn response;
}

async function assertPathAbsent(stage: string, path: string): Promise<void> {
\tconst response = await readTree(stage, path);
\tconst paths = collectPaths(details(response));
\tconst expected = normalizePath(path);
\tassertCondition(
\t\t!paths.some((candidate) => normalizePath(candidate) === expected),
\t\t`Expected '${path}' to be absent from the live Tree.`,
\t);
}'''
new = '''async function assertPathAbsent(stage: string, path: string): Promise<void> {
\tconst response = await executeTool(
\t\tstage,
\t\t"ascet_get",
\t\t{ action: "tree", target: { targetPathPrefix: path }, traversal: { depth: 4, maxFolders: 200, maxComponents: 200 } },
\t\treadContext(),
\t);
\tconst report = details(response);
\tif (readString(report, "error", "code") === "folder_not_found") return;
\tassertOutcomeOk(response);
\tconst paths = collectPaths(report);
\tconst expected = normalizePath(path);
\tassertCondition(
\t\t!paths.some((candidate) => normalizePath(candidate) === expected),
\t\t`Expected '${path}' to be absent from the live Tree.`,
\t);
}'''
assert old in text
path.write_text(text.replace(old, new), encoding="utf-8")
discovery = root / "scripts" / "ascet-permission-live-discovery.ts"
discovery.write_text(discovery.read_text(encoding="utf-8").rstrip("\n") + "\n", encoding="utf-8")
