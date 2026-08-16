# Optimizing the State Machine

Usually, there are several ways to specify the same functionality or to adjust the code generation/build process settings.

When code is generated for a state machine, parts of actions and conditions specified at the state or transition are either inserted on the spot (inlining) or—on certain conditions—generated as separate methods (outlining). The prerequisites for outlining are:

1. The state machine optimization option Outline Generated Methods (may be changed locally) is activated in the Project Properties window, Statemachine node, of the project that contains the state machine.

This options applies to all state machines contained in the project, and to all experiments (physical, quantized, implemented).

1. The option Outline automatically generated methods for State Machines is activated in the implementation editor of the state machine.

When the first prerequisite is not met, outlining is not done for any state machine in the project.

When the first prerequisite is met, but not the second, outlining is not done for this particular state machine.

If both prerequisites are met, code size with and without outlining is checked during code generation. If code with outlining is smaller, outlining is done.

If actions and conditions (or parts thereof) are specified in separate diagrams, the corresponding code is either generated in separate private methods (outlining), or it is inserted on the spot automatically during code generation (auto-inlining).

The following prerequisites must be met so that auto-inlining can take place:

1. The state machine optimization option Auto-inline private methods (Smaller code-size - may be changed locally) is activated in the Project Properties window, [Statemachine](ProjectEditorEnglishUS.chm::/PE_Statemachine_Options_Window.htm) node, of the project that contains the state machine.

This options applies to all state machines contained in the project, and to all experiments (physical, quantized, implemented).

1. The option Auto-inline private methods (Smaller code-size) is activated in the implementation editor of the state machine.

When the first prerequisite is not met, auto-inlining is not done for any state machine in the project.

When the first prerequisite is met, but not the second, auto-inlining is not done for this particular state machine.

If both prerequisites are met, code size with and without auto-inlining is checked during code generation. If code with auto-inlining is smaller, auto-inlining is selected. This is usually the case for small private functions, or for functions with only a few calls. Each function is checked separately, so that only those functions are inlined whose inlining saves code size.

Depending on the possibilities you choose, you can optimize a state machine under three aspects:

- Response time
- Runtime
- Code size

See also

[Optimized for Response Time](SM_Optimized_for_Response_Time.md)

[Optimized for Run Time](SM_Optimized_for_Run_Time.md)

[Optimized for Code Size](SM_Optimized_for_Code_Size.md)

[Project Editor - Statemachine Node](ProjectEditorEnglishUS.chm::/PE_Statemachine_Options_Window.htm)
