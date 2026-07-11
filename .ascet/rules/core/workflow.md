# ASCET Navigation Workflow

Start with runtime status, then use shallow exploration before reading implementation details.

Scope rules:

- Database scope: sample top-level folders and representative targets.
- Folder scope: inspect only the requested subtree and a few representative objects.
- Project scope: resolve the project first, then inspect representative children or integration entry points.

Prefer representative evidence over completeness. Avoid full recursive traversal unless the user explicitly asks for it.
