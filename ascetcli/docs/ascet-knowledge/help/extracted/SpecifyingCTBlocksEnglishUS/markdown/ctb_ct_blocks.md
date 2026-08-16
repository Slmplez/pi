# CT Blocks

The comprehensive capabilities of ASCET are utilized to model discrete systems for the functional development of controller software and for the simulation of control units. In contrast, the control system associated with the control unit represents a continuous time physical system that is described by differential equations.

Examples for continuous time systems are the drive train or the wheel suspension of vehicles (mechanical system), the combustion process in the cylinder chamber (thermodynamic system), the brake circuit of a vehicle (hydraulic or pneumatic system), and the vehicle battery (electric or electrochemical system). In addition, there are increasingly also mechatronic systems in which, e.g., the mechanics of an actuator is connected with a local electronic control, or an intelligent sensor processes the physical signal electronically.

ASCET supports the model design and simulation of such continuous time systems by means of so-called CT blocks. CT stands for Continuous Time and refers to elements that are modeled or calculated in quasi-continuous time increments. The continuous time modeling in ASCET is based on state space representation, the standard description form in the design of continuous time systems. This representation \ allows the description of CT basic blocks by nonlinear ordinary first-order differential equations and nonlinear output equations. ASCET provides several real-time integration methods to solve these differential equations efficiently.

The continuous time model can be structured in modular and hierarchical blocks. Continuous time models can be combined by ASCET controller specifications to create combined models, so-called hybrid projects. These hybrid projects can be used to test a controller specification against a model of the actual technical processes that need to be controlled.

The model and the simulation experiment are strictly separate; a model contains the modular and hierarchical system description while an experiment contains the selected data set, the integration algorithm, and the selected visualization configuration including an input method for parameters. The results are accurate, reusable models and high flexibility. At the experiment level, each model variable can be flexibly altered and measured. The chosen integration step size and the integration algorithm can be changed during the simulation, without any time-consuming recompilation of the model or the current experiment.

See also

[Continuous Time Basic Blocks](CTB_Overview_CT_Basic_Blocks.md)

[Summary - Basic Block Interfaces](CTB_summary.md)

[Continuous Time Structure Blocks and Graphical Hierarchies](CTB_Continuous_Time_Structure_Blocks.md)

[Block Interfaces (Structure Blocks)](CTB_Summary_Structure_Block_Interfaces.md)

[Solving Differential Equations - Integration Algorithms](ctb_overview_differential_equations_and_integration_algorithms.md)
