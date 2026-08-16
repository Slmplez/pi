# ASCET Search CLI

`AscetSearch.exe` wraps the ten native Component Manager **Search** menu operations. It does not call `AscetReadTextCode`, traverse database components, build a custom index, or use OCR.

## Build

```powershell
powershell -ExecutionPolicy Bypass -File .\ascetcli\scripts\build-ascet-search.ps1
```

Output:

```text
ascetcli\output\ascet-search\AscetSearch.exe
ascetcli\output\ascet-search\Ascetapidll\Etas.AscetNET.dll
```

ASCET 6.1.5 must be running with one database open.

## Commands

```powershell
AscetSearch.exe types
AscetSearch.exe element PCA_Ctrl_slMin_RA
AscetSearch.exe element-ref PCA_Ctrl_slMin_RA
AscetSearch.exe text VLC3IsInControl -n 20
```

Default output is compact JSON. Options:

- `-n <max>`: maximum returned items; `0` returns all. Default: `100`.
- `-t <ms>`: queue and asynchronous Search timeout. Default: `300000`.
- -k: show and keep the native result window. By default the window is hidden and closed after reading.
- -p: plain-text output.

## Modes

| Mode | Native Search menu item | Native selector |
|---|---|---|
| `comp` | Components | `browseItemsParentWindow:browseString:` |
| `comp-ref` | References to component | `browseReferencesToItemParentWindow:browseString:` |
| `method` | Declarations of method/process | `browseMethodsParentWindow:browseString:` |
| `method-ref` | References to method/process | `browseSendersOfMethodParentWindow:browseString:` |
| `method-element` | Declarations of method/process element | `browseMethodElementsParentWindow:browseString:` |
| `element` | Declarations of element | `browseDefinerOfElementParentWindow:browseString:` |
| `element-ref` | References to element | `browseUserOfElementParentWindow:browseString:` |
| `sender` | Senders of message | `browseSenderOfMessageParentWindow:browseString:` |
| `receiver` | Receivers of message | `browseReceiverOfMessageParentWindow:browseString:` |
| `text` | Text in ESDL or C code | `menuFind` and `findNextButtonActivate` |

## JSON

Browse result:

```json
{
  "ok": true,
  "mode": "element-ref",
  "q": "PCA_Ctrl_slMin_RA",
  "ui": true,
  "count": 2,
  "items": [
    "PCA_Ctrl_slMin_RA::1D[cont->cont] - WheelControl_VD20 (...)"
  ],
  "ms": 848,
  "waitMs": 4,
  "more": true
}
```

Text result:

```json
{
  "ok": true,
  "mode": "text",
  "q": "VLC3IsInControl",
  "ui": true,
  "count": 26,
  "items": [
    {
      "component": "ADC_CSMEnaServWoABS",
      "symbol": "calc (AbsStabilizationAvailable::log;VLC3IsInControl::log)",
      "line": 1,
      "code": "if(AbsStabilizationAvailable && VLC3IsInControl)",
      "span": [1, 1]
    }
  ],
  "ms": 13703,
  "waitMs": 4,
  "more": true
}
```

`count` is the total result count. `items` is limited by `-n`. `more` is emitted only when results were truncated.

## Concurrency

Concurrent CLI processes are supported. A named Windows mutex serializes the complete Search transaction per ASCET PID:

```text
capture native window state
→ invoke Search
→ read native result model
→ release mutex
```

waitMs reports time spent waiting for another Search call. Direct parallel ToolAPI/UI operations against the same ASCET instance are not used.

The native Search window is still created internally because this is a UI API. Default mode hides it immediately and closes it after reading; -k keeps it visible.

## Compatibility

The documented Tool-API cannot set every Search type/query or read structured Search results. This CLI therefore uses internal ASCET 6.1.5 Cebra classes. Selectors and `instVarAt:` indexes must be revalidated for other ASCET versions.

