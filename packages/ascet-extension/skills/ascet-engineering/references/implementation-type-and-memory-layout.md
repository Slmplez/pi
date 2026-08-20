# Implementation Type and Memory Layout

Use the active `ascet_edit.apply_element_spec` contract and C# normalization as the field authority. There is no public `impl.type` field. Ordinary Element specs use `impl.valueType`; Provider Exported and Local Dependent Parameter creation uses an `implementation` decision that is normalized before the Bridge call.

For an existing Element patch, read the exact Element when implementation metadata affects the change. Preserve its value type, memory location, Formula, ranges, and limit-assignment option unless the request explicitly changes them. Do not use `ascetDefault` to reset an existing implementation.

For a new Element, select implementation metadata only from the complete required implementation/data range, signedness, model type, required precision, code/target rules, and ownership policy. Do not select an integer width from the current value alone. Stop when those inputs do not determine one compatible representation.

## Public request forms

Ordinary Elements use `impl.valueType`, not `impl.type`:

```json
{
  "impl": {
    "valueType": "real32",
    "memoryLocation": "Default",
    "formula": "ident"
  }
}
```

`physicalRange` and `impl.implementationRange` are mutually exclusive. Send at most one: use `physicalRange` for the model/physical range, or `impl.implementationRange` for the implementation/data range. Never send both in the same request.

Imported Parameters must not provide `data`, `physicalRange`, or `impl`. Their local implementation must not be invented; use only the compatibility information required by the active Imported contract.

Provider/Local creation requires one implementation decision:

```json
{
  "implementation": {
    "mode": "explicit",
    "valueType": "uint8",
    "memoryLocation": "Default",
    "formula": "ident",
    "limitAssignments": true
  }
}
```

`implementation.mode=ascetDefault` is not an implementation type. It is allowed only for a Provider/Local creation decision when the explicit engineering decision is to let ASCET choose its default implementation:

```json
{
  "implementation": {
    "mode": "ascetDefault"
  }
}
```

When this decision is normalized, no `impl` is sent; ASCET applies its default implementation during creation. Do not use it for an existing Element patch, to reset an implementation, or to hide unknown implementation requirements. For `implementation.mode=explicit`, `valueType`, `memoryLocation`, `formula`, and `limitAssignments` are required by the active contract. An empty `formula` (`""`) explicitly means no conversion Formula; normalization omits the Formula rather than treating it as an ASCET default.

## ASCET UI type sets

Choose only from the types exposed by the relevant ASCET UI list:

- `modelType=cont`: `real64`, `real32`, `sint8`, `sint16`, `sint32`, `uint8`, `uint16`, `uint32`.
- `modelType=log`: `bit`, `bool`, `sint8`, `sint16`, `sint32`, `uint8`, `uint16`, `uint32`.

A `cont` implementation must not use `bit` or `bool`. A `log` implementation may use the logical types or an integer type from the list. Do not recommend types that are not present in the active UI list.

## Range, signedness, and precision selection

For integer implementations, use the smallest type that contains the complete required implementation/data range and matches signedness. Never use the current value as the range:

| Type | Inclusive range |
| --- | --- |
| `sint8` | `[-128, 127]` |
| `sint16` | `[-32768, 32767]` |
| `sint32` | `[-2147483648, 2147483647]` |
| `uint8` | `[0, 255]` |
| `uint16` | `[0, 65535]` |
| `uint32` | `[0, 4294967295]` |

For real implementations, choose `real32` or `real64` from the required precision and explicit target/engineering rule. A range alone cannot determine floating-point precision. Real implementations require `modelType=cont`.

The public request may use `sint8`, `sint16`, or `sint32`. The Bridge normalizes these `sint*` names to internal `int*` aliases; ASCET UI/readback may display the `sint*` label again. Compare equivalent aliases as the same type, rather than treating this normalization as a change.

## Formula, range, and limit rules

- Use `formula="ident"` for an explicit identity conversion.
- A non-identity Formula requires continuous model semantics and a non-real implementation representation.
- Real implementation representations must not use a non-identity Formula.
- A ranged discrete Parameter requires `limitAssignments=true`.
- For `real32` and `real64`, `limitAssignments` is not applicable: use `null`, or omit it where the active request shape permits omission; do not use `true`.
- For an explicit Provider/Local decision, retain the required `limitAssignments` field and set it to `null` for real implementations when the contract requires the field.

## Memory location

Use an exact live value or an explicit target/platform rule. `Default` is a concrete value, not permission to guess. If memory class, section, calibration placement, or target mapping is unclear, stop before the write.

## Verification

After apply, accept only passed automatic verification. Check normalized `impl.valueType`, memory location, Formula, the selected range field, and limit-assignment behavior when requested. Treat a changed or missing implementation field as a failed or incomplete result, not as an ASCET default assumption.
