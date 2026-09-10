# AGENTS.md

## Build and release integration

When changing project code, review `Dockerfile`, `.dockerignore`, and `.github/workflows/` for corresponding updates. Keep Docker builds and CI/release workflows aligned with changes to the project structure, package paths, build commands, runtime dependencies, and version source.

## Agent skills

### Issue tracker

Issues are tracked as local Markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Domain docs

This repository uses a single-context domain-doc layout. See `docs/agents/domain.md`.
