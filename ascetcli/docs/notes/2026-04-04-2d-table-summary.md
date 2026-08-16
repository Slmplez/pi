# 2026-04-04 2D Table 总结

## 结论

今天把 ASCET CLI 的 `2d table` 主路径基本打通了。

当前已经有证据支持：

- fixed/default-axis `2d` create
- fixed/default-axis `2d` same-shape matrix-only update
- fixed/default-axis `2d` restore baseline
- normal/custom-axis `2d` create
- normal/custom-axis `2d` same-shape update
- normal/custom-axis `2d` restore baseline
- grow/shrink shape `2d` update
  - 语义是 apply-mode `--recreate-incompatible`
  - 不是 in-place reshape

而且这些路径已经拿到了 fresh-process 和核心 restart-level readback 证据。

## 今天踩到的坑

### 1. `2d` 早期不是“完全写不进去”，而是会退成 structure-only

早期最典型的失败形态是：

- 表存在
- `x/y` 轴回到默认值
- `values` 变成零矩阵

这说明：

- `AddTwoDTableFixed(...)` 和结构层没有完全失败
- 真正坏的是 payload durable

### 2. `SetXSize/SetYSize` 不是错误 API，错误的是调用时机

一开始的误判是：

- 以为 `TwoDTableData.SetXSize/SetYSize` 会导致 COM 对象失效，所以应该完全跳过

后来的 live 证据证明更准确的规律是：

- `SetXSize/SetYSize` 其实是必须的
- 但它们必须在拿到 nested `MatrixData/DistributionData` 之前调用
- 如果先拿 nested 对象再调 size，就会让那些句柄失效

最后打通的顺序是：

1. `TwoDTableData.SetXSize(...)`
2. `TwoDTableData.SetYSize(...)`
3. 重新获取 `GetXDistribution()/GetYDistribution()/GetValue()`
4. 写 axis 和 matrix payload

### 3. `MatrixData.SetDoubleValue(...)` 的签名就是 jagged array

中间做过一个错误尝试：

- 以为 `MatrixData.SetDoubleValue(...)` 应该改成真正二维数组 `double[,]`

live 直接报了明确类型错误：

- `System.Double[,]` 不能转换成 `System.Double[][]`

所以当前 ToolAPI 这层实际要的还是 jagged matrix：

- `double[][]`
- `int[][]`
- `long[][]`
- `bool[][]`

这点非常关键，后面不要再回退到 `[,]`。

### 4. normal/custom-axis `2d` 的 axis 写入不能复用 generic array resize helper

normal/custom-axis `2d` 一开始还会卡在 `xDistribution` 写入：

- trace 停在 `before-apply-xdist`

根因是：

- generic `ApplyArrayValues(...)` 会再跑一次 `SetSize(...)`
- 对 `2d` axis distribution 来说，这个“二次 resize”会把刚刚稳定下来的对象状态又弄乱

最后的修法是：

- parent `TwoDTableData` 先 `SetXSize/SetYSize`
- axis distribution 只写值，不再二次 resize
- 因此新增了 `ApplyArrayValuesWithoutResizing(...)`

### 5. grow/shrink shape 不应该走 in-place update

shape change 的 2d update 本质上是：

- `2x3 -> 3x3`
- `3x3 -> 2x2`
- 之类的表形状变化

这类变化如果强行走原地 reshape，风险很高：

- stale nested handles
- 旧矩阵残留
- 默认轴回退
- live 环境不可预测

最终选择的语义是：

- shape mismatch 直接判 `incompatible`
- apply-mode 只有显式带 `--recreate-incompatible` 才 remove + create

这比 in-place reshape 更稳、更可验证。

## 关键代码点

- `src/AscetCopolit/AscetElementSync.cs`
  - `ApplyTwoDTableData(...)`
  - `ApplyTwoDTableXDistributionData(...)`
  - `ApplyTwoDTableYDistributionData(...)`
  - `ApplyArrayValuesWithoutResizing(...)`
  - `HasTwoDShapeMismatch(...)`
  - apply-mode `apply_requires_recreate`

## 当前产品语义

现在 2D 的产品语义应该写成：

- same-shape `2d` update：原地 update
- shape-changing `2d` update：apply-mode `--recreate-incompatible`
- grow/shrink 已支持，但属于 explicit recreate，不是 in-place reshape

## 对后续的建议

1. 不要再把 `SetXSize/SetYSize` 简单标成“禁用”
2. 不要再尝试把 `MatrixData` 改成 `[,]`
3. 如果未来要支持真正 in-place reshape，必须单独做隔离验证，不要直接改现有稳定路径
4. 保持 CLI 文档、验证矩阵、最终总结三处文案同步

## Obsidian 说明

这台机器上可用的 `obsidian` 命令是 Obsidian QA 的导入 CLI，不是写笔记的 Obsidian note CLI。

另外本地也没有找到可直接写入的 `.obsidian` vault 目录。

所以这份笔记目前先以标准 markdown 形式保存在仓库里：

- `docs/notes/2026-04-04-2d-table-summary.md`

后续如果你给我一个实际的 Obsidian vault 路径，我可以把它同步到你的 vault 里。
