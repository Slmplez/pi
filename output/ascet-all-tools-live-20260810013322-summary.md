# ASCET 默认工具 Live 全量测试报告

- 日期：2026-08-10
- Live 数据库：`C:\Repo\F05_IPB_L2_0429`
- 测试范围：默认注册的 9 个工具、50 个 public action
- 执行模式：真实 ToolAPI 读写；直接写入；plan/commit action 均完成 commit
- 测试命名空间：`TEST\__pi_all_tools_live_20260810013322`
- 结果：50/50 action 通过，0 失败，0 清理错误

## 覆盖矩阵

| Action | 调用次数 | 成功 | 最大耗时 ms |
|---|---:|---:|---:|
| `ascet_capabilities.search_actions` | 1 | 1 | 29 |
| `ascet_diff.diff` | 1 | 1 | 1983 |
| `ascet_diff.diff_component_snapshot` | 1 | 1 | 2829 |
| `ascet_diff.diff_element_spec` | 1 | 1 | 699 |
| `ascet_diff.diff_method` | 1 | 1 | 999 |
| `ascet_diff.diff_project_formulas` | 1 | 1 | 873 |
| `ascet_diff.diff_state_machine_domain` | 1 | 1 | 1784 |
| `ascet_edit.apply_element_spec` | 2 | 2 | 2723 |
| `ascet_edit.apply_project_formula` | 2 | 2 | 868 |
| `ascet_edit.check` | 1 | 1 | 398 |
| `ascet_edit.create_component` | 7 | 7 | 945 |
| `ascet_edit.create_folder` | 1 | 1 | 713 |
| `ascet_edit.create_method` | 4 | 4 | 994 |
| `ascet_edit.delete_component` | 7 | 7 | 754 |
| `ascet_edit.delete_folder` | 1 | 1 | 865 |
| `ascet_edit.delete_method` | 1 | 1 | 569 |
| `ascet_edit.set` | 1 | 1 | 532 |
| `ascet_edit.set_element_dependency` | 2 | 2 | 1785 |
| `ascet_edit.set_enumerators` | 1 | 1 | 631 |
| `ascet_edit.set_method_code` | 2 | 2 | 1089 |
| `ascet_edit.set_method_signature` | 2 | 2 | 872 |
| `ascet_edit.set_module_code` | 1 | 1 | 947 |
| `ascet_edit.set_state_machine_code` | 1 | 1 | 996 |
| `ascet_get.bde_edges` | 1 | 1 | 724 |
| `ascet_get.component_refs` | 1 | 1 | 527 |
| `ascet_get.database_catalog` | 1 | 1 | 26 |
| `ascet_get.dbitem_refs` | 1 | 1 | 486 |
| `ascet_get.elements` | 1 | 1 | 557 |
| `ascet_get.formulas` | 1 | 1 | 563 |
| `ascet_get.import_binding` | 1 | 1 | 418 |
| `ascet_get.tree` | 2 | 2 | 635 |
| `ascet_read.read` | 1 | 1 | 567 |
| `ascet_read.read_block_diagram` | 1 | 1 | 4001 |
| `ascet_read.read_code` | 1 | 1 | 512 |
| `ascet_read.read_dependent_chain` | 1 | 1 | 650 |
| `ascet_read.read_element` | 1 | 1 | 564 |
| `ascet_read.read_element_dependency` | 1 | 1 | 453 |
| `ascet_read.read_implementation` | 1 | 1 | 820 |
| `ascet_read.read_method_signature` | 1 | 1 | 556 |
| `ascet_read.read_state_machine_flow` | 1 | 1 | 1150 |
| `ascet_recover.clear_extension_temp` | 1 | 1 | 34 |
| `ascet_recover.clear_stale_cli_lock` | 1 | 1 | 0 |
| `ascet_recover.scheduler_recover` | 1 | 1 | 20 |
| `ascet_recover.scheduler_status` | 1 | 1 | 1 |
| `ascet_recover.status` | 1 | 1 | 381 |
| `ascet_scheduler_status.recover` | 1 | 1 | 25 |
| `ascet_scheduler_status.status` | 1 | 1 | 2 |
| `ascet_status.status` | 1 | 1 | 767 |
| `configure_parameter_dependency_chain.commit` | 1 | 1 | 10252 |
| `configure_parameter_dependency_chain.plan` | 1 | 1 | 4932 |

## 真实写入范围

- 创建并删除 Folder、Class、Module、StateMachine、Enumeration。
- 创建、修改签名、写入代码并删除 Method。
- 真实执行 Element spec plan/commit 和 Element dependency plan/commit。
- 真实执行 Provider -> Imported -> Local dependent chain plan/commit。
- 在现有 Project 中新增唯一公式，随后按原始 6 条公式快照 restore，并删除临时公式。
- 执行组件 editability check/set。
- 所有删除操作均通过自动 readback。

## 清理验证

- Live formulas 复查：原始公式数仍为 6，`PI_ALL_TOOLS_*` 临时公式为 0。
- Live tree 复查：测试 Folder 返回 `folder_not_found`，确认命名空间已删除。
- Scheduler/CLI lock：测试中 status/recover 均成功，无残留清理错误。

## 发现与修复

### `configure_parameter_dependency_chain.commit` 错误 stale_plan

首次 live commit 因 fingerprint 包含 Bridge PID、Bridge generation、duration、临时 snapshot path 和临时 OID 而立即失效。修复后仅排除运行期易变字段，保留语义 payload 和 marker 变化检测。新增回归测试，仍可识别真实 preflight 内容变化。

验证：`configure_parameter_dependency_chain` 单测 14/14 通过；live plan 4.932 s，live commit 10.252 s。

## 工具评估

| 工具 | 结论 | 评价 |
|---|---|---|
| `ascet_status` | 通过 | 安装、DLL、Bridge、ToolAPI、scheduler 诊断完整。 |
| `ascet_capabilities` | 通过 | action 检索准确；`limit` 最大值为 50，应在调用方遵守 schema。 |
| `ascet_get` | 通过 | 9/9 action；Tree、Catalog、Elements、Formula、引用与 BDE 路径均可用。Catalog 强制要求无边界完整 Tree，约束合理。 |
| `ascet_read` | 通过 | 9/9 action；精确读取完整。`read_block_diagram` 为最慢读取，约 4.0 s。 |
| `ascet_diff` | 通过 | 6/6 action；Component snapshot 最慢，约 2.8 s。 |
| `ascet_edit` | 通过 | 16/16 action；自动 readback 有效。复合写入必须 plan/commit，接口安全但调用复杂。 |
| `configure_parameter_dependency_chain` | 修复后通过 | 2/2 action；功能完整、回滚证据充分，但 commit 成本最高。 |
| `ascet_recover` | 通过 | 5/5 action；均为安全恢复，不触碰用户 ASCET GUI。 |
| `ascet_scheduler_status` | 通过 | 2/2 action；状态与恢复快速。 |

## Batch 说明

`ascet_batch_write` 默认未注册，仅在 batch-write profile 和 feature flag 同时启用时出现。根据当前计划该工具后续移除，因此不计入默认 50-action 验收，也未继续修改其实现。

## 验证命令

- `npx tsx --test packages/ascet-extension/src/configure-parameter-dependency-chain.test.ts`
- `npm run check`
