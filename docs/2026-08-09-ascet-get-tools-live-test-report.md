# ASCET Get Tools Live 测试报告

日期：2026-08-09

## 1. 结论

```text
FUNCTIONAL GATE: PASS
PERFORMANCE GATE: FAIL
```

- 8 个 `ascet_get` action 均完成真实 ASCET Database 串行调用。
- 修复后共 20 个 Live/合同用例，功能验证全部通过。
- `component_refs` 的 name/scope 过滤缺陷已修复，6 个专项 Live 回归全部通过。
- 性能失败：`database_catalog include=["message"]` 耗时 87.342 s，超过 15–45 s 目标上限。
- 基础 Get action、精确 OID/name 查询、import/export binding、stored Observation 和结构化错误均通过。

测试结果 JSON：

`output/ascet-get-tools-live-validation-20260809.json`

## 2. 环境

- Database：`C:\Repo\F05_IPB_L2_0429`
- CLI：`ascetcli/output/ascet-csharp/bin/AscetCli.exe`
- 普通 Get artifact root：`output/ascet-get-tools-live-artifacts`
- Catalog source Tree：`obs-tree-live-20260808-full-database`
- Catalog artifact root：`output/database-catalog-baseline`
- 调用方式：严格串行，无 `Promise.all` 或并行 ToolAPI Session

## 3. Action 覆盖

| 用例 | action | 结果 | 耗时 | items | 主要验证 |
| --- | --- | --- | ---: | ---: | --- |
| Project scoped Tree | `tree` | PASS | 723 ms | 84 | complete、未截断、Project 存在 |
| SCM scoped Tree | `tree` | PASS | 615 ms | 64 | canonical `CM_SCM` 存在 |
| Project references | `component_refs` | PASS | 643 ms | 95 | 找到 `CM_SCM` reference |
| SCM Elements | `elements` | PASS | 455 ms | 11 | 包含 imported Element、identity 完整 |
| Project Formulas | `formulas` | PASS | 2,142 ms | 581 | contents 和 parameters 完整 |
| EMC Main BDE | `bde_edges` | PASS | 619 ms | 44 | from/to endpoint 完整 |
| SCM DB item refs | `dbitem_refs` | PASS | 355 ms | 4 | target path/OID/kind 完整 |
| Local Module + Enum Catalog | `database_catalog` | PASS | 60 ms | 1,136 | 428 Module、708 Enumeration、无 Live scan |
| Live Message Catalog | `database_catalog` | FUNCTION PASS | 87,342 ms | 24,656 | coverage complete、428/428 Module、0 failure |
| Exact Element by OID | `elements` | PASS | 486 ms | 1 | 精确返回 imported `DrvPedalPos` |
| Exact Formula name | `formulas` | PASS | 479 ms | 1 | 精确返回指定 Formula |
| Component Ref name filter | `component_refs` | PASS | 546 ms | 1 | 精确返回 `CM_SCM` |
| Component Ref exported scope | `component_refs` | PASS | 559 ms | 95 | exported scope 全集 |
| Component Ref imported scope | `component_refs` | PASS | 555 ms | 0 | 正确返回空集 |
| Component Ref name + scope | `component_refs` | PASS | 563 ms | 1 | 组合过滤命中 |
| Component Ref mismatched scope | `component_refs` | PASS | 459 ms | 0 | 组合过滤正确拒绝 |
| Exact import binding | `import_binding` | PASS | 415 ms | 1 | import/export matched=true |

所有普通单次 Get 调用均低于 2.2 s。

## 4. 功能缺陷修复

### 4.1 原始缺陷

`component_refs` 接受 `filters.name` 和 `filters.scope`，但原实现直接输出全部 reference，没有执行过滤。原始 Live 结果为：

```text
name=CM_SCM
预期：1 item
实际：95 items
```

### 4.2 实现修复

修改：

`ascetcli/src/AscetCopilot/Services/Get/AscetGetService.cs`

`GetComponentRefs` 现在先读取 reference name/scope，并应用统一过滤：

```text
MatchesName(name, request.NameFilter)
AND
MatchesScope(scope, request.Scopes)
```

同时复用已读取的 name 和 scope 构造 DTO，避免重复 ToolAPI 属性读取。

### 4.3 Regression tests

新增：

- TypeScript：验证 `buildAscetGetArgs` 正确传递 `name` 和 `scopes`。
- C#：`AscetGetFilterContractTest` 验证无过滤、name、scope 和组合过滤。

结果：

```text
TypeScript get.test.ts: 7 passed
AscetGetFilterContractTest passed
ASCET C# build passed
npm run check passed
```

### 4.4 Live 复验

报告：

`output/ascet-component-refs-filter-live-20260809.json`

| 组合 | items | 结果 |
| --- | ---: | --- |
| 无过滤 | 95 | PASS |
| `name=CM_SCM` | 1 | PASS |
| `scope=exported` | 95 | PASS |
| `scope=imported` | 0 | PASS |
| `name=CM_SCM, scope=exported` | 1 | PASS |
| `name=CM_SCM, scope=imported` | 0 | PASS |

```text
FUNCTIONAL GATE: PASS
```

## 5. Import Binding

从 `CM_SCM` 的 imported Elements 和 Project Component references 动态发现 provider：

```text
consumer:
PlatformLibrary\Package\SCM_SecondaryCollisionMitigation\Component\Config\CM_SCM

import:
DrvPedalPos

provider:
CN_Libary\CNMS_IPB20\IPBCustGeneral\Asw2Asw_IPBCustGen_BB88010

export:
DrvPedalPos
```

独立精确调用结果：

```json
{
  "matched": true,
  "importPath": "PlatformLibrary\\Package\\SCM_SecondaryCollisionMitigation\\Component\\Config\\CM_SCM::DrvPedalPos",
  "exportPath": "CN_Libary\\CNMS_IPB20\\IPBCustGeneral\\Asw2Asw_IPBCustGen_BB88010::DrvPedalPos"
}
```

精确调用耗时 415 ms。发现阶段尝试 54 个 consumer/provider 组合，总耗时 19.892 s；该聚合时间不作为单次 action 性能。

## 6. Stored Observation

以下 action 已验证 stored NDJSON 输出：

| action | resultId | items |
| --- | --- | ---: |
| `tree` Project scope | `obs-tree-41372-1786239936053-0` | 84 |
| `tree` SCM scope | `obs-tree-41372-1786239936672-3` | 64 |
| `component_refs` | `obs-component_refs-41372-1786239937317-6` | 95 |
| `elements` | `obs-elements-41372-1786239937774-9` | 11 |
| `formulas` | `obs-formulas-41372-1786239939919-12` | 581 |
| `bde_edges` | `obs-bde_edges-41372-1786239940541-15` | 44 |
| `dbitem_refs` | `obs-dbitem_refs-41372-1786239940899-18` | 4 |

NDJSON 行均为紧凑单行 JSON，可直接使用 grep、find、read 或 `Select-String`。

Formula 样例：

```json
{"name":"Acceleration_mPERs2_P2exp14","type":"linear","unit":"m/s^2","contents":"f(phys) = 0 + 16384 * phys","parameters":[0,16384]}
```

BDE edge 样例：

```json
{"fromPath":"...EMC_Drive_Main20ms::/isActive/isActive","toPath":"...EMC_Drive_Main20ms::/calc/ExtActivationReq"}
```

## 7. 错误合同

| 用例 | 预期 code | 实际 code | 结果 |
| --- | --- | --- | --- |
| Formula target 不是 Project | `unsupported_project_kind` | `unsupported_project_kind` | PASS |
| BDE diagram 不存在 | `diagram_not_found` | `diagram_not_found` | PASS |
| Catalog source Tree 不存在 | `source_tree_not_found` | `source_tree_not_found` | PASS |

错误均为结构化失败，没有进程崩溃或静默空结果。

## 8. Message Catalog 性能

结果：

- Catalog resultId：`obs-database-catalog-42316-1786240094297-1`
- Messages：24,656
- Module success/failure：428 / 0
- send：11,335
- receive：12,773
- send-receive：548
- coverage：`complete_for_scope`
- failures：0

分阶段耗时：

| 阶段 | 耗时 |
| --- | ---: |
| Source Tree scan | 30.9 ms |
| Session open | 213 ms |
| Module scan | 86,062 ms |
| Session close | 2 ms |
| Live scan | 87,150 ms |
| End-to-end | 87,342 ms |

性能目标：15–45 s。

```text
PERFORMANCE GATE: FAIL
```

实测超过上限 42.342 s，约为上限的 1.94 倍。主瓶颈仍是 428 个 Module 的串行 `GetAllModelElements()`，不是 Tree 读取或 Session 建立。

按照硬性能门禁规则，瓶颈报告不能替代性能通过；除非用户明确接受例外，否则不得标记 Get tools 整体验收完成。

## 9. 测试夹具说明

首次 Catalog 用例使用隔离 artifact root，无法读取 frozen Tree，因此立即返回 `source_tree_not_found`。随后切换到 `output/database-catalog-baseline` 并重新执行：

- Local Module + Enum Catalog：PASS，60 ms。
- Live Message Catalog：FUNCTION PASS，87.342 s。

最终 JSON 报告中的 Catalog 记录已替换为复验结果。

## 10. 后续动作

1. 优化或批处理 Module Element 扫描。
2. 重新运行 Message 和 all-four Catalog 性能基准。
3. 性能达到目标，或由用户明确接受性能例外后，才能将 Performance Gate 标记为 PASS。
