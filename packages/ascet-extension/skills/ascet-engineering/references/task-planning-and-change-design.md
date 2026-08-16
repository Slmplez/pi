# Task Planning and Change Design

Do not create a task list for a single exact read, a small Method body edit, a single-field Element patch, or one explicit Action unless coordination is genuinely useful.

Use two to four concrete steps for combined ESDL and Element work, Method plus signature changes, new Methods, or complete Parameter Dependency Chains. Add detail only for real dependencies, multiple Components or Projects, ownership conflicts, multiple Variants, shared non-local impact, or independent write units.

Before a non-trivial apply, capture:

- exact target and requested behavior;
- modification scope, owner, and exclusions;
- exact code or surface change;
- Element and Parameter metadata;
- complete dependency and mapping definition;
- write order and success criteria;
- assumptions, blocking unknowns, and risks.

Each step must name the object, operation, dependency, and completion condition. Do not split every read mechanically or use vague analysis and modification placeholders.
