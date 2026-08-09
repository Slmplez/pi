# ASCET Database Model Catalog Live 验证报告

日期：2026-08-09

## 1. 验证范围

- Source Tree：`obs-tree-live-20260808-full-database`
- Tree rows：10,670
- Project：75
- Class：7,069
- Module rows / unique OID：859 / 428
- Enumeration unique OID：708
- Tree coverage：`complete_for_scope`
- Tree truncated：`false`
- 初次八组合报告：`output/database-catalog-live-validation-20260809.json`
- Parameter 规则修正后复验报告：`output/database-catalog-live-rerun-20260809.json`
- Parameter 分阶段耗时复验：`output/database-catalog-live-timing-20260809.json`
- 最新 Parameter Catalog：`obs-database-catalog-37936-1786238694802-0`
- 最终全量 Catalog：`obs-database-catalog-25568-1786237843372-2`

所有 ASCET Live 请求均串行执行。

## 2. include 组合结果

Parameter 相关行采用结构候选规则修正后的复验结果；其余行采用初次完整矩阵结果。全量复验同时重新覆盖了最新 Message 实现。

| include | Catalog objects | elapsed | source Tree | Project scan | Parameter closure | Module scan | 结果 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `enumeration` | 708 | 70 ms | 62.2 ms | - | - | - | pass |
| `module` | 428 | 34 ms | 27.8 ms | - | - | - | pass |
| `module,enumeration` | 1,136 | 44 ms | 31.6 ms | - | - | - | pass |
| `message` | 24,656 | 88,095 ms | 29.5 ms | 0 | 0 | 84,874 ms | pass |
| `parameter_class` | 951 | 33,466 ms | 52.8 ms | 2,414 ms | 27,938 ms | 0 | pass |
| `parameter_class,enumeration` | 1,659 | 38,703 ms | 41.8 ms | 2,491 ms | 35,618 ms | 0 | pass |
| `module,message,enumeration` | 25,792 | 86,284 ms | 39.5 ms | 0 | 0 | 85,072 ms | pass |
| all four | 26,743 | 122,245 ms | 38.2 ms | 2,418 ms | 34,155 ms | 84,414 ms | pass |

Local-only `enumeration` / `module` 请求的 `liveScanMs=0`，未连接 ASCET。

## 3. 最终全量 Catalog

### 3.1 对象

| 类型 | 数量 |
| --- | ---: |
| Parameter Class | 951 |
| Enumeration | 708 |
| Module | 428 |
| Message | 24,656 |

### 3.2 关系

| 关系 | 数量 |
| --- | ---: |
| Project -> Complex | 696 |
| Parameter Class -> Child Parameter Class | 1,335 |
| Parameter Class -> Enumeration | 315 |
| Project -> Module | 431 |
| Module -> Message | 24,656 |
| Message -> Enumeration | 4,851 |

### 3.3 Live 扫描

- Project：75 success / 0 failure
- Module：428 success / 0 failure
- Parameter Class scanned：1,015
- Parameter Class verified：951
- rejected has methods：61
- rejected no evidence：3
- orphan candidates：124
- orphan verified：95
- Message kind：11,335 send / 12,773 receive / 548 send-receive
- coverage：`complete_for_scope`
- failures：0

## 4. Parameter Class 954 基线差异

按冻结结构规则重新计算 Tree：

- 结构候选：983
- `Methods=0` 结构基线：954
- 正式语义 Catalog：951
- missing：3
- extra：0
- 结构候选未扫描：0

三个 missing 均满足结构规则和 `Methods=0`，但没有直接 Parameter、Calibration、canonical parameter 或已验证 child evidence，因此按 Catalog 冻结判定被拒绝：

| path | OID | methodCount | 结论 |
| --- | --- | ---: | --- |
| `PlatformLibrary\Package\DAT_DiagnosisActuationTest\Public\DAT_Parameter_ID_database` | `040qm00000001oo7187g9r8cjntk2` | 0 | `rejected_no_parameter_evidence` |
| `PlatformLibrary\Package\HAZ_HazardWarning\Component\HAZ\Parameter\_Constant_HazardWarning` | `040gm001ipk01no71gff3osjudj04` | 0 | `rejected_no_parameter_evidence` |
| `PlatformLibrary\Package\PT_PowerTrain\Parameter\Public\SystemConstant\_PT_ESP_SystemConstant` | `040qm00700001n870g7g87u1vm000` | 0 | `rejected_no_parameter_evidence` |

因此 951 是正式语义定义下的预期结果；954 只代表旧的“结构命中 + Methods=0”基线。`Methods=0` 未被单独当作充分条件。

本次补全的结构规则额外发现并验证了此前遗漏的 orphan：

`PlatformLibrary_NewBrakeSystems\Package\CPE_CpEstimation\Enumerations\CPE_External_Enumeration_Settings`

其 classification 为 `orphan_parameter_class`，evidence 为 `methods=0`、`IsCalibration=true`。

## 5. 代表对象

以下对象均存在于最终 Parameter Class artifact：

- Calibration root：`CN_Libary\CNMS_IPB20\IPBCustNonHADHAP\Parameter\Calibration\IPBCustNonHADHAP_BB88010_Parameter_Calibration`
- Constant root：`CN_Libary\CNMS_IPB20\IPBCustNonHADHAP\Parameter\Constant\IPBCustNonHADHAP_BB88010_Parameter_Constant`
- name-only Calibration：`CN_Libary\Package\LDM\ADC\Component\Main\_ADCMain_Calibration`
- name-only Constant：`CN_Libary\Package\LDM\ADC\Component\Main\_ADCMain_Constant`
- IDs folder：`PlatformLibrary\Package\LDMCoor_LongitudinalDynamicArbitrator\public\IDs\_LdmId_CDD`
- Enumeration Settings：`PlatformLibrary_NewBrakeSystems\Package\CRB_CooperativeRegenerativeBraking\Enumerations\CRB_Internal_Enumeration_Settings`

## 6. Enumeration usage 和关系可追踪性

Enumeration usage 三态已验证：

- `enumeration` only：Parameter/Message 均为 `not_scanned`，各 708。
- `parameter_class,enumeration`：Parameter `used=148`、`scanned_not_used=560`；Message 为 `not_scanned=708`。
- all four：Parameter `used=148`、`scanned_not_used=560`；Message `used=405`、`scanned_not_used=303`。

Parameter Enum edge 示例：

```json
{"relationKind":"parameter_class_enumeration","parameterClassPath":"CN_Libary\\Package\\CRB_CooperativeRegenerativeBraking\\Parameter\\Priviate\\_CNMS_CRB_Calibration","elementName":"CRB_UseMbRegenMax_TwinAxle","enumerationPath":"CN_Libary\\Package\\CRB_CooperativeRegenerativeBraking\\Enumerations\\FS_MbRegenMax_TwinAxle"}
```

Message Enum edge 示例：

```json
{"relationKind":"message_enumeration","modulePath":"CN_Libary\\CNMS_IPB20\\Configuration\\CM_CNMS_PTConfiguration_AxleSplit","messageName":"StateDrvUnitPt_RA","messageKind":"receive_message","enumerationPath":"PlatformLibrary\\Package\\PT_PowerTrain\\Enumeration\\Public\\StateDrvUnit"}
```

对应 NDJSON 可直接用 `Select-String`、grep、find 或逐行 reader 检索。

## 7. Message 样本趋势

此前代表样本为 19 个 Module、1,264 个直接 Message；本次为 428 个唯一 Module、24,656 个直接 Message：

- 样本：约 66.5 Message / Module
- 全库：约 57.6 Message / Module
- Module 数量扩大约 22.5 倍，Message 数量扩大约 19.5 倍

全库结果与代表样本的数量级和三类 Message 分布趋势一致。默认 `messageDepth=0` 仍符合代表样本 1,264 / 1,265 的直接覆盖结论。

## 8. 性能结论

未达到以下目标：

- `message` 目标 15–45 s，实测约 88.1 s。
- `parameter_class` 目标 10–30 s，实测约 33.5 s。
- all four 目标 30–90 s，实测约 122.2 s。

瓶颈明确：

- Source Tree 读取仅约 28–62 ms。
- Session open 约 216 ms，close 约 2 ms。
- 428 个 Module 的直接 `GetAllModelElements()` 扫描约 84.4–85.1 s，约 197 ms / Module，是主瓶颈。
- Parameter closure 扫描 1,015 个 Class，约 27.9–35.6 s，是次要瓶颈。最新无 Enum 扫描中，Project closure 为 22.0 s、orphan scan 为 5.9 s、classification 为 4 ms。
- Project 扫描约 2.4–2.5 s。

性能问题不来自 stored Tree、CLI 启动或 Session 建立。后续优化应优先减少/批处理 Module Element 读取，并对 Class closure 做缓存或批量读取。

## 9. 验证命令

通过：

```text
npx tsx --test packages/ascet-extension/src/get.test.ts packages/ascet-extension/src/observation-store.test.ts packages/ascet-extension/src/database-catalog/tree-source.test.ts packages/ascet-extension/src/database-catalog/catalog-service.test.ts packages/ascet-extension/src/database-catalog/artifact-writer.test.ts packages/ascet-extension/src/edit/mutation-runner.test.ts packages/ascet-extension/src/testing/action-contract.test.ts
```

结果：29 tests passed。

通过：

```text
AscetDatabaseCatalogContractTest passed
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-ascet-csharp.ps1
npm run check
```

`npm run check` 无 error、warning、info。

## 10. 完成审计

- Contract：`database_catalog`、必填唯一 include、完整 Tree 校验、stored-only、现有 `get_tree` 不变。
- Scan control：未 include 类型不输出且非依赖扫描不执行。
- Correctness：Module OID 去重、Project/Class closure/evidence、Message kind、稳定 message identity、Enum usage 三态均验证。
- Runtime：每个 Live Catalog 请求仅一个 CLI operation；C# operation 内仅一个 `AscetSession`。
- Artifact：独立 resultId、include-dependent NDJSON、关系文件、Summary/Meta、atomic publication 均验证。
- Failure handling：Live failure 为 0；失败路径会结构化写入 Meta，未静默丢弃。
- Performance：未达目标，但主/次瓶颈及分阶段耗时已明确记录，满足“达到目标或提供明确瓶颈报告”的完成条件。
- Live acceptance：八个 include 组合均串行通过；954 基线 missing/extra 已逐项分析。