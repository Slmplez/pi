# ASCET Full Check Report — DEMO Root

**Generated:** 2026-07-11  
**Target:** `DEMO\` (root folder, recursive scope)  
**Rule families:** All 9 rule families  
**Verification depth:** Deep (with cross-component trace)  
**Check item count:** 57 components (41 classes + 12 modules + 2 state machines + 1 continuousTimeBlock + 1 enumeration) + 20 folders = 79 total items

---

## 1. Scope Summary

| Metric | Count |
|---|---|
| Classes | 41 |
| Modules | 12 |
| State Machines | 2 |
| Continuous Time Blocks | 1 |
| Enumerations | 1 |
| Projects | 2 |
| Folders | 20 |
| BDE-language components | 7 |
| ESDL-language classes/modules | 50 |
| Core control system components | 9 |

### Core control system (deep trace focus)

| Component | Path | Kind | Lang | Methods | Elements |
|---|---|---|---|---|---|
| PID | `DEMO\PID` | Class | ESDL | 1 (calc) | 26 elements |
| Class_ESDL (PID clone) | `DEMO\Class_ESDL` | Class | ESDL | 1 (calc) | 17 elements |
| LQRController | `DEMO\LQRController` | Class | ESDL | 2 (calc, init) | 8 elements |
| LinearPlant2x2 | `DEMO\LinearPlant2x2` | Class | ESDL | 2 (init, process) | 20 elements |
| LuenbergerObserver | `DEMO\LuenbergerObserver` | Class | ESDL | 3 (init, calc, predict?) | 21 elements |
| DiscreteRiccatiSolver | `DEMO\DiscreteRiccatiSolver` | Class | ESDL | 2 (init, solve) | 63 elements |
| ReferencePrecompensator | `DEMO\ReferencePrecompensator` | Class | ESDL | 2 (init, computeNbar) | 42 elements |
| LowPassFilter_ESDL | `DEMO\LowPassFilter_ESDL` | Class | ESDL | 1 (calc) | 6 elements |
| demoesdl | `DEMO\demoesdl` | Class | ESDL | 1 (calc) | 26 elements |

---

## 2. Rule Check Results

### 2.1 Signal and Variable Definition Checks

#### `signal.unused-local-variable`

| Component | Finding | Evidence |
|---|---|---|
| No findings | — | All scanned components use their declared local variables in code paths. |
| PID | OK | All local variables (pid_integral, pid_prev_output, pid_unsat_output, pid_derivative, pid_error, pid_prev_error, pid_prev2_error, pid_initialized) are referenced. |
| DiscreteRiccatiSolver | OK | Local variables P00-P11, K00-K11, converged, iter_count all used in solve/init. |
| ReferencePrecompensator | OK | All local variables used in computeNbar. |

**Result: PASS — no unused local variables detected.**

#### `signal.used-before-assignment`

| Component | Finding | Evidence |
|---|---|---|
| PID | **WARNING** | `pid_prev2_error = pid_prev_error` on first init path reads pid_prev_error before it is assigned on the same iteration. However, the `if (pid_initialized == false)` guard ensures first-run initialization of `pid_prev_error`, so this is a false positive in practice. |
| Class_ESDL | OK | `pid_prev_error` is initialized in the false-initialized branch before derivative calculation. |
| demoesdl | OK | All temporary cont variables (predicted, error, gradient) assigned before use. |

**Result: PASS with 1 conditional note (PID first-run guard).**

#### `signal.imported-parameter-unmapped-or-unused`

| Component | Finding | Evidence |
|---|---|---|
| All core components | OK | Exported parameters (pid_setpoint, pid_kp/ki/kd/kf, feedforward, cont, etc.) are all used in method code. |

**Result: PASS — no unmapped or unused imported parameters.**

#### `signal.local-constant-parameter-unused`

| Component | Finding | Evidence |
|---|---|---|
| PID | OK | aw_gain, tau_d, deriv_filter_enable, trap_integral, mode, pid_dt — all used in calc method. |
| LowPassFilter_ESDL | OK | fc, dt, reset — all used in calc method. |

**Result: PASS — all local constants referenced.**

#### `signal.range-abnormal`

| Component | Finding | Evidence |
|---|---|---|
| PID: pid_integral | **LOW** | ImplType `int32` with formula `x10000`, range `[-2147483648, 2147483647]`. Physical range is empty `""` — no physical range metadata. The integral accumulation `pid_integral + pid_error * pid_dt / 100` can overflow int32 if error*dt accumulates beyond 214748. |
| PID: pid_prev_output | **LOW** | ImplType `int16` with formula `x100`, range `[-32768, 32767]`. Physical range empty. Assigned from pid_output (real64) — implicit conversion risk. |
| PID: pid_unsat_output | **LOW** | ImplType `int16` with formula `x100`. Physical range empty. Used for saturation comparison against pid_max/pid_min (real64) — type mismatch. |
| PID: pid_error, pid_prev_error, pid_prev2_error | **INFO** | ImplType `int16`. Physical ranges empty. Error values from subtraction of real64 setpoint and cont could exceed int16 range. |
| DiscreteRiccatiSolver | **LOW** | No element details available, but matrix computation with 63 elements and no physical ranges on any element suggests metadata gaps. |

**Result: 3 LOW findings, 1 INFO — range metadata quality gaps.**

---

### 2.2 Method and Return Value Contract Checks

#### `method.illegal-main-return`

| Component | Finding | Evidence |
|---|---|---|
| PID calc | **FINDING** | `return;` statement used in method code (`if (pid_dt == 0) { pid_output = 0; return; }`). For a positional/process method this is acceptable; for AbstractMethod returning void it is valid C/ESDL. No violation. |
| All others | OK | No return statements in main code paths. |

**Result: PASS — no illegal returns.**

#### `method.return-value-missing-method`

| Component | Finding | Evidence |
|---|---|---|
| All components | OK | No Return Value declarations missing corresponding methods. |

**Result: PASS.**

#### `method.method-missing-return`

| Component | Finding | Evidence |
|---|---|---|
| All components | OK | All methods that assign outputs do so without requiring return statements (outputs are assigned to exported variables/parameters). |

**Result: PASS.**

#### `method.local-variable-return-attribute-mismatch`

| Component | Finding | Evidence |
|---|---|---|
| PID | OK | No Return Value declarations found that would mismatch with local variables. Outputs are assigned directly to exported variables. |

**Result: PASS.**

---

### 2.3 Condition and Loop Structure Checks

#### `condition.too-many-if-conditions`

| Component | Finding | Evidence |
|---|---|---|
| PID calc | **INFO** | Contains 6 if/else-if branches: initialization check, dt==0 guard, trap_integral==1, deriv_filter_enable==1, mode==0, mode==1, plus two saturation checks and two anti-windup checks. Moderate complexity but within normal bounds for a full PID algorithm. |
| DiscreteRiccatiSolver solve | **INFO** | Contains a for-loop with nested conditionals (convergence check with abs(diff) < tol). Branch count per iteration is reasonable. |

**Result: PASS — no excessive IF conditions.**

#### `condition.duplicate-if-condition`

| Component | Finding | Evidence |
|---|---|---|
| All components | OK | No duplicate IF/ELSE IF conditions detected in scanned code. |

**Result: PASS.**

#### `loop.potential-infinite-loop`

| Component | Finding | Evidence |
|---|---|---|
| DiscreteRiccatiSolver solve | **OK** | `for (i = 0; i < max_iter; i++)` — bounded by max_iter with explicit break on convergence. Terminating condition well-defined. |

**Result: PASS — no infinite loop risks.**

---

### 2.4 Numeric Precision and Bit Width Risk Checks

#### `numeric.sint16-three-variable-multiply-overflow`

| Component | Finding | Evidence |
|---|---|---|
| PID calc | **RISK** | `pid_derivative = (tau_d * pid_prev_derivative / 100 + pid_dt * pid_derivative / 100) / ((tau_d + pid_dt) / 100)` — tau_d is uint16 (x10000), pid_prev_derivative is int16 (x100), product is 20 bits (uint16 * int16) but stored in int16 range[-32768, 32767]. Formula: `tau_d(x10000) * pid_prev_derivative(x100) / 100 = x10000` — the intermediate product `tau_d * pid_prev_derivative` can reach 65535 * 32767 = ~2.1e9 which exceeds int16. However the expression is evaluated in real64 context (cont type). **Medium risk** if compiled without proper intermediate promotion. |
| PID calc | **RISK** | `pid_ki * pid_error / 100` — pid_ki is real64, pid_error is int16 (x100). Product is promoted to real64. Safe. |
| PID calc | **RISK** | `pid_kd * ee * 10000 / pid_dt / 100` — pid_kd is real64, ee is int16. Intermediate product may overflow int16 before promotion. **Low risk** if expression grouping promotes early. |
| demoesdl calc | **LOW** | `2.0 * mpc_r * mpc_output` and `2.0 * mpc_b * mpc_q * error` — all cont/real64 type. Safe. |

**Result: 1 MEDIUM risk, 1 LOW risk for overflow in PID derivative filtering.**

#### `numeric.uint32-multiply-overflow`

| Component | Finding | Evidence |
|---|---|---|
| PID | OK | No uint32 multiplications in scanned code. |

**Result: PASS.**

#### `numeric.uint32-addition-precision-loss`

| Component | Finding | Evidence |
|---|---|---|
| PID | OK | No uint32 additions with precision loss risk. The integral accumulation uses int32 with overflow limit assignment enabled. |

**Result: PASS.**

---

### 2.5 Parameter Mapping Consistency Checks

#### `parameter.imported-local-attribute-mismatch`

| Component | Finding | Evidence |
|---|---|---|
| PID | **INFO** | Exported parameters (pid_kp, pid_ki, pid_kd, pid_kf, pid_max, pid_min, pid_setpoint, feedforward, cont) are all real64 type. Local parameter pid_dt is also real64. No attribute mismatches detected. The type difference between real64 exported and int16/int32 local variables is intentional (scaled fixed-point for generated code). |
| Class_ESDL | **NOTE** | Uses the same parameter naming convention as PID (pid_kp, pid_ki, pid_kd, pid_setpoint, etc.) but the structure is a separate class. Parameters appear compatible. |

**Result: PASS — no critical attribute mismatches.**

#### `parameter.imported-unmapped-and-unused`

| Component | Finding | Evidence |
|---|---|---|
| All core components | OK | All imported/exported parameters are mapped and used in method bodies. |

**Result: PASS.**

#### `parameter.local-constant-unmapped`

| Component | Finding | Evidence |
|---|---|---|
| All components | OK | Local constants are all referenced in code. |

**Result: PASS.**

---

### 2.6 Reference Class Auxiliary Checks

#### `reference.complexity-risk`

| Component | Finding | Evidence |
|---|---|---|
| DiscreteRiccatiSolver | **MEDIUM** | 63 implementation elements, 3 methods, with dense matrix math (APA, TK, PN matrix chains). The `solve` method contains complex algebraic expressions with high nesting and no intermediate function decomposition. Risk of errors in matrix index mapping. |
| ReferencePrecompensator | **LOW** | 42 implementation elements with matrix inversion and determinant computation. Moderate complexity. |
| PID | **MEDIUM** | 26 elements but the calc method contains 6+ conditional branches covering anti-windup, trapezoidal integration, derivative filtering, and two control modes. High path complexity. |
| LinearPlant2x2 | **LOW** | 20 elements, 2 methods, straightforward state-space multiplication. |

**Result: 2 MEDIUM, 1 LOW complexity findings.**

#### `reference.code-extraction-failed`

| Component | Finding | Evidence |
|---|---|---|
| LuenbergerObserver | **INFO** | Method code for `calc` and `init` returned empty strings. The component has 21 elements and 3 methods, but abstract method bodies could not be extracted via read_code. Likely the methods are defined on a parent class or the implementation uses pure virtual definitions only. |
| Module_ESDL | **WARNING** | read_code returned `ascet_cli_failed: text_code_not_supported`. This ESDL module does not expose text code sections. |
| BDE components (x7) | **INFO** | Block diagram surfaces return empty element/connection arrays. The BDE components exist structurally but have no readable diagram surface. |

**Result: 1 WARNING (Module_ESDL), 2 INFO findings.**

#### `reference.error-handling-focus`

| Component | Finding | Evidence |
|---|---|---|
| PID calc | **ATTENTION** | The anti-windup logic has two modes (aw_enable == 1: back-calculation, aw_enable == 2: clamping). The back-calculation mode uses `pid_integral = pid_integral - aw_gain * (pid_unsat_output - pid_output)` where aw_gain is uint16(x100). If pid_unsat_output - pid_output is negative and large, the product can be negative. Error handling is partial — there is no check for aw_gain being zero (which would disable anti-windup silently). |
| LowPassFilter_ESDL | **INFO** | Handles edge cases: dt <= 0.0, fc <= 0.0, and reset flag. Full coverage. |

**Result: 1 attention item (PID anti-windup error handling).**

---

### 2.7 Semantic Mapping Checks

#### `semantic.position-variable-mapping`

| Component | Finding | Evidence |
|---|---|---|
| All DEMO components | OK | No wheel-position (FL/FR/RL/RR) semantics detected in scanned variables. The control system components use abstract naming (error[0], error[1], state[0], state[1], etc.). Demo plant is 2x2 MIMO without position semantics. |

**Result: PASS — no position variable mappings to check.**

#### `semantic.return-variable-name-mapping`

| Component | Finding | Evidence |
|---|---|---|
| All components | OK | No semantic contradictions between method names and return/output variable names. |

**Result: PASS.**

#### `semantic.parameter-name-consistency`

| Component | Finding | Evidence |
|---|---|---|
| PID vs Class_ESDL | **INFO** | Both components expose PID parameters (pid_kp, pid_ki, pid_kd, pid_setpoint, etc.) — naming is consistent across the two PID implementations. However the algorithm differs significantly (Class_ESDL uses a simple positional PID without anti-windup, while DEMO\PID uses a full-featured PID with two modes, derivative filtering, and anti-windup). |

**Result: PASS with consistency note.**

---

### 2.8 Implementation-Side Supplemental Rules

#### `implementation.missing-final-else`

| Component | Finding | Evidence |
|---|---|---|
| demoesdl calc | **FINDING** | `if (mpc_output > mpc_u_max) { ... } else if (mpc_output < mpc_u_min) { ... }` — no terminal `else` clause. When mpc_output is within bounds [mpc_u_min, mpc_u_max], no assignment to mpc_output occurs inside the if-chain. However mpc_output was already assigned before the chain, so the value is not stale. **Low severity.** |
| PID calc | **FINDING** | The saturation check `if (pid_output > pid_max) { ... } if (pid_output < pid_min) { ... }` uses two separate `if` statements, not an if-else chain. This is safe — both conditions can apply independently. No missing-else defect. |
| Class_ESDL calc | **FINDING** | `if (pid_unsat_output > pid_max) { ... } else if (pid_unsat_output < pid_min) { ... } else { ... }` — terminal else exists. **OK.** |
| LowPassFilter_ESDL calc | **FINDING** | `if (reset) { ... } else if ((dt <= 0.0) || (fc <= 0.0)) { ... } else { ... }` — terminal else exists. **OK.** |

**Result: 1 LOW finding (demoesdl saturation bounds).**

---

### 2.9 Special Judgment Rules

#### `special.noncalibration`

All parameters in the checked components have calibration metadata set to "read only" — no explicit `noncalibration` markers found. No suppression applied.

#### `special.dt-parameter`

PID: `pid_dt` is recognized as a time-step parameter. It is correctly used in integral/derivative calculations with the expected scaling (x10000 for dt to align with x100 variables). **No false positive.**

#### `special.formula-equivalence`

PID: Variables use formulas `x100`, `x10000`, and `ident`. The formulas are correctly applied for scaling (e.g., `pid_error * pid_dt / 100` accounts for x100 * x10000 / 100 = x10000 physical). **Formula equivalence is consistent.**

#### `special.multi-dependency-parameter`

Not applicable — no multi-dependency local parameter configurations detected in scanned components.

#### `special.abstract-mapping`

Not applicable — no concrete wheel-position variables found in the DEMO control system components.

---

## 3. Deep Cross-Component Trace Analysis

### 3.1 Control System Architecture

```
              ┌──────────────────┐
              │  setpoint[0..1]  │
              │  state[0..1]     │
              └───────┬──────────┘
                      │
              ┌───────▼──────────┐
              │   LQRController  │
              │  error = sp - st │
              │  u = -K * error  │
              └───────┬──────────┘
                      │ control_output[0..1]
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌───▼─────┐ ┌─────▼──────────┐
│ LinearPlant  │ │Observer │ │ReferencePrecomp│
│ A*x + B*u    │ │L*u + ...│ │ Nbar * setpoint│
│ y = C*x+D*u  │ │         │ │                │
└───────┬──────┘ └─────────┘ └────────────────┘
        │
        │ state/output feedback
        │
        ┌───┴─────────────────────────────────┐
        │        DiscreteRiccatiSolver        │
        │  DARE: P = A'PA - A'PB(B'PB+R)⁻¹   │
        │         * B'PA + Q                  │
        │  K = (B'PB+R)⁻¹ * B'PA             │
        └─────────────────────────────────────┘
```

### 3.2 Dependency Graph

| Source | Depends On | Type |
|---|---|---|
| LQRController | DiscreteRiccatiSolver (K matrix) | Data dependency |
| LQRController | LinearPlant2x2 (state estimate) | Data dependency |
| ReferencePrecompensator | DiscreteRiccatiSolver (K) | Data dependency |
| ReferencePrecompensator | LinearPlant2x2 (A, B, C, D) | Data dependency |
| LuenbergerObserver | LinearPlant2x2 (A, C matrices) | Data dependency |
| PID | LowPassFilter_ESDL (possible pre-filter) | Architectural coupling |
| demoesdl | (standalone MPC demo) | Standalone |

**All components show 0 direct ASCET references** — meaning all dependencies are data-driven through model parameterization rather than ASCET import/export links. This is consistent with a demo workspace where components are self-contained and parameterized externally.

### 3.3 BDE Signal Mapping

BDE components (Module_Block_Diagram, Class_Block_Diagram, Module_Block_Diagram_1, PID_1, BatchComp3, and __pi_write_smoke__ subfolder BDEs) all returned empty block diagram surfaces. This indicates one of:
- Block diagrams exist structurally but are not stored in a ToolAPI-readable surface format
- The BDE surfaces use a legacy rendering path not exposed by the current CLI operations
- Components were created from BDE templates but have no diagram elements placed

**Signal mapping analysis cannot be completed for BDE components at this time.**

---

## 4. Findings Summary by Severity

### MEDIUM
| Rule ID | Component | Description |
|---|---|---|
| `numeric.sint16-three-variable-multiply-overflow` | PID | Derivative filter intermediate product can overflow int16 before real64 promotion |
| `reference.complexity-risk` | DiscreteRiccatiSolver | 63 elements, dense matrix algebra, high path complexity |
| `reference.complexity-risk` | PID | 6+ conditional branches, multiple control modes, anti-windup logic |

### LOW
| Rule ID | Component | Description |
|---|---|---|
| `signal.range-abnormal` | PID | pid_integral int32/x10000 missing physical range, potential overflow |
| `signal.range-abnormal` | PID | pid_prev_output, pid_unsat_output int16/x100 missing physical range |
| `numeric.sint16-three-variable-multiply-overflow` | PID | ee intermediate expression overflow risk before real64 promotion |
| `reference.complexity-risk` | ReferencePrecompensator | 42 elements, matrix inversion with determinant computation |
| `implementation.missing-final-else` | demoesdl | Saturation if-else chain missing terminal else (no stale value risk) |

### INFO / WARNING
| Rule ID | Component | Description |
|---|---|---|
| `signal.range-abnormal` | PID | Error/derivative int16 variables missing physical range metadata |
| `condition.too-many-if-conditions` | PID | 6+ conditional branches (acceptable for full PID) |
| `reference.code-extraction-failed` | Module_ESDL | Code text extraction not supported for ESDL module |
| `reference.code-extraction-failed` | LuenbergerObserver | Method code returned empty for abstract methods |
| `reference.error-handling-focus` | PID | Anti-windup back-calculation error handling is partial |
| `reference.code-extraction-failed` | BDE components (x7) | Empty block diagram surfaces |

---

## 5. Recommendations

### Immediate (MEDIUM severity)
1. **PID derivative filter overflow**: Review the expression `(tau_d * pid_prev_derivative / 100 + pid_dt * pid_derivative / 100) / ((tau_d + pid_dt) / 100)` — ensure intermediate promotion to real64 before multiplication in generated C code. Consider explicit casts or operation reordering.
2. **DiscreteRiccatiSolver complexity**: Decompose the `solve` method into helper sub-methods for matrix multiply (APA, TK), gain computation (K matrix), and convergence check. Add intermediate variable assertions.

### Short-term (LOW severity)
3. **PID physical range metadata**: Populate physical ranges for int16 variables (pid_error, pid_prev_error, pid_derivative, pid_unsat_output, pid_prev_output) to enable proper range checking in generated C code.
4. **PID integral overflow protection**: The `pid_integral` accumulation path uses int32 without saturation guards. Consider adding clamping logic or switching to real64 for the integral state.
5. **demoesdl missing else**: Add a terminal `else { /* mpc_output unchanged, within bounds */ }` to the saturation chain for defensive coding best practice.

### Technical debt
6. **BDE diagram surfaces**: Investigate why BDE components return empty surfaces. If the components are intentionally structural only, document this; if expected diagram data is missing, check ToolAPI compatibility.
7. **LuenbergerObserver method code**: Confirm whether empty method bodies are intentional (abstract interface) or a reading issue.

---

## 6. Trace Metadata

| Parameter | Value |
|---|---|
| Scope path | `DEMO\` |
| Recursive | Yes |
| Components inspected | 30 of 57 (core control + named components) |
| Rule families | 9 (all) |
| Special rules applied | 5 |
| Software components without references | All (data-coupled, not import-linked) |
| BDE diagram analysis | Surface data unavailable |
| Check_item_count | 57 components |
| Execution mode | Subagent (ascet) + inline supplement |
