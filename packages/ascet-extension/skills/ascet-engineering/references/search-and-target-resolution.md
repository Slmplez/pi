# Search and Target Resolution

Use Search only for candidate discovery. Exact validated targets skip Search, but still require any exact read needed for a decision or mutation.

Discovery-only requests may stop after `ascet_search.search`; report candidates, `count`, and truncation without reading every item. Search results are candidates, not complete metadata or proof of identity, ownership, editability, impact, or absence. Never pass a Search candidate directly to an edit action.

## Supported modes

| Mode | Use | Exact validation when required |
|---|---|---|
| `comp` | Component declarations | `ascet_read.read` or the matching surface read |
| `comp-ref` | Component references | Read the exact referenced Component |
| `method` | Method or Process declarations | `ascet_read.read_code` or `ascet_read.read_method_signature` |
| `method-ref` | Method or Process references | Read the exact caller |
| `method-element` | Method Element declarations | Resolve the owner and read the exact Element |
| `element` | Element declarations | `ascet_read.read_element` |
| `element-ref` | Element use locations | Read the exact owning Component |
| `sender` | Message senders | Validate the sender and owner |
| `receiver` | Message receivers | Validate the receiver and owner |
| `text` | ESDL or C text locations | `ascet_read.read_code` |

Text candidates require `ascet_read.read_code` before code conclusions or edits. Element candidates require `ascet_read.read_element` before metadata conclusions or edits. Resolve other candidates with the matching exact `ascet_read` action defined by the active Tool contract.

## Choosing `q` for `mode=text`

Do not default to broad text queries such as `slope`, `AVH`, `state`, or `request`. These generic domain words can match many unrelated code locations and produce a high native `count` or truncated results.

Prefer a complete identifier such as `AVHActivationByBrakePedal` or `TargetStateAvh`, a full signal name or full Parameter name. When the exact identifier is unknown, use the longest stable, distinguishing fragment already supported by the request or live evidence; do not substitute a natural-language description.

Inspect `count`, `items`, and `more`. If the result remains broad or truncated, refine `q` before opening candidate code. Do not conclude from the first match, and do not issue several unchanged broad queries when one more-specific identifier can resolve the target.

`count` is the native total match count, `items` is limited by the request, and `more=true` means the returned list is truncated. A text item is a location hint, not a complete body. Do not select the first same-name item. A zero result does not prove global absence when mode, query, scope, or truncation may be wrong. Use the fewest bounded Search calls that resolve the unknown; do not repeat an unchanged query without new evidence.
