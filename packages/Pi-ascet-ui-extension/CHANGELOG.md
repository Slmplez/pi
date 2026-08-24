﻿# Changelog

## [Unreleased]

### Fixed

- Fixed ASCET startup header dashboard row counts and disposed async updates so recent-session and release state changes do not cause layout shifts or post-dispose redraws.
- Fixed the ASCET Release panel so a cached current version cannot mask a newer package reported by the registry.
