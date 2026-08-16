# Surface and Signal Flow Routing

Match reads to the exact ASCET surface:

- BDE candidate: use `ascet_search.search` with `comp` only when discovery is required, then `ascet_read.read_block_diagram`.
- ESDL or C target: use `ascet_read.read_code`.
- Method interface: use `ascet_read.read_method_signature`.
- implementation metadata: use `ascet_read.read_implementation`.
- StateMachine control flow: use `ascet_read.read_state_machine_flow`.
- exact Element metadata: use `ascet_read.read_element`.

Search does not return a complete BDE or code body. An empty diagram payload does not prove the Component is absent. Do not read Method code from a BDE-only Component, and do not use a block-diagram read for code text.

Trace `source → transform → consumer` only as far as needed to choose the safe modification point. A signal name alone does not prove identity or ownership. Expand complete Signal Flow only when source, transformation, consumer, scheduling, mapping, or ownership can change the implementation decision.
