# ASCET Final Live Pressure Acceptance

- Date: 2026-08-15
- ASCET PID: 25888
- Database: `C:\Repo\13_XIAOMIAVH\px_Backup\px_Backup`
- Result: PASS

## Native Search

- 10-mode live matrix: PASS
- Sequential pressure: 500 calls, 0 failures
- Sequential average/max: 2821.21 / 15624 ms
- Concurrent pressure: 400 calls, 0 failures
- Concurrent average/max: 20221.23 / 27078 ms
- Queue wait average/max: 8475.82 / 23205 ms
- All 400 concurrent submissions were serialized by the native Search mutex.

## Public Tool Flow

- `ascet_get.tree`: PASS, bounded depth-2 sample returned 201 items
- `ascet_get.formulas`: PASS, exact Project returned 931 formulas
- `ascet_read.read_dependent_chain`: PASS
- Native Element Search plus exact Provider validation: PASS
- `ascet_edit.set_dependent_chain` preview: PASS
- `ascet_edit.set_dependent_chain` apply idempotency: PASS, `changed:false`

Validated chain:

- Local: `CN_Libary\Package\LDM\ADC\Private\ADC_VLCDriveOffAndStandstillPostCalc\C_ACC_vRollOutReq`
- Imported: `CN_Libary\Package\LDM\ADC\Private\ADC_VLCDriveOffAndStandstillPostCalc\P_ACC_vRollOutReq`
- Exported: `PlatformLibrary\Package\VLC_VehicleLongitudinalControl\VLC_ACC\parameter\private\VLC_ACC_StandStillParameter\P_ACC_vRollOutReq`

## Stability

- ASCET PID unchanged and responding
- Search process residue: 0
- Visible Search/Browse/Find windows: 0
- Working-set delta: +3969024 bytes
- Private-memory delta: -425984 bytes
- Handle delta: 0
- Existing non-Search `MONITOR` business window was observed and was not created by Search.

## Defects Found and Fixed

1. Explicit dependency mapping incorrectly included `dependencyFormals`; backend validation correctly stopped before Bridge mutation. The adapter now omits it for `bindingPolicy=explicit`.
2. Automatic Provider resolution did not re-read the complete explicit-provider chain before idempotency evaluation. It now performs the exact read and returns `changed:false` before approval/write when the chain is already configured.

## Validation

- Targeted `set-dependent-chain` tests: PASS
- Live preview: PASS
- Live idempotent apply: PASS
- `npm run check`: PASS
