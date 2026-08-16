# Preconditions for IP Protection

The following conditions must be kept in mind for IP protection to work properly:

- Both partners must use the same ASCET version.

With different ASCET versions, re-generation of the code will be enforced at the receiving partner, and data model conversions may take place. Both require Write access to the components.

- The code generation settings including [data type name settings](IntroductionEnglishUS.chm::/INT_DataTypeNames.htm) and [code generation message configuration](CM_ConfigMessages_in_ConfigWindows.md) have to be the same for all components which are involved.

It is recommended that both development partners use the same project to build the code, and keep the settings - i.e. [project properties](ProjectEditorEnglishUS.chm::/projectsettings.htm), [ASCET options](CM_Setting_Up_ASCET.md), settings in files such as codegen.ini,codegen_ecco.ini, memory_sections.xml, settings_<compiler>.mk etc. - unchanged.

- The required interface of an IP protected component must not be changed in the BUILD project. This includes:
- method signatures of embedded components (including their implementation specification)

It is recommended to include all embedded components in the IP protection to avoid this particular problem. For ASCET-SE targets using ASCET modules, this is mandatory since init code of embedded components will be generated into the module code.

- [formula](ProjectEditorEnglishUS.chm::/PE_TransformationFormulas.htm) / [implementation type](ProjectEditorEnglishUS.chm::/PE_ImplementationTypes.htm) definitions
- Declaration of all imported elements
- Only protected (Read and Write [access rights](DatabaseAccess.md) removed) modules and classes which are referenced by the very same project should be exchanged.

If Write access is possible, the component can be "touched" (see [Force a New Build during Code Generation](ForceaNewbuild.md)), which would make the generated code invalid.

For security reasons it is recommended to remove also the Generate access right. With that, any change in the code generation relevant settings will lead to an error early in the build process phase.

- It is recommended that, for communication between modules from both partners, the protected modules always contain the exported messages. ASCET needs to regenerate imported messages (which are exported in unprotected modules) in protected modules. For that purpose, full access rights are required.

So, if partner A transfers a protected module with messages to partner B, all shared messages are best exported in the protected module. If necessary, a shared interface module with message copies can be defined.

- Use the __NON_OPT_COPY setting for the modularMessageUse option in the codegen_ecco.ini file (see the ASCET-SE user's guide for details).
- All formulas and implementation types must remain unchanged. Adding or changing formulas or implementation types forces a rebuild for all components, not only those which use these formulas. In this, case you will lose the build capability for the IP protected components.

If more than one instance of the protected component is (or may be) present in the project context, the implementation setting Optimized Method Calls should be disabled in the [implementation editor of the component](ImplementationEditorEnglishUS.chm::/IEd_ImplementationEditor_for_ComponentsProjects.htm).

See also

[IP Protection](CM_IntellectualPropertyProtection.md)

[Access Rights](DatabaseAccess.md)

[IP Protection Procedure](CM_IPProtectionProcedure.md)

[ASAM-MCD-2MC Generation for Protected Components](CM_ASAM2MCGenerationProtectedComponents.md)

[Introduction - Data Type Names](IntroductionEnglishUS.chm::/INT_DataTypeNames.htm)

[Configuring Messages in the Configuration Windows](CM_ConfigMessages_in_ConfigWindows.md)

[Project Editor - Project Settings](ProjectEditorEnglishUS.chm::/projectsettings.htm)

[Setting Up ASCET](CM_Setting_Up_ASCET.md)

[Project Editor - Transformation Formulas](ProjectEditorEnglishUS.chm::/PE_TransformationFormulas.htm)

[Project Editor - Implementation Types](ProjectEditorEnglishUS.chm::/PE_ImplementationTypes.htm)

[Force a New Build during Code Generation](ForceaNewbuild.md)

[Editing Implementations - Implementation Editor for Components/Projects](ImplementationEditorEnglishUS.chm::/IEd_ImplementationEditor_for_ComponentsProjects.htm)
