# ESDL Editor Tasks and Workflows

These pages focus on actions, editing flows, and step-by-step tasks.

- [Overview](../raw/ESDL_Overview.md)
  Context: `ESDL Editor > Overview`
  Note: The ESDL editor is used to specify components in ESDL code. ESDL components can either be classes, modules or continuous time blocks. A class in ESDL code works in the same way as a class specified as a block diagram. When it is used by another component, it looks and behaves just like a class specified as a block diagram.
- [ESDL as a Modelling Language](../raw/esdl_esdl_as_modellinglanguage.md)
  Context: `ESDL Editor > Basics > ESDL as a Modelling Language`
  Note: ESDL was designed specifically as a modelling language for the automotive environment. In ASCET, it is used to specify the method or process bodies within classes or modules. For simplicity, classes and modules are subsumed under the term classes in this section.
- [Working with Methods and Processes](../raw/esdl_working_with_methods_and_processes.md)
  Context: `ESDL Editor > Basics > Basic Elements > Working with Methods and Processes`
  Note: The basic elements of a functional description in ESDL are methods and processes. A method/process consists of a method/process header, which servers as an identifier, and the method/process body, which describes the operations to be performed.
- [ESDL Syntax](../raw/ESDL_ESDL_Syntax.md)
  Context: `ESDL Editor > Basics > Basic Elements > ESDL Syntax`
  Note: ESDL syntax is entirely the same as that of the Java programming language. Every statement in ESDL is terminated by a semicolon (;).
- [Variable Names](../raw/ESDL_Variable_Names.md)
  Context: `ESDL Editor > Basics > Basic Elements > Variable Names`
  Note: In ESDL, variables names are made up of letters and digits. The first element of a variable name must be a letter. The underscore character counts as a letter. Variable names must not contain spaces.
- [Data Types](../raw/ESDL_Data_Types.md)
  Context: `ESDL Editor > Basics > Basic Elements > Data Types`
  Note: ESDL is strongly typed and variables must be declared. The procedure here is the same as when editing block diagrams. Variables are added to the elements list and can then be edited as needed.
- [Type Conversion](../raw/ESDL_Type_Conversion.md)
  Context: `ESDL Editor > Basics > Basic Elements > Type Conversion`
  Note: Whenever a basic arithmetic operator like +, -, *, / has operands of different types, the result is automatically converted to that of the strongest type used in the expression.
- [Primitive Methods](../raw/ESDL_Primitive_Methods.md)
  Context: `ESDL Editor > Basics > Basic Elements > Primitive Methods`
  Note: Every arithmetic type has a predefined interface which covers a set of basic math functions. The following messages are available for all arithmetic types:
- [Implementation Casts in ESDL](../raw/ESDL_Implementation_Casts_in_ESDL.md)
  Context: `ESDL Editor > Basics > Basic Elements > Implementation Casts in ESDL`
  Note: Implementation casts (see Overview - Implementation Casts) are available in ESDL for modules and classes (except CT blocks).
- [Methods](../raw/ESDL_Methods.md)
  Context: `ESDL Editor > Basics > Methods`
  Note: The functional description of a software model in ESDL is contained in methods. The methods perform calculations and manipulate data. They are invoked (or called) as operations on objects.
- [Methods with a Return Value](../raw/ESDL_Methods_with_a_Return_Value.md)
  Context: `ESDL Editor > Basics > Methods > Methods with a Return Value`
  Note: A method call can return a value, which can in turn be assigned to a variable in the method call. The variable must be of the same type as the return value.
- [Nested Methods](../raw/ESDL_Nested_Methods.md)
  Context: `ESDL Editor > Basics > Methods > Nested Methods`
  Note: Only if direct access methods are enabled for access to an object’s variable, can a method call be nested. Hence, the following nested statement is legal if aa is a variable defined in anObject:
- [This](../raw/this.md)
  Context: `ESDL Editor > Basics > Methods > This`
  Note: The pseudo-identifier this can be used in ESDL to call a method at the current component. If, for example, you want to call the private method initCounter at the current object, you can use the following statement:
- [Access Control](../raw/esdl_access_control.md)
  Context: `ESDL Editor > Basics > Methods > Access Control`
  Note: In ESDL, both the methods and variables of a class can be declared as either public or private to control access to these elements and hide their implementation from other objects.
- [Direct Access Methods](../raw/ESDL_Direct_Access_Methods.md)
  Context: `ESDL Editor > Basics > Methods > Direct Access Methods`
  Note: Every public variable automatically adds two methods to the current object’s interface, which are referred to as direct access methods. A direct access method can be called to access the data in a public variable. It can be used for both read and write access to that variable.
- [Composite Data Types](../raw/ESDL_Overview_-_Composite_Data_Types.md)
  Context: `ESDL Editor > Basics > Composite Data Types`
  Note: ESDL provides two groups of composite data types. The first group of composite types comprises common arrays and matrices, the second group is used for characteristic lines and maps.
- [Arrays](../raw/ESDL_Arrays_-_Description.md)
  Context: `ESDL Editor > Basics > Composite Data Types > Arrays`
  Note: An array is a one-dimensional, indexed set of variables which have the same data type. In ESDL, arrays are available for all basic data types. The variables are accessed through the array index, the first index position is 0.
- [Public Interface of Arrays](../raw/ESDL_Public_Interface_of_Arrays.md)
  Context: `ESDL Editor > Basics > Composite Data Types > Arrays > Public Interface of Arrays`
  Note: The table summarizes the public methods available of arrays.
- [Matrices](../raw/esdl_matrices_-_description.md)
  Context: `ESDL Editor > Basics > Composite Data Types > Matrices`
  Note: A matrix is a two-dimensional, indexed set of variables which have the same data type. In ESDL, matrices are available for all basic data types. The variables are accessed through the array indices x and y, the first index position is 0.
- [Public Interface of Matrices](../raw/ESDL_Public_Interface_of_Matrices.md)
  Context: `ESDL Editor > Basics > Composite Data Types > Matrices > Public Interface of Matrices`
  Note: The table summarizes the public methods available for matrices.
- [Characteristic Lines](../raw/ESDL_One-Dimensional_Tables_-_Description.md)
  Context: `ESDL Editor > Basics > Composite Data Types > Characteristic Lines`
  Note: Characteristic lines describe parameter values in dependence of a given set of sample points rather than using an algorithm. A characteristic line is represented as a one-dimensional table.
- [Public Interface of Characteristic Lines](../raw/ESDL_Public_Interface_of_One-Dimensional_Tables.md)
  Context: `ESDL Editor > Basics > Composite Data Types > Characteristic Lines > Public Interface of Characteristic Lines`
  Note: In ESDL, characteristic lines can only be accessed using their public interface. The table summarizes the public methods available for characteristic lines.
- [Linear Interpolation (1D)](../raw/esdl_linear_interpolation%281d%29.md)
  Context: `ESDL Editor > Basics > Composite Data Types > Characteristic Lines > Linear Interpolation (1D)`
  Note: The following example illustrates linear interpolation in characteristic lines (one-dimensional tables). It uses a table LLpr that has the following values:
- [Characteristic Maps](../raw/ESDL_Two-Dimensional_Tables_-_Description.md)
  Context: `ESDL Editor > Basics > Composite Data Types > Characteristic Maps`
  Note: Characteristic maps describe parameter values in dependence of a given set of pairs of sample points rather than using an algorithm. A characteristic map is represented as a two-dimensional table.
- [Public Interface of Characteristic Maps](../raw/ESDL_Public_Interface_of_Two-Dimensional_Tables.md)
  Context: `ESDL Editor > Basics > Composite Data Types > Characteristic Maps > Public Interface of Characteristic Maps`
  Note: In ESDL, characteristic maps can only be accessed using their public interface. The table summarizes the public methods available for characteristic maps.
- [Linear Interpolation (2D)](../raw/esdl_linear_interpolation_%282d%29.md)
  Context: `ESDL Editor > Basics > Composite Data Types > Characteristic Maps > Linear Interpolation (2D)`
  Note: The following example illustrates linear interpolation in characteristic maps (two-dimensional tables). It uses a table LLpr2 that has the following values:
- [Distributions and Group Tables](../raw/esdl_distributions_and_group_tables_-_description.md)
  Context: `ESDL Editor > Basics > Composite Data Types > Distributions and Group Tables`
  Note: Characteristic lines and maps can be related to each other by using the same set of sample points. In ASCET, such a shared set of sample point is modelled as a distribution, tables that use the sample points in a distribution are referred to as group tables.
- [Public Interface of Distributions and Group Tables](../raw/ESDL_Public_Interface_of_Distributions_and_Group_Tables.md)
  Context: `ESDL Editor > Basics > Composite Data Types > Distributions and Group Tables > Public Interface of Distributions and Group Tables`
  Note: Unlike plain tables, group tables do not have a getAt method. Instead, the public interface is "split" between the distribution, which has a search method, and the group table, which has an interpolate method.
- [Adaptive Characteristic Lines/Maps: Restrictions](../raw/ESDL_AdaptiveCharacteristic_Restrictions.md)
  Context: `ESDL Editor > Basics > Composite Data Types > Adaptive Characteristic Lines/Maps: Restrictions`
  Note: When you are using the methods provided to adapt characteristic lines and maps, several restrictions must be kept:
- [Literals and Constants](../raw/literals_and_constants.md)
  Context: `ESDL Editor > Basics > Other Definitions > Literals and Constants`
  Note: Literals are values like 12, 6.1e4 or true. Every primitive type (boolean and arithmetic), can occur as a literal in an ESDL method. The data type of literals is implicit.
- [Comments](../raw/ESDL_Comments.md)
  Context: `ESDL Editor > Basics > Other Definitions > Comments`
  Note: A comment explains the purpose of a particular piece of ESDL code. There are two types of comments, commonly referred to as single- and multi-line comment.
- [Structures](../raw/ESDL_Structures.md)
  Context: `ESDL Editor > Basics > Other Definitions > Structures`
  Note: In ESDL, structures (or records) are modelled using classes. A class can be used as a complex container element which holds any number of variables. If a variables in a class is public, it can be read and written to from ESDL using direct access methods.
- [Messages](../raw/ESDL_Messages.md)
  Context: `ESDL Editor > Basics > Other Definitions > Messages`
  Note: In ASCET, an additional concept of messages as real-time language constructs is used for interprocess communication. Messages, in this sense, are used as protected global variables in the real-time environment.
- [Resources](../raw/esdl_resources.md)
  Context: `ESDL Editor > Basics > Other Definitions > Resources`
  Note: Similar to messages, resources are available only in modules. They have two access methods, reserve and release. In ESDL, these methods can be used as shown in the following example:
- [Enumerations](../raw/ESDL_Enumerations.md)
  Context: `ESDL Editor > Basics > Other Definitions > Enumerations`
  Note: All enumerations are of the following type: [image]
- [Mathematical Functions](../raw/ESDL_Mathematical_Functions.md)
  Context: `ESDL Editor > Basics > Other Definitions > Mathematical Functions`
  Note: ASCET comes with a comprehensive library of pre-defined elements. They can be used as building block for new modules and classes.
- [Example: Access to Mathematical Functions](../raw/esdl_example__access_to_mathematical_functions.md)
  Context: `ESDL Editor > Basics > Other Definitions > Mathematical Functions > Example: Access to Mathematical Functions`
  Note: The following examples show how to access mathematical functions from an ESDL model description.
- [Mathematical Functions: Summary](../raw/ESDL_Mathematical_Functions__Summary.md)
  Context: `ESDL Editor > Basics > Other Definitions > Mathematical Functions > Mathematical Functions: Summary`
- [Operators](../raw/summary.md)
  Context: `ESDL Editor > Basics > Other Definitions > Operators`
  Note: In ESDL, method calls take precedence over all other operators. The order of precedence can be manipulated by adding parentheses to an expression.
- [Unary Operators](../raw/Unary_Operators.md)
  Context: `ESDL Editor > Basics > Other Definitions > Operators > Unary Operators`
  Note: The unary operators are +, - and ! (not), the latter is used for boolean types. In addition, the increment and decrement operators ++ and -- are available. They can be used as prefix or postfix operators.
- [Arithmetic Operators](../raw/Arithmetic_Operators.md)
  Context: `ESDL Editor > Basics > Other Definitions > Operators > Arithmetic Operators`
  Note: The four arithmetic operators +, -, * and / can be used in ESDL. The modulus operator %, which calculates the remainder of an integer division, is also available.
- [Comparison Operators](../raw/Comparison_Operators.md)
  Context: `ESDL Editor > Basics > Other Definitions > Operators > Comparison Operators`
  Note: The operators >, >=, < and <= are applied to arithmetic types and take precedence in this group.
- [Verify Operation](../raw/ESDL_VerifyOperator.md)
  Context: `ESDL Editor > Basics > Other Definitions > Operators > Verify Operation`
  Note: The verify(); operation is used to check if the original and the complement of an element marked as redundant are consistent. The operation returns a Boolean value.
- [Logical Operators](../raw/Logical_Operators.md)
  Context: `ESDL Editor > Basics > Other Definitions > Operators > Logical Operators`
  Note: The logical operators && and || (AND and OR) follow next in the order of precedence with the AND operator taking precedence over an OR.
- [Conditional Operator (MUX)](../raw/conditional_operator_mux.md)
  Context: `ESDL Editor > Basics > Other Definitions > Operators > Conditional Operator (MUX)`
  Note: The conditional operator ?: corresponds to the MUX operator in the block diagram editor. The operator has the general form (a ? n : m) where a is a boolean, n and m must be of the same type. They can be any primitive type, boolean or arithmetic.
- [Shorthand Assignment Operators](../raw/Shorthand_Assignment_Operators.md)
  Context: `ESDL Editor > Basics > Other Definitions > Operators > Shorthand Assignment Operators`
  Note: In ESDL common shorthand assignments, such as += or *= can be used. The a += 4 operation is a shorthand for the a = a + 4 assignment operation. Shorthand notation is available for the following operators:
- [Conversion Operations](../raw/ESDL_ConversionOperations.md)
  Context: `ESDL Editor > Basics > Other Definitions > Operators > Conversion Operations`
  Note: = Sint8, Sint16, Sint32, Uint8, Uint16, or Uint32
- [Examples: Conversion Operations](../raw/ESDL_Example_ConversionOperations.md)
  Context: `ESDL Editor > Basics > Other Definitions > Operators > Examples: Conversion Operations`
  Note: The conversion operations are used to convert a cont variable and use the result in an addition.
- [Assert Operation](../raw/ESDL_AssertOperation.md)
  Context: `ESDL Editor > Basics > Other Definitions > Operators > Assert Operation`
  Note: The Assert operation allows to specify a restricted interval in ESDL:
- [Example: Assert Operation](../raw/ESDL_Example_AssertOperation.md)
  Context: `ESDL Editor > Basics > Other Definitions > Operators > Example: Assert Operation`
  Note: A small ESDL example for the Assert operator has been created:
- [Control Flow](../raw/ESDL_ControlFlow_Summary.md)
  Context: `ESDL Editor > Basics > Other Definitions > Control Flow`
  Note: The control flow elements can be used to determine the order of and conditions under which an ESDL function or statement is executed. The most common types are conditional structures and loops.
- [If...Else](../raw/ifelse.md)
  Context: `ESDL Editor > Basics > Other Definitions > Control Flow > If...Else`
  Note: The if…else statement can be used for simple conditional constructions. It has the general form
- [Switch...Case...Default](../raw/switchasedefault.md)
  Context: `ESDL Editor > Basics > Other Definitions > Control Flow > Switch...Case...Default`
  Note: The switch…case…default statement or, for short, the switch statement, can be used for more complex conditional constructions. It has the general form
- [Example: Switch...Case...Default](../raw/ESDL_Example__SwitchCaseDefault.md)
  Context: `ESDL Editor > Basics > Other Definitions > Control Flow > Example: Switch...Case...Default`
  Note: The example below sets the value of a variable scont depending on the value of the limitIntArg.
- [While](../raw/while.md)
  Context: `ESDL Editor > Basics > Other Definitions > Control Flow > While`
  Note: The while loop is used to model a simple loop. It has the general form:
- [Do...While](../raw/ESDL_DoWhile.md)
  Context: `ESDL Editor > Basics > Other Definitions > Control Flow > Do...While`
  Note: The do...while loop has the general form:
- [Example: Do...While](../raw/ESDL_ExampleDoWhile.md)
  Context: `ESDL Editor > Basics > Other Definitions > Control Flow > Example: Do...While`
  Note: This is a simple example of a do...while loop:
- [For](../raw/for.md)
  Context: `ESDL Editor > Basics > Other Definitions > Control Flow > For`
  Note: The for loop stands out as one of the modelling features that are available in ESDL only. There is no equivalent in block diagrams.
- [Example: For](../raw/ESDL_Example__For.md)
  Context: `ESDL Editor > Basics > Other Definitions > Control Flow > Example: For`
  Note: The example is a simple combination of an if…else statement and a for loop:
- [Break](../raw/break.md)
  Context: `ESDL Editor > Basics > Other Definitions > Control Flow > Break`
  Note: The break statement can be used to exit immediately from each of the control elements listed above and return to another enclosing statement or to the remainder of the model.
- [Specifying Modules in ESDL](../raw/specifying_modules.md)
  Context: `ESDL Editor > Basics > Specifying Modules in ESDL`
  Note: Specifying modules in ESDL code works in the same way as specifying classes, except that processes are defined rather than methods. Furthermore, it is possible to define messages in modules. When specifying classes, the message buttons are grayed out in the ESDL editor, when specifying modules they are active.
- [Analyzing ESDL Components](../raw/ESDL_analyzing_esdl_components.md)
  Context: `ESDL Editor > Basics > Analyzing ESDL Components`
  Note: After you have created a block diagram, you will usually want to experiment with it to see whether it works as intended. The procedure is the same as for block diagrams (see Analyzing Components).
- [External Editor](../raw/external_editor.md)
  Context: `ESDL Editor > Basics > External Editor`
  Note: The editor available for creating ESDL code is limited and can only carry out simple operations. Another way of creating code is to select a user-defined external editor (e.g. Notepad, Codewright, etc.). As the external editor is connected via a file system, files with the suffixes *.c and *.h must be associated with the editor in the Windows configuration. Without this association, the external editor cannot be opened from the ASCET environment. However, an error message indicates that the association is missing.
- [Searching/Replacing and Printing ESDL Code](../raw/ESDL_Search_replace_print_code.md)
  Context: `ESDL Editor > Basics > Searching/Replacing and Printing ESDL Code`
  Note: A sophisticated search and replace feature is available in the ESDL editor. It works in the same way as the one for the C code editor (see Finding and Replacing C Code).
- [Accessing Block Diagrams from ESDL](../raw/esdl_accessing_block_diagrams_from_esdl.md)
  Context: `ESDL Editor > Basics > Accessing Block Diagrams from ESDL`
  Note: This section guides you through building a simple limited integrator in ESDL. The integrator uses a limiter element from the Systemlib_ETAS folder to determine the bandwidth of the outgoing signal.
- [Example: To Build the Integrator Element](../raw/ESDL_Example__To_Build_the_Integrator_Element.md)
  Context: `ESDL Editor > Basics > Example: To Build the Integrator Element`
  Note: You can either rename the default method calc to compute or delete it.
- [Using ESDL in State Machines](../raw/esdl_using_esdl_in_state_machines.md)
  Context: `ESDL Editor > Basics > Using ESDL in State Machines`
  Note: When modelling state machines in ASCET, the description in ESDL is often more compact than block diagrams. ESDL can be used to describe both states and transitions between states.
- [ESDL vs. Block Diagrams](../raw/esdl_esdl_vs._block_diagrams.md)
  Context: `ESDL Editor > Basics > ESDL Features Compared > ESDL vs. Block Diagrams`
  Note: The following table presents an overview of differences in model descriptions using ESDL and block diagrams.
- [Reference: ESDL vs. ANSI C](../raw/esdl_reference__esdl_vs._ansi_c.md)
  Context: `ESDL Editor > Basics > ESDL Features Compared > Reference: ESDL vs. ANSI C`
  Note: The following table presents an overview of the main differences between the ESDL modelling language and the ANSI C programming language.
- [Reference: ESDL vs. Java](../raw/esdl_reference__esdl_vs._java.md)
  Context: `ESDL Editor > Basics > ESDL Features Compared > Reference: ESDL vs. Java`
  Note: The following table presents an overview of the main differences between the ESDL modelling language and the Java programming language.
- [Creating a Class or Module in ESDL Code](../raw/Creating_class_module.md)
  Context: `ESDL Editor > Instructions > Creating a Class or Module in ESDL Code`
  Note: To create a class or module in ESDL code, proceed as follows:
- [Selecting a Default Method/Process](../raw/esdl_selectdefaultmethodprocess.md)
  Context: `ESDL Editor > Instructions > Selecting a Default Method/Process`
  Note: In each diagram, one method or one process can be selected as default method/process. The default method/process of the first diagram is displayed when you open the component in the ESDL editor.
- [Creating ESDL Code](../raw/creating_esdl_code.md)
  Context: `ESDL Editor > Instructions > Creating ESDL Code`
  Note: To create ESDL code, proceed as follows:
- [Filtering the Tree Pane](../raw/esdl_filtering_the_component_pane.md)
  Context: `ESDL Editor > Instructions > Filtering the Tree Pane`
  Note: The Outline tab can be filtered. To do so, proceed as follows.
- [Using Implementation Casts in ESDL](../raw/use_impl.casts.md)
  Context: `ESDL Editor > Instructions > Specifying Components in ESDL > Using Implementation Casts in ESDL`
  Note: Unlike the scenario in the block diagram editor, implementation casts can only be added to the ESDL editor using a button.
- [Editing ESDL Code](../raw/editing_esdl_code.md)
  Context: `ESDL Editor > Instructions > Specifying Components in ESDL > Editing ESDL Code`
  Note: It is possible to cut, copy and paste ESDL code between methods or within a method.
- [Finding/Replacing ESDL Code](../raw/ESDL_FindReplace_code.md)
  Context: `ESDL Editor > Instructions > Specifying Components in ESDL > Finding/Replacing ESDL Code`
  Note: To find/replace ESDL code, proceed as follows:
- [Searching/Deleting Unused Elements](../raw/ESDL_SearchDeleteUnusedElements.md)
  Context: `ESDL Editor > Instructions > Specifying Components in ESDL > Searching/Deleting Unused Elements`
  Note: To delete elements (scalar, composite or complex) not used in the ESDL code, proceed as follows:
- [Printing the ESDL Code](../raw/Printing_the_C_Code.md)
  Context: `ESDL Editor > Instructions > Specifying Components in ESDL > Printing the ESDL Code`
  Note: To print the ESDL code, proceed as follows:
- [Including a Component via the Block Library](../raw/ESDL_IncludeComponent_BlockLibrary.md)
  Context: `ESDL Editor > Instructions > Specifying Components in ESDL > Including a Component via the Block Library`
  Note: When you stored frequently used components in a block library, you can include them via the Library palette. Proceed as follows.
- [Analyzing a Diagram](../raw/ESDL_analyze_diagram.md)
  Context: `ESDL Editor > Instructions > Specifying Components in ESDL > Analyzing a Diagram`
  Note: As for block diagrams, you do not have to generate the complete code each time, there is an analysis function.
- [Using an External Editor](../raw/open-external-editor.md)
  Context: `ESDL Editor > Instructions > External Editor > Using an External Editor`
  Note: To open an external editor, proceed as follows:
- [Ending the External Editor Mode](../raw/end-external-editor.md)
  Context: `ESDL Editor > Instructions > External Editor > Ending the External Editor Mode`
  Note: To end the external editor mode, proceed as follows:
- [ESDL Editor - Window Elements](../raw/ESDL_Description_of_WindowElement.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements`
  Note: The ESDL editor window contains the following window elements:
- [Toolbars](../raw/ESDL_Toolbars.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Toolbars`
  Note: The following toolbars are available in the ESDL-Code Editor:
- [Toolbar General](../raw/ESDL_Toolbar_General.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Toolbars > Toolbar General`
  Note: The toolbar General contains following icons:
- [Toolbar Elements](../raw/ESDL_Toolbar_Elements.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Toolbars > Toolbar Elements`
  Note: The toolbar Elements contains following icons:
- [Menus](../raw/ESDL_Menu_Bar.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Menus`
  Note: This menu bar contains the following menus:
- [File Menu](../raw/ESDL_File_Menu.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Menus > File Menu`
  Note: This menu contains the following functions:
- [Edit Menu](../raw/ESDL_Edit_Menu.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Menus > Edit Menu`
  Note: This menu contains the following options:
- [View Menu](../raw/ESDL_View_Menu.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Menus > View Menu`
  Note: This menu contains the following functions:
- [Insert Menu](../raw/ESDL_Insert_Menu.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Menus > Insert Menu`
  Note: This menu contains the following functions:
- [Build Menu](../raw/ESDL_Build_Menu.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Menus > Build Menu`
  Note: This menu contains the following functions:
- [Extras Menu](../raw/ESDL_Extras_Menu.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Menus > Extras Menu`
  Note: This menu contains the following options:
- [Tools Menu](../raw/ESDL_Tools_Menu.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Menus > Tools Menu`
  Note: This menu contains the following functions:
- [Window Menu](../raw/ESDL_Window_Menu.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Menus > Window Menu`
  Note: This menu contains the following functions:
- [Help Menu](../raw/ESDL_Help_Menu.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Menus > Help Menu`
  Note: This menu contains the following functions:
- [Tree Pane](../raw/ESDL_TreePane.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Tree Pane`
  Note: The tree pane contains following three tabs and filter functions:
- [Context Menu for Components and Elements](../raw/esdl_contextmenu_componentselements.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Tree Pane > Context Menu for Components and Elements`
  Note: In the Outline tab, the context menu of a component or element - including method signature elements and process-local variables - contains the following functions:
- [Context Menu for Diagrams, Methods and Processes](../raw/esdl_contextmenu_diagrammethods.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Tree Pane > Context Menu for Diagrams, Methods and Processes`
  Note: In the Outline tab, the context menu of a diagram, method or process contains the following functions:
- [Specification View](../raw/ESDL_Specification_View.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Views > Specification View`
  Note: The Specification view contains the following elements:
- [Search Results View](../raw/ESDL_SearchResultsView.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Views > Search Results View`
  Note: A component contains a dependent parameter DepPar_sqrt, which is mapped to the parameter Ki in dataset Data, and to the parameter testPar in dataset Data_1. The active dataset is Data.
- [Browse View](../raw/ESDL_Browse_View.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Views > Browse View`
  Note: The Browse view contains the following elements:
- [Context Menu Browse View and Search Results View](../raw/esdl_contextmenu_browseview.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Views > Context Menu Browse View and Search Results View`
  Note: The context menus of the Browse view and the Search Results view contain a subset of the following functions:
- [External Editor View](../raw/ESDL_External_Editor_View.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Views > External Editor View`
  Note: The external editor view contains the following elements:
- [Palettes](../raw/ESDL_Palettes.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Palettes`
  Note: The following palettes are available in the ESDL editor:
- [Elements Palette](../raw/ESDL_Elements_Palette.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Palettes > Elements Palette`
  Note: The Elements palette contains following functions:
- [Library Palette](../raw/ESDL_Library_Palette.md)
  Context: `ESDL Editor > Reference to User Interface > ESDL Editor - Window Elements > Palettes > Library Palette`
  Note: The Library palette is read-only, you cannot add or remove block library items via the palette. It contains following elements.
