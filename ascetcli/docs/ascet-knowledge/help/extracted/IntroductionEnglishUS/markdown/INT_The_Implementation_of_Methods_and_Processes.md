# The Implementation of Methods and Processes

The facilities for using implementations allow for method implementations to be specified. Method and process implementations are available in both ESDL and block diagrams.

The implementation of a method or process contains information the memory to be used for running a method or process and whether it should be fully expanded during code generation.

In general, algorithms that should have a short response time or are used more often, will be run in internal memory, whereas other algorithms that are not used very often, such as initialization algorithms, will run in external memory

In addition, method and process calls can either be represented as function calls or fully expanded in generated code (inlining).
