# Specification View (C Code for CT Blocks)

The Specification view contains the following elements:

- <method name> tab

In this tab, you enter the code for the method or process body.

- Header tab

In this tab, you enter the code for the method or process body.

- Target combo box

This combo box is used to show the currently selected target that belongs to the code in the tabs, and to select a different target. The target PC is always available; more targets appear when you install ASCET-RP or ASCET-SE.

- Arithmetic combo box

This combo box is used to display the currently selected experimentation arithmetic for the component, and to select a different arithmetic. Possible values are:

| Column 1 | Column 2 |
| --- | --- |
| Physical Experiment | Floating-point arithmetic |
| Quantized Physical Experiment | Quantized floating-point arithmetic |
| Implementation Experiment | Fixed-point arithmetic |
| Object Based Controller Implementation | Fixed-point arithmetic with additional optimizations for the electronic control unit. Only for use with microcontroller targets. |

- Implementation combo box

This combo box is only available when you selected the Implementation Experiment or Object Based Controller Implementation arithmetic. It is used to display the currently selected implementation for the component, and to select a different implementation. The Impl. implementation is always available; more entries appear when you add further implementation to the component's project or default project.

- [context menu](ctb_contextmenu_specificationview.md)
