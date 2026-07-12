# ASCET Requirements Gate Implementation Plan

## 1. Approval Status

方案状态：最终优化版

审批结论：有条件通过

开发准入：允许

旧方案实现：禁止

必须按本契约实现：是

优先级：高

核心验收标准：

```text
risk_context 负责判断是否能进入设计；
risk_details 负责把证据分页展开完整；
/ascet-design 只能在 detail_complete + evidence_complete + no blocking clarification 时放行。
```

## 2. Goal

将 `ascet_requirements` 从 Excel 检索工具升级为 `/ascet-design` 的前置闸门工具。

第一版开发目标不是生成更长的风险报告，而是可靠判断：

1. 当前需求是否已经找到。
2. 关联线索是否已经识别。
3. 风险详情是否已经分页展开。
4. Excel 原始证据是否完整。
5. 是否还有 blocking clarification。
6. 是否允许进入 ASCET 设计阶段。

## 3. Scope

主要改造文件：

```text
packages/ascet-extension/src/tools/requirements/types.ts
packages/ascet-extension/src/tools/requirements/schema.ts
packages/ascet-extension/src/tools/requirements/normalizer.ts
packages/ascet-extension/src/tools/requirements/relations.ts
packages/ascet-extension/src/tools/requirements/risk-context.ts
packages/ascet-extension/src/tools/requirements/prompt.ts
packages/ascet-extension/src/ascet-design.ts
packages/coding-agent/test/ascet-extension-requirements.test.ts
packages/coding-agent/test/ascet-extension-design-command.test.ts
```

建议新增文件：

```text
packages/ascet-extension/src/tools/requirements/state.ts
packages/ascet-extension/src/tools/requirements/risk-details.ts
packages/ascet-extension/src/tools/requirements/pagination.ts
```

## 4. Final Actions

保留一个综合工具：

```ts
ascet_requirements
```

最终 action：

```ts
type AscetRequirementsAction =
	| "status"
	| "index"
	| "search"
	| "get_record"
	| "relation_leads"
	| "risk_context"
	| "risk_details";
```

Action 职责：

| Action | Responsibility |
|---|---|
| `search` | 找目标需求候选 |
| `get_record` | 展开单条需求原始记录 |
| `relation_leads` | 找“为什么相关”的关系线索 |
| `risk_context` | 返回状态、计数、闸门判断、下一步动作 |
| `risk_details` | 分页展开完整风险内容和 Excel 证据 |

## 5. Core Types

### 5.1 Gate State

```ts
type RiskContextStage = "summary_only" | "detail_partial" | "detail_complete";
type EvidenceStatus = "missing" | "partial" | "complete";
type Readiness = "not_ready" | "needs_clarification" | "ready";

type BlockingReason =
	| "summary_only"
	| "detail_partial"
	| "evidence_missing"
	| "evidence_partial"
	| "pagination_incomplete"
	| "truncated_output"
	| "blocking_clarification"
	| "relation_leads_not_expanded";

interface RiskGateState {
	riskContextStage: RiskContextStage;
	evidenceStatus: EvidenceStatus;
	readiness: Readiness;
	ascetReady: boolean;
	stateValid: boolean;
	stateErrors: string[];
	blockingReasons: BlockingReason[];
}
```

### 5.2 RelationLead

`RelationLead` 只表示“为什么这个 related requirement 和 target requirement 有关系”，不表示风险详情。

```ts
interface RelationLead {
	leadId: string;
	targetRequirementId?: string;
	relatedRequirementId?: string;
	relatedRequirementTitle?: string;
	relationType: RelationType;
	relationEvidence: {
		value: string;
		targetCell?: string;
		relatedCell?: string;
		sourceField?: string;
	};
	confidence: "high" | "medium" | "low";
}
```

### 5.3 RequirementRiskDetail

`RequirementRiskDetail` 表示某条目标或关联需求上真实存在的风险字段，必须包含 Excel 原始证据。

```ts
interface RequirementRiskDetail {
	riskId: string;
	riskKey: {
		targetRequirementId?: string;
		relatedRequirementId?: string;
		riskType: RiskType;
		evidenceRef: string;
	};
	sourceLeadId?: string;
	targetRequirementId?: string;
	relatedRequirementId?: string;
	relatedRequirementTitle?: string;
	riskType: RiskType;
	riskContentRaw: string;
	riskIdentifiers: string[];
	riskSummary?: string;
	evidence: RequirementEvidence;
	ascetImpactHint?: string;
	impactBasis: "direct_evidence" | "relation_inference" | "engineering_inference";
	impactConfidence: "high" | "medium" | "low";
}
```

### 5.4 Pagination

`risk_details` 每次返回必须包含固定分页字段：

```ts
interface RiskDetailsPage {
	totalCount: number;
	returnedCount: number;
	offset: number;
	limit: number;
	hasMore: boolean;
	nextOffset?: number;
}
```

### 5.5 Detail Completion

```ts
interface DetailCompletion {
	targetDetailsComplete: boolean;
	relationDetailsComplete: boolean;
	allPagesRetrieved: boolean;
	evidenceComplete: boolean;
	truncated: boolean;
}
```

## 6. State Machine Rules

必须新增 `state.ts`，集中计算状态，不允许模型自由判断 `ascet_ready`。

核心规则：

```ts
if (riskContextStage !== "detail_complete") {
	ascetReady = false;
}

if (evidenceStatus !== "complete") {
	ascetReady = false;
}

if (!detailCompletion.allPagesRetrieved) {
	ascetReady = false;
}

if (blockingClarifications.length > 0) {
	ascetReady = false;
}
```

非法状态组合必须显式返回：

```ts
stateValid: false;
stateErrors: string[];
```

非法组合示例：

| risk_context_stage | evidence_status | readiness | ascet_ready | Result |
|---|---|---|---:|---|
| `summary_only` | `complete` | `ready` | `true` | invalid |
| `detail_partial` | `complete` | `ready` | `true` | invalid |
| `detail_complete` | `partial` | `ready` | `true` | invalid |

唯一可放行组合：

```json
{
  "risk_context_stage": "detail_complete",
  "evidence_status": "complete",
  "readiness": "ready",
  "ascet_ready": true,
  "state_valid": true
}
```

## 7. risk_context Contract

`risk_context` 是闸门摘要，不是风险详情。

允许输出：

```text
target_found
self_risk_count
relation_lead_count
related_requirement_count
risk_detail_count
risk_summary_by_type
risk_summary_by_requirement
risk_context_stage
evidence_status
readiness
ascet_ready
state_valid
state_errors
blocking_reasons
blocking_clarifications
non_blocking_clarifications
detail_completion
next_action
```

禁止输出：

```text
risk_content_raw
risk_summary
ascet_impact_hint
具体风险结论
具体 ASCET 设计建议
被截断风险的摘要推断
```

如果 `ascet_ready=false`，formatter 第一屏必须输出：

```text
当前不能进入 /ascet-design
原因：...
下一步：调用 ascet_requirements(action="risk_details", ...)
```

## 8. risk_details Contract

### 8.1 Parameters

```ts
interface RiskDetailsParams {
	action: "risk_details";
	requirementId?: string;
	leadId?: string;
	relatedRequirementId?: string;
	relationTypes?: RelationType[];
	riskTypes?: RiskType[];
	scope?: "target" | "related" | "all";
	priorityMode?: "ascet_relevant_first" | "risk_severity_first" | "source_order";
	offset?: number;
	limit?: number;
	includeRelationEvidence?: boolean;
	includeRiskEvidence?: boolean;
	includeAscetImpact?: boolean;
}
```

默认值：

```ts
scope = "target";
priorityMode = "ascet_relevant_first";
offset = 0;
limit = 10;
```

`scope="all"` 保留，但不能作为默认值。

推荐默认展开顺序：

```text
1. scope="target"
2. scope="related", relationTypes=["same_signal", "same_reused_signal", "signal_family"]
3. scope="related", riskTypes=["bosch_defect", "coem_swim", "lesson_learned"]
4. 用户明确要求时再 scope="all"
```

### 8.2 Return Shape

```ts
interface RiskDetailsResult {
	requirementId?: string;
	totalCount: number;
	returnedCount: number;
	offset: number;
	limit: number;
	hasMore: boolean;
	nextOffset?: number;
	detailCompletion: DetailCompletion;
	risks: RequirementRiskDetail[];
}
```

如果 `hasMore=true`，必须提供 `nextOffset`。

如果分页未完成：

```ts
ascetReady = false;
blockingReasons includes "pagination_incomplete";
```

## 9. Risk ID and Deduplication

`riskId` 应尽量稳定。

推荐：

```text
targetRequirementId:relatedRequirementId:riskType:evidenceRef
```

示例：

```text
907829:76788:bosch_defect:Sheet1!AB123
907829:76790:coem_swim:SWIM-45678
```

去重规则：

```text
same relatedRequirementId + riskType + evidenceRef => one RequirementRiskDetail
```

如果同一个风险通过多个 relation lead 命中：

1. 不重复输出风险详情。
2. 可以保留多个 `sourceLeadId`，或保留最高置信度 lead。
3. 测试必须覆盖 same_signal + same_feature + same_ccp 重复命中的情况。

## 10. Normalization Changes

`normalizer.ts` 当前会从 defect/swim 字段中抽取 ID，但这不够。

必须保留三层内容：

```ts
riskContentRaw: string;
riskIdentifiers: string[];
riskSummary?: string;
```

要求：

1. `riskContentRaw` 必须是 Excel 单元格完整原文。
2. `riskIdentifiers` 只保存 defect ID / SWIM ID / ticket ID。
3. 风险判断必须基于 `riskContentRaw`，不能只基于 ID。

## 11. ASCET Impact Hint

`ascet_impact` 不能包装成确定事实。

使用：

```ts
ascetImpactHint?: string;
impactBasis: "direct_evidence" | "relation_inference" | "engineering_inference";
impactConfidence: "high" | "medium" | "low";
```

示例：

```json
{
  "ascetImpactHint": "Wheel slip state may depend on wheel speed validity and quality propagation.",
  "impactBasis": "relation_inference",
  "impactConfidence": "medium"
}
```

## 12. Clarifications

把澄清项拆成 blocking 和 non-blocking：

```ts
interface ClarificationItem {
	id: string;
	question: string;
	reason: string;
	requiredBeforeAscetDesign: boolean;
}

blockingClarifications: ClarificationItem[];
nonBlockingClarifications: ClarificationItem[];
```

只有 `blockingClarifications.length > 0` 才阻止进入设计。

## 13. /ascet-design Gate

更新 `ascet-design.ts` prompt：

```text
必须先调用 ascet_requirements(action="risk_context")。
如果 ascet_ready=false，禁止进入 ASCET 设计。
如果 next_action 存在，继续调用 next_action。
如果 blocking_clarifications 非空，调用 ask_user_question。
只有 canEnterAscetDesign=true 时，才允许 ASCET explore/read/design。
风险详情阶段禁止 ascet_write / ascet_batch_write。
```

最终闸门：

```ts
canEnterAscetDesign =
	ascetReady === true &&
	riskContextStage === "detail_complete" &&
	evidenceStatus === "complete" &&
	detailCompletion.allPagesRetrieved === true &&
	blockingClarifications.length === 0;
```

拦截时必须返回 `next_action`：

```json
{
  "can_enter_ascet_design": false,
  "blocking_reasons": [
    "pagination_incomplete",
    "evidence_partial"
  ],
  "next_action": {
    "tool": "ascet_requirements",
    "action": "risk_details",
    "requirementId": "907829",
    "offset": 10,
    "limit": 10,
    "priorityMode": "ascet_relevant_first"
  }
}
```

## 14. Implementation Flow

### 14.1 risk_context

流程：

1. 读取 Excel。
2. normalize records。
3. search target。
4. build relation leads。
5. 统计风险字段，不展开风险原文。
6. 生成 `risk_summary_by_type`。
7. 生成 `risk_summary_by_requirement`。
8. 生成 clarifications。
9. 计算 gate state。
10. 返回 `next_action`。

### 14.2 relation_leads

流程：

1. 定位 target requirement。
2. 比较 signal / reused signal / feature / CCP / risk keyword。
3. 生成 `RelationLead[]`。
4. 每条 lead 必须包含 relation evidence。
5. 不输出风险详情。

### 14.3 risk_details

流程：

1. 读取 Excel。
2. 定位 target。
3. 根据 `leadId / relatedRequirementId / relationTypes / scope` 选择记录。
4. 从风险字段生成 `RequirementRiskDetail[]`。
5. 用 `relatedRequirementId + riskType + evidenceRef` 去重。
6. 按 `priorityMode` 排序。
7. 分页。
8. 返回 paging metadata 和 `detailCompletion`。

## 15. Testing Plan

必须新增或更新测试：

1. `risk_context` 不包含 `risk_content_raw`。
2. `risk_context` 不包含 `risk_summary`。
3. `risk_context` 不包含 `ascet_impact_hint`。
4. `relation_leads` 返回 lead，不返回 risk detail。
5. `risk_details` 返回完整 raw cell text。
6. 同一 `evidenceRef + riskType + relatedRequirementId` 去重。
7. 分页 `offset / limit / has_more / next_offset` 正确。
8. 分页合并后不重复、不漏项。
9. `summary_only` 不可能 `ascet_ready=true`。
10. `detail_partial` 不可能 `ascet_ready=true`。
11. `evidence_status!="complete"` 时 `ascet_ready=false`。
12. blocking clarification 存在时 `ascet_ready=false`。
13. 非法状态组合返回 `state_valid=false` 和 `state_errors`。
14. `/ascet-design` prompt 明确禁止未 ready 时进入设计。
15. `/ascet-design` prompt 明确要求 follow `next_action`。

## 16. Development Order

推荐顺序：

1. 修改 `types.ts` 和 `schema.ts`。
2. 新增 `state.ts`。
3. 修改 `normalizer.ts`，保留完整 raw cell text 和 identifiers。
4. 将 `relations.ts` 输出从 `RequirementRelationRiskItem` 改为 `RelationLead`。
5. 新增 `pagination.ts`。
6. 新增 `risk-details.ts`。
7. 重写 `risk-context.ts` 输出结构。
8. 修改 `formatAscetRequirementsResult`。
9. 修改 `prompt.ts`。
10. 修改 `/ascet-design` prompt。
11. 补测试。
12. 跑验证。

## 17. Verification Commands

```powershell
npm run check
```

Focused tests：

```powershell
node node_modules/vitest/dist/cli.js --run test/ascet-extension-requirements.test.ts test/ascet-extension-design-command.test.ts
```

## 18. Acceptance Criteria

开发完成后必须满足：

```text
risk_context 只负责闸门判断；
risk_details 能分页展开完整证据；
relation_leads 和 risk_details 类型分离；
状态组合不会自相矛盾；
ascet_ready 不能被模型自由推断；
/ascet-design 在证据不完整时必须拦截并给 next_action。
```

## 19. Non-goals

第一版不做：

1. 不做复杂 LLM 风险总结生成。
2. 不做 ASCET 写入。
3. 不自动修改模型。
4. 不把 `risk_context` 做成最终报告。
5. 不把半截风险摘要当作设计依据。

## 20. Final Decision

```text
方案状态：最终优化版
审批结论：有条件通过
开发准入：允许
旧方案实现：禁止
必须按本契约实现：是
优先级：高
```

一句话结论：

```text
这版可以进入开发，但实现重点是“闸门契约”和“证据完整性”，不是报告生成。
```
