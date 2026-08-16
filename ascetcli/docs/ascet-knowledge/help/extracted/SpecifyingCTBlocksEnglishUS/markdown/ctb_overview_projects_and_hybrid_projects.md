# Overview - Projects and Hybrid Projects

Projects are used for:

- Online simulation (hardware-in-the-loop) of CT blocks and Standard ASCET blocks
- Continuous time modeling of several CT structures with different integration algorithms and step sizes in a project
- Simulation of CT blocks in real-time

A project can consist of standard or/and continuous time modules or structures. A hybrid project is a project that contains both standard ASCET blocks and continuous time components. For example, in the hardware-in-the-loop simulation, the sending, receiving, and processing of signals from the real process (that is simulated by continuous time structures) are usually processed by standard modules.

When modeling and simulating systems with very fast and very slow components, e.g., hydraulic and mechanical components, the computing time can be reduced by using different integration methods or different integration steps. For this purpose, the respective model parts have to be located in a CT basic block or CT structure block, as appropriate.

The various CT model parts are loaded into a project and connected with each other in the Block Diagram Editor. In a project, each CT model part (CT basic block or CT structure block) can be computed as an independent process using a separate integration method and integration step size. It should be noted, however, that the individual blocks are linked to different tasks that communicate with each other only in fixed, selectable time intervals dT.

There is no exchange of values for intermediate steps of the integration method as is the case for coupling CT blocks with CT structures. There is also no automatic semantic verification as for CT structures that determines the computing sequence for the integration. The above applies only to CT blocks/structure at the project level. CT blocks and CT structures within the CT structures communicate at the granularity of the integration step size, of course, also within projects.

To ensure numeric stability, strongly cohesive systems should, therefore, not be coupled at the project level but within CT structures. Systems with weak cohesion can, however, be structured in projects. The advantage for weakly cohesive systems with highly disparate dynamic properties is that the integration method and integration step size can be selected individually to achieve an optimal computing time.

The figure below schematically shows a project composed of one discrete standard block and two different CT structure blocks.

![](9908ct_Projekt.bmp)

A hybrid project (e.g., for the ECU test automation) combines a controller model (Standard ASCET block) with a control system model (continuous CT structure blocks). The continuous time model part is itself composed of two CT structure blocks with different integration methods and different step sizes. The communication between the CT blocks takes place at 2 msec intervals while the CT blocks communicate with the discrete standard block every 10 msec.

See also

[Combining Continuous Time Blocks With Modules](CTB_Combining_Continuous_Time_Blocks_With_Modules.md)
