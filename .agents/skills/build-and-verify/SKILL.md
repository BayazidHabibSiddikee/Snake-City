---
name: build-and-verify
description: Type-check, build, and verify Serpent Peaks changes before committing.
---

# Build and Verify Workflow

1. Run `npm run lint` to verify strict TypeScript compilation (`tsc --noEmit`).
2. Run `npm run build` to verify Vite production bundling into `dist/`.
3. Check `git status --short` to ensure no build artifacts (`dist/`, `node_modules/`) or secrets are staged.
4. Update `MEMORY.md` if any backlog item was completed or new technical debt was introduced.
