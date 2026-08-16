# Elements Fast Path

Use `ascet_search` for live Element candidates, then `ascet_read.read_element` to validate the exact Component path and read model type, scope, unit, formula, range, initial, calibration, dependency, and implementation metadata.

For existing Elements, send only the requested patch and preserve unread fields. For multiple Elements in one Component, use one `apply_element_spec` plan and one corresponding commit/write. Choose exactly one range source: Physical or Implementation. Do not invent missing values.
