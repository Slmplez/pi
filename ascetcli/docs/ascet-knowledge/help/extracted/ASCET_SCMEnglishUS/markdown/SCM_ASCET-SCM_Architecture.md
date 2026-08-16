# ASCET-SCM Architecture

As there are multiple tools on the market which differ in their interfaces as well as in the way they handle software versioning, ASCET-SCM is made up of different layers.

- Part of ASCET-SCM is directly integrated in the ASCET base package. This involves additional data needed for ASCET items if these are managed by SCM tools.
- To handle all activities between ASCET and SCM tools, a separate ASCET-SCM server application runs in parallel to ASCET.
- Any SCM tool specific actions are encapsulated in separate packages (called "drivers") which are loaded by the ASCET-SCM server for the corresponding SCM tool that is used in the current ASCET database or workspace.
- Each driver connects to APIs of specific SCM tools, e.g. SVN Driver connects to the command line interface offered by Subversion.

See also

[Fundamentals of Software Configuration Management](SCM_Fundamentals_of_Software_Configuration_Management.md)

[Software Version Management Systems](SCM_Software_Version_Management_Systems.md)
