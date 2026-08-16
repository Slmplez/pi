# ASCET Extension 工具提示词（中文说明版）

说明：prompt 正文为代码中实际注入的英文原文（模型看到的就是这些文本），每个工具附中文释义与注入时机。

## 注入机制总览

1. **扩展加载时（pi 启动）**：`src/index.ts` 的 `ascetExtension()` 创建 exposure controller，按 `PI_ASCET_PROFILE` 环境变量选定初始 profile（默认 `base`），调用 `registerProfileTools()` 把该 profile 允许的工具连同 `promptSnippet` + `promptGuidelines` 一起注册进 pi。
2. **每次 agent 运行前（before_agent_start）**：`activateProfile()` 重新应用当前 profile 的工具集合（profile 未变则跳过重新注册），并把 ASCET coding policy（System Prompt）追加到 systemPrompt（只追加一次）。
3. **profile 切换时**：工具会按新 profile 重新构建——`promptGuidelines` = 基础 guidelines + profile 专属额外 guidelines（见文末各 profile 段）。
4. **工具 description/schema**：每次模型请求随 tool schema 一起发送；guidelines 由 pi 框架组装进系统提示。
5. **环境变量**：`PI_ASCET_PROFILE` 选初始 profile；`PI_ASCET_ENABLE_BATCH_WRITE=1` 才暴露隐藏的 `ascet_batch_write`。

## 各 profile 激活的工具清单

```text
base: find, grep, read, ascet_get, ascet_read, ascet_status, ascet_capabilities, ascet_recover, ascet_scheduler_status, ascet_diff, ascet_edit, configure_parameter_dependency_chain
advanced-read: find, grep, read, ascet_get, ascet_read, ascet_status, ascet_capabilities
reference: find, grep, read, ascet_get, ascet_read, ascet_status, ascet_capabilities
diff: find, grep, read, ascet_get, ascet_read, ascet_status, ascet_capabilities, ascet_diff
write-preflight: find, grep, read, ascet_get, ascet_read, ascet_status, ascet_capabilities, ascet_edit, ascet_scheduler_status, configure_parameter_dependency_chain
batch-write: find, grep, read, ascet_get, ascet_read, ascet_status, ascet_capabilities, ascet_edit, ascet_scheduler_status, configure_parameter_dependency_chain
component-edit: find, grep, read, ascet_get, ascet_read, ascet_status, ascet_capabilities, ascet_edit, configure_parameter_dependency_chain
ops: find, grep, read, ascet_get, ascet_read, ascet_status, ascet_capabilities, ascet_recover, ascet_scheduler_status
```

## ascet_status

- **中文释义**：ASCET 安装、DLL、live ToolAPI 与调度器诊断。提示模型在运行时可用性不确定时先调用它。
- **注入时机**：始终注册（所有 profile 都包含）。
- **description（随 schema 每次发送）**: Report ASCET installation, DLL, live ToolAPI, and scheduler diagnostics.
- **promptSnippet**: Check ASCET installation, DLL, live ToolAPI, and scheduler availability

**promptGuidelines（英文原文）**:

```text
Use ascet_status before calling other ASCET tools when runtime availability is uncertain.
Treat missing ASCET CLI, contract catalog, or Etas.AscetNET.dll as a setup issue.
Treat a failed live ToolAPI probe as runtime unavailable even when installation checks pass.
Use ascet_scheduler_status for detailed queue, CLI lock, and operation-health diagnostics.
status: ascet_status({})
```

## ascet_capabilities

- **中文释义**：Action 发现入口：search_actions 返回完整 schema/rules/fewShot。其 guidelines 内嵌完整的 46 条紧凑 action 目录（buildCompactActionGuide）。
- **注入时机**：始终注册（所有 profile 都包含）。action 目录随工具注册一次性注入。
- **description（随 schema 每次发送）**: Search ASCET tool actions or bundled backend operations.
- **promptSnippet**: Discover ASCET tool actions before choosing a read, search, compare, verify, or write action.

**promptGuidelines（英文原文）**:

```text
Use ascet_capabilities.search_actions when selecting the right ASCET action is unclear.
Initial action guide is compact; call search_actions for full schema, rules, fewShot, and result shape.
search_actions: ascet_capabilities({action:"search_actions",query:"complete code",limit:3})
ASCET action guide:
Use these compact ASCET action descriptors to choose a tool action.
If the right ASCET action is unclear or parameters are uncertain, call ascet_capabilities({action:"search_actions",query:"...",limit:3}) to get full schema, rules, and fewShot.
search_actions searches ASCET tool actions, not ASCET model contents.
ops:
- ascet_status.status: Connect ASCET and warm only the component partition.. Ex: status: ascet_status({})
- ascet_capabilities.search_actions: search ASCET tool actions and return full schema/rules/fewShot. Ex: search_actions: ascet_capabilities({action:"search_actions",query:"complete code",limit:3})
- configure_parameter_dependency_chain.plan: Plan one complete inline Provider/Consumer/Local dependency chain.. Ex: configure_parameter_dependency_chain({mode:"plan",provider:{componentPath:"F/Provider",element:{role:"providerExportedParameter",name:"P_Threshold",modelType:"cont",unit:"",comment:"Provider output",calibration:false,range:{mode:"none"},data:{mode:"ascetDefault"},implementation:{mode:"ascetDefault"}}},consumer:{componentPath:"F/Consumer",element:{role:"consumerImportedParameter",name:"P_Threshold",modelType:"cont"}},local:{componentPath:"F/Consumer",element:{role:"localDependentParameter",name:"C_Threshold",modelType:"cont",unit:"",comment:"Dependent local",calibration:false,range:{mode:"none"},implementation:{mode:"ascetDefault"}}},dependency:{formula:"P_Threshold",formals:["P_Threshold"],bindingPolicy:"explicit",mappings:{P_Threshold:{kind:"parameter",name:"P_Threshold"}},variantPolicy:"default"}})
- configure_parameter_dependency_chain.commit: Commit a previously planned dependency chain by planId only.. Ex: commit: configure_parameter_dependency_chain({mode:"commit",planId:"plan-id"})
- ascet_recover.status: Diagnose ASCET extension runtime state.. Ex: status: ascet_recover({action:"status"})
- ascet_recover.clear_extension_temp: Clear extension-owned temporary ASCET files.. Ex: clear_extension_temp: ascet_recover({action:"clear_extension_temp"})
- ascet_recover.scheduler_status: Inspect ASCET scheduler queue and CLI lock state.. Ex: scheduler_status: ascet_recover({action:"scheduler_status"})
- ascet_recover.scheduler_recover: Run safe scheduler recovery.. Ex: scheduler_recover: ascet_recover({action:"scheduler_recover"})
- ascet_recover.clear_stale_cli_lock: Clear a stale PI-owned ASCET CLI lock.. Ex: clear_stale_cli_lock: ascet_recover({action:"clear_stale_cli_lock"})
- ascet_scheduler_status.status: Inspect ASCET runtime scheduler queue, PI CLI lock, and operation health.. Ex: status: ascet_scheduler_status({action:"status",format:"text"})
- ascet_scheduler_status.recover: Run safe scheduler recovery from the scheduler tool.. Ex: recover: ascet_scheduler_status({action:"recover",format:"text"})
read:
- ascet_read.read_code: read complete live code; not global code search. Ex: read_code: ascet_read({action:"read_code",componentPath:"DEMO/PID",methodName:"calc",section:"body"})
- ascet_read.read_method_signature: Verify primitive method return type and arguments.. Ex: read_method_signature: ascet_read({action:"read_method_signature",componentPath:"DEMO/PID",methodName:"calc"})
- ascet_read.read_element: Read complete metadata for one exact resolved Element.. Ex: read_element: ascet_read({action:"read_element",componentPath:"DEMO/PID",elementName:"pid_kp"})
- ascet_read.read_implementation: Read implementation metadata for a resolved component.. Ex: read_implementation: ascet_read({action:"read_implementation",componentPath:"DEMO/PID",implementationMode:"default"})
- ascet_read.read_block_diagram: Read a BDE/block-diagram surface for resolved class or module targets.. Ex: read_block_diagram: ascet_read({action:"read_block_diagram",componentPath:"DEMO/PID",diagramName:"Main"})
- ascet_read.read_state_machine_flow: Read state-machine flow only for resolved StateMachine targets.. Ex: read_state_machine_flow: ascet_read({action:"read_state_machine_flow",componentPath:"DEMO/SM",detailLevel:"summary"})
- ascet_read.read_dependent_chain: read one exact local/imported/exported dependency chain; provider path is optional explicit evidence. Ex: read_dependent_chain: ascet_read({action:"read_dependent_chain",componentPath:"FeatureA/Consumer",dependentElement:"C_K_Effective"})
- ascet_read.read_element_dependency: Read dependency flag and formula for one existing element.. Ex: read_element_dependency: ascet_read({action:"read_element_dependency",componentPath:"FeatureA/Consumer",elementName:"C_K_Effective",targetKind:"component"})
- ascet_read.read: Read a live summary for one exact resolved Component.. Ex: read: ascet_read({action:"read",componentPath:"DEMO/PID"})
diff:
- ascet_diff.diff: Compare two ASCET targets with the generic diff route.. Ex: diff: ascet_diff({action:"diff",objectKind:"class",leftPath:"D/A",rightPath:"D/B",changesOnly:true})
- ascet_diff.diff_method: Compare one method body between two components.. Ex: diff_method: ascet_diff({action:"diff_method",leftPath:"D/A",rightPath:"D/B",methodName:"calc",changesOnly:true})
- ascet_diff.diff_component_snapshot: Compare quick child snapshots for two components.. Ex: diff_component_snapshot: ascet_diff({action:"diff_component_snapshot",leftPath:"D/A",rightPath:"D/B",changesOnly:true})
- ascet_diff.diff_state_machine_domain: Compare state-machine domain structure.. Ex: diff_state_machine_domain: ascet_diff({action:"diff_state_machine_domain",leftPath:"D/A",rightPath:"D/B",changesOnly:true})
- ascet_diff.diff_element_spec: Compare an element spec artifact with a live component.. Ex: diff_element_spec: ascet_diff({action:"diff_element_spec",componentPath:"DEMO/PID",specFile:"spec.json",changesOnly:true})
- ascet_diff.diff_project_formulas: Compare project formulas between two Project targets.. Ex: diff_project_formulas: ascet_diff({action:"diff_project_formulas",leftPath:"D/P1",rightPath:"D/P2",changesOnly:true})
write:
- ascet_edit.create_folder: Create one ASCET folder with guarded preflight/readback behavior.. Ex: create_folder: ascet_edit({action:"create_folder",folderPath:"DEMO/New"})
- ascet_edit.create_component: Create one component target with kind-specific defaults and readback.. Ex: create_component: ascet_edit({action:"create_component",componentPath:"DEMO/C",kind:"class",language:"ESDL"})
- ascet_edit.create_method: Create one method/process/action shell compatible with the component kind.. Ex: create_method: ascet_edit({action:"create_method",componentPath:"DEMO/PID",componentKind:"class",methodName:"calc2",methodKind:"abstract"})
- ascet_edit.set_method_signature: Patch a method signature before writing code that depends on return values or arguments.. Ex: set_method_signature: ascet_edit({action:"set_method_signature",componentPath:"DEMO/PID",methodName:"calc",returnType:"cont",arguments:[{name:"u",type:"cont",ifExists:"replace"}]})
- ascet_edit.delete_component: Delete one component through guarded write flow.. Ex: delete_component: ascet_edit({action:"delete_component",componentPath:"DEMO/Old",ifMissing:"fail"})
- ascet_edit.delete_method: Delete one method through guarded write flow.. Ex: delete_method: ascet_edit({action:"delete_method",componentPath:"DEMO/PID",methodName:"old",ifMissing:"fail"})
- ascet_edit.delete_folder: Delete one folder through guarded write flow.. Ex: delete_folder: ascet_edit({action:"delete_folder",folderPath:"DEMO/Old",ifMissing:"fail"})
- ascet_edit.set_method_code: Set one class/module method body.. Ex: set_method_code: ascet_edit({action:"set_method_code",componentPath:"DEMO/PID",methodName:"calc",codeFile:"calc.esdl"})
- ascet_edit.set_module_code: Set module method, header, or external C code surfaces.. Ex: set_module_code.set-method: ascet_edit({action:"set_module_code",modulePath:"DEMO/M",operation:"set-method",methodName:"calc",codeFile:"calc.c"})
- ascet_edit.set_state_machine_code: Set state-machine method, state, transition, binding, or start-state code.. Ex: set_state_machine_code.set-method: ascet_edit({action:"set_state_machine_code",stateMachinePath:"D/SM",operation:"set-method",methodName:"tick",codeFile:"tick.esdl"})
- ascet_edit.set_enumerators: Set enumeration values for an ASCET enumeration component.. Ex: set_enumerators: ascet_edit({action:"set_enumerators",componentPath:"D/E",enumerators:["E_OFF","E_ON"]})
- ascet_edit.apply_element_spec: Apply structured primitive element specs from evidence, not guesses.. Ex: ascet_edit({action:"apply_element_spec",componentPath:"F/C",intent:"create",elements:[{role:"providerExportedParameter",name:"P",modelType:"cont",unit:"",comment:"Provider output",calibration:false,range:{mode:"none"},data:{mode:"ascetDefault"},implementation:{mode:"ascetDefault"}}]})
- ascet_edit.apply_project_formula: Apply structured project formula specs through guarded write flow.. Ex: apply_project_formula: ascet_edit({action:"apply_project_formula",projectPath:"D/P",specFile:"formula.json",mode:"restore"})
- ascet_edit.set_element_dependency: set dependency flag/formula on an existing local parameter only; successful writes invalidate matching observations. Ex: set_element_dependency: ascet_edit({action:"set_element_dependency",targetPath:"F/C",elementName:"K",dependency:"dependent",variantPolicy:"default"})
- ascet_edit.check: Check whether a source-controlled ASCET component is editable.. Ex: check: ascet_edit({mode:"check",componentPath:"DEMO/PID"})
- ascet_edit.set: Request an ASCET SCM lock through guarded write flow.. Ex: set: ascet_edit({mode:"set",componentPath:"DEMO/PID",executeWrite:true})
```

## ascet_recover

- **中文释义**：扩展侧安全恢复：状态、清理扩展临时文件、调度器恢复、清理过期 CLI 锁。禁止杀用户 ASCET 进程。
- **注入时机**：默认 base profile 注册；ops profile 追加 1 条额外 guideline。
- **description（随 schema 每次发送）**: Run safe ASCET extension recovery actions without touching user-owned ASCET processes.
- **promptSnippet**: Check ASCET extension recovery status or clear extension-owned temp files.

**promptGuidelines（英文原文）**:

```text
Use action='status' before recovery if the failure mode is unclear.
Use scheduler_status or scheduler_recover for queue, lock, and operation-health diagnostics.
Only clear extension-owned temp files; this tool must not kill ASCET GUI or user-owned ToolAPI processes.
status: ascet_recover({action:"status"})
clear_extension_temp: ascet_recover({action:"clear_extension_temp"})
scheduler_status: ascet_recover({action:"scheduler_status"})
scheduler_recover: ascet_recover({action:"scheduler_recover"})
clear_stale_cli_lock: ascet_recover({action:"clear_stale_cli_lock"})
```

## ascet_scheduler_status

- **中文释义**：调度队列、PI CLI 锁、操作健康诊断；recover 仅做安全恢复。
- **注入时机**：base / write-preflight / batch-write / ops profile 注册。
- **description（随 schema 每次发送）**: Inspect ASCET scheduler queue status, PI CLI lock ownership, and degraded operation health.
- **promptSnippet**: Inspect ASCET runtime scheduler queue, PI CLI lock, and operation health.

**promptGuidelines（英文原文）**:

```text
Use ascet_scheduler_status when ASCET tools appear stuck, queued, degraded, or timing out.
Use action='recover' only for safe scheduler recovery; it does not kill user-owned ASCET GUI processes.
status: ascet_scheduler_status({action:"status",format:"text"})
recover: ascet_scheduler_status({action:"recover",format:"text"})
```

## ascet_get

- **中文释义**：有界结构读取：tree、database_catalog、elements、formulas、component_refs、bde_edges、import_binding、dbitem_refs。
- **注入时机**：所有 profile 注册（ON_DEMAND_DISCOVERY_TOOLS）。reference profile 追加 1 条额外 guideline。
- **description（随 schema 每次发送）**: Read ASCET tree, database catalogs, elements, formulas, references, bindings, and BDE edges on demand.
- **promptSnippet**: Get one bounded ASCET structure or stored observation; use ascet_capabilities for full action rules.

**promptGuidelines（英文原文）**:

```text
- ascet_get.tree: Read a bounded live Folder/Component tree when structural discovery is required.. Ex: tree: ascet_get({action:"tree",target:{targetPathPrefix:"PlatformLibrary\\Package"}})
- ascet_get.database_catalog: Build stored full-database catalogs from a complete Tree observation.. Ex: database_catalog: ascet_get({action:"database_catalog",sourceTreeResultId:"obs-tree-full",include:["module","enumeration"],delivery:"stored"})
- ascet_get.elements: Read complete Element directory entries for an exact Component or bounded Folder selection.. Ex: elements: ascet_get({action:"elements",target:{path:"DEMO\\PID"}})
- ascet_get.formulas: Read complete Project Formula definitions for one exact Project.. Ex: formulas: ascet_get({action:"formulas",target:{path:"DEMO\\Project"}})
- ascet_get.component_refs: Read outgoing Component references without loading source code.. Ex: component_refs: ascet_get({action:"component_refs",target:{path:"DEMO\\Consumer"}})
- ascet_get.bde_edges: Read BDE signal edges for one resolved component/diagram.. Ex: bde_edges: ascet_get({action:"bde_edges",target:{path:"DEMO\\Controller"},diagramName:"Main"})
- ascet_get.import_binding: Verify one Imported Element binding against an explicit provider Component.. Ex: import_binding: ascet_get({action:"import_binding",target:{path:"DEMO\\Consumer"},elementName:"P_Request",provider:{path:"DEMO\\Provider"}})
- ascet_get.dbitem_refs: Read outgoing database-item references for one exact object.. Ex: dbitem_refs: ascet_get({action:"dbitem_refs",target:{path:"DEMO\\Consumer"}})
```

## ascet_read

- **中文释义**：精确目标深读：代码、签名、Element 元数据、实现、BDE、状态机、依赖链。
- **注入时机**：所有 profile 注册。advanced-read profile 追加 2 条 read_block_diagram 额外 guideline。
- **description（随 schema 每次发送）**: Read live ASCET code text, implementations, block diagrams, and state-machine flows.
- **promptSnippet**: Read one exact ASCET target deeply after bounded discovery; use ascet_capabilities for full action rules.

**promptGuidelines（英文原文）**:

```text
- ascet_read.read_code: read complete live code; not global code search. Ex: read_code: ascet_read({action:"read_code",componentPath:"DEMO/PID",methodName:"calc",section:"body"})
- ascet_read.read_method_signature: Verify primitive method return type and arguments.. Ex: read_method_signature: ascet_read({action:"read_method_signature",componentPath:"DEMO/PID",methodName:"calc"})
- ascet_read.read_element: Read complete metadata for one exact resolved Element.. Ex: read_element: ascet_read({action:"read_element",componentPath:"DEMO/PID",elementName:"pid_kp"})
- ascet_read.read_implementation: Read implementation metadata for a resolved component.. Ex: read_implementation: ascet_read({action:"read_implementation",componentPath:"DEMO/PID",implementationMode:"default"})
- ascet_read.read_block_diagram: Read a BDE/block-diagram surface for resolved class or module targets.. Ex: read_block_diagram: ascet_read({action:"read_block_diagram",componentPath:"DEMO/PID",diagramName:"Main"})
- ascet_read.read_state_machine_flow: Read state-machine flow only for resolved StateMachine targets.. Ex: read_state_machine_flow: ascet_read({action:"read_state_machine_flow",componentPath:"DEMO/SM",detailLevel:"summary"})
- ascet_read.read_dependent_chain: read one exact local/imported/exported dependency chain; provider path is optional explicit evidence. Ex: read_dependent_chain: ascet_read({action:"read_dependent_chain",componentPath:"FeatureA/Consumer",dependentElement:"C_K_Effective"})
- ascet_read.read_element_dependency: Read dependency flag and formula for one existing element.. Ex: read_element_dependency: ascet_read({action:"read_element_dependency",componentPath:"FeatureA/Consumer",elementName:"C_K_Effective",targetKind:"component"})
- ascet_read.read: Read a live summary for one exact resolved Component.. Ex: read: ascet_read({action:"read",componentPath:"DEMO/PID"})
```

## ascet_diff

- **中文释义**：对比组件、方法、快照、状态机域、element spec、project formula。
- **注入时机**：base / diff profile 注册。diff profile 追加 1 条额外 guideline。
- **description（随 schema 每次发送）**: Compare ASCET components, methods, element specs, project formulas, and state-machine domains.
- **promptSnippet**: Compare resolved ASCET targets; use ascet_capabilities for full action rules.

**promptGuidelines（英文原文）**:

```text
- ascet_diff.diff: Compare two ASCET targets with the generic diff route.. Ex: diff: ascet_diff({action:"diff",objectKind:"class",leftPath:"D/A",rightPath:"D/B",changesOnly:true})
- ascet_diff.diff_method: Compare one method body between two components.. Ex: diff_method: ascet_diff({action:"diff_method",leftPath:"D/A",rightPath:"D/B",methodName:"calc",changesOnly:true})
- ascet_diff.diff_component_snapshot: Compare quick child snapshots for two components.. Ex: diff_component_snapshot: ascet_diff({action:"diff_component_snapshot",leftPath:"D/A",rightPath:"D/B",changesOnly:true})
- ascet_diff.diff_state_machine_domain: Compare state-machine domain structure.. Ex: diff_state_machine_domain: ascet_diff({action:"diff_state_machine_domain",leftPath:"D/A",rightPath:"D/B",changesOnly:true})
- ascet_diff.diff_element_spec: Compare an element spec artifact with a live component.. Ex: diff_element_spec: ascet_diff({action:"diff_element_spec",componentPath:"DEMO/PID",specFile:"spec.json",changesOnly:true})
- ascet_diff.diff_project_formulas: Compare project formulas between two Project targets.. Ex: diff_project_formulas: ascet_diff({action:"diff_project_formulas",leftPath:"D/P1",rightPath:"D/P2",changesOnly:true})
```

## ascet_edit

- **中文释义**：守卫式写入：缺 executeWrite 时仅 Preflight，executeWrite=true 才真实写入；Runtime 自动 readback 验证。含 check/set 两个编辑性操作。
- **注入时机**：base / write-preflight / batch-write / component-edit profile 注册。write-preflight / batch-write / component-edit 各追加 1 条额外 guideline。
- **description（随 schema 每次发送）**: Run a guarded ASCET mutation or inspect/request component editability.
- **promptSnippet**: Preflight or execute one exact ASCET edit; use ascet_capabilities for full action rules.

**promptGuidelines（英文原文）**:

```text
- ascet_edit.create_folder: Create one ASCET folder with guarded preflight/readback behavior.. Ex: create_folder: ascet_edit({action:"create_folder",folderPath:"DEMO/New"})
- ascet_edit.create_component: Create one component target with kind-specific defaults and readback.. Ex: create_component: ascet_edit({action:"create_component",componentPath:"DEMO/C",kind:"class",language:"ESDL"})
- ascet_edit.create_method: Create one method/process/action shell compatible with the component kind.. Ex: create_method: ascet_edit({action:"create_method",componentPath:"DEMO/PID",componentKind:"class",methodName:"calc2",methodKind:"abstract"})
- ascet_edit.set_method_signature: Patch a method signature before writing code that depends on return values or arguments.. Ex: set_method_signature: ascet_edit({action:"set_method_signature",componentPath:"DEMO/PID",methodName:"calc",returnType:"cont",arguments:[{name:"u",type:"cont",ifExists:"replace"}]})
- ascet_edit.delete_component: Delete one component through guarded write flow.. Ex: delete_component: ascet_edit({action:"delete_component",componentPath:"DEMO/Old",ifMissing:"fail"})
- ascet_edit.delete_method: Delete one method through guarded write flow.. Ex: delete_method: ascet_edit({action:"delete_method",componentPath:"DEMO/PID",methodName:"old",ifMissing:"fail"})
- ascet_edit.delete_folder: Delete one folder through guarded write flow.. Ex: delete_folder: ascet_edit({action:"delete_folder",folderPath:"DEMO/Old",ifMissing:"fail"})
- ascet_edit.set_method_code: Set one class/module method body.. Ex: set_method_code: ascet_edit({action:"set_method_code",componentPath:"DEMO/PID",methodName:"calc",codeFile:"calc.esdl"})
- ascet_edit.set_module_code: Set module method, header, or external C code surfaces.. Ex: set_module_code.set-method: ascet_edit({action:"set_module_code",modulePath:"DEMO/M",operation:"set-method",methodName:"calc",codeFile:"calc.c"})
- ascet_edit.set_state_machine_code: Set state-machine method, state, transition, binding, or start-state code.. Ex: set_state_machine_code.set-method: ascet_edit({action:"set_state_machine_code",stateMachinePath:"D/SM",operation:"set-method",methodName:"tick",codeFile:"tick.esdl"})
- ascet_edit.set_enumerators: Set enumeration values for an ASCET enumeration component.. Ex: set_enumerators: ascet_edit({action:"set_enumerators",componentPath:"D/E",enumerators:["E_OFF","E_ON"]})
- ascet_edit.apply_element_spec: Apply structured primitive element specs from evidence, not guesses.. Ex: ascet_edit({action:"apply_element_spec",componentPath:"F/C",intent:"create",elements:[{role:"providerExportedParameter",name:"P",modelType:"cont",unit:"",comment:"Provider output",calibration:false,range:{mode:"none"},data:{mode:"ascetDefault"},implementation:{mode:"ascetDefault"}}]})
- ascet_edit.apply_project_formula: Apply structured project formula specs through guarded write flow.. Ex: apply_project_formula: ascet_edit({action:"apply_project_formula",projectPath:"D/P",specFile:"formula.json",mode:"restore"})
- ascet_edit.set_element_dependency: set dependency flag/formula on an existing local parameter only; successful writes invalidate matching observations. Ex: set_element_dependency: ascet_edit({action:"set_element_dependency",targetPath:"F/C",elementName:"K",dependency:"dependent",variantPolicy:"default"})
- ascet_edit.check: Check whether a source-controlled ASCET component is editable.. Ex: check: ascet_edit({mode:"check",componentPath:"DEMO/PID"})
- ascet_edit.set: Request an ASCET SCM lock through guarded write flow.. Ex: set: ascet_edit({mode:"set",componentPath:"DEMO/PID",executeWrite:true})
```

## configure_parameter_dependency_chain

- **中文释义**：Provider→Imported→Local 依赖链 plan/commit；variantPolicy 必填；执行与回滚由 Runtime 内部自动验证。
- **注入时机**：base / write-preflight / batch-write / component-edit profile 注册。
- **description（随 schema 每次发送）**: Plan or commit an explicit ASCET Provider Exported Parameter -> Consumer Imported Parameter -> Local Dependent Parameter chain without guessing ASCET data.
- **promptSnippet**: Use configure_parameter_dependency_chain for one explicit provider/consumer/local dependency chain.

**promptGuidelines（英文原文）**:

```text
configure_parameter_dependency_chain.plan: Plan one complete inline Provider/Consumer/Local dependency chain.
Use mode=plan before commit. Do not create or pass specFile artifacts; provide one role-specific inline element for provider, consumer, and local.
Provider and Local must include every applicable decision group. Imported Parameter is the only lightweight exception and must not contain data, implementation, range, or calibration.
Provider Exported and Consumer Imported names must be the same P_<Name>; the Consumer Local name must be C_<Name>. Provide dependency.formals, bindingPolicy=explicit, mappings, and variantPolicy. The formals list and mapping keys must match exactly; executed stages and rollback writes use automatic internal verification.
configure_parameter_dependency_chain.commit: Commit a previously planned dependency chain by planId only.
Pass only mode=commit and the unchanged planId returned by plan.
```

## ascet_batch_write

- **中文释义**：批量写入（隐藏工具）：默认只返回 preflight 摘要，需用户显式批准才 executeWrite=true。
- **注入时机**：仅当环境变量 PI_ASCET_ENABLE_BATCH_WRITE=1 且 batch-write profile 激活时注册；模型默认不可见。
- **description（随 schema 每次发送）**: Run one ASCET batch write operation after explicit interactive confirmation.
- **promptSnippet**: Prepare or confirm a guarded ASCET batch write.

**promptGuidelines（英文原文）**:

```text
By default this tool returns a preflight summary and does not write.
Set executeWrite=true only after the user explicitly approves the batch write.
Keep request batches small and homogeneous; ASCET live access remains sequential.
For batch_create_component, omitted language defaults to ESDL for class and module targets; statemachine targets do not need language.
For batch_create_method, provide componentKind when omitting methodKind. componentKind=class defaults to abstract and componentKind=module defaults to process; statemachine targets require explicit action, condition, or trigger.
For batch_set_element_spec/apply_element_spec requests, follow the same element-spec contract as ascet_edit: physicalRange and impl.implementationRange are mutually exclusive, discrete exported/local parameter range writes require impl.limitAssignments=true, real32/real64 implementations must omit that option, and imported parameters must not include data, physicalRange, or impl settings.
Batch writes may return partial success. Inspect per-request failures and verify exact touched targets before claiming the whole batch succeeded.
batch_set_method_code: ascet_batch_write({operation:"batch_set_method_code",requests:[{componentPath:"DEMO/PID",methodName:"calc",codeFile:"calc.esdl"}]})
batch_set_element_spec: ascet_batch_write({operation:"batch_set_element_spec",requests:[{componentPath:"DEMO/PID",specFile:"spec.json",mode:"restore"}]})
batch_create_component: ascet_batch_write({operation:"batch_create_component",requests:[{componentPath:"DEMO/C",kind:"class",language:"ESDL"}]})
batch_create_method: ascet_batch_write({operation:"batch_create_method",requests:[{componentPath:"DEMO/PID",methodName:"calc2",componentKind:"class",methodKind:"abstract"}]})
batch_set_project_formula: ascet_batch_write({operation:"batch_set_project_formula",requests:[{projectPath:"D/P",specFile:"formula.json",mode:"restore"}]})
batch_delete_component: ascet_batch_write({operation:"batch_delete_component",requests:[{componentPath:"DEMO/Old",ifMissing:"fail"}]})
batch_delete_method: ascet_batch_write({operation:"batch_delete_method",requests:[{componentPath:"DEMO/PID",methodName:"old",ifMissing:"fail"}]})
batch_create_folder: ascet_batch_write({operation:"batch_create_folder",requests:[{folderPath:"DEMO/New"}]})
batch_delete_folder: ascet_batch_write({operation:"batch_delete_folder",requests:[{folderPath:"DEMO/Old",ifMissing:"fail"}]})
```

## 共享 action 目录 buildCompactActionGuide()

- **中文释义**：46 条紧凑 action 描述（一句话职责 + 最小调用示例），注入在 `ascet_capabilities` 的 guidelines 中，让模型无需 search_actions 即可直接选择常见 action。
- **注入时机**：`ascet_capabilities` 注册时一次性生成并注入（所有 profile）。

```text
ASCET action guide:
Use these compact ASCET action descriptors to choose a tool action.
If the right ASCET action is unclear or parameters are uncertain, call ascet_capabilities({action:"search_actions",query:"...",limit:3}) to get full schema, rules, and fewShot.
search_actions searches ASCET tool actions, not ASCET model contents.
ops:
- ascet_status.status: Connect ASCET and warm only the component partition.. Ex: status: ascet_status({})
- ascet_capabilities.search_actions: search ASCET tool actions and return full schema/rules/fewShot. Ex: search_actions: ascet_capabilities({action:"search_actions",query:"complete code",limit:3})
- configure_parameter_dependency_chain.plan: Plan one complete inline Provider/Consumer/Local dependency chain.. Ex: configure_parameter_dependency_chain({mode:"plan",provider:{componentPath:"F/Provider",element:{role:"providerExportedParameter",name:"P_Threshold",modelType:"cont",unit:"",comment:"Provider output",calibration:false,range:{mode:"none"},data:{mode:"ascetDefault"},implementation:{mode:"ascetDefault"}}},consumer:{componentPath:"F/Consumer",element:{role:"consumerImportedParameter",name:"P_Threshold",modelType:"cont"}},local:{componentPath:"F/Consumer",element:{role:"localDependentParameter",name:"C_Threshold",modelType:"cont",unit:"",comment:"Dependent local",calibration:false,range:{mode:"none"},implementation:{mode:"ascetDefault"}}},dependency:{formula:"P_Threshold",formals:["P_Threshold"],bindingPolicy:"explicit",mappings:{P_Threshold:{kind:"parameter",name:"P_Threshold"}},variantPolicy:"default"}})
- configure_parameter_dependency_chain.commit: Commit a previously planned dependency chain by planId only.. Ex: commit: configure_parameter_dependency_chain({mode:"commit",planId:"plan-id"})
- ascet_recover.status: Diagnose ASCET extension runtime state.. Ex: status: ascet_recover({action:"status"})
- ascet_recover.clear_extension_temp: Clear extension-owned temporary ASCET files.. Ex: clear_extension_temp: ascet_recover({action:"clear_extension_temp"})
- ascet_recover.scheduler_status: Inspect ASCET scheduler queue and CLI lock state.. Ex: scheduler_status: ascet_recover({action:"scheduler_status"})
- ascet_recover.scheduler_recover: Run safe scheduler recovery.. Ex: scheduler_recover: ascet_recover({action:"scheduler_recover"})
- ascet_recover.clear_stale_cli_lock: Clear a stale PI-owned ASCET CLI lock.. Ex: clear_stale_cli_lock: ascet_recover({action:"clear_stale_cli_lock"})
- ascet_scheduler_status.status: Inspect ASCET runtime scheduler queue, PI CLI lock, and operation health.. Ex: status: ascet_scheduler_status({action:"status",format:"text"})
- ascet_scheduler_status.recover: Run safe scheduler recovery from the scheduler tool.. Ex: recover: ascet_scheduler_status({action:"recover",format:"text"})
read:
- ascet_read.read_code: read complete live code; not global code search. Ex: read_code: ascet_read({action:"read_code",componentPath:"DEMO/PID",methodName:"calc",section:"body"})
- ascet_read.read_method_signature: Verify primitive method return type and arguments.. Ex: read_method_signature: ascet_read({action:"read_method_signature",componentPath:"DEMO/PID",methodName:"calc"})
- ascet_read.read_element: Read complete metadata for one exact resolved Element.. Ex: read_element: ascet_read({action:"read_element",componentPath:"DEMO/PID",elementName:"pid_kp"})
- ascet_read.read_implementation: Read implementation metadata for a resolved component.. Ex: read_implementation: ascet_read({action:"read_implementation",componentPath:"DEMO/PID",implementationMode:"default"})
- ascet_read.read_block_diagram: Read a BDE/block-diagram surface for resolved class or module targets.. Ex: read_block_diagram: ascet_read({action:"read_block_diagram",componentPath:"DEMO/PID",diagramName:"Main"})
- ascet_read.read_state_machine_flow: Read state-machine flow only for resolved StateMachine targets.. Ex: read_state_machine_flow: ascet_read({action:"read_state_machine_flow",componentPath:"DEMO/SM",detailLevel:"summary"})
- ascet_read.read_dependent_chain: read one exact local/imported/exported dependency chain; provider path is optional explicit evidence. Ex: read_dependent_chain: ascet_read({action:"read_dependent_chain",componentPath:"FeatureA/Consumer",dependentElement:"C_K_Effective"})
- ascet_read.read_element_dependency: Read dependency flag and formula for one existing element.. Ex: read_element_dependency: ascet_read({action:"read_element_dependency",componentPath:"FeatureA/Consumer",elementName:"C_K_Effective",targetKind:"component"})
- ascet_read.read: Read a live summary for one exact resolved Component.. Ex: read: ascet_read({action:"read",componentPath:"DEMO/PID"})
diff:
- ascet_diff.diff: Compare two ASCET targets with the generic diff route.. Ex: diff: ascet_diff({action:"diff",objectKind:"class",leftPath:"D/A",rightPath:"D/B",changesOnly:true})
- ascet_diff.diff_method: Compare one method body between two components.. Ex: diff_method: ascet_diff({action:"diff_method",leftPath:"D/A",rightPath:"D/B",methodName:"calc",changesOnly:true})
- ascet_diff.diff_component_snapshot: Compare quick child snapshots for two components.. Ex: diff_component_snapshot: ascet_diff({action:"diff_component_snapshot",leftPath:"D/A",rightPath:"D/B",changesOnly:true})
- ascet_diff.diff_state_machine_domain: Compare state-machine domain structure.. Ex: diff_state_machine_domain: ascet_diff({action:"diff_state_machine_domain",leftPath:"D/A",rightPath:"D/B",changesOnly:true})
- ascet_diff.diff_element_spec: Compare an element spec artifact with a live component.. Ex: diff_element_spec: ascet_diff({action:"diff_element_spec",componentPath:"DEMO/PID",specFile:"spec.json",changesOnly:true})
- ascet_diff.diff_project_formulas: Compare project formulas between two Project targets.. Ex: diff_project_formulas: ascet_diff({action:"diff_project_formulas",leftPath:"D/P1",rightPath:"D/P2",changesOnly:true})
write:
- ascet_edit.create_folder: Create one ASCET folder with guarded preflight/readback behavior.. Ex: create_folder: ascet_edit({action:"create_folder",folderPath:"DEMO/New"})
- ascet_edit.create_component: Create one component target with kind-specific defaults and readback.. Ex: create_component: ascet_edit({action:"create_component",componentPath:"DEMO/C",kind:"class",language:"ESDL"})
- ascet_edit.create_method: Create one method/process/action shell compatible with the component kind.. Ex: create_method: ascet_edit({action:"create_method",componentPath:"DEMO/PID",componentKind:"class",methodName:"calc2",methodKind:"abstract"})
- ascet_edit.set_method_signature: Patch a method signature before writing code that depends on return values or arguments.. Ex: set_method_signature: ascet_edit({action:"set_method_signature",componentPath:"DEMO/PID",methodName:"calc",returnType:"cont",arguments:[{name:"u",type:"cont",ifExists:"replace"}]})
- ascet_edit.delete_component: Delete one component through guarded write flow.. Ex: delete_component: ascet_edit({action:"delete_component",componentPath:"DEMO/Old",ifMissing:"fail"})
- ascet_edit.delete_method: Delete one method through guarded write flow.. Ex: delete_method: ascet_edit({action:"delete_method",componentPath:"DEMO/PID",methodName:"old",ifMissing:"fail"})
- ascet_edit.delete_folder: Delete one folder through guarded write flow.. Ex: delete_folder: ascet_edit({action:"delete_folder",folderPath:"DEMO/Old",ifMissing:"fail"})
- ascet_edit.set_method_code: Set one class/module method body.. Ex: set_method_code: ascet_edit({action:"set_method_code",componentPath:"DEMO/PID",methodName:"calc",codeFile:"calc.esdl"})
- ascet_edit.set_module_code: Set module method, header, or external C code surfaces.. Ex: set_module_code.set-method: ascet_edit({action:"set_module_code",modulePath:"DEMO/M",operation:"set-method",methodName:"calc",codeFile:"calc.c"})
- ascet_edit.set_state_machine_code: Set state-machine method, state, transition, binding, or start-state code.. Ex: set_state_machine_code.set-method: ascet_edit({action:"set_state_machine_code",stateMachinePath:"D/SM",operation:"set-method",methodName:"tick",codeFile:"tick.esdl"})
- ascet_edit.set_enumerators: Set enumeration values for an ASCET enumeration component.. Ex: set_enumerators: ascet_edit({action:"set_enumerators",componentPath:"D/E",enumerators:["E_OFF","E_ON"]})
- ascet_edit.apply_element_spec: Apply structured primitive element specs from evidence, not guesses.. Ex: ascet_edit({action:"apply_element_spec",componentPath:"F/C",intent:"create",elements:[{role:"providerExportedParameter",name:"P",modelType:"cont",unit:"",comment:"Provider output",calibration:false,range:{mode:"none"},data:{mode:"ascetDefault"},implementation:{mode:"ascetDefault"}}]})
- ascet_edit.apply_project_formula: Apply structured project formula specs through guarded write flow.. Ex: apply_project_formula: ascet_edit({action:"apply_project_formula",projectPath:"D/P",specFile:"formula.json",mode:"restore"})
- ascet_edit.set_element_dependency: set dependency flag/formula on an existing local parameter only; successful writes invalidate matching observations. Ex: set_element_dependency: ascet_edit({action:"set_element_dependency",targetPath:"F/C",elementName:"K",dependency:"dependent",variantPolicy:"default"})
- ascet_edit.check: Check whether a source-controlled ASCET component is editable.. Ex: check: ascet_edit({mode:"check",componentPath:"DEMO/PID"})
- ascet_edit.set: Request an ASCET SCM lock through guarded write flow.. Ex: set: ascet_edit({mode:"set",componentPath:"DEMO/PID",executeWrite:true})
```

## 各 profile 的额外 guidelines（profile 激活时叠加到对应工具）

### base

（无额外 guideline）

### advanced-read

```text
ascet_read:
  Use ascet_read action=read_block_diagram for block diagram, BDE, wiring, connection, or signal-flow questions after componentPath is resolved exactly.
  Example: ascet_read({action:"read_block_diagram",componentPath:"DEMO/PID",detailLevel:"summary"})
```

### reference

```text
ascet_get:
  Reference profile enables component_refs, elements, and import_binding for exact resolved targets; reference actions return outgoing relationships only.
```

### diff

```text
ascet_diff:
  Use ascet_diff for file, snapshot, method, element-spec, and formula comparisons.
```

### write-preflight

```text
ascet_edit:
  Executed ascet_edit mutations perform mandatory automatic action-specific readback verification. Inspect verification status and returned evidence. Do not issue a redundant read after passed.
```

### batch-write

```text
ascet_edit:
  Batch write remains hidden by default; use ascet_edit single-operation flow unless explicitly enabled.
```

### component-edit

```text
ascet_edit:
  Use component editable actions only when the user explicitly asks to change editability.
```

### ops

```text
ascet_recover:
  Use ascet_recover and ascet_scheduler_status for runtime, queue, lock, or recovery diagnostics.
```

## ascet_requirements（已定义但未注册，永远不会注入）

- **中文释义**：Excel 需求风险上下文检索，设计前置门禁。
- **注入时机**：无——`tools/requirements/definition.ts` 完整定义，但 `tools/registry.ts` 未注册，pi 框架永远看不到它。

```text
Use ascet_requirements(action="risk_context") before ASCET live design when the user provides a requirement, signal, function description, or design intent.
Before calling risk_context/search/index, locate the requirements .xlsx with agent file search tools and pass sourceFile explicitly.
Do not rely on implicit workbook discovery; set workspaceSearch=true only when the user explicitly wants tool-side workspace scanning.
risk_context is a gate summary only: do not treat it as detailed risk evidence and do not infer ASCET design from it.
If risk_context returns design_gate_ready=false or nextAction, call the next ascet_requirements action before ASCET design.
Use relation_leads to explain why related requirements are connected; use risk_details to retrieve paginated raw Excel risk evidence.
If the user request lacks a searchable requirement ID, signal, function behavior, or scope, ask a concise clarification question before calling this tool.
If blockingClarifications are present, ask the user to choose or refine the target before continuing ASCET design.
Treat Excel evidence as historical risk context, not final truth; confirm implementation details with ASCET read/search/reference tools later.
Never modify Excel from this tool.
Never call ASCET write tools as part of requirements retrieval.
```
