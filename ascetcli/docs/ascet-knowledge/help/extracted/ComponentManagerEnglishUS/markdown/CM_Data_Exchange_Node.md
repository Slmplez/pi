# Data Exchange Options

In the Data Exchange node, you set the options for data exchange. The exchange formats DCM V1.x and 2.x and data exchange with INCA and ASCET from V4 are supported.

This node contains the following fields and buttons:

##### Data File Path

Directory of the data file.

##### Extension for Output File

File extension for data exchange file.

Possible values: dcf / dcm / kon

##### DCM Format version

Determines the DCM version to be used.

Possible values: DCM V1.x / DCM V2.x

##### Write Enums

Determines whether enumerations are written in TEXT format (only for DCM V1.x).

##### Write Sampling Points

Determines whether sampling points are written in DCM V2.x syntax (only for DCM V1.x).

##### Case Sensitive Names

Specifies whether upper/lower case are taken into account.

If the option is disabled, e.g. a parameter named CONT is mapped to a parameter named Cont during import.

##### Include Booleans

Specifies whether Booleans are taken into account.

##### Include Dependent Parameters

Specifies whether dependent parameters are taken into account.

##### Boolean format

Determines the format of Booleans (only for DCM V2.x).

Possible values: true/false / Integer

##### Show Log File for Load / Show Log File for Save

Specifies whether the log file for read/write processes is displayed.

##### Log File for Load / Log File for Save

Path and name of the log files for read and write processes.
