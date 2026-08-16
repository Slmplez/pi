# Editing the Formula

To edit the formula, proceed as follows:

1. In the Formulas tab, select the formula you want to edit.
1. Press F2 to rename the formula.
1. Do one of the following.
1. In the Type combo box, select the type of formula to be edited.
1. Enter the required values in the respective fields.
1. Enter a unit into the Unit field.
1. Type a comment into the Comment field.
1. Click OK.

You cannot rename or delete the ident formula. When you edit the ident formula and select another type from the Type combo box, the following warning is displayed:

The <ident> formula is used for newly created elements to provide an identity conversion and changing this formula may corrupt your implementation. Do you really want to change the <ident> formula?

If you really want to change the type of the ident formula, click Yes. Otherwise, click No.

If you are working with AUTOSAR, you can use the Comment field to enter an AUTOSAR-specific name for the physical unit. The AUTOSAR-specific name is entered as follows:

AR-UnitName="<name>"

The semantic of the name is as follows:

- If <name> contains a package name separator, i.e. a "/", then the name is treated as a PACKAGE name and used instead of the template provided for physical units (see also [Configuring the AUTOSAR XML Output](AtomicSoftwareComponentEditorEnglishUS.chm::/ASCconfigureAUTOSARXMLOutput.htm)). In this case, <name> must follow the rules for package names.
- If <name> does not contain any package separators, then the name is treated as the SHORT-NAME of the unit with the package template for physical units used to derived the full name of the unit.
- If no name is given, the SHORT-NAME of the unit is derived from the display name as of today, i.e. making the display name a valid short name identifier.

The given name must not contain any template parameter (i.e., %...%), but is taken as is.

You cannot specify an AUTOSAR-specific name for a physical unit entered in the properties editor of an element. Instead a formula must be created and assigned to the element.
