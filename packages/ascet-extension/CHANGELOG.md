# Changelog

## [Unreleased]

### Added

- Added `ascet_get` for bounded live tree, element, formula, reference, import-binding, and BDE-edge retrieval.
- Added task-scoped Observation delivery with inline JSON or NDJSON plus metadata for large results.

### Changed

- ASCET discovery now uses `ascet_get`, Pi `find`/`grep`/`read`, and exact `ascet_read` operations without a persistent database index.

### Fixed

- Fixed Bosch LLM Farm slow first-token requests to use effective provider-scoped 15-minute timeouts and five agent-level retries without showing intermediate retry errors.
- Fixed `ascet_get` `component_refs` name and scope filters being ignored.

### Removed

- Removed `ascet_index`, `ascet_search`, `ascet_explore`, P0/SQLite indexing, startup warmup, index footer, and background index refresh.
- Removed `read_project_formulas`; use `ascet_get` action `formulas` instead.