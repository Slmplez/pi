# ASCET AMD Import Errors

| Column 1 | Column 2 | Column 3 | Column 4 |
| --- | --- | --- | --- |
| Errors | ID | Causes | Autofix |
| Bad A2L file | XMLe01 | The A2L file to be imported is invalid and could not be read | % |
| Can't process file | XMLe02 | Invalid file location – You tried to import a component into the database/workspace root. | % |
| Can't process file | XMLe02 | Invalid nameSpace – The mane space in the *.main.amd file is invalid (in most cases, empty) | % |
| Duplicated name | XMLw03 | The name of an element is already present. | Resolve name conflicts by renaming – the element will be renamed (name_1) |
| Duplicated OID | XMLe04 | Another component with this OID exists in the database/workspace, or another element with this OID exists in a component. | % |
| File not found | XMLw05 | An explicitly referenced file (required) cannot be read (e.g., a *.main.amd file). | % |
| File not found | XMLw05 | A signal file cannot be found | Use defaults for missing files – an empty signal is generated |
| File not found | XMLw05 | A *.data.amd file or *.implementation.amd file cannot be found | Use defaults for missing files – defaults for all data and implementations are created |
| Inconsistent data | XMLw06 | Different widget types in group … – in an *.experiment.amd file, different window types are defined in the same group | Discard inconsistent data – the defective window elements re not imported |
| Inconsistent data | XMLw06 | Different widget categories in group … – in an *.experiment.amd file, different window categories are defined in the same group | Discard inconsistent data – the defective window elements re not imported |
| Inconsistent data | XMLw06 | Wrong type for module element – an invalid complex element was found while reading the tasks (project | % |
| Inconsistent data | XMLw06 | Inconsistent IfThen layout – an invalid If-Then block was found while reading a *.specification.amd file | % |
| Inconsistent data | XMLw06 | Inconsistent IfThenElse layout – an invalid If-Then-Else block was found while reading a *.specification.amd file | % |
| Invalid file | XMLe07 | AMD parse error – the indicated file could not be read | % |
| Invalid file | XMLe07 | Decryption failed – the indicated file could not be decrypted | % |
| Invalid file | XMLe07 | Schema validation failed – the indicated file could not be validated against the schema | % |
| Missing configuration | XMLw08 | A data set or implementation set in a *.data.amd file or *.implementation.amd file is invalid/incomplete | Create default configuration – a data set/implementation set with default values is created |
| Orphaned configuration | XMLw09 | For date or implementation stated in a *.data.amd file or *.implementation.amd file, no element exists in the *.main.amd file | Ignore the configuration – the data or implementation is not read |
| Short name not found | XMLw10 | For a C code component, the indicated code generator could not be identified (misspelled in most cases) | Ignore data referring to missing generators – all C code variants for this generator are not read |
| Short name not found | XMLe11 | More than one class configuration exist in a *.data.amd file or *.implementation.amd file | % |
| Unhandled exception | XMLe12 | A critical error occurred | % |
| Unhandled exception | XMLe12 | An error occurred | Use defaults – the file in question is ignored, and defaults are generated instead |
| Unreadable file | XMLw13 | A file from the ProjectFile tab could not be read | Ignore unreadable references to project files – the file is not read, it is missing in the ProjectFile tab |
| Unreadable image file | XMLe14 | A graphic (icon) cannot be read | % |
| Unresolvable name | XMLw15 | An element (or component) that is referenced (only) by name cannot be found. This error can occur wherever elements or components are referenced. | Ignore unresolvable class/element references – the reference is ignored and nor read |
| Unsuitable element | XMLw15 | A method is referenced as measurement/calibration element in an *.experiment.amd file | Ignore element – the measurement/calibration element is not read |
| Write access denied | XMLe18 | A component cannot be imported because the „Disallow Overwrite“ option is set. | % |
| Wrong parameter number | XMLe19 | A formula has more (or fewer) parameters than expected | % |
| Invalid formula | XMLw20 | An invalid formula (syntax error) was specified for a dependent parameter | Use the formula with invalid content – the formula is read as it is, however, it cannot be evaluated during code generation |
| The file to be imported uses a deprecated schema | XMLw21 | The indicated file was written for an older version of the corresponding schema. | Ignore schema version differences – the file is read in spite of the version conflict. However, the file may contain defective data that can cause problems at a later time. |
| An invalid OID has been encountered | XMLw22 | An invalid local OID (variable, method etc.) was detected. | % |
| An invalid OID has been encountered | XMLw22 | An invalid local OID (component) was detected. | Replace the bad OID by a better one – The OID, as well as references to it, are replaced by a valid OID |
| Illegal specification type | XMLw23 | The *.main.amd file of a component, contains a specification type not allowed for this component. | % |
| Illegal specification type | XMLw23 | The *. specification.amd file of a component, contains a specification type not allowed for this component. | ignore the specification – the specification is not imported |
| A declared method has no counterpart in any specification | XMLw24 | For a method signature in *.main.amd, no method body exists in *.specification.amd | Add [name] to specification [name] – an empty method is created in the corresponding specification |
| A problematic coordinate value has been encountered | XMLw25 | A graphical object has a negative coordinate. | Replace the old value [oldValue] with [newValue] – the negative coordinate is replaced by a positive one |
| Component cannot overwrite folder | XMLe26 | In the destination folder for a component import, a subfolder with the component name already exists | % |
