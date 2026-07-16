#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ATTRIBUTE_FIELDS = ["type", "formula", "min", "max", "resolution", "offset", "unit", "calibration"];

function parseArgs(argv) {
	const args = {
		evidenceDir: null,
		out: null,
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--evidence-dir") args.evidenceDir = argv[++i];
		else if (arg === "--out") args.out = argv[++i];
		else if (arg === "--help" || arg === "-h") {
			printHelp();
			process.exit(0);
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}
	if (!args.evidenceDir) throw new Error("--evidence-dir is required");
	if (!args.out) args.out = join(args.evidenceDir, "..", "findings", "parameter-mapping.jsonl");
	return args;
}

function printHelp() {
	console.log(`Usage: node check-parameter-mapping.mjs --evidence-dir <dir> [--out <findings.jsonl>]

Reads ASCET full-check evidence JSONL files and emits deterministic parameter mapping findings.
`);
}

function readJsonlFile(filePath) {
	const text = readFileSync(filePath, "utf8");
	return text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line, index) => {
			try {
				return JSON.parse(line);
			} catch (error) {
				throw new Error(`${filePath}:${index + 1}: invalid JSONL: ${error.message}`);
			}
		});
}

function readEvidence(evidenceDir) {
	const dir = resolve(evidenceDir);
	if (!existsSync(dir)) throw new Error(`Evidence directory does not exist: ${dir}`);
	const records = [];
	for (const file of readdirSync(dir)) {
		if (file.endsWith(".jsonl")) {
			records.push(...readJsonlFile(join(dir, file)));
		}
	}
	return records;
}

function payload(record) {
	const value = record?.payload;
	if (value && typeof value === "object" && "result" in value && value.result && typeof value.result === "object") {
		return value.result;
	}
	return value && typeof value === "object" ? value : {};
}

function scalar(value) {
	if (value == null) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return JSON.stringify(value);
}

function normalizeName(name) {
	return scalar(name).trim();
}

function keyName(name) {
	return normalizeName(name).toLowerCase();
}

function includesAnyText(value, needles) {
	const text = scalar(value).toLowerCase();
	return needles.some((needle) => text.includes(needle));
}

function isDtElement(element) {
	const name = keyName(element?.name ?? element?.element ?? element?.element_name);
	if (name === "dt") return true;
	const markers = [
		element?.type,
		element?.kind,
		element?.scope,
		element?.description,
		element?.metadata,
		element?.summary,
		element?.role,
	];
	return markers.some((marker) =>
		includesAnyText(marker, ["system parameter", "delta time", "time step", "dt system parameter"]),
	);
}

function arrayFrom(value) {
	if (Array.isArray(value)) return value;
	return [];
}

function extractChildren(record) {
	const data = payload(record);
	const candidates = [
		data.items,
		data.children,
		data.elements,
		data.parameters,
		data.result?.items,
		record?.children,
		record?.items,
	];
	return candidates.find(Array.isArray) ?? [];
}

function collectParameters(records) {
	const byComponent = new Map();
	for (const record of records) {
		if (!["children", "parameter_children"].includes(record?.kind)) continue;
		const componentPath = record.component_path ?? record.componentPath ?? payload(record).componentPath;
		if (!componentPath) continue;
		const component = scalar(componentPath);
		const params = byComponent.get(component) ?? new Map();
		for (const child of extractChildren(record)) {
			const name = normalizeName(child?.name ?? child?.element ?? child?.element_name);
			if (!name) continue;
			const markerText = [
				child?.scope,
				child?.type,
				child?.kind,
				child?.category,
				child?.role,
				child?.description,
			]
				.map(scalar)
				.join(" ")
				.toLowerCase();
			const looksParameter =
				markerText.includes("parameter") ||
				markerText.includes("imported") ||
				markerText.includes("exported") ||
				markerText.includes("local") ||
				keyName(name) === "dt";
			if (!looksParameter) continue;
			params.set(keyName(name), {
				...child,
				name,
				component_path: component,
				is_dt: isDtElement(child),
			});
		}
		byComponent.set(component, params);
	}
	return byComponent;
}

function firstRecordByKindAndComponent(records, kinds) {
	const byComponent = new Map();
	for (const record of records) {
		if (!kinds.includes(record?.kind)) continue;
		const component = scalar(record.component_path ?? record.componentPath ?? payload(record).componentPath);
		if (component && !byComponent.has(component)) byComponent.set(component, record);
	}
	return byComponent;
}

function dependentChainRows(records) {
	const rows = [];
	for (const record of records) {
		if (record?.kind !== "dependent_chain") continue;
		if (record.ok === false) continue;
		const data = payload(record);
		const consumer = scalar(record.component_path ?? record.componentPath ?? data.component ?? data.componentPath);
		const dependent = data.dependent && typeof data.dependent === "object" ? data.dependent : {};
		const localName = normalizeName(dependent.name ?? dependent.element ?? record.element_name ?? record.elementName);
		for (const input of arrayFrom(data.inputs)) {
			const value = input?.value && typeof input.value === "object" ? input.value : {};
			const exported = input?.export && typeof input.export === "object" ? input.export : {};
			const importedName = normalizeName(
				value.name ?? input?.importedName ?? input?.imported?.name ?? input?.formal?.name ?? input?.elementName,
			);
			if (!importedName && !localName) continue;
			rows.push({
				record,
				data: input,
				importer: consumer,
				exporter: scalar(record.exporter_component_path ?? record.exporterComponentPath ?? exported.owner ?? data.exporter),
				localComponent: consumer,
				importedName,
				localName,
				importedAttributes: value,
				localAttributes: dependent,
				exportedAttributes: exported,
				expectedName: normalizeName(input?.expectedName ?? input?.expected?.name ?? data.expectedName),
				semanticMismatch:
					input?.semanticMismatch === true ||
					input?.semantic_mismatch === true ||
					data.semanticMismatch === true ||
					data.semantic_mismatch === true,
			});
		}
	}
	return rows;
}

function dependencyRecords(records) {
	const byElement = new Map();
	for (const record of records) {
		if (record?.kind !== "dependent_chain" || record.ok === false) continue;
		const data = payload(record);
		const target = scalar(record.component_path ?? record.componentPath ?? data.component ?? data.componentPath);
		const dependent = data.dependent && typeof data.dependent === "object" ? data.dependent : {};
		const name = normalizeName(dependent.name ?? dependent.element ?? record.element_name ?? record.elementName);
		if (!target || !name) continue;
		byElement.set(`${target}::${keyName(name)}`, { record, data: dependent });
	}
	return byElement;
}

function occurrenceCount(records, componentPath, elementName) {
	let count = 0;
	for (const record of records) {
		if (!["occurrences", "parameter_occurrences"].includes(record?.kind)) continue;
		const recordElement = normalizeName(record.element_name ?? record.elementName ?? payload(record).elementName);
		if (recordElement && keyName(recordElement) !== keyName(elementName)) continue;
		const recordComponent = scalar(record.component_path ?? record.componentPath ?? payload(record).componentPath);
		if (recordComponent && componentPath && recordComponent !== componentPath) continue;
		const data = payload(record);
		count += arrayFrom(data.occurrences).length;
		count += arrayFrom(data.matches).length;
		count += arrayFrom(data.items).length;
		if (data.count && Number.isFinite(Number(data.count))) count += Number(data.count);
	}
	return count;
}

function occurrenceRecord(records, componentPath, elementName) {
	return records.find((record) => {
		if (!["occurrences", "parameter_occurrences"].includes(record?.kind)) return false;
		const recordElement = normalizeName(record.element_name ?? record.elementName ?? payload(record).elementName);
		const recordComponent = scalar(record.component_path ?? record.componentPath ?? payload(record).componentPath);
		return keyName(recordElement) === keyName(elementName) && (!recordComponent || !componentPath || recordComponent === componentPath);
	});
}

function evidenceRef(record) {
	return {
		evidence_id: scalar(record?.evidence_id ?? `${record?.kind}:${record?.target ?? ""}`),
		tool: scalar(record?.tool),
		action: scalar(record?.action),
		target: scalar(record?.target ?? record?.component_path ?? record?.componentPath),
	};
}

function finding(row, ruleId, severity, elementName, evidence, recommendation, extra = {}) {
	return {
		rule_id: ruleId,
		family: "parameter-mapping",
		severity,
		component_path: row.importer || row.exporter || null,
		method_name: null,
		diagram_name: null,
		element_name: elementName || null,
		signal_name: null,
		importer_component_path: row.importer || null,
		exporter_component_path: row.exporter || null,
		actual_mapping: {
			imported: row.importedName || null,
			local: row.localName || null,
			...(extra.actual_mapping ?? {}),
		},
		expected_mapping: extra.expected_mapping ?? null,
		evidence,
		recommendation,
		tool_evidence: [evidenceRef(row.record), ...(extra.tool_evidence ?? [])],
		confidence: extra.confidence ?? "medium",
	};
}

function attrValue(element, attr) {
	if (!element || typeof element !== "object") return undefined;
	const direct = element[attr];
	if (direct != null && direct !== "") return scalar(direct);
	const metadata = element.metadata;
	if (metadata && typeof metadata === "object" && metadata[attr] != null && metadata[attr] !== "") {
		return scalar(metadata[attr]);
	}
	return undefined;
}

function compareAttributes(imported, local) {
	const mismatches = [];
	for (const field of ATTRIBUTE_FIELDS) {
		const left = attrValue(imported, field);
		const right = attrValue(local, field);
		if (left == null || right == null) continue;
		if (left.trim().toLowerCase() !== right.trim().toLowerCase()) {
			mismatches.push({ field, imported: left, local: right });
		}
	}
	return mismatches;
}

function isLocalConstant(parameter) {
	const text = [
		parameter?.scope,
		parameter?.kind,
		parameter?.type,
		parameter?.category,
		parameter?.role,
		parameter?.constant,
		parameter?.isConstant,
	]
		.map(scalar)
		.join(" ")
		.toLowerCase();
	return text.includes("local") && text.includes("constant");
}

function run(records) {
	const findings = [];
	const params = collectParameters(records);
	const rows = dependentChainRows(records);
	const deps = dependencyRecords(records);
	const childEvidence = firstRecordByKindAndComponent(records, ["children", "parameter_children"]);
	const componentRefEvidence = firstRecordByKindAndComponent(records, ["component_refs"]);
	const rowSupportEvidence = (row) =>
		[
			componentRefEvidence.get(row.importer),
			componentRefEvidence.get(row.exporter),
			childEvidence.get(row.importer),
			childEvidence.get(row.exporter),
		]
			.filter(Boolean)
			.map(evidenceRef);

	for (const gap of records.filter((record) => record?.kind === "parameter_mapping_relation_gap" && record.ok === false)) {
		findings.push({
			rule_id: "evidence.parameter-mapping-relation-gap",
			family: "evidence-gap",
			severity: "info",
			component_path: gap.component_path ?? null,
			method_name: null,
			diagram_name: null,
			element_name: null,
			signal_name: null,
			evidence: gap.error?.message ?? "Importer/exporter relation could not be established.",
			recommendation: "Collect component_refs or provide the importer/exporter component pair explicitly.",
			tool_evidence: [evidenceRef(gap)],
			confidence: "high",
		});
	}

	const importsByImporter = new Map();
	const mappedImportsByImporter = new Map();
	const mappedLocalsByExporter = new Map();
	for (const [component, componentParams] of params) {
		importsByImporter.set(
			component,
			[...componentParams.values()].filter((param) => scalar(param.scope).toLowerCase().includes("imported")),
		);
	}

	const localToImports = new Map();
	for (const row of rows) {
		const importerParams = params.get(row.importer) ?? new Map();
		const localComponent = row.localComponent || row.exporter;
		const localParams = params.get(localComponent) ?? new Map();
		const imported = importerParams.get(keyName(row.importedName)) ?? row.importedAttributes;
		const local = localParams.get(keyName(row.localName)) ?? row.localAttributes;
		const importedIsDt = isDtElement({ ...imported, name: row.importedName });
		const localIsDt = isDtElement({ ...local, name: row.localName });

		if (row.importer && row.importedName) {
			const set = mappedImportsByImporter.get(row.importer) ?? new Set();
			set.add(keyName(row.importedName));
			mappedImportsByImporter.set(row.importer, set);
		}
		if (row.exporter && row.localName) {
			const set = mappedLocalsByExporter.get(localComponent) ?? new Set();
			set.add(keyName(row.localName));
			mappedLocalsByExporter.set(localComponent, set);
			const dep = deps.get(`${localComponent}::${keyName(row.localName)}`);
			const depState = scalar(dep?.data?.dependency).toLowerCase();
			if (depState === "dependent") {
				const groupKey = `${localComponent}::${keyName(row.localName)}`;
				const group = localToImports.get(groupKey) ?? { row, imports: [], dep };
				group.imports.push(row.importedName);
				localToImports.set(groupKey, group);
			}
		}

		if (importedIsDt !== localIsDt) {
			findings.push(
				finding(
					row,
					"parameter.mapping-dt-business-crosswire",
					"high",
					importedIsDt ? row.localName : row.importedName,
					`Business parameter mapping crosses ASCET dT system parameter boundary: ${row.importedName} -> ${row.localName}.`,
					"Remove the dT mapping from the business parameter chain and map the business parameter to the intended exported/local parameter.",
					{ confidence: "high", tool_evidence: rowSupportEvidence(row) },
				),
			);
			continue;
		}

		if (importedIsDt || localIsDt) continue;

		if (row.importedName && !importerParams.has(keyName(row.importedName))) {
			findings.push(
				finding(
					row,
					"parameter.mapping-missing-imported",
					"high",
					row.importedName,
					`Mapping references imported parameter '${row.importedName}' but it is not present in ${row.importer}.`,
					"Create the imported parameter or remove the stale mapping reference.",
					{ confidence: "high", tool_evidence: rowSupportEvidence(row) },
				),
			);
		}

		if (row.localName && !localParams.has(keyName(row.localName))) {
			findings.push(
				finding(
					row,
					"parameter.mapping-missing-local",
					"high",
					row.localName,
					`Mapping references local parameter '${row.localName}' but it is not present in ${localComponent}.`,
					"Create the local/exported parameter or remap to an existing parameter.",
					{ confidence: "high", tool_evidence: rowSupportEvidence(row) },
				),
			);
		}

		const mismatches = compareAttributes(imported, local);
		if (mismatches.length > 0 && importerParams.has(keyName(row.importedName)) && localParams.has(keyName(row.localName))) {
			findings.push(
				finding(
					row,
					"parameter.imported-local-attribute-mismatch",
					"medium",
					row.importedName,
					`Mapped parameters differ in ${mismatches.map((entry) => entry.field).join(", ")}.`,
					"Align type, formula, range, unit, resolution, offset, and calibration metadata or remap to the intended parameter.",
					{
						actual_mapping: { mismatches },
						tool_evidence: rowSupportEvidence(row),
						confidence: "high",
					},
				),
			);
		}

		if (row.semanticMismatch && row.expectedName) {
			findings.push(
				finding(
					row,
					"semantic.parameter-name-consistency",
					"medium",
					row.importedName,
					`Tool evidence marks parameter mapping '${row.importedName}' -> '${row.localName}' as semantically inconsistent with expected '${row.expectedName}'.`,
					"Review the mapping target and align the parameter name semantics with the intended business value.",
					{
						expected_mapping: { local: row.expectedName },
						tool_evidence: rowSupportEvidence(row),
						confidence: "medium",
					},
				),
			);
		}
	}

	for (const [component, importedParams] of importsByImporter) {
		const mapped = mappedImportsByImporter.get(component) ?? new Set();
		for (const param of importedParams) {
			if (param.is_dt || isDtElement(param)) continue;
			if (mapped.has(keyName(param.name))) continue;
			const occurrences = occurrenceCount(records, component, param.name);
			if (occurrences === 0) {
				const supportEvidence = [childEvidence.get(component), occurrenceRecord(records, component, param.name)]
					.filter(Boolean)
					.map(evidenceRef);
				findings.push({
					rule_id: "parameter.imported-unmapped-and-unused",
					family: "parameter-mapping",
					severity: "medium",
					component_path: component,
					method_name: null,
					diagram_name: null,
					element_name: param.name,
					signal_name: null,
					importer_component_path: component,
					exporter_component_path: null,
					actual_mapping: { imported: param.name, local: null },
					expected_mapping: null,
					evidence: `Imported parameter '${param.name}' is not mapped and has no recorded occurrences.`,
					recommendation: "Remove the unused imported parameter or map it to the intended exported/local parameter.",
					tool_evidence: supportEvidence,
					confidence: "medium",
				});
			}
		}
	}

	for (const [component, componentParams] of params) {
		const mapped = mappedLocalsByExporter.get(component) ?? new Set();
		for (const param of componentParams.values()) {
			if (param.is_dt || isDtElement(param)) continue;
			if (!isLocalConstant(param)) continue;
			if (mapped.has(keyName(param.name))) continue;
			const supportEvidence = [childEvidence.get(component)].filter(Boolean).map(evidenceRef);
			findings.push({
				rule_id: "parameter.local-constant-unmapped",
				family: "parameter-mapping",
				severity: "low",
				component_path: component,
				method_name: null,
				diagram_name: null,
				element_name: param.name,
				signal_name: null,
				importer_component_path: null,
				exporter_component_path: component,
				actual_mapping: { imported: null, local: param.name },
				expected_mapping: null,
				evidence: `Local constant parameter '${param.name}' is not supported by an import/export mapping.`,
				recommendation: "Map the local constant to the intended imported/exported parameter or document why it is intentionally standalone.",
				tool_evidence: supportEvidence,
				confidence: "medium",
			});
		}
	}

	for (const group of localToImports.values()) {
		const uniqueImports = [...new Set(group.imports.map(normalizeName).filter(Boolean))];
		if (uniqueImports.length <= 1) continue;
		findings.push(
			finding(
				group.row,
				"parameter.multiple-dependency-local-parameter",
				"medium",
				group.row.localName,
				`Multiple imported parameters (${uniqueImports.join(", ")}) map to dependent local parameter '${group.row.localName}'.`,
				"Split the dependency target or confirm that the multiple imported parameters are intentionally equivalent.",
				{
					actual_mapping: { imported: uniqueImports, local: group.row.localName },
					tool_evidence: [...rowSupportEvidence(group.row), ...(group.dep?.record ? [evidenceRef(group.dep.record)] : [])],
					confidence: "medium",
				},
			),
		);
	}

	return findings;
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	const records = readEvidence(args.evidenceDir);
	const findings = run(records);
	mkdirSync(dirname(args.out), { recursive: true });
	writeFileSync(args.out, findings.map((finding) => JSON.stringify(finding)).join("\n") + (findings.length ? "\n" : ""));
	console.log(
		JSON.stringify({
			ok: true,
			script: basename(fileURLToPath(import.meta.url)),
			evidenceDir: resolve(args.evidenceDir),
			out: resolve(args.out),
			findings: findings.length,
		}),
	);
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}
