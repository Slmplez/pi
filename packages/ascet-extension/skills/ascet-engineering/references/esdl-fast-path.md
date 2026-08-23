# ESDL Fast Path

For an exact existing Method body, use the shortest safe route:

```text
ascet_read.read_code
→ ascet_edit.set_method_code
```

When the signature changes, read both body and signature, use `ascet_edit.set_method_signature`, then use `ascet_edit.set_method_code`. For a new Method, use `ascet_edit.create_method`, set the signature only when required, and then set the body.

Keep Method shell, signature, and body separate. Do not place arguments, return declarations, or fake overloads in body text. Ensure every control path satisfies the declared return behavior.

When ordinary Elements are part of the change, use `ascet_edit.apply_element_spec` before the body write. When a complete Parameter Dependency Chain is part of the change, use `ascet_edit.create_dependent_chain` instead. Read current Element or chain state only when it affects design or conflict handling.

AI-generated ESDL uses the short `//[AI-GEN]` marker. Put it on the first non-empty line for a full replacement body; for a local region, pair separate-line `//[AI-GEN]` and `//[/AI-GEN]` markers. Preserve existing markers; never nest, duplicate, or mark unchanged user code.

Do not force an exact Method change through Project, ownership, BDE, or full Signal Flow analysis unless that evidence can alter the requested code or target.
