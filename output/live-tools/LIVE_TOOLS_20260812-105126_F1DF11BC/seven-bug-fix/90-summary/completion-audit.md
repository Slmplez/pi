# ASCET Tools Test Execution Summary

```text
runId: LIVE_TOOLS_20260812-105126_F1DF11BC
status: BLOCKED
liveWritesExecuted: 0
unexpectedWrites: 0
fixtureCreated: false
cleanupRequired: false
```

## Passed

- Focused Node/Tools tests: 79/79
- ASCET Bridge non-live tests: passed
- npm run check: passed
- ASCET installation/DLL/ToolAPI: ready
- Scheduler: healthy; CLI lock: none
- Full database Tree: complete, live, not truncated
- Shared OID evidence: complete for OID 040gpc83142g1no70o90q9iltgggg
- Read-only operations correctly emitted no shared-object advisory

## Live Read-only Failure

The current Project alias:

```text
PlatformProjects\Gen10\ESP10\ESP4DPB\Product\ESP4DPBCust1MotxWD_ECU_CSW_BB88962::CM_AVH_1MotxWD
```

Results:

```text
ascet_get.tree exact target: target_not_found
ascet_get.elements: passed, componentOid=040gpc83142g1no70o90q9iltgggg
ascet_get.component_refs: passed
ascet_read.read_implementation: passed
ascet_edit.check: passed
```

The Package alias passed all equivalent read-only calls.

## Mutation Gate

Isolated mutation was not started because the read-only resolver Gate failed. It is also blocked by missing public reconciliation and fixture-scoped Live failure injection. No fixture or business object was modified.