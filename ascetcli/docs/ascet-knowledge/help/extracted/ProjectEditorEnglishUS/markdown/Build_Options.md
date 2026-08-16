# Build Node (Project Properties)

The following options are available in the Build node:

##### Target

Determines the experimental or micro-controller target. The choices available here depend on the ASCET products you have installed: The ASCET base system provides only the PC target, ASCET-RP adds the experimental targets, ASCET-SE adds the ANSI-C target, the EHOOKS target and various microcontroller targets, depending on the selections made during ASCET-SE installation.

##### Edit Target Settings

This link opens the ASCET options window in the appropriate <target>\Build subnode of the [Targets](ComponentManagerEnglishUS.chm::/CM_TargetsNode.htm) node. Use the <target> hierarchy to set target-specific options.

##### Code Generator

Determines what kind of arithmetic is used in the generated code. Available options are:

1. Physical Experiment (floating point arithmetic)
1. Quantized Physical Experiment (quantized floating point arithmetic)
1. Implementation Experiment (fixed point arithmetic)
1. Object Based Controller Implementation
1. Object Based Controller Physical

##### Edit Code Generation Settings

This link opens the Experiment Code node (for experimental targets and the PC and Prototyping targets) or Production Code node (for microcontroller targets, the ANSI-C target, and the EHOOKS target).

##### Compiler

Determines the compiler used to generate the code for the project. The list offers all compilers that can be used with the selected target.

For the EHOOKS target, no compiler can be selected.

##### Edit Compiler Settings

This link opens the ASCET options window. In that window, use the appropriate subnode of the Compiler node to set the compiler path (see [Compiler Options](ComponentManagerEnglishUS.chm::/cm_compiler_options.htm)).

##### Operating System

Determines the operating system of the current target. The available selections depend on the selected target.

<table class="hcp1" x-use-null-cells="">
<col/>
<col/>
<col/>
<col/>
<col/>
<col/>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="2">
<p class="tableheadeng">Operating System</p></td>
<td class="hcp3" colspan="5" rowspan="1">
<p align="center" class="tableheadeng" style="text-align: center;">Target</p></td>
</tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p align="center" class="tableheadeng" style="text-align: center;">PC, </p>
<p align="center" class="tableheadeng" style="text-align: center;">Prototyping</p></td>
<td class="hcp3">
<p align="center" class="tableheadeng" style="text-align: Center;">ES113x</p></td>
<td class="hcp3">
<p align="center" class="tableheadeng" style="text-align: Center;">ES910, </p>
<p align="center" class="tableheadeng" style="text-align: Center;">RTPRO-PC</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tableheadeng" style="text-align: Center;">ANSI-C</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tableheadeng" style="text-align: Center;">microcontroller </p>
<p align="center" class="tableheadeng" style="text-align: Center;">targets</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tableheadeng">GENERIC</p></td>
<td class="hcp3">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp3">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p class="tabledefaulteng"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tableheadeng">ERCOSEK 4.3</p></td>
<td class="hcp3">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp3">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="1">
<p class="tableheadeng">RTA-OSEK V5.0</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="1">
<p class="tableheadeng">GENERIC-OSEK</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="1">
<p class="tableheadeng">RTE-AUTOSAR 3.0.2</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="1">
<p class="tableheadeng">RTE-AUTOSAR 3.0.4</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="1">
<p class="tableheadeng">RTE-AUTOSAR 3.1.0</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="1">
<p class="tableheadeng">RTE-AUTOSAR 3.1.2</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="1">
<p class="tableheadeng">RTE-AUTOSAR 3.1.4</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="1">
<p class="tableheadeng">RTE-AUTOSAR 3.1.5</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3" colspan="1" rowspan="1">
<p class="tableheadeng">RTE-AUTOSAR 4.0.2</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td></tr>
<tr class="hcp2" valign="top">
<td class="hcp3">
<p class="tableheadeng">RTE-AUTOSAR 4.0.3</p></td>
<td class="hcp3">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;">x</p></td>
<td class="hcp3" colspan="1" rowspan="1">
<p align="center" class="tabledefaulteng" style="text-align: center;"> </p></td></tr>
</table>

For the EHOOKS target, no operating system can be selected.

##### Edit OS Configuration

This link opens the [OS Configuration node](PE_OS_Configuration_Option.md) of the ASCET options window.

##### Generate Dependency Files

Switches the generation of make files containing the dependencies of all generated header files on (activated) or off (deactivated, default). Header files included by the user via #include statements are not taken into account. A make file is created for each generated *.c file.

##### Header Structure

Controls the header file generation when using Component menu, select File Out Generated Code. For compilation with ASCET, the modular header structure remains intact.

The following selections are available:

| Column 1 | Column 2 |
| --- | --- |
| Component | A separate header file is created for each class and each module in the project. If a module contains a class, the header information of the class is inserted in the module header file. If a class is included in several modules of the project, its header information is inserted in all module header files. |
| Module | A separate header file is created for each module in the project. |
| Project | A single header file is created for the entire project. This file contains all information from the modules and classes in the project. This header file must be included in all *.c files. |

Headers of internal and external C code classes and of the OS component are not affected by this option (exception: use header global is activated for an external C code class).

##### Banner Templates for C Files

A semicolon-separated list of banner templates that are placed at the beginning of each generated *.c file. The file names may contain the following macros:

| Column 1 | Column 2 |
| --- | --- |
| %ASCET% | product installation directory |
| %DATA% | data directory |
| %TARGETROOT% | target root directory ( %ASCET%\target ) |
| %P_TARGET% | target directory (e.g., %ASCET%\target\trg_ansi ) |

For a list of macros that can be used in the banner template file, see [Banners in the Generated Code](PE_Banners_in_GeneratedCode.md).

##### Banner Templates for H Files

A semicolon-separated list of banner templates that are placed at the beginning of each generated *.h file. The macros in the banner file names and in the banner files are the same as for the C banners.

##### Configure Code Generation Messages

This link opens the CodeGen message Configuration window. In that window, you can configure the messages from code generation and build process. For a detailed description, see [Configuring Messages in the CodeGen Message Configuration Window](ComponentManagerEnglishUS.chm::/CM_ConfigMessages_in_ConfigWindows.htm).

See also

[Integer Arithmetic Node](fixedpoint.md)

[Optimization Node](CodeOptimization.md)

[Banners in the Generated Code](PE_Banners_in_GeneratedCode.md)

[Configuring Messages in the CodeGen Message Configuration Window](ComponentManagerEnglishUS.chm::/CM_ConfigMessages_in_ConfigWindows.htm)

[Compiler Options](ComponentManagerEnglishUS.chm::/cm_compiler_options.htm)

[Targets Node](ComponentManagerEnglishUS.chm::/CM_TargetsNode.htm)
