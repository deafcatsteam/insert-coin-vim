# CLAUDE.md — Insert Coin (Vim arcade trainer)

Reference spec: `SPEC.md`. Read it before any task. If a request conflicts with the spec, say so and ask.

## Language
- English everywhere: code, comments, commit messages, docs, issues, PR descriptions.
- Player-facing strings go through i18n keys (`locales/en.json`). Never hardcode UI text.

## Workflow (mandatory)
1. **Audit**: read relevant files, report current state. No modifications.
2. **Plan**: propose numbered steps, files touched, risks. Wait for explicit approval.
3. **Execute**: implement the approved plan only. No scope creep.
4. **Verify**: run lint, typecheck, tests, level validation; report results honestly.
- Never claim something works without having run it.
- If unsure about state (branch, files, config), check first instead of assuming.

## Current phase
**Phase 2 — v1.0** (SPEC §12). Phase 1 shipped as `v0.1.0`. Phase 0 findings in `docs/phase0-report.md` are rules for levels and engine (no `Ctrl+N`/`Ctrl+T`/`Ctrl+W` in levels, shared editor setup, Vim state reset per level).

## Conventions
- TypeScript strict mode. No `any` without a comment explaining why.
- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`. Small, focused commits.
- SemVer. Do not bump versions or create tags unless asked.
- Keyboard: use `KeyboardEvent.key`, never `.code`. Keep AZERTY in mind (the maintainer uses it).
- Keystroke counting follows VimGolf conventions.
- No external network resources at runtime (fonts self-hosted, no CDN, no analytics, no cookies).
- Levels: one JSON per level in `levels/<chapter>/`, must pass schema + solution replay.

## Commands
```bash
npm install
npm run dev          # local dev server
npm run lint         # ESLint + Prettier check
npm run format       # Prettier write
npm run typecheck
npm test             # unit tests (Vitest, jsdom)
npm run validate:levels   # schema, i18n keys, replay of every solution
npm run build
```
Not defined yet: `npm run test:e2e` (Playwright, Phase 1).

## Do not
- Push, force-push, tag, or deploy without explicit approval.
- Add dependencies without stating why and their license (must be MIT/BSD/Apache/OFL-compatible).
- Use names, logos, or assets from existing franchises (Alien, etc.).
- Put the Ko-fi/Sponsors prompt inside gameplay.
