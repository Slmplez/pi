# Name Templates

The generation of names (e.g., for variables) in the C code is controlled by macros. ASCET provides templates as a means of name customization. Templates are strings that may contain template parameters; these are expanded to their current value during ASCET code generation.

The set of valid template parameters is defined for each template individually. If a template uses an invalid template parameter, an error (EMake90) is issued during code generation.

ASCET provides a specific syntax for influencing the template parameter expansion.

- Template parameter names must be capitalized.

A template parameter %COMPONENT.name% causes an error.

- Templates must not contain blanks.

A template parameter % COMPONENT.NAME% causes an error.

- templates without template parameters

A template may be constant, i.e. without any template parameter. In this case, the template keeps its value in any context.

Example:

| Column 1 | Column 2 |
| --- | --- |
| template | is expanded to |
| temp | temp |

- templates with unconditional use of template parameters

Templates may use any valid template parameter, which will be expanded depending on the context. Each template parameter MUST start and end with a % (percent) character. In addition to template parameters, templates may use constant parts.

This template parameter expansion mechanism leaves all characters not embedded in '%', as they are.

Examples:

| Column 1 | Column 2 |
| --- | --- |
| template + parameter | is expanded to |
| %COMPONENT.NAME% | Classname |
|  | (for an ASCET component named Classname ) |
| %COMPONENT.NAME% | MoDuLeNaMe |
|  | (for an ASCET component named MoDuLeNaMe ) |
| myClass_%COMPONENT.NAME% | myClass_Class |
|  | (for an ASCET component named Class ) |

- Conditional use of template parameters

Templates may use any valid template parameter conditionally. In that case, a template parameter is used only if it has a value, i.e. it does not expand to an empty string. The indication for conditional usage is to embed the template parameter in two ? characters.

Examples:

| Column 1 | Column 2 |
| --- | --- |
| template + parameter | is expanded to |
| %COMPONENT.NAME%_%?COMPONENT.IMPL?% | Classname |
|  | (for an ASCET component named Classname in a context where the implementation (named Impl ) is irrelevant, e.g., an offline experiment) |
| %COMPONENT.NAME%_%?COMPONENT.IMPL?% | Classname_Impl |
|  | (for an ASCET component named Classname in a context where the implementation (named Impl ) is relevant) |

- Capitalization of template parameter values

This feature is mainly used for compatibility with previous ASCET versions, where some of the names were hard-coded and capitalized. The indication for using the uppercase equivalent for a specific template parameter value is to embed the template parameter in two ^ characters.

Examples:

| Column 1 | Column 2 |
| --- | --- |
| template + parameter | is expanded to |
| %^COMPONENT.NAME^% | CLASSNAME |
|  | (for an ASCET component named Classname ) |
| myClass_%COMPONENT.NAME% | myClass_CLASS |
|  | (for an ASCET component named Class ) |
