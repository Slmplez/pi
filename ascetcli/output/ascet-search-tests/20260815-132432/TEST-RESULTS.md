# AscetSearch 测试结果

- 运行目录：`C:\Repo\09_ASCETCopilot\pi-ascet-extension-prototype\ascetcli\output\ascet-search-tests\20260815-132432`
- 结论：**PASS（阶段性验证）**
- ASCET：6.1.5_2.2.0，PID 25888
- 数据库：`C:\Repo\F05_IPB_L2_0429`

## 已通过

- 离线参数/JSON 测试与构建
- `npm run check`
- 10 种原生 Search 类型实机矩阵
- 默认隐藏窗口、`-k` 保留窗口、空结果、`-n 0`、截断与 `more`
- 多进程互斥队列、排队超时、废弃 Mutex 恢复
- 参数错误、特殊字符、Unicode、512 字符查询、缺失 DLL
- 100 次顺序混合压力测试
- 40 次并发调用压力测试：5 批 × 8 进程，10 种模式各 4 次
- 最终数据库、编辑器、窗口、进程、资源和日志审计

## 模式矩阵

| mode | query | 总结果数 | 状态 |
|---|---|---:|---|
| comp | `_PCA` | 1 | PASS |
| comp-ref | `_PCA` | 1 | PASS |
| method | `calc` | 5929 | PASS |
| method-ref | `calc` | 5929 | PASS |
| method-element | `VLC3IsInControl` | 20 | PASS |
| element | `PCA_Ctrl_slMin_RA` | 1 | PASS |
| element-ref | `PCA_Ctrl_slMin_RA` | 2 | PASS |
| sender | `calc` | 4 | PASS |
| receiver | `calc` | 4 | PASS |
| text | `VLC3IsInControl` | 26 | PASS |

## 并发语义

并发 CLI 进程可以同时发起调用，但通过 ASCET PID 级命名 Mutex 排队；原生 Search UI 不会并行执行。这避免结果串扰和 ASCET 崩溃。

正式并发压力测试：

- 调用：40
- 失败：0
- 实际排队调用：35
- 平均排队：17448.18 ms
- 最大排队：71332 ms
- 平均端到端：24170.2 ms
- 最大端到端：74543 ms

## 稳定性

顺序 100 次：

- 失败：0
- 平均端到端：7582.17 ms
- 最大端到端：44889 ms
- 工作集变化：-1347584 bytes
- 句柄变化：0

并发 40 次：

- 工作集变化：360448 bytes
- 句柄变化：0
- Search 子窗口残留：0

最终状态：

- PID 未变化：25888
- ASCET 响应：True
- 未保存编辑器：0
- 打开业务窗口：0
- Search 子窗口：0
- 相对基线工作集变化：-1290240 bytes
- 相对基线句柄变化：-1
- 基线后严重日志命中：0

## 观察项

- 首版并发测试脚本把 PowerShell `Process.ExitCode=` 误判为失败；CLI 当时已返回成功 JSON。修正测试脚本后正式测试通过，不是产品缺陷。
- 最终状态首次采样瞬时出现 `openWindows=1`；立即复测及随后 3 次间隔采样均为 0，且原生 Search 子窗口始终为 0。

## 未执行的破坏性场景

- ASCET not running
- multiple ASCET processes
- database closed
- ASCET terminated during search
- manual native Find already running

## 范围限制

本次通过的是阶段性验证：已执行 100 次顺序和 40 次并发调用。完整 release/nightly 门禁原计划为 500 次顺序和 400 次并发，本次未执行，因此不能声明完整 500/400 门禁通过。
