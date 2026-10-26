# Changelog

## 0.3.0 — Release preparation

- Add hosted ZIP uploads for Python repository scanning.
- Validate archive paths and reject symbolic links.
- Enforce archive, file-count, per-file, and total extracted-source limits.
- Add API tests for health checks, ZIP scanning, invalid archives, traversal attempts, and production CORS.
- Add continuous integration for backend tests and frontend production builds.
- Document ZIP upload, testing, and Render deployment.
- Remove the developer-specific local path from the default UI state.

The scanner analyzes Python source statically and does not execute uploaded code.
