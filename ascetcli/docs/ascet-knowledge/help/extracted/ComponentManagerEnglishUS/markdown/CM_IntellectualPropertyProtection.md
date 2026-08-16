# Intellectual Property Protection

##### Introduction

ASCET provides means for intellectual property protection (IP protection), i.e. for secure exchange of sensitive components. The parties involved in such an exchange could be, e.g., OEM & Tier 1 supplier. The IP protection allows the exchange of protected components by keeping simulation (offline and online experiments) and build capabilities (for production code generation), including the generation of the respective ASAM-MCD-2MC description file (see also [ASAM-MCD-2MC Generation for Protected Components](CM_ASAM2MCGenerationProtectedComponents.md)).

IP protection works with ASCET V5.2.2+HF1 and higher.

##### Build Mechanism

The IP protection mechanism requires both companies to use the identical context, i.e. the identical project as well as identical settings/options.

ASCET uses the project OID to identify the generated code as well as the object code stored in the database. The code exported with the protected component will not be found if the component is used in a different project, and therefore ASCET will try - and fail - to regenerate code for the protected component.

In general, the attempt to regenerate code is an indication that the generation context (project, settings, options, etc.) is different. This must not happen for the IP protection use case to work.

When using old ASCET-SCM versions, be aware that the versioning tool changes the time stamps of the components. As a consequence, ASCET tries to rebuild the code even if nothing really changed. With ASCET-SCM V5.2.2-1018 or higher and ASCET V6.0.1 or higher, this problem is solved and time stamps are not changed during component import.

See also

[Preconditions for IP Protection](CM_PreconditionsIPProtection.md)

[IP Protection Procedure](CM_IPProtectionProcedure.md)

[ASAM-MCD-2MC Generation for Protected Components](CM_ASAM2MCGenerationProtectedComponents.md)
