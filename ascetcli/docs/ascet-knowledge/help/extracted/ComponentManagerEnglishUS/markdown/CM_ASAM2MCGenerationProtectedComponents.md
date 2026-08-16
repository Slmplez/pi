# ASAM-MCD-2MC Generation for Protected Components

IP protected components must be generated and compiled with virtual address table (see ASCET-SE user's guide for details). You must activate the Generate Map File option in the [Production Code](ProjectEditorEnglishUS.chm::/Production_Code_Options_Window.htm) node of the Project Properties window and the addressTable option in the codegen_ecco.ini file.

You also need to define the COMPILE_VAT macro in the project_settings.mk file. The macro is added to the PROJECT_DEFINES section, e.g.,

PROJECT_DEFINES = $(MEM_LAYOUT) $(COMPILE_UNUSED_DEF) __DCC__ __GENERATE_ISR_DUMMY COMPILE_VAT

It is recommended to use these settings in all ASCET installations involved in the component exchange.

Then you can generate code with the unprotected components, protect the components and transfer them to the development partner. The partner can build the project as described before. See also [IP Protection Procedure](CM_IPProtectionProcedure.md) and [Building/Rebuilding Executable Code](projecteditorenglishus.chm::/generateexecutable.htm).

To generate a complete a2l file, the partner has to read the information from the precompiled objects. This is done in the project editor, via the Tools menu, ASAM-2MC submenu, Read Hex File option. Afterwards, the a2l file can be written as described in [Generating Application Files](ProjectEditorEnglishUS.chm::/generating_files.htm); it should contain the complete addresses.

See also

[IP Protection](CM_IntellectualPropertyProtection.md)

[Preconditions for IP Protection](CM_PreconditionsIPProtection.md)

[IP Protection Procedure](CM_IPProtectionProcedure.md)

[Project Editor - Production Code Node](ProjectEditorEnglishUS.chm::/Production_Code_Options_Window.htm)

[Project Editor - Building/Rebuilding Executable Code](projecteditorenglishus.chm::/generateexecutable.htm)

[Project Editor - Generating Application Files](ProjectEditorEnglishUS.chm::/generating_files.htm)
