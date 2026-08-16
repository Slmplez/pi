# Merged CHM Content

## Trouble Shooting

_Source: `markdown/TS_Trouble_Shooting.md`_

# Trouble Shooting

The Trouble Shooting section contains the following parts.

- [General Hints](markdown/TS_General_Hints.md)
- [Problems with ASCET](markdown/TS_Problems_with_ASCET.md)
- [Code Generation Messages](markdown/TS_Overview_CGM.md)


---

## General Hints

_Source: `markdown/TS_General_Hints.md`_

# General Hints

This section contains general problems that may appear during ASCET operation, together - if possible - with hints and explanations on how to solve the problems.

- [Database Size Limit](markdown/Limit_Size_Database.md)
- [Conversion of Database](markdown/Conversion_of_Database.md)
- [Problems with Graphics Cards](markdown/Problems_Graphics_Cards.md)
- [The Offline Experiment Runs Out of Time](markdown/Offline_Experiment_Runs_Out_Time.md)
- [Unpredictable Effects](markdown/Unpredictable_Effects_when_Using_Complex_Assignments.md)
- [External Experiment Target Problems](markdown/Problems_External_Experiment_Target.md)
- [Busy ASCET](markdown/Busy_ASCET.md)
- [Black Icons in ASCET](markdown/TS_Black_Icons_in_ASCET.md)


---

## Database Size Limit

_Source: `markdown/Limit_Size_Database.md`_

# Database Size Limit

Limit of the size of a database

The size of an ASCET database is limited to approximately. 3.5 GByte, the size of a single object to 128 MByte. Be careful not to reach this limit when working with a large database, because when the limit is exceeded the database will be destroyed. Use the database tools to compact your database when necessary.

See also

[Component Manager - Database Maintenance Routines](ComponentManagerEnglishUS.chm::/CM_Database_Maintenance_Routines.htm)

[Component Manager - Optimizing a Database](ComponentManagerEnglishUS.chm::/Optimize.htm)


---

## Conversion of Database

_Source: `markdown/Conversion_of_Database.md`_

# Conversion of Database

Conversion of databases

Databases that have been created with ASCET-SD V4.0 or later are automatically converted to the current ASCET version. Note that the converted database cannot be used with older versions of ASCET. A backup copy of the old database is created automatically during conversion. See [Converting a Database from ASCET-SD 4.0 or Later](ComponentManagerEnglishUS.chm::/Convert4.1.htm) for details.

Databases created with ASCET-SD prior to 4.0 cannot be opened with the current ASCET version. See [Converting a Database from ASCET-SD prior to V4.0](ComponentManagerEnglishUS.chm::/Convertdatabase.htm) for a possible workaround.

ASCET supports only ANSI C compliant names. To ensure compatibility, you have to adjust the names of all items in the database using the built-in conversion tool. In the Component Manager, open the Tools menu, point to Database, then point to Convert and select All Names To ANSI C to convert the names of all items.


---

## Problems with Graphics Cards

_Source: `markdown/Problems_Graphics_Cards.md`_

# Problems with Graphics Cards

Problems with graphics cards

When problems with the displaying of ASCET windows appear, there is probably an incompatibility between ASCET, the graphics card and the graphics cards driver. When such problems occur, either try the most recent driver for your graphics card (which is usually available on the Internet from the card manufacturer) or try another resolution of your card. All standard VGA and SVGAmodi should generally work.


---

## The Offline Experiment Runs Out of Time

_Source: `markdown/Offline_Experiment_Runs_Out_Time.md`_

# The Offline Experiment Runs Out of Time

The offline experiment runs out of time

The time (dT) for offline experiments has a limitation of approx. 3 days (in units of dT), i.e. if the dT is set very high (for instance 1000 seconds), the offline experiment will crash after a few minutes.


---

## Unpredictable Effects

_Source: `markdown/Unpredictable_Effects_when_Using_Complex_Assignments.md`_

# Unpredictable Effects

Unpredictable effects when using complex assignments

Unpredictable effects with the measuring of complex elements occur when complex assignments are executed in the model. A complex assignment is represented by an assignment of the respective pointers of the complex elements, that is, both objects are identical afterwards and one object is lost. E.g. in the assignment A=B, the element A becomes the element B. The measurement and calibration system however still refers to both as separate objects. You can measure and calibrate the ’lost’ object (here object A) but this has no effect and does not take into account the object that represents the complex element after the assignments (i.e. object B).


---

## External Experiment Target Problems

_Source: `markdown/Problems_External_Experiment_Target.md`_

# External Experiment Target Problems

Problems with external experiment targets

A potential source of errors when using the Centronics link cable is that the speed of the parallel port may be too fast for the Centronics link cable (esp. when using a Pentium 200 or higher). Here it is advisable to reconfigure the parallel port in the setup of the computer BIOS.


---

## Busy ASCET

_Source: `markdown/Busy_ASCET.md`_

# Busy ASCET

Busy ASCET

While ASCET is busy (e.g. generating code, committing to the database/workspace), do not try to invoke other functions in ASCET, but wait until the current action of ASCET is finished. Otherwise, the system behavior of ASCET may lead to unexpected errors (e.g. system errors).


---

## Black Icons in ASCET

_Source: `markdown/TS_Black_Icons_in_ASCET.md`_

# Black Icons in ASCET

The icons in the ASCET user interface turn black.

When the graphic modus of the PC or notebook is changed while ASCET is running, it can happen that the icons in the ASCET user interface turn black. With certain ASCET add-ons, even a system error can occur.

Therefore, it is not allowed to change the graphic mode of the PC or notebook while ASCET is running.

Some actions change the graphic modus automatically, among them the activation or usage of a secondary graphic output (e.g., a second monitor). Currently, no solution or workaround exists for these cases.


---

## Problems with ASCET

_Source: `markdown/TS_Problems_with_ASCET.md`_

# Problems with ASCET

This section contains more problems that may appear during ASCET operation, together - if possible - with hints and explanations on how to solve the problems.

- [Experiments Do Not Run](markdown/Some_ASCET_Experiments_do_not_End_or_do_not_Run_Properly.md)
- [Compilation Returns Unexplainable Error Messages](markdown/TS_CompilationReturnsUnexplainableErrorMessages_or_DoesNotEnd.md)
- [Does not Compute Correctly When Using Temporary Variables](markdown/ASCET_does_not_compute_correctly_when_using_temporary_variables.md)
- [L1-Communication Errors during Online Experiments](markdown/TS_L1CommunicationErrors_occur_during_OnlineExperiments.md)
- [Documentation Generation](markdown/TS_DocumentationGeneration_RTFformat_does_not_work_properly.md)


---

## Experiments Do Not Run

_Source: `markdown/Some_ASCET_Experiments_do_not_End_or_do_not_Run_Properly.md`_

# Experiments Do Not Run

Some ASCET experiments do not end or not run properly

Here the problem often lies with the C code that has been integrated into an ASCET model. Potential errors are wrong passing of parameters (when converting the ASCET type continuous the C type double float should be chosen), and infinite loops in the C code. Infinite loops may also occur in recursive object structures. A possible way to find the error here, is to exclude the C code components.

The generated code may not run in the scheduled time frame, i.e. its execution time is too long. Here either the specification must be changed, or a time frame with a longer interval should be assigned.

Another source of errors in this field is that sequence calls are not set properly or are simply forgotten.


---

## Compilation Returns Unexplainable Error Messages

_Source: `markdown/TS_CompilationReturnsUnexplainableErrorMessages_or_DoesNotEnd.md`_

# Compilation Returns Unexplainable Error Messages

The compilation returns unexplainable error messages or does not end

If you click into another window during compilation the priority for the DOS-box where the compilation takes place is decreased dramatically, so that the compilation comes to an almost complete stop. In that case you can activate the DOS-box by double clicking on its icon.

Additionally you should avoid the following keywords, which are used by the error management system to trace back compiler errors to the ASCET model: Error, ERROR, Serious, Fatal, illegal, Failed, failed, warning, known format.


---

## Does not Compute Correctly When Using Temporary Variables

_Source: `markdown/ASCET_does_not_compute_correctly_when_using_temporary_variables.md`_

# Does not Compute Correctly When Using Temporary Variables

[Temporary variables](IntroductionEnglishUS.chm::/INT_temporary_variables.htm) are deprecated; they will be removed in a future ASCET version. ASCET does not compute correctly when using temporary variables

In block diagrams, temporary variables can be used if the result of an expression is to be used in several different branches. These temporary variables are only computed once (upon evaluation of the first branch). If the branches using the temporary variable are only computed conditionally (e.g. as they are input to a switch or a MUX operator), the value of that temporary variable may not be computed correctly. Therefore automatic temporary variables should not be used, if the branches leading from a temporary variable are fed into a conditional operator.

Consider using [common subexpression elimination](ProjectEditorEnglishUS.chm::/CodeOptimization.htm#CommonSubexpr) instead.

See also

[Temporary Variables](IntroductionEnglishUS.chm::/INT_temporary_variables.htm)

[Project Properties Window - Optimization Node](ProjectEditorEnglishUS.chm::/CodeOptimization.htm)


---

## L1-Communication Errors during Online Experiments

_Source: `markdown/TS_L1CommunicationErrors_occur_during_OnlineExperiments.md`_

# L1-Communication Errors during Online Experiments

L1-Communication Errors often occur during online experiments

In this case the priority of the communication process is too low. The priority of this process can be raised for the target in the file es1130cp.inv, es1130cp_gnu.inv or es1135cp_gnu.inv in the respective target directory. The file you have to edit depends on your target/compiler combination.

This file is used in the configuration of the compiler. Here you can modify the priority of the communication process by setting the parameter __L1_Prio = to the desired priority (by default it has the lowest priority, i.e. 0).


---

## Documentation Generation

_Source: `markdown/TS_DocumentationGeneration_RTFformat_does_not_work_properly.md`_

# Documentation Generation

The documentation generation in .rtf format does not work properly.

When displaying .rtf files, Word for Windows may not display the integrated bitmap image files. You may have to update all links to (external) *.gif files to view the images.


---

## Code Generation Messages

_Source: `markdown/TS_Overview_CGM.md`_

# Code Generation Messages - Overview

This section contains warnings and error messages that may appear during ASCET code generation, together with hints and explanations on how to correct the mistakes that led to the error. Error messages point to serious faults in the specification that lead to the code generation process to be terminated. Warnings point to less serious faults. The code generation process may be successful, but the resulting code may not work as desired.


---

## Method Must Be Defined

_Source: `markdown/Error_Messages_1.md`_

# Method Must Be Defined

Method <method_name> must be defined; need a return value

##### Description:

A method with return value has been declared in the component, but the return value does not have a sequence call attached to it. This is required, because the method might be called by other components.

##### Solution:

Edit the sequence call and select the method the return value belongs to as the sequence name. The sequence number must be the highest number attached to that method.


---

## Method Has No Argument

_Source: `markdown/Method_Has_No_Argument.md`_

# Method Has No Argument

<method_name> has no argument <argument_name>

##### Description:

An operation attached to the method method_name uses an argument belonging to another method. A method may only use the local and global elements and its arguments, but not the arguments of other methods.

##### Solution:

Change the sequence call or replace the argument with another element.


---

## Missing Argument Connection for Method

_Source: `markdown/Error_Message_2.md`_

# Missing Argument Connection for Method

Missing argument connection for method <method_name> at block <block_name>

##### Description:

At the block block_name the method method_name is called, but not all arguments are connected, i.e. one of the arguments is missing. In the case of an operator, the method name is left blank.

##### Solution:

Connect the missing arguments, or in the case of an operator, choose an operator with the appropriate number of arguments.


---

## Double Sequence Number

_Source: `markdown/Double_Sequence_Number.md`_

# Double Sequence Number

Double sequence number <sequence_number> for <name>

##### Description:

The process, method, action, or condition name has two sequence calls attached to it with the same sequence number sequence_number.

##### Solution:

Change one of the sequence numbers to a sequence number not yet used in <name>.


---

## Return Value Does not Belong to <name>

_Source: `markdown/Return_Value_Does_not_Belong_Name.md`_

# Return Value Does Not Belong to <name>

Return value does not belong to <name>

##### Description:

A return value of some method or condition is assigned a sequence call belonging to a method or action name, which has no return value. The sequence call of a return value must always be assigned to the method or condition defining that return value.

##### Solution:

Change the sequence name of the sequence call of the return value to the name of the condition or method the return value belongs to.


---

## Loop Detected at Block

_Source: `markdown/Loop_Detected_at_Block.md`_

# Loop Detected at Block

Delay-free loop detected at <block_name> block

##### Description:

A loop is created without any operation in that loop, e.g. the return value of an operator is directly fed in as an input to that operator.

##### Solution:

Insert an element into the loop.


---

## Type Mismatch

_Source: `markdown/Type_Mismatch.md`_

# Type Mismatch

Type mismatch: expected <type_A>, got <type_B>

##### Description:

An argument of type_B is used where an argument of type_A is required, and the type_B can not be cast to type_A. E.g. an argument of type cont is fed into a logical operator. Presumably the connection is wrong.

##### Solution:

Supply an argument of the correct type.


---

## Element Name Type Mismatch

_Source: `markdown/TS_Type_Mismatch_Name.md`_

# Element Name Type Mismatch

Type mismatch: expected <type_A> [<name_A>], got <type_B> [<name_B>]

##### Description:

An element with name name_B of type_B is assigned to a variable with name name_A of type type_A where type_B can not be cast to type_A. E.g. an element of type cont is assigned a variable of type logical. Presumably the connection is wrong.

##### Solution:

Change the type of the element or make a correct connection.


---

## Return Must Be the Last Operation

_Source: `markdown/TS_Last_Operation_.md`_

# Return Must Be the Last Operation

last operation of <name> must be return statement

##### Description:

A method with a return value or condition name has a return statement whose sequence call does not have the highest sequence number in sequence calls attached to the method or condition.

##### Solution:

Change the sequence number in the sequence call to the highest number in all sequence calls belonging to the method or condition name.


---

## Specification of IF Block

_Source: `markdown/TS_Specification_of_IF_BLock.md`_

# Specification of IF Block

<then> part of IF block must be specified

##### Description:

An IF block is used where THEN part is not used.

##### Solution:

Specify the THEN part. There must be at least one sequence call with a connector attached to the THEN part.


---

## State Machine Needs Start State

_Source: `markdown/TS_Start_State_Needed_to_State_Machine.md`_

# State Machine Needs Start State

<state machine> needs start state

##### Description:

The state machine has no start state.

##### Solution:

Specify one of the states of the state machine as its start state.


---

## Multiple Prio for Trigger

_Source: `markdown/TS_Multiple_Prior_for_Trigger.md`_

# Multiple Prio for Trigger

Multiple prio <priority_number> for trigger <trigger_name> in state <state_name>

##### Description:

The state machine contains two transitions leading from state state_name attached to the same trigger trigger_name with the same priority priority_number. This is not allowed, since the transition is not unique.

##### Solution:

Change one of the priorities, such that all priorities leading from the same state and assigned to the same trigger are different.

See also

[State Machine Editor - Assigning Triggers, Priorities, Conditions and Actions to a Transition](StateMachineEditorEnglishUS.chm::/SM_AssignTriggers.htm)


---

## Unbalanced Number

_Source: `markdown/TS_Unbalanced_Number.md`_

# Unbalanced Number

Unbalanced number of start/stop atomic in <name>

##### Description:

The method, process, condition or action name has sequence calls with attached atomic marks. However, there is an unbalanced number of start and stop marks.

##### Solution:

Insert or delete some of the start or stop marks, such that their number and appearance is balanced.


---

## Method Not Defined as Public in Class

_Source: `markdown/TS_Method_Not_Defined_as_Public.md`_

# Method Not Defined as Public in Class

method <Element_name>/<function_name> not defined as public in class <Class_name>

##### Description:

The element / function in the class <Class_name> has not been set for direct access/ made public.

##### Solution:

Enable direct access (Set/Get functionality) for the element or make the function public.


---

## Name Not Defined

_Source: `markdown/TS_NameNotDefined.md`_

# Name Not Defined

<name> not defined

##### Description:

The method, process, or action has been declared, but was not defined. There is no sequence call with sequence name name. This only relates to methods without return values.

##### Solution:

Define the method, process or action or delete its declaration from the component interface.


---

## Type Mismatch

_Source: `markdown/TS_Type_Mismatch_with_Casting.md`_

# Type Mismatch

Type mismatch with casting from <type_B> [<name_B>], got <type_A> [<name_A>]

Description:

An element with name name_B of type type_B is assigned to a variable with name name_A of type type_A where a type cast is made from type_B to type_A. E.g. an element of type cont is assigned a variable of type sdisc.

Solution:

Change the type of the element or make a correct connection.


---

## Argument Method Not Used

_Source: `markdown/TS_Argument_of_Method_Not_Used.md`_

# Argument Method Not Used

Argument <argument_name> of method <method_name> not used

##### Description:

In the definition of the method method_name the argument argument_name of the method is not used.

##### Solution:

Use the argument argument_name in the definition of the method or delete it from the method definition.


---

## Unreachable State

_Source: `markdown/TS_Unreachable_State.md`_

# Unreachable State

Unreachable state <state_name>

##### Description:

The state machine contains a state with name state_name that can not be reached from the start state, i.e. no transition leads to that state.

##### Solution:

Delete the state or make the state reachable from the start state.


---

## Literal Value Does Not Fit Type

_Source: `markdown/TS_Literal_Value_Does_Not_Fit_Type.md`_

# Literal Value Does Not Fit Type

Literal value <value> does not fit type <type> - limited to <range_value>

##### Description:

The value of the literal is too large for the variable of type <type> it is assigned to. The value of the literal for this assignment is automatically limited to the value <range_value>. This does not apply to expressions consisting of literals only. The type <type> is either udisc or sdisc.


---

## Need Binding for Imported Element

_Source: `markdown/TS_NeedBinding_for_ImportedElement.md`_

# Need Binding for Imported Element

Need binding for imported element <element_name>

##### Description:

The imported element or message element_name is not bound to a global element or message.

##### Solution:

Adjust the binding (either automatically or manually).


---

## Missing Application Modes

_Source: `markdown/TS_Application_Modes_Missing.md`_

# Missing Application Modes

Application modes missing for task <task_name>

##### Description:

The task task_name has no application mode assigned to it.

##### Solution:

Assign an application mode, or delete the task task_name. To exclude certain tasks from execution, simply specify an additional application mode with name unused and assign it to the tasks that are to be excluded.


---

## Start Application Mode Not Specified

_Source: `markdown/TS_Application_Mode_Not_Specified.md`_

# Start Application Mode Not Specified

No start application mode specified - using <opmode_name>

Description:

None of the application modes is defined as the start mode. The application mode opmode_name is automatically defined as the start mode.

Solution:

Define one of the application modes as the start mode, unless the right mode has been picked as the default.

See also

[Project Editor - Application Modes](ProjectEditorEnglishUS.chm::/PE_applicationmodes.htm)


---

## Missing Trigger Event

_Source: `markdown/TS_Missing_Trigger_Event.md`_

# Missing Trigger Event

Missing trigger event

##### Description:

One of the event tasks specified in the operating system has no trigger event assigned to it.

##### Solution:

Change the mode of that task or assign one of the trigger events to that task.


---

## Integer Interval too Large

_Source: `markdown/TS_Integer_Interval_of_Variable.md`_

# Integer Interval too Large

Integer interval [a,b] of <name> too large for implementation type

Description:

The integer interval [a,b] derived from the model interval is too large for the chosen implementation type. Presumably, the implementation for this element has not been edited or the implementation type is not set to an integer type.

Solution:

Edit the implementation for the element <name>.


---

## Fixed-Point Code for Non-Linear Formula

_Source: `markdown/TS_FixedPointCode_for_NonLinearFormula.md`_

# Fixed-Point Code for Non-Linear Formula

Cannot generate fixed point code for the non-linear formula <formula_name> of <name>

##### Description:

The non-linear formula formula_name is assigned to name. The fixed point code generation only supports linear formulas.

##### Solution:

Change the formula assigned to name or change the formula formula_name, so that it is a linear formula.


---

## Physical Interval of Divisor Contains 0

_Source: `markdown/TS_Physical_Interval_of_Divisor.md`_

# Physical Interval of Divisor Contains 0

Physical interval [a,b] of divisor contains zero

##### Description:

Fixed point code can not be generated, because a division by zero could occur. This would result in an implementation interval of infinite size.

##### Solution:

Insert a variable for the divisor and specify a meaningful implementation for it (the physical interval should not contain zero).


---

## Formula in Implementation Not Known

_Source: `markdown/TS_Formula_in_Implementation_unknown.md`_

# Formula in Implementation Not Known

Formula in implementation for <name> not known in current project - using default

##### Description:

In the implementation for the element name the formula is not known in the context of the current project. Presumably, no formula has been assigned. The identity formula is used instead.

##### Solution:

Use a valid formula from the context of the current project for the implementation for the element name.


---

## Interval Mismatch in Assignment

_Source: `markdown/TS_IntervalMismatch_in_Assignment.md`_

# Interval Mismatch in Assignment

Interval mismatch in assignment of <variable_name>: [a,b] := [c,d] (will be limited)

##### Description:

The fixed point code generator has found, that in the assignment of variable variable_name there is a possible conflict. The value of the expression that is assigned to the variable lies within the interval [c,d]. This interval is computed via interval arithmetics from the intervals specified for the elements in that expression. The interval [a,b] for the variable variable_name does not, however, include the interval [c,d], so that an overflow might occur. To avoid this overflow, the value of the expression is automatically limited to the value interval of variable variable_name before the assignment is carried out. Note, that this warning cannot be avoided when there are arithmetic loops.


---

