# ASCET Database Structure Analysis

Date: 2026-08-12
Status: collecting database samples; no production skill changes yet

## Analysis model

Each database is recorded using the same dimensions:

1. Database identity and external filesystem location.
2. Database role: CNMS platform, customer CUST, mixed snapshot, or unknown.
3. Top-level ASCET roots and object counts.
4. Project nodes and likely active customer/product projects.
5. Generic platform, China mainstream, customer package, and product assembly layers.
6. Concrete Project-to-Package references proving composition relationships.
7. Freshness clues, customer-only deltas, and possible CNMS promotion candidates.
8. Uncertainties that require comparison with another database.

The classification must not rely on a single name match. External path, internal hierarchy, Project identity, references, ownership, and version context are separate evidence dimensions.

## Working relationship model

- `CNMS` means China Main Stream: a reusable China platform layer for requirements already judged sufficiently common across customer projects.
- `CUST` means a customer delivery/integration project. It can contain newer functionality than CNMS because a customer requirement is commonly implemented and validated there first.
- Reuse scope and chronological freshness are independent. CNMS is broader in reuse scope, but CUST may be newer for a specific function.
- A typical evolution is `customer requirement -> CUST implementation -> repeated/generalized evidence -> CNMS extraction or promotion -> CUST re-integration against CNMS`.
- Customer-specific behavior should remain in CUST. Promotion requires evidence that semantics, interfaces, configuration ownership, and lifecycle are reusable across customers.

## Database 01: Xiaomi ESP OBD upgrade CUST

### Identity

- Classification: CUST database with embedded platform and CNMS content.
- Database name: `C:\Repo\11_ASCETCopilotLiveTest\AscetDb_Xiaomi_ESP_OBD_upgrade_to_FSR1_int_XmN3xAPPx821031xD5EDxECCxOPD_7599\ASW\Db\AscetDb_20260707223121`
- Database directory: `C:\Repo\11_ASCETCopilotLiveTest\AscetDb_Xiaomi_ESP_OBD_upgrade_to_FSR1_int_XmN3xAPPx821031xD5EDxECCxOPD_7599\ASW\Db\`
- Fingerprint: `49be9da8ddaa5ac7b09b24a394229cbbd9a9dc3dbabadf9704da7ff25633274a`
- Tree coverage: complete for database scope; not truncated.
- Tree size: 9,162 objects, including 63 Project nodes.

### Top-level roots

| Root | Objects | Interpreted role |
| --- | ---: | --- |
| `PlatformLibrary` | 8,024 | Main generic platform packages and package-level component projects |
| `PlatformLibrary_NewBrakeSystems` | 510 | Additional shared platform packages for new brake systems |
| `Customer` | 227 | Customer-owned package implementations and adaptations |
| `PlatformProjects` | 187 | Product/customer assembly projects and project-local modules/parameters |
| `CN_Libary` | 160 | China mainstream/shared layer; contains CNMS projects, reusable packages, and some transitional content |
| `PlatformProjects_NewBrakeSystems` | 33 | Product integration for new brake-system packages |
| Other platform/library roots | 21 | Smaller specialized shared libraries |

Object-kind totals:

| Kind | Count |
| --- | ---: |
| Class | 5,877 |
| Folder | 1,624 |
| Module | 815 |
| Enumeration | 641 |
| ASCET icon | 76 |
| Project | 63 |
| State machine | 60 |
| Signal | 6 |

### CNMS layer structure

`CN_Libary` contains 160 objects: 71 Classes, 48 Folders, 29 Modules, 7 Enumerations, 4 Projects, and 1 StateMachine.

Major branches:

- `CN_Libary\Package\CST_ComfortableStop` — 77 objects.
- `CN_Libary\Package\VDM` — 16 objects.
- `CN_Libary\Package\LDM` — 14 objects.
- `CN_Libary\CNMS_ESP10_Europium\BrakeRedundancyCust*` — 19 objects.
- `CN_Libary\LDI_Cust` — 13 objects.
- Smaller `VariantCoding`, `CRB`, `MTC_PreCtrl`, `CNMS_RPA`, and `temp` branches.

Project nodes under `CN_Libary`:

- `CN_Libary\CNMS_ESP10_Europium\BrakeRedundancyCustFx\Component\ESP10RedundancyCustFx_ECU_CSW_BB00001`
- `CN_Libary\LDI_Cust\LDICust_ECU_CSW_BB00001`
- `CN_Libary\Package\CST_ComfortableStop\component\CSTwDPB_ECU_CSW_BB00001`
- `CN_Libary\Package\VDM\Component\VDM_ECU_CSW_BB00147`

Important qualification: `CN_Libary` is heterogeneous. A path under this root is evidence of China-shared intent, but not sufficient by itself to prove that an object is fully platformized. Names such as `Cust`, `temp`, and mixed project/package placement require ownership and reuse validation.

### CUST/product layer structure

Primary product branch:

- `PlatformProjects\Gen10\ESP10\ESP4DPB\Product` — 149 objects.

Customer/product Project nodes:

- `PlatformProjects\Gen10\ESP10\ESP4DPB\Product\ESP4DPBCust1MotxWD_ECU_CSW_BB88962`
- `PlatformProjects\Gen10\ESP10\ESP4DPB\Product\ESP4DPBCust2MotAWDAxleSplit_ECU_CSW_BB88962`

The non-default `BB88962` identity and `Cust*` naming distinguish these customer/product assemblies from the many package-level `BB00001` projects stored under platform package roots.

The database also contains customer namespaces for JLR/FMC, Xiaomi, VAG, Audi, VW, CEVT, and GM. Presence alone does not make all of them active in this delivery. The database filesystem name and verified component references provide stronger evidence that Xiaomi is the relevant customer context.

### Verified mixed composition example

Verified project module:

`PlatformProjects\Gen10\ESP10\ESP4DPB\Product\ESP4DPBCust1MotxWD_ECU_CSW_BB88962::CM_AVH_1MotxWD`

This module has 84 elements and 26 resolved component references:

- 23 references target `PlatformLibrary`.
- 3 references target `Customer\XiaoMi`.
- Scope distribution: 17 local, 7 imported, and 2 exported references.

Customer-specific targets include:

- `Customer\XiaoMi\Package\AVH\AvhSet_XiaoMi`
- `Customer\XiaoMi\Package\AVH\NextEV\AVH_BrakePedalPatternDetection_Xiaomi`
- `Customer\XiaoMi\Package\AVH\AVH_SwitchAdaption_XiaoMi`

This proves that a CUST Project is not a standalone fork. It is an assembly layer combining generic platform components with customer-owned implementations. CNMS content may be present in the same database even when a selected customer module currently references generic and customer roots directly.

### Initial conclusions from Database 01

1. Database filesystem location and internal ASCET ownership hierarchy are different concepts. A CUST database contains copies or snapshots of platform, CNMS, customer, and product assembly layers.
2. `PlatformProjects\...\Product\*Cust*` is strong evidence for customer integration scope.
3. `Customer\<customer>\Package` is the direct customer implementation layer.
4. `CN_Libary` is the China shared/promotion layer, but requires branch-level validation because it also contains transitional or customer-named content.
5. `PlatformLibrary` is the broad generic feature layer and is distinct from CNMS.
6. Project-level modules can reference both platform and customer Classes. Therefore scope must be inferred from the complete reference chain, not from the Project path alone.
7. A newer CUST implementation must not be overwritten merely because an older CNMS implementation exists.
8. Promotion analysis requires at least a paired CUST/CNMS comparison: same feature, interfaces, implementation delta, parameter ownership, customer-specific dependencies, and version chronology.

### Open comparison questions

The next databases should be used to determine:

- Whether `CN_Libary\CNMS_DPB4HAD` follows the same internal layout as the `CNMS_ESP10_Europium` sample.
- Whether promoted functionality is moved, copied, wrapped, or re-referenced from CUST.
- Which naming/version fields reliably identify the newer implementation.
- Whether customer-specific Classes remain under `Customer` after promotion or are replaced by CNMS wrappers.
- How CUST Projects select between generic `PlatformLibrary`, `CN_Libary`, and `Customer` implementations.
- Which differences are universal promotion candidates versus customer calibration, variant, interface, or diagnostic adaptations.

## Planned skill implications

Do not implement these rules in `ascet-engineering` until more paired samples are recorded. Expected future additions:

- Explicit database role detection: CNMS, CUST, mixed, or unknown.
- Separate freshness analysis from reuse/ownership analysis.
- Search order based on request intent rather than fixed CNMS-first or CUST-first precedence.
- A promotion-candidate workflow comparing CUST delta against CNMS baseline.
- Guardrails preventing customer-only behavior from being generalized without evidence.

## Database 02: Xiaomi DPB 48V upgrade CUST with CNMS_DPB4HAD

### Identity

- Classification: Xiaomi DPB CUST database containing a feature-specific CNMS project.
- Database name returned by ToolAPI: `C:\Repo\11_ASCETCopilotLiveTest\AscetDb_Xiaomi_DPB_48V_For_Upgrade_Int_MM21xD5EDxED840001xECCL_6870\ASW\Db\AscetDb_20260205055732`
- Timestamp encoded in database name: 2026-02-05 05:57:32.
- ToolAPI-reported database directory: the previous Database 01 OBD path, not the parent of the new database name.
- Identity status: inconsistent `name`/`path`; the exact database name and newly collected complete tree are used as the primary identity evidence.
- Tree coverage: complete for database scope; not truncated.
- Tree size: 3,143 objects, including 33 Project nodes.
- Captured tree SHA-256: `DF53AB79113F6103E38CA95CF9E46B74713A392A50F4D12D65C8A3D29BFCB946`.

This database is chronologically older than Database 01 according to the embedded timestamps: 2026-02-05 versus 2026-07-07. This supports the rule that database role and freshness must be evaluated separately.

### Top-level roots

| Root | Objects | Interpreted role |
| --- | ---: | --- |
| `PlatformLibrary` | 2,256 | Main generic platform packages |
| `PlatformLibrary_NewBrakeSystems` | 659 | Shared new-brake-system packages |
| `EncapSWLibrary` | 70 | Encapsulated shared software |
| `PlatformProjects` | 49 | DPB customer product assembly and local definitions |
| `CN_Libary` | 36 | Main China shared/CNMS layer using the established misspelling |
| `PlatformProjects_NewBrakeSystems` | 23 | New-brake-system integration projects |
| `Customer` | 21 | Sparse customer-owned package content |
| Other library roots | 25 | Specialized platform/bypass libraries |
| `CN_Library` | 4 | Separate correctly spelled China-library root |

Object-kind totals:

| Kind | Count |
| --- | ---: |
| Class | 1,756 |
| Folder | 688 |
| Module | 344 |
| Enumeration | 290 |
| Project | 33 |
| State machine | 22 |
| ASCET icon | 5 |
| Signal | 5 |

### CNMS_DPB4HAD structure

Feature root:

`CN_Libary\CNMS_DPB4HAD\DPB_BrakeRedundancyCust`

The subtree has 19 objects:

- 6 folders.
- 10 Modules.
- 2 parameter-provider Classes.
- 1 Project.

CNMS Project:

`CN_Libary\CNMS_DPB4HAD\DPB_BrakeRedundancyCust\Component\DPBRedundancyCust_ECU_CSW_BB00001`

Project assembly instances include:

- `Asw2Asw_DPBRedundancyCust_BB00001`
- `CM_APC_Backup`
- `CM_DriverInteraction_IPB`
- `CM_EMC_DPB`
- `CM_LdmCoor_DPB`
- `CM_LFI_DPB`
- `LFIHost_5ms`
- `XPass_BB00001_DPBRedundancyCust`

Local CNMS definitions and configuration include:

- Component definitions outside the Project-instance path, such as `Asw2Asw_DPBRedundancyCust_BB00001` and `XPass_BB00001_DPBRedundancyCust`.
- `Parameter\Calibration\DPBRedundancyCust_BB00001_Calibration`.
- `Parameter\Constant\DPBRedundancyCust_BB00001_Constant`.

Representative reference reads show that `CM_EMC_DPB` and `CM_LdmCoor_DPB` resolve their outgoing type/component references to `PlatformLibrary`. CNMS therefore acts as a reusable feature assembly/adaptation layer over generic platform components; it is not a replacement for `PlatformLibrary`.

### DPB CUST structure

CUST Product Project:

`PlatformProjects\DPB\Product\DPBCust_ECU_CSW_BB00000`

The Project contains 34 Module instances. Examples include:

- Generic/package integrations: `CM_CRB_DPB`, `CM_DBR_DPB`, `CM_PPCdpb`, `CM_SspWss_DPBHad`.
- DPB integration modules: `CM_DPB_SignalExport_Dev`, `CM_DPB_SignalExport_LDM`, `CM_LdmCoor_SignalExchange_DPB`.
- Customer-marked integration: `CM_DPB_SignalExport_Xiaomi_MS11`.
- Product adaptation and verification: `CM_ExternalEPB`, `VariantCodingVerification`, `Stubs4DPB_Study`.
- Product-owned bridge modules: `Asw2Asw_DPBCust_BB00000`, `XPass_BB00000_DPBCust`.

CUST definitions outside the Project-instance path are stored under:

- `PlatformProjects\DPB\Modules` — six Module definitions and two Classes.
- `PlatformProjects\DPB\Parameter\_calibration_Cust` — customer calibration provider.

This distinction is important: `Project::Module` paths describe assembly instances, while `PlatformProjects\DPB\Modules` and `Parameter` contain product-owned definitions/configuration. Promotion analysis should focus first on the owned definitions and then verify how their instances are wired into the Project.

Representative reference reads show:

- `CM_ExternalEPB` has seven outgoing references, all resolving to `PlatformLibrary`.
- `CM_DPB_SignalExport_Xiaomi_MS11` has one outgoing reference resolving to `PlatformLibrary_NewBrakeSystems`.

A customer-marked Project module can therefore be customer-specific because of wiring, naming, interface selection, scheduling, or signal mapping even when its referenced type is generic. Target root alone does not decide ownership.

### CNMS versus CUST relationship in Database 02

The CNMS and CUST Projects coexist but are not whole-project duplicates:

| Dimension | CNMS | CUST |
| --- | --- | --- |
| Path | `CN_Libary\CNMS_DPB4HAD\DPB_BrakeRedundancyCust` | `PlatformProjects\DPB\Product\DPBCust_ECU_CSW_BB00000` |
| Scope | Feature-specific brake-redundancy customer baseline | Broad DPB customer product assembly |
| Project identity | `DPBRedundancyCust_ECU_CSW_BB00001` | `DPBCust_ECU_CSW_BB00000` |
| Project Module instances | 8 | 34 |
| Configuration | Dedicated Calibration and Constant providers | Customer calibration provider |
| Exact Module-name overlap | None | None |

Consequently, the fallback rule must be applied per feature, not per database:

1. Search the platform-specific CNMS root for a semantically matching feature project.
2. If the requested feature is absent from CNMS, search the CUST Product Project and its owned `Modules`/`Parameter` branches.
3. If both contain plausible implementations, compare scope and semantics; do not assume one is a newer copy of the other.
4. A broad CUST Project can consume or coexist with multiple independent CNMS feature projects.

### Naming and structure anomalies

Both spellings exist as independent roots:

- `CN_Libary` — primary CNMS structure.
- `CN_Library\BrakeRedundancy\Enumeration\EMC_BrakeActuatorControlStatus` — a separate four-object branch.

Discovery must support both spellings and must not normalize them into one path before reading exact identity/OID evidence.

The customer namespace is sparse: only 21 objects. `Customer\Xiaomi` contains one PFA-specific Class, while the active DPB Product Project contains a Xiaomi-named signal-export Module. This confirms that customer adaptations are not always located under `Customer\<name>`; they may also be Project-owned integration Modules under `PlatformProjects`.

### Comparison with Database 01

| Dimension | Database 01 | Database 02 |
| --- | ---: | ---: |
| Encoded database timestamp | 2026-07-07 | 2026-02-05 |
| Objects | 9,162 | 3,143 |
| Projects | 63 | 33 |
| `CN_Libary` objects | 160 | 36 |
| `PlatformProjects` objects | 187 | 49 |
| `Customer` objects | 227 | 21 |
| Main product family | ESP10/ESP4DPB | DPB |
| Main customer project identity | `ESP4DPBCust*...BB88962` | `DPBCust...BB00000` |
| Explicit CNMS family | `CNMS_ESP10_Europium` plus packages | `CNMS_DPB4HAD` |

Database 02 is a smaller, older, more focused DPB database. Database 01 is a newer and broader customer integration snapshot. Neither size nor location alone establishes which implementation of a specific feature is authoritative.

### Additional skill implications from Database 02

- Invalidate stored Tree/Catalog evidence when `database.name` changes, even if `database.path` remains unchanged or stale.
- Detect and report inconsistent database `name`/`path`; do not silently combine artifacts across them.
- Search both `CN_Libary` and `CN_Library` as exact candidate roots.
- Resolve CNMS availability per requested feature, not by checking only whether a CNMS root exists.
- Distinguish Project instances (`Project::Module`) from owned Module/Class definitions.
- For CUST-first investigation, inspect `PlatformProjects\<platform>\Modules` and `Parameter` in addition to the Product Project.
- For CNMS-first investigation, inspect feature-owned `Component`, `Parameter\Calibration`, and `Parameter\Constant` branches.
- Customer naming and customer ownership are related but not equivalent; verify wiring and owner location.

## Database 03: F05 IPB L2 CNMS-centric database

### Identity

- Classification: CNMS-centric IPB platform database with residual CUST-owned definitions and customer dependencies.
- Live database name: `C:\Repo\F05_IPB_L2_0429`.
- ToolAPI-reported database directory: still the Database 01 Xiaomi OBD directory.
- Identity status: inconsistent `name`/`path` for the second consecutive switch; full `database.name` and a newly collected complete tree are authoritative for this analysis.
- Tree coverage: complete for database scope; not truncated.
- Tree size: 10,681 objects, including 75 Project nodes.
- Captured tree SHA-256: `18D06D793B5FDCB8095C32C0538CB85D5E178C782C62D7C5CB4D94E7F984AB38`.
- No reliable creation timestamp is encoded in the database name; `0429` is not treated as a date without additional evidence.

### Top-level roots

| Root | Objects | Interpreted role |
| --- | ---: | --- |
| `PlatformLibrary` | 8,992 | Main generic platform implementation layer |
| `PlatformLibrary_NewBrakeSystems` | 812 | Shared new-brake-system implementation layer |
| `CN_Libary` | 678 | Large China shared/CNMS and China feature-package layer |
| `Customer` | 143 | Customer-originated definitions retained in the platform snapshot |
| `PlatformProjects` | 19 | IPB project-owned definitions and parameter providers; no Product Project |
| `CN_Library` | 15 | Correctly spelled secondary China layer, mainly BrakeRedundancy assets |
| Other roots | 22 | Specialized platform, test, and demo content |

Object-kind totals:

| Kind | Count |
| --- | ---: |
| Class | 7,069 |
| Folder | 1,855 |
| Module | 859 |
| Enumeration | 708 |
| Project | 75 |
| State machine | 62 |
| ASCET icon | 46 |
| Signal | 7 |

### Database-role evidence

Unlike Database 01 and Database 02, there is no Project under `PlatformProjects\...\Product`. `PlatformProjects` contains only definitions/configuration:

- `PlatformProjects\IPB\Modules` — six Modules and one Class.
- `PlatformProjects\IPB\Parameter\Calibration\IPBCust_BB93833_Parameter_Calibration`.
- `PlatformProjects\IPB\Parameter\Constant\IPBCust_BB93833_Parameter_Contant`.
- One unrelated ESP10 customer Class.

The active integration structures are four Projects under `CN_Libary\CNMS_IPB20`, all using build-block identity `BB88010`. This makes the database CNMS-centric even though customer/project-owned artifacts remain present.

### CN_Libary structure

`CN_Libary` contains 678 objects:

- 311 Classes.
- 189 Modules.
- 103 Folders.
- 63 Enumerations.
- 10 Projects.
- 2 StateMachines.

Major branches:

- `CN_Libary\Package` — 521 objects, including shared China feature packages such as LDM, iTAS, CST, VDM, CRB, MTC and others.
- `CN_Libary\CNMS_IPB20` — 148 objects.
- Smaller `CNMS_RPA` and `temp` branches.

This database shows two China-platform levels:

1. `CN_Libary\Package\<feature>` for reusable China feature implementations/configurations.
2. `CN_Libary\CNMS_IPB20\<project slice>` for platform-level Project assemblies and variants.

### CNMS_IPB20 Project partitioning

Four CNMS Projects are present:

| Project slice | Project | Module instances |
| --- | --- | ---: |
| General baseline | `IPBCustGeneral_ECU_CSW_BB88010` | 80 |
| Non-HAD/HAP architecture | `IPBCustNonHADHAP_ECU_CSW_BB88010` | 10 |
| One drive unit / xWD | `IPBCustOneDrvUnitxwD_ECU_CSW_BB88010` | 16 |
| Two drive units / axle split | `IPBCustTwoDrvUnitAxleSplit_ECU_CSW_BB88010` | 17 |

There is no exact Module-name common to all four Projects. The one-drive-unit and two-drive-unit Projects share only:

- `CM_CRB_Fx_GAC2Huawei`
- `CM_CRB_PowertrainModel_IPB_CNMS`

The structure strongly suggests partitioned platform slices rather than four complete copies:

- `IPBCustGeneral` supplies the broad common functional assembly.
- `IPBCustNonHADHAP` supplies architecture/brake-redundancy integration.
- The one-drive-unit and axle-split Projects supply mutually selected powertrain/drivetrain configurations.

This interpretation must be confirmed from downstream CUST composition before assuming how the slices are combined.

### Definition-to-Project instance relationship

Tree OID comparison proves that `Project::Module` entries are references to the same component definition, not copied implementations. Examples:

- `PlatformProjects\IPB\Modules\CM_IPBCust_SignalExport` and the instance in `IPBCustGeneral` have the same OID.
- `CN_Libary\CNMS_IPB20\Configuration\CM_CNMS_PTConfiguration_AxleSplit` and its axle-split Project instance have the same OID.
- CNMS-owned `Asw2Asw_*` and `XPass_*` definitions have the same OIDs as their Project instances.

This provides a reliable analysis join:

```text
Project::Module instance
→ match exact OID
→ canonical non-Project definition path
→ determine actual owner layer
```

Name matching is not needed when the OID is available.

### Actual ownership composition of CNMS Projects

Using the same-OID join, the CNMS Projects resolve to the following definition roots.

#### IPBCustGeneral

- 60 Modules from `PlatformLibrary`.
- 5 Modules from `PlatformLibrary_NewBrakeSystems`.
- 9 Modules from `CN_Libary`.
- 6 Modules from `PlatformProjects\IPB\Modules`.

The six `PlatformProjects`-owned definitions are:

- `CM_AEB_IPB_Ref`
- `CM_IPBCust_SignalExport`
- `CM_IPBCust_SignalExport_Diag`
- `CM_SspWss_SignalExport_IPBCust`
- `IPBCust_5ms_BB93833`, instantiated as `TaskBaseCtrlx1Variant`
- `IPBCust_Sensors20ms_BB93833`, instantiated as `TaskBaseCtrlx4`

Therefore, a Project can be platformized under CNMS while some component definitions remain under the CUST/project-owned root.

#### IPBCustNonHADHAP

- 6 Modules from `PlatformLibrary`.
- 1 Module from `PlatformLibrary_NewBrakeSystems`.
- 2 Modules owned directly under the CNMS slice.
- 1 Module from `Customer\ChangAn\LFI\CM_FxWrapper`.

The direct `Customer\ChangAn` dependency is a critical platformization exception. It may represent deliberate shared reuse, incomplete migration, historical ownership, or platform debt. Location alone cannot decide which interpretation is correct.

This slice also owns dedicated configuration providers:

- `Parameter\Calibration\IPBCustNonHADHAP_BB88010_Parameter_Calibration`
- `Parameter\Constant\IPBCustNonHADHAP_BB88010_Parameter_Constant`

#### IPBCustOneDrvUnitxwD

- 9 Modules from `PlatformLibrary`.
- 1 Module from `PlatformLibrary_NewBrakeSystems`.
- 6 Modules from `CN_Libary`, including the CNMS configuration and China feature packages.

#### IPBCustTwoDrvUnitAxleSplit

- 10 Modules from `PlatformLibrary`.
- 1 Module from `PlatformLibrary_NewBrakeSystems`.
- 6 Modules from `CN_Libary`, including the axle-split CNMS configuration and China feature packages.

### CN_Library secondary branch

The correctly spelled root contains 15 BrakeRedundancy assets:

- `LFI_Assisted_Architecture` Enumeration.
- `_CM_EMC_Parameter` and `_CM_LFI_Parameter` calibration Classes.
- Brake-redundancy private/wrapper Classes.

These objects are separate from `CN_Libary\CNMS_IPB20`. Discovery must preserve both exact roots and join by OID/references where possible.

### Refined CNMS/CUST relationship from Database 03

Database 03 shows that platformization is not a single binary state. It can occur independently at several levels:

| Level | Possible state |
| --- | --- |
| Project assembly | Moved/created under `CN_Libary\CNMS_*` |
| Feature configuration | Owned under CNMS `Configuration` or China `Package` |
| Module/Class definition | Still under `PlatformProjects`, `Customer`, `CN_Libary`, or generic platform roots |
| Parameters | CNMS-owned, CUST-owned, package-owned, or mixed |
| Variant selection | Split into multiple CNMS Projects rather than one monolithic Project |

A CNMS Project path proves platformized assembly intent, but does not prove that every included implementation is platform-owned or customer-neutral.

The likely promotion sequence is therefore more granular than a simple move:

```text
CUST definition and wiring
→ reusable CNMS Project assembly
→ selected CUST definitions reused by OID
→ configuration/parameters gradually moved or generalized
→ customer-root dependencies reviewed and possibly migrated
```

### Comparison across the first three databases

| Dimension | Database 01 | Database 02 | Database 03 |
| --- | --- | --- | --- |
| Primary role | Newer broad Xiaomi ESP CUST | Focused Xiaomi DPB CUST with one CNMS feature | CNMS-centric IPB platform |
| Objects | 9,162 | 3,143 | 10,681 |
| Projects | 63 | 33 | 75 |
| Product CUST Project | Yes | Yes | No |
| CNMS Projects | Several heterogeneous branches | One DPB feature Project | Four IPB20 platform slices |
| CUST-owned definitions used by CNMS | Not yet measured | Not observed in sampled feature | Proven: six PlatformProjects Modules |
| Direct Customer dependency inside CNMS | Not yet measured | Not observed in sampled feature | Proven: ChangAn `CM_FxWrapper` |

### Additional skill implications from Database 03

- Classify database role by Project distribution, not merely by the presence of `CN_Libary`, `Customer`, or `PlatformProjects` roots.
- Treat CNMS platformization as multi-level: Project, component definition, parameter provider, dependency, and variant.
- Resolve each `Project::Module` instance to its canonical definition by exact OID before deciding ownership or edit location.
- A CNMS Project that references `PlatformProjects` or `Customer` must be reported as mixed ownership, not assumed fully generalized.
- Flag direct customer-root dependencies inside CNMS as platformization exceptions requiring engineering review.
- Do not automatically relocate such dependencies; determine whether they are intentional shared assets, historical naming, or incomplete promotion.
- Model multiple CNMS Projects as potentially composable platform slices. Do not assume they are full alternatives solely because they share a CNMS root.
- Inspect CNMS `Configuration`, slice-local Parameter providers, China `Package` content, and residual `PlatformProjects` definitions together.

# Consolidated Findings from Three Databases

Collection is complete after three database samples. The conclusions below supersede the initial simplified assumption that CNMS and CUST are two fixed alternative locations.

## 1. Sample classification

| Database | Logical role | Main evidence |
| --- | --- | --- |
| Database 01: Xiaomi ESP OBD | CUST-centric, broad customer integration | Product CUST Projects under `PlatformProjects`; extensive `Customer\XiaoMi`; mixed platform/customer references |
| Database 02: Xiaomi DPB 48V | CUST-centric with a feature-specific CNMS Project | Broad `DPBCust` Product Project coexists with the smaller `CNMS_DPB4HAD\DPB_BrakeRedundancyCust` Project |
| Database 03: F05 IPB L2 | CNMS-centric platform database with mixed ownership | Four `CNMS_IPB20` Project slices; no Product CUST Project; CNMS still reuses `PlatformProjects` and `Customer` definitions |

The database role must be classified from Project topology and ownership, not from external filesystem naming or the mere presence of a root folder.

## 2. Stable logical layer model

The three databases support the following logical hierarchy:

```text
PlatformLibrary / PlatformLibrary_NewBrakeSystems
    Generic cross-region platform implementation

CN_Libary\Package
    Reusable China feature packages/configuration

CN_Libary\CNMS_<platform>
    China mainstream Project assemblies and platform variants

Customer\<customer>
    Customer-originated Classes, Modules, Enumerations, wrappers, and parameters

PlatformProjects\<platform>\Modules|Parameter
    Product/CUST-owned definitions and configuration

PlatformProjects\...\Product\<CustProject>
    Final customer/product Project assembly
```

This is a logical model, not a strict dependency direction. Both CUST and CNMS Projects can assemble objects from several layers.

## 3. Core CNMS/CUST relationship

### CUST responsibilities

CUST normally provides:

- The final customer/product Project assembly.
- First implementation of new customer requirements.
- Customer interfaces, signal mappings, wrappers, diagnostics, scheduling, calibration, and variants.
- Project-owned Modules and Parameters not yet generalized.
- Integration of generic platform, China packages, CNMS features, and customer-specific objects.

CUST may be newer than CNMS for a particular function. It must not be overwritten merely because a CNMS implementation exists.

### CNMS responsibilities

CNMS normally provides:

- Reusable China-mainstream Project assemblies.
- Common feature integration validated beyond a single customer.
- Platform configuration slices for architecture, drivetrain, HAD/HAP, and other variants.
- China-shared feature packages and common parameter/configuration providers.

CNMS is broader in reuse scope, but not necessarily newer and not necessarily free of customer-owned dependencies.

### Evolution relationship

The observed evolution is better represented as:

```text
Customer requirement
→ CUST implementation and validation
→ repeated/common semantics identified
→ CNMS Project begins assembling the capability
→ CUST definitions may temporarily remain reused by OID
→ configuration and parameters are generalized
→ customer-root dependencies are removed, replaced, or explicitly accepted
→ CUST Product Projects consume the stabilized CNMS capability
```

Promotion is therefore incremental and can stop at any intermediate state.

## 4. Platformization is multi-level

A function must be evaluated independently at these levels:

1. **Project assembly** — Is the Project under `CN_Libary\CNMS_*`?
2. **Component definition** — Where is the actual Module/Class definition located?
3. **Parameter ownership** — Are Calibration/Constant providers CNMS-, Package-, CUST-, or Customer-owned?
4. **Dependency ownership** — Does CNMS still directly depend on `PlatformProjects` or `Customer` objects?
5. **Variant abstraction** — Are customer differences represented as reusable platform variants?
6. **Customer integration** — Does the CUST Project only map/select the platform feature, or still implement its business logic?

Recommended terminology:

| Term | Meaning |
| --- | --- |
| CUST implementation | Function and definitions remain customer/product owned |
| Promotion candidate | CUST function appears reusable but is not yet adopted by CNMS |
| Platformized assembly | CNMS Project assembles the function, but ownership may still be mixed |
| Mixed-ownership CNMS | CNMS Project references CUST or Customer definitions |
| Platform-owned implementation | Definitions, configuration, and parameters are owned by platform/CNMS packages |
| Fully platformized | CNMS assembly and implementation are reusable, with customer-specific behavior isolated to mappings/variants |

Database 03 proves the distinction: the CNMS Project is platformized at assembly level while six definitions remain under `PlatformProjects`, and one dependency remains under `Customer\ChangAn`.

## 5. CNMS availability is feature-specific

The existence of `CN_Libary\CNMS_<platform>` does not mean every function is available in CNMS.

Database 02 contains both:

- A broad DPB CUST Product Project.
- A narrow CNMS brake-redundancy Project.

They have no exact Module-name overlap and serve different scopes. The correct rule is:

```text
Requested feature
→ search the matching CNMS platform root for semantic coverage
→ if absent, inspect the CUST Product Project and owned definitions
→ if both exist, compare scope, behavior, ownership, and chronology
```

Do not treat the whole CNMS Project and whole CUST Project as alternative versions of each other.

## 6. Project instances and definitions

`Project::Module` is an assembly instance/entry, not a separate implementation owner. The three-database analysis establishes the preferred join:

```text
Project::Module
→ exact OID
→ non-Project definition with the same OID
→ canonical owner path
```

This resolves whether a Project instance comes from:

- `PlatformLibrary`
- `PlatformLibrary_NewBrakeSystems`
- `CN_Libary\Package`
- `CN_Libary\CNMS_*`
- `PlatformProjects`
- `Customer`

Ownership and edit location must be decided from the canonical definition, not the Project-instance path or display name.

## 7. Database-role classification rules

### CUST-centric

Strong indicators:

- Project under `PlatformProjects\...\Product\*Cust*`.
- Customer/project-owned Modules and Parameters.
- Customer-named mappings or signal exports.
- Broad final-product assembly referencing multiple platform and customer layers.

### CNMS-centric

Strong indicators:

- Main integration Projects under `CN_Libary\CNMS_<platform>`.
- Multiple reusable configuration or architecture slices.
- No final Product CUST Project in the database.
- Broad use of platform and China-package definitions.

### Mixed

Indicators:

- Both active Product CUST Projects and feature-level CNMS Projects.
- CNMS Projects reuse definitions under `PlatformProjects` or `Customer`.
- The database is a development/integration snapshot containing multiple ownership stages.

The classification describes the database's dominant role; individual features can still have different ownership states.

## 8. Freshness and authority rules

Reuse scope and time are independent:

```text
CNMS = broader reuse intent
CUST = customer delivery intent
```

Neither implies newer implementation.

For a customer delivery issue:

1. Start from the active CUST Product Project.
2. Resolve the exact Module definition by OID.
3. Trace whether behavior comes from Customer, PlatformProjects, CNMS, or generic platform.
4. Prefer the customer integration layer when the requirement is customer-specific.

For shared platform work:

1. Start from the matching CNMS/China feature package.
2. Confirm cross-customer semantics.
3. Inspect representative CUST integrations and newer customer deltas.
4. Do not generalize a customer implementation without evidence.

When CUST and CNMS are both plausible, keep both candidates and ask for the intended modification layer.

## 9. Promotion-readiness criteria

A CUST function should be considered ready for CNMS promotion only when evidence supports all relevant dimensions:

- Requirement semantics are useful across customers.
- Inputs/outputs and signal meaning are customer-neutral.
- Type, unit, range, lifecycle, scheduling, and failure behavior are reusable.
- Customer-specific diagnostics, interfaces, naming, and mappings are isolated.
- Calibration and constant ownership are defined for platform use.
- Variants replace customer hard-coding where practical.
- Direct `Customer` dependencies are removed or explicitly justified.
- `PlatformProjects` dependencies are migrated or accepted as transitional ownership.
- Representative CUST Projects can integrate the promoted feature without duplicating logic.
- Compatibility and migration impact are understood.

A feature failing these checks should remain CUST-owned or be recorded as partially platformized.

## 10. Discovery and analysis workflow for the skill

The final recommended workflow is:

```text
1. Read exact database identity.
2. Invalidate stored artifacts when database.name changes.
3. Detect inconsistent database.name/database.path.
4. Collect a complete or explicitly bounded Tree.
5. Classify database as CUST-centric, CNMS-centric, mixed, or unknown.
6. Determine platform family and requested feature semantics.
7. Search both CN_Libary and CN_Library exact roots.
8. Locate candidate CNMS feature Projects and CUST Product Projects.
9. Resolve Project::Module instances to definitions by OID.
10. Trace Parameters, dependencies, signal mappings, and variants.
11. Compare CNMS and CUST chronology and behavior where both exist.
12. Freeze featureScope or integrationScope before proposing edits.
13. Report promotion state and mixed-ownership exceptions explicitly.
```

## 11. Rules that must not be used

The three databases disprove the following shortcuts:

- `CNMS always contains the newest implementation.`
- `If a CNMS root exists, the requested feature must be in CNMS.`
- `A CNMS Project contains only platform-owned components.`
- `Customer-specific code is always under Customer\<name>`.
- `PlatformProjects contains only final Product Projects.`
- `Project::Module is the implementation definition.`
- `Same or similar names prove the same feature/version.`
- `No exact name overlap means no semantic relationship.`
- `database.path alone identifies the active database.`
- `CN_Libary and CN_Library can be normalized into one path.`

## 12. Final relationship model

```text
Generic platform
    PlatformLibrary
          ↓
China reusable features
    CN_Libary\Package
          ↓
CNMS platform assemblies and variants
    CN_Libary\CNMS_<platform>
          ↓
Customer/product integration
    PlatformProjects\...\Product\*Cust*
```

This downward view describes increasing integration specificity, not strict implementation ownership. At every level, exact OID ownership can point sideways or upward to another root.

The lifecycle view is:

```text
CUST first implementation
→ promotion candidate
→ CNMS mixed-ownership assembly
→ platform-owned implementation
→ fully platformized feature
```

The skill must determine the current lifecycle state from evidence rather than assuming it from the directory name.
