# Example 1: Code Generation

In the first example, the transition from the inner state Start to OuterEnd has a higher priority than the transition from Start to InnerState1. This means that code can be generated both with activated and deactivated Optimize Static Actions (Restricted Modeling) option.

![](optimizeHierState_1.gif)

The following table shows an extract of the generated C code (ANSI-C target, Object Based Controller Physical) for both cases. Code for the static action of HState is set in boldface.

| Column 1 | Column 2 |
| --- | --- |
| Option deactivated | Option activated |
| switch (_sm) { case InnerState1: if (_x == 3.0F) { _x = _x + 1.0F; _sm = Start; break; } _x = _x + 1.0F; break; case OuterEnd: break; case Start: default: if (_x == 1.0F) { _x = _x * 3.0F; _sm = OuterEnd; break; } if (_x == 2.0F) { _x = _x * 3.0F; _x = _x + 1.0F; _sm = InnerState1; break; } _x = _x * 2.0F; _x = _x + 1.0F; break; } | switch (_sm) { case InnerState1: _x = _x + 1.0F; if (_x == 3.0F) { _sm = Start; break; } break; case OuterEnd: break; case Start: default: if (_x == 1.0F) { _x = _x * 3.0F; _sm = OuterEnd; break; } _x = _x + 1.0F; if (_x == 2.0F) { _x = _x * 3.0F; _sm = InnerState1; break; } _x = _x * 2.0F; break; } |
